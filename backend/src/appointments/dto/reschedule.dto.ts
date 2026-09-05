import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RescheduleDto {
  @ApiProperty() @IsString() dateDebut: string; // ISO
}
