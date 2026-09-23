import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

/** Modification d'une fiche client par le professionnel (CDC II.11.1). */
export class UpdateClientDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() nom?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() prenom?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() telephone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsEmail() email?: string;
  @ApiProperty({ required: false, description: 'Date ISO.' }) @IsOptional() @IsString() dateNaissance?: string;
}

/** Note interne, visible du seul professionnel qui l'a écrite (CDC II.12). */
export class NoteClientDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  texte: string;
}
