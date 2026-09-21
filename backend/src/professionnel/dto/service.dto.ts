import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

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
  @ApiProperty({ required: false, description: 'Publication du service.' }) @IsOptional() @IsBoolean() actif?: boolean;

  /** Disponibilité affichée au client, distincte de la publication. */
  @ApiProperty({ required: false, enum: ['DISPONIBLE', 'COMPLET', 'INDISPONIBLE'] })
  @IsOptional() @IsIn(['DISPONIBLE', 'COMPLET', 'INDISPONIBLE'])
  statut?: 'DISPONIBLE' | 'COMPLET' | 'INDISPONIBLE';
}
