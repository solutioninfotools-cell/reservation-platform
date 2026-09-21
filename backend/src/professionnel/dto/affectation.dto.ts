import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePermissionsDto {
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() peutConsulterAgenda?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() peutGererRdv?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() peutGererPlanning?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() peutGererParametres?: boolean;

  /**
   * Activation de la réceptionniste SUR CET ESPACE uniquement (CDC II.13.1).
   * Le professionnel peut suspendre son accès sans toucher au compte, qui
   * reste valable chez les autres professionnels.
   */
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() actif?: boolean;
}
