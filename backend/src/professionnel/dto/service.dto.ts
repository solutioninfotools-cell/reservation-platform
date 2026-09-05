import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty() @IsString() nom: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsInt() @Min(5) dureeMinutes: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) prix?: number;
}
export class UpdateServiceDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() nom?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(5) dureeMinutes?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) prix?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() actif?: boolean;
}
