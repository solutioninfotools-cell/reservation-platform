import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(8) password: string;
  @ApiProperty({ enum: ['PROFESSIONNEL', 'RECEPTIONNISTE'] })
  @IsIn(['PROFESSIONNEL', 'RECEPTIONNISTE'])
  role: 'PROFESSIONNEL' | 'RECEPTIONNISTE';

  @ApiProperty() @IsString() nom: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() specialite?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() telephone?: string;
}
