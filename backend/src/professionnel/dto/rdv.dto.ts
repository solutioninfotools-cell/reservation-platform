import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsISO8601, IsObject, IsOptional, IsString } from 'class-validator';

/**
 * Création d'un rendez-vous depuis l'agenda du professionnel (CDC II.14).
 *
 * Volontairement dépourvu de `professionnelId` : celui-ci est déduit de la
 * session, afin qu'un professionnel ne puisse pas écrire dans l'agenda d'un
 * confrère.
 */
export class CreateProRdvDto {
  @ApiProperty() @IsString() serviceId: string;
  @ApiProperty({ description: 'Date et heure de début, au format ISO.' }) @IsISO8601() dateDebut: string;

  @ApiProperty() @IsString() nom: string;
  @ApiProperty() @IsString() prenom: string;
  @ApiProperty() @IsString() telephone: string;
  @ApiProperty({ required: false }) @IsOptional() @IsEmail() email?: string;
  @ApiProperty({ required: false, description: 'Date ISO.' }) @IsOptional() @IsString() dateNaissance?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString() remarque?: string;

  @ApiProperty({ required: false, description: 'Réponses aux champs personnalisés : { champId: valeur }.' })
  @IsOptional()
  @IsObject()
  reponsesChamps?: Record<string, string>;
}
