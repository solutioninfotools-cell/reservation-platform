import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty() @IsEmail({}, { message: "Le format de l'adresse e-mail est invalide." }) email!: string;
  @ApiProperty() @IsString() @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' }) password!: string;
  @ApiProperty({ enum: ['PROFESSIONNEL', 'RECEPTIONNISTE'] })
  @IsIn(['PROFESSIONNEL', 'RECEPTIONNISTE'])
  role!: 'PROFESSIONNEL' | 'RECEPTIONNISTE';

  @ApiProperty() @IsString() nom!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() specialite?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(/^[0-9]{10}$/, { message: 'Le numéro de téléphone doit contenir exactement 10 chiffres.' })
  telephone?: string;
}