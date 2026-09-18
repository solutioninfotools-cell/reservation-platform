import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString
} from 'class-validator';


export class CreateRdvDto {

  @ApiProperty()
  @IsString()
  professionnelId!: string;


  @ApiProperty()
  @IsString()
  serviceId!: string;


  @ApiProperty()
  @IsString()
  dateDebut!: string;


  // =========================
  // CLIENT
  // =========================

  @ApiProperty()
  @IsString()
  nom!: string;


  @ApiProperty()
  @IsString()
  prenom!: string;


  @ApiProperty()
  @IsString()
  telephone!: string;


  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;


  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  dateNaissance?: string;


  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  adresse?: string;


  // =========================
  // RENDEZ-VOUS
  // =========================

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  remarque?: string;


  @ApiProperty({
    required: false,
    description:
      'Réponses aux champs personnalisés du service'
  })
  @IsOptional()
  reponsesChamps?: Record<string, string>;

}