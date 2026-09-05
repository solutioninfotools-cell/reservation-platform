import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class ResetSupervisorDto {
  @ApiProperty({ enum: ['ADMIN', 'PRESTATAIRE'] })
  @IsIn(['ADMIN', 'PRESTATAIRE'])
  nouveauMode: 'ADMIN' | 'PRESTATAIRE';

  @ApiProperty({ description: 'Ressaisie du mot de passe du compte actuel — vérifiée côté backend' })
  @IsString()
  password: string;
}
