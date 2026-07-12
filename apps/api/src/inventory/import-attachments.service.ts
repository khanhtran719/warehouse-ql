import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';

export const MAX_RECEIPT_IMAGE_SIZE = 8 * 1024 * 1024;
export const MAX_RECEIPT_IMAGES = 5;
const extensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export type ReceiptImageFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

export function validateReceiptImage(file: Pick<ReceiptImageFile, 'mimetype' | 'size' | 'buffer'>) {
  if (!extensions[file.mimetype]) {
    throw new BadRequestException('Ảnh chứng từ chỉ hỗ trợ JPEG, PNG hoặc WebP');
  }
  if (file.size > MAX_RECEIPT_IMAGE_SIZE) {
    throw new BadRequestException('Mỗi ảnh chứng từ không được vượt quá 8 MB');
  }
  if (!hasValidSignature(file.mimetype, file.buffer)) {
    throw new BadRequestException('Nội dung tệp ảnh chứng từ không hợp lệ');
  }
}

function hasValidSignature(mimeType: string, buffer: Buffer) {
  if (mimeType === 'image/jpeg')
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === 'image/png')
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  );
}

@Injectable()
export class ImportAttachmentsService {
  private readonly uploadDir: string;

  constructor(
    private prisma: PrismaService,
    config: ConfigService,
  ) {
    this.uploadDir = resolve(config.get<string>('UPLOAD_DIR') ?? join(process.cwd(), 'uploads', 'import-receipts'));
  }

  async upload(stockImportId: string, file: ReceiptImageFile, userId: string) {
    validateReceiptImage(file);
    const voucher = await this.prisma.stockImport.findUnique({ where: { id: stockImportId }, select: { id: true } });
    if (!voucher) throw new NotFoundException('Không tìm thấy phiếu nhập');
    const attachmentCount = await this.prisma.stockImportAttachment.count({ where: { stockImportId } });
    if (attachmentCount >= MAX_RECEIPT_IMAGES) {
      throw new ConflictException(`Mỗi phiếu nhập chỉ lưu tối đa ${MAX_RECEIPT_IMAGES} ảnh chứng từ`);
    }

    const storageKey = `${randomBytes(16).toString('hex')}${extensions[file.mimetype]}`;
    await mkdir(this.uploadDir, { recursive: true });
    await writeFile(this.filePath(storageKey), file.buffer, { flag: 'wx' });

    try {
      return await this.prisma.stockImportAttachment.create({
        data: {
          stockImportId,
          originalName: basename(file.originalname).slice(0, 255) || `chung-tu${extensions[file.mimetype]}`,
          storageKey,
          mimeType: file.mimetype,
          size: file.size,
          uploadedById: userId,
        },
      });
    } catch (error) {
      await unlink(this.filePath(storageKey)).catch(() => undefined);
      throw error;
    }
  }

  async download(stockImportId: string, attachmentId: string) {
    const attachment = await this.prisma.stockImportAttachment.findFirst({
      where: { id: attachmentId, stockImportId },
    });
    if (!attachment) throw new NotFoundException('Không tìm thấy ảnh chứng từ');
    try {
      return { attachment, buffer: await readFile(this.filePath(attachment.storageKey)) };
    } catch {
      throw new NotFoundException('Tệp ảnh chứng từ không còn trên hệ thống lưu trữ');
    }
  }

  private filePath(storageKey: string) {
    return join(this.uploadDir, storageKey);
  }
}
