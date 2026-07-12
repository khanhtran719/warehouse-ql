import { Transform, Type } from 'class-transformer';
import { IsNumber, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class AdjustStockDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(999_999_999_999_999)
  targetStock!: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
