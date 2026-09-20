import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateDisponibiliteDto {
  @ApiProperty({ description: '0 = lundi ... 6 = dimanche' }) @IsInt() @Min(0) @Max(6) jourSemaine: number;
  @ApiProperty() @IsString() @Matches(HHMM) heureDebut: string;
  @ApiProperty() @IsString() @Matches(HHMM) heureFin: string;
}

/** Modification d'une plage horaire existante (CDC II.7.3 « modifier des créneaux »). */
export class UpdateDisponibiliteDto {
  @ApiProperty({ required: false, description: '0 = lundi ... 6 = dimanche' })
  @IsOptional() @IsInt() @Min(0) @Max(6)
  jourSemaine?: number;

  @ApiProperty({ required: false }) @IsOptional() @IsString() @Matches(HHMM) heureDebut?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @Matches(HHMM) heureFin?: string;
}

export class CreateIndisponibiliteDto {
  @ApiProperty({ enum: ['CRENEAU', 'JOURNEE', 'PERIODE'] })
  @IsIn(['CRENEAU', 'JOURNEE', 'PERIODE'])
  type: 'CRENEAU' | 'JOURNEE' | 'PERIODE';

  // Sans validateur, une chaîne quelconque produisait une « Invalid Date »
  // silencieusement enregistrée en base.
  @ApiProperty({ description: 'Date ISO.' }) @IsISO8601() dateDebut: string;
  @ApiProperty({ description: 'Date ISO.' }) @IsISO8601() dateFin: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() motif?: string;
}
