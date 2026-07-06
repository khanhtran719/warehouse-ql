import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { ExportType, VoucherStatus } from '@prisma/client';
import { PaginationDto } from '../common/pagination.dto';

export class VoucherItemDto {
  @IsString() productId!: string;
  @Type(() => Number) @IsNumber() @Min(0.001) quantity!: number;
  @Type(() => Number) @IsNumber() @Min(0) unitPrice!: number;
}
export class CreateImportDto {
  @IsDateString() importDate!: string;
  @IsOptional() @IsString() note?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => VoucherItemDto) items!: VoucherItemDto[];
}
export class CreateExportDto {
  @IsDateString() exportDate!: string;
  @IsEnum(ExportType) exportType: ExportType = ExportType.SALE;
  @IsOptional() @IsString() note?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => VoucherItemDto) items!: VoucherItemDto[];
}
export class ListVoucherDto extends PaginationDto {
  @IsOptional() @IsEnum(VoucherStatus) status?: VoucherStatus;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}
export class ListExportDto extends ListVoucherDto { @IsOptional() @IsEnum(ExportType) exportType?: ExportType; }
export class ExportExcelDto { @Type(() => Number) @IsNumber() @Min(1) month!: number; @Type(() => Number) @IsNumber() @Min(2000) year!: number; }
