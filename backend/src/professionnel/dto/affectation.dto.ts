import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

/** Autorisations déléguées par le professionnel à sa réceptionniste (CDC II.13.2). */
export class UpdatePermissionsDto {
  @ApiProperty({ required: false, description: "Consulter l'agenda et les clients." })
  @IsOptional() @IsBoolean() peutConsulterAgenda?: boolean;

  @ApiProperty({ required: false, description: 'Gérer les rendez-vous (créer, déplacer, changer le statut, annuler).' })
  @IsOptional() @IsBoolean() peutGererRdv?: boolean;

  @ApiProperty({ required: false, description: 'Gérer le planning détaillé (créneaux, blocages).' })
  @IsOptional() @IsBoolean() peutGererPlanning?: boolean;

  @ApiProperty({ required: false, description: 'Gérer les paramètres de réservation.' })
  @IsOptional() @IsBoolean() peutGererParametres?: boolean;
}

/** Activation/désactivation d'une réceptionniste sur cet espace (CDC II.13.1). */
export class SetAffectationActiveDto {
  @ApiProperty() @IsBoolean() actif: boolean;
}
