import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty() @IsEmail({}, { message: "Le format de l'adresse e-mail est invalide." }) email!: string;
}