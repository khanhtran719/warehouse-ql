import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser } from '../common/current-user.decorator';
import { CreateImportDto, ListVoucherDto } from './dto';
import { ImportAttachmentsService, MAX_RECEIPT_IMAGE_SIZE, type ReceiptImageFile } from './import-attachments.service';
import { StockImportsService } from './stock-imports.service';

@UseGuards(AuthGuard('jwt'))
@Controller('stock-imports')
export class StockImportsController {
  constructor(
    private service: StockImportsService,
    private attachments: ImportAttachmentsService,
  ) {}
  @Get() list(@Query() q: ListVoucherDto) {
    return this.service.list(q);
  }
  @Post() create(@Body() dto: CreateImportDto, @CurrentUser() user: CurrentUser) {
    return this.service.create(dto, user.id);
  }
  @Get(':id') get(@Param('id') id: string) {
    return this.service.get(id);
  }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: CreateImportDto) {
    return this.service.update(id, dto);
  }
  @Post(':id/confirm') confirm(@Param('id') id: string, @CurrentUser() user: CurrentUser) {
    return this.service.confirm(id, user.id);
  }
  @Post(':id/cancel') cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_RECEIPT_IMAGE_SIZE } }))
  uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: ReceiptImageFile | undefined,
    @CurrentUser() user: CurrentUser,
  ) {
    if (!file) throw new BadRequestException('Vui lòng chọn ảnh chứng từ');
    return this.attachments.upload(id, file, user.id);
  }

  @Get(':id/attachments/:attachmentId')
  async downloadAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { attachment, buffer } = await this.attachments.download(id, attachmentId);
    response.setHeader('Content-Type', attachment.mimeType);
    response.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`,
    );
    return new StreamableFile(buffer);
  }
}
