import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class InitialSetupDto {
  @ApiProperty({ enum: ['ADMIN', 'PRESTATAIRE'] })
  @IsIn(['ADMIN', 'PRESTATAIRE'])
  modeSupervision: 'ADMIN' | 'PRESTATAIRE';

  @ApiProperty()
  @IsString()
  domaine: string;

  // Compte du premier superviseur (Admin général ou Professionnel-superviseur)
  @ApiProperty() @IsString() email: string;
  @ApiProperty() @IsString() password: string;
  @ApiProperty() @IsString() nom: string;
}
