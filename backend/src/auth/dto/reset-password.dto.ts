import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty() @IsEmail({}, { message: "Le format de l'adresse e-mail est invalide." }) email!: string;
  @ApiProperty() @IsString() @Length(6, 6) code!: string;
  @ApiProperty() @IsString() @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' }) nouveauMotDePasse!: string;
}