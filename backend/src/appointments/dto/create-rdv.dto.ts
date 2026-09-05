import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateRdvDto {
  @ApiProperty() @IsString() professionnelId: string;
  @ApiProperty() @IsString() serviceId: string;
  @ApiProperty() @IsString() dateDebut: string; // ISO

  // Identification du client (sans compte)
  @ApiProperty() @IsString() nom: string;
  @ApiProperty() @IsString() prenom: string;
  @ApiProperty() @IsString() telephone: string;
  @ApiProperty({ required: false }) @IsOptional() @IsEmail() email?: string;
  @ApiProperty({ required: false }) @IsOptional() dateNaissance?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString() remarque?: string;
  @ApiProperty({ required: false, description: 'Réponses aux champs personnalisés du service, { champId: valeur }' })
  @IsOptional()
  reponsesChamps?: Record<string, string>;
}
