import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length, MinLength } from 'class-validator';

export class VersPrestataireDto {
  @ApiProperty({ description: "userId du professionnel qui devient superviseur" })
  @IsString()
  professionnelUserId!: string;

  @ApiProperty({ description: 'Ressaisie du mot de passe du compte actuel — vérifiée côté backend' })
  @IsString()
  password!: string;
}

export class VersAdminDto {
  // Nom / e-mail : uniquement si aucun compte Admin n'existe encore (sinon le compte existant est réactivé).
  @ApiProperty({ required: false }) @IsOptional() @IsString() nom?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsEmail({}, { message: "Le format de l'adresse e-mail est invalide." }) email?: string;

  // Nouveau mot de passe du compte Admin : facultatif si le compte existe déjà.
  @ApiProperty({ required: false }) @IsOptional() @IsString() motDePasseAdmin?: string;

  @ApiProperty({ description: 'Ressaisie du mot de passe du compte actuel — vérifiée côté backend' })
  @IsString()
  password!: string;
}

export class ReinitialisationTotaleDto {
  @ApiProperty({ description: 'Mot de passe du compte actuel' })
  @IsString()
  password!: string;

  @ApiProperty({ description: 'Doit valoir exactement REINITIALISER' })
  @IsString()
  @Length(1, 40)
  confirmation!: string;
}