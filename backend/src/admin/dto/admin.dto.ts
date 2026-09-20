import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export type StatutCompteAdmin = 'EN_ATTENTE' | 'ACTIF' | 'REFUSE' | 'DESACTIVE';

export class UpdateStatutCompteDto {
  @ApiProperty({ enum: ['EN_ATTENTE', 'ACTIF', 'REFUSE', 'DESACTIVE'] })
  @IsEnum(['EN_ATTENTE', 'ACTIF', 'REFUSE', 'DESACTIVE'] as const)
  statut: StatutCompteAdmin;
}

/** Création d'un compte Professionnel, Réceptionniste ou Administrateur par l'Admin. */
export class CreateCompteDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) password: string;
  @ApiProperty({ enum: ['PROFESSIONNEL', 'RECEPTIONNISTE', 'ADMIN'] })
  @IsEnum(['PROFESSIONNEL', 'RECEPTIONNISTE', 'ADMIN'] as const)
  role: 'PROFESSIONNEL' | 'RECEPTIONNISTE' | 'ADMIN';
  @ApiProperty() @IsString() nom: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() telephone?: string;
  @ApiProperty({ required: false, description: 'Professionnel uniquement' }) @IsOptional() @IsString() specialite?: string;
}

export class ResetPasswordDto {
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) password: string;
}

export class AffectationDto {
  @ApiProperty() @IsString() professionnelId: string;
  @ApiProperty() @IsString() receptionnisteId: string;
}

/** Remplace l'ensemble des affectations d'une réceptionniste (formulaire « Affecter »). */
export class SetAffectationsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  professionnelIds: string[];
}

export class UpdatePermissionsAffectationDto {
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() peutConsulterAgenda?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() peutGererRdv?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() peutGererPlanning?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() peutGererParametres?: boolean;
}

export class UpdateParamsDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() platformName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() slogan?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() logoUrl?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() address?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() phone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsEmail() email?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() domaine?: string;
  @ApiProperty({ required: false, type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  joursOuvrables?: string[];
  @ApiProperty({ required: false }) @IsOptional() @IsString() horairesGeneraux?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() conditions?: string;

  // Présentation publique et règles d'annulation / report (CDC IV)
  @ApiProperty({ required: false }) @IsOptional() @IsString() conditionsReservation?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() heroImageUrl?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() localisationUrl?: string;
  @ApiProperty({ required: false, description: "Délai minimum avant annulation, en heures" })
  @IsOptional() @IsInt() @Min(0) delaiMinAnnulationHeures?: number;
  @ApiProperty({ required: false, description: 'Délai minimum avant modification, en heures' })
  @IsOptional() @IsInt() @Min(0) delaiMinModificationHeures?: number;
  @ApiProperty({ required: false, description: 'Nombre de reports autorisés par rendez-vous' })
  @IsOptional() @IsInt() @Min(0) maxChangementsRdv?: number;
}

export class SetServiceActifDto {
  @ApiProperty() @IsBoolean() actif: boolean;
}

export class AnnulerRdvDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() motif?: string;
}

// ===========================================================================
// Édition des profils (l'Admin corrige une fiche sans passer par le titulaire)
// ===========================================================================
export class UpdateProfessionnelDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MinLength(2) nom?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() specialite?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() telephone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() adresse?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() photoUrl?: string;
}

export class UpdateReceptionnisteDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MinLength(2) nom?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() telephone?: string;
}

export class UpdateEmailDto {
  @ApiProperty() @IsEmail() email: string;
}

// ===========================================================================
// Actions groupées et annonces
// ===========================================================================
export class BulkStatutCompteDto {
  @ApiProperty({ type: [String] })
  @IsArray() @ArrayNotEmpty() @ArrayUnique() @IsString({ each: true })
  userIds: string[];

  @ApiProperty({ enum: ['EN_ATTENTE', 'ACTIF', 'REFUSE', 'DESACTIVE'] })
  @IsEnum(['EN_ATTENTE', 'ACTIF', 'REFUSE', 'DESACTIVE'] as const)
  statut: StatutCompteAdmin;
}

export type CibleAnnonce = 'TOUS' | 'PROFESSIONNELS' | 'RECEPTIONNISTES' | 'SELECTION';

/** Message diffusé par l'Admin (CDC I.13) : notification interne, pas un e-mail. */
export class AnnonceDto {
  @ApiProperty({ enum: ['TOUS', 'PROFESSIONNELS', 'RECEPTIONNISTES', 'SELECTION'] })
  @IsEnum(['TOUS', 'PROFESSIONNELS', 'RECEPTIONNISTES', 'SELECTION'] as const)
  cible: CibleAnnonce;

  @ApiProperty({ minLength: 3 }) @IsString() @MinLength(3) message: string;

  @ApiProperty({ required: false, type: [String], description: 'Requis si cible = SELECTION' })
  @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true })
  userIds?: string[];
}

// ===========================================================================
// Services / rendez-vous / clients
// ===========================================================================
export class SetServiceStatutDto {
  @ApiProperty({ enum: ['DISPONIBLE', 'COMPLET', 'INDISPONIBLE'] })
  @IsEnum(['DISPONIBLE', 'COMPLET', 'INDISPONIBLE'] as const)
  statut: 'DISPONIBLE' | 'COMPLET' | 'INDISPONIBLE';
}

export class DeplacerRdvDto {
  @ApiProperty({ description: 'Nouveau début, au format ISO' }) @IsDateString() dateDebut: string;
}

export class UpdateClientDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MinLength(1) nom?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MinLength(1) prenom?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MinLength(6) telephone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsEmail() email?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() adresse?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() dateNaissance?: string;
}
