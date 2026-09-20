import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * Un service tel que le configure le professionnel (section II.5 du CDC) :
 * nom, description, durée, prix si applicable, image et statut.
 *
 * `prix` est exprimé en centimes (cf. schema.prisma) ; la conversion en dinars
 * est faite côté frontend.
 */
export class CreateServiceDto {
  @ApiProperty() @IsString() nom: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsInt() @Min(5) dureeMinutes: number;
  @ApiProperty({ required: false, description: 'En centimes.' }) @IsOptional() @IsInt() @Min(0) prix?: number;
  @ApiProperty({ required: false, description: "URL de l'image du service." }) @IsOptional() @IsString() imageUrl?: string;
  @ApiProperty({ required: false, default: true }) @IsOptional() @IsBoolean() actif?: boolean;
}

export class UpdateServiceDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() nom?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(5) dureeMinutes?: number;
  @ApiProperty({ required: false, description: 'En centimes.' }) @IsOptional() @IsInt() @Min(0) prix?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() imageUrl?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() actif?: boolean;
}
