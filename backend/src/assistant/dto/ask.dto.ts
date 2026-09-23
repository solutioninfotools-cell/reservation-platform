import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AskDto {
  @ApiProperty({ description: "Question posée en langage naturel." })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  question: string;
}
