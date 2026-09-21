import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export const TYPES_CHAMP = ['TEXTE', 'TEXTE_LONG', 'NOMBRE', 'SELECTION', 'RADIO', 'CHECKBOX', 'SWITCH', 'DATE', 'FICHIER'] as const;
export type TypeChampValue = (typeof TYPES_CHAMP)[number];

/**
 * Condition d'affichage d'un champ personnalisé (CDC II.6) : le champ n'est
 * présenté au client que si les conditions listées sont satisfaites.
 */
export class ConditionChampDto {
  @ApiProperty() @IsString() champId: string;
  @ApiProperty() @IsString() valeur: string;
}

export class CreateChampDto {
  @ApiProperty({ required: false, description: 'Service auquel rattacher le champ ; absent = champ commun au professionnel.' })
  @IsOptional() @IsString() serviceId?: string;

  @ApiProperty() @IsString() label: string;
  @ApiProperty({ enum: TYPES_CHAMP }) @IsIn(TYPES_CHAMP as unknown as string[]) type: TypeChampValue;

  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) options?: string[];
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() obligatoire?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) ordre?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() texteAide?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() valeurParDefaut?: string;

  @ApiProperty({ required: false, type: [ConditionChampDto] }) @IsOptional() @IsArray() conditions?: ConditionChampDto[];
  @ApiProperty({ required: false, enum: ['ET', 'OU'] }) @IsOptional() @IsIn(['ET', 'OU']) conditionLogique?: 'ET' | 'OU';
  @ApiProperty({ required: false, description: "Le champ n'est obligatoire que si ses conditions sont satisfaites." })
  @IsOptional() @IsBoolean() requisSiCondition?: boolean;
}

export class UpdateChampDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() serviceId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() label?: string;
  @ApiProperty({ required: false, enum: TYPES_CHAMP }) @IsOptional() @IsIn(TYPES_CHAMP as unknown as string[]) type?: TypeChampValue;
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) options?: string[];
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() obligatoire?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) ordre?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() texteAide?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() valeurParDefaut?: string;
  @ApiProperty({ required: false, type: [ConditionChampDto] }) @IsOptional() @IsArray() conditions?: ConditionChampDto[];
  @ApiProperty({ required: false, enum: ['ET', 'OU'] }) @IsOptional() @IsIn(['ET', 'OU']) conditionLogique?: 'ET' | 'OU';
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() requisSiCondition?: boolean;
}
