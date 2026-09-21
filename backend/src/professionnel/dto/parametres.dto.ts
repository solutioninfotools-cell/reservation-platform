import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Règles de réservation propres au professionnel (CDC II.15bis).
 * Elles sont appliquées par le moteur de créneaux côté backend : le frontend
 * ne fait que les afficher et les éditer.
 */
export class UpdateParametresDto {
  @ApiProperty({ required: false, description: 'Temps minimum entre deux rendez-vous, en minutes.' })
  @IsOptional() @IsInt() @Min(0) @Max(240) intervalleMinutes?: number;

  @ApiProperty({ required: false, description: 'Délai minimum avant de pouvoir réserver, en heures.' })
  @IsOptional() @IsInt() @Min(0) @Max(720) delaiMinHeures?: number;

  @ApiProperty({ required: false, description: 'Horizon maximum de réservation, en jours.' })
  @IsOptional() @IsInt() @Min(1) @Max(730) delaiMaxJours?: number;

  @ApiProperty({ required: false, description: 'Seuil d’avertissement pour les absences répétées.' })
  @IsOptional() @IsInt() @Min(1) @Max(50) seuilAbsences?: number;

  @ApiProperty({ required: false, description: 'Nombre maximum de rendez-vous par client et par journée.' })
  @IsOptional() @IsInt() @Min(1) @Max(20) maxRdvParClientParJour?: number;
}
