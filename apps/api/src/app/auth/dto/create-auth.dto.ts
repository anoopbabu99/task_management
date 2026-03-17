import { IsNotEmpty, IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { UserRole } from '@ababu/data';

export class CreateAuthDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  organizationName?: string; // Name of new Company OR Department

  @IsOptional()
  @IsUUID()
  organizationId?: string;   // ID to JOIN

  @IsOptional()
  @IsUUID()
  parentId?: string;         // ID of Parent Company (if creating a sub-org)
}