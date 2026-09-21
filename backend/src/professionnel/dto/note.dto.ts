import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/**
 * Note interne d'un professionnel sur un client (CDC II.9).
 * Jamais exposée au client : elle ne sort que par l'espace Professionnel.
 */
export class CreateNoteDto {
  @ApiProperty() @IsString() clientId: string;
  @ApiProperty() @IsString() @MinLength(1) texte: string;
}

export class UpdateNoteDto {
  @ApiProperty() @IsString() @MinLength(1) texte: string;
}
