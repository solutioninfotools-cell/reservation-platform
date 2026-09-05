import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

const STATUTS = ['RESERVE', 'CLIENT_ARRIVE', 'EN_COURS', 'TERMINE', 'ABSENT', 'ANNULE'] as const;

export class UpdateStatusDto {
  @ApiProperty({ enum: STATUTS }) @IsIn(STATUTS) statut: (typeof STATUTS)[number];
  @ApiProperty({ required: false }) @IsOptional() @IsString() motif?: string;
}
