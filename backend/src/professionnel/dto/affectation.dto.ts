import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePermissionsDto {
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() peutConsulterAgenda?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() peutGererRdv?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() peutGererPlanning?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() peutGererParametres?: boolean;
}
