import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { PaginationDto } from '../common/pagination.dto';

export class ListProductsDto extends PaginationDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() status?: string;
}
export class ProductDto {
  @IsString() @MinLength(1) code!: string;
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() unitId?: string;
  @Type(() => Number) @IsNumber() @Min(0) defaultSalePrice!: number;
  @Type(() => Number) @IsNumber() @Min(0) minStock = 0;
  @IsOptional() @IsString() note?: string;
}
export class SimpleNameDto { @IsString() @MinLength(1) name!: string; }
