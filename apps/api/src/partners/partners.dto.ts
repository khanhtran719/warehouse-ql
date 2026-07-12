import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { RecordStatus } from '@prisma/client';
import { PaginationDto } from '../common/pagination.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const trimOptional = ({ value }: { value: unknown }) => {
  const trimmed = typeof value === 'string' ? value.trim() : value;
  return trimmed === '' ? undefined : trimmed;
};

export class PartnerDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code!: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  taxCode?: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactPerson?: string;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;
}

export class ListPartnersDto extends PaginationDto {
  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;

  @Transform(trimOptional)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
