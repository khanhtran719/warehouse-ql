import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { RecordStatus, UserRole } from '@prisma/client';
import { PaginationDto } from '../common/pagination.dto';

export class ListUsersDto extends PaginationDto {
  @IsOptional() @IsEnum(RecordStatus) status?: RecordStatus;
}

export class CreateUserDto {
  @IsString() @MinLength(3) @MaxLength(50) username!: string;
  @IsString() @MinLength(1) @MaxLength(100) name!: string;
  @IsString() @MinLength(8) @MaxLength(100) password!: string;
  @IsOptional() @IsEnum(UserRole) role: UserRole = UserRole.STAFF;
}

export class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) name?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @IsEnum(RecordStatus) status?: RecordStatus;
}

export class ResetPasswordDto {
  @IsString() @MinLength(8) @MaxLength(100) password!: string;
}
