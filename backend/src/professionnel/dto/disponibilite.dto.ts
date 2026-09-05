import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsString, Matches, Max, Min } from 'class-validator';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateDisponibiliteDto {
  @ApiProperty({ description: '0 = lundi ... 6 = dimanche' }) @IsInt() @Min(0) @Max(6) jourSemaine: number;
  @ApiProperty() @IsString() @Matches(HHMM) heureDebut: string;
  @ApiProperty() @IsString() @Matches(HHMM) heureFin: string;
}

export class CreateIndisponibiliteDto {
  @ApiProperty({ enum: ['CRENEAU', 'JOURNEE', 'PERIODE'] })
  @IsIn(['CRENEAU', 'JOURNEE', 'PERIODE'])
  type: 'CRENEAU' | 'JOURNEE' | 'PERIODE';

  @ApiProperty() dateDebut: string;
  @ApiProperty() dateFin: string;
  @ApiProperty({ required: false }) motif?: string;
}
