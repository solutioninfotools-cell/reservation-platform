import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

/** Les 9 types de champs du CDC II.6, alignés sur l'enum Prisma `TypeChamp`. */
export const TYPES_CHAMP = [
  'TEXTE',
  'TEXTE_LONG',
  'NOMBRE',
  'SELECTION',
  'RADIO',
  'CHECKBOX',
  'SWITCH',
  'DATE',
  'FICHIER',
] as const;

/** Types dont les valeurs sont choisies dans une liste définie par le professionnel. */
export const TYPES_AVEC_OPTIONS = ['SELECTION', 'RADIO', 'CHECKBOX'];

/**
 * Une condition d'affichage : « afficher ce champ si <champId> vaut <valeur> ».
 * Plusieurs conditions sont combinées par `conditionLogique` (ET / OU).
 */
export class ConditionChampDto {
  @ApiProperty({ description: "Identifiant du champ dont dépend l'affichage." })
  @IsString()
  champId: string;

  @ApiProperty({ description: 'Valeur attendue pour que la condition soit vraie.' })
  @IsString()
  valeur: string;
}

export class CreateChampDto {
  @ApiProperty() @IsString() label: string;

  @ApiProperty({ enum: TYPES_CHAMP })
  @IsIn(TYPES_CHAMP as unknown as string[])
  type: (typeof TYPES_CHAMP)[number];

  @ApiProperty({ required: false, description: 'Service auquel le champ est rattaché ; absent = champ global au professionnel.' })
  @IsOptional()
  @IsString()
  serviceId?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() obligatoire?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) ordre?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() valeurParDefaut?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() texteAide?: string;

  @ApiProperty({ required: false, type: [ConditionChampDto], description: "Vide = champ toujours visible." })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionChampDto)
  conditions?: ConditionChampDto[];

  @ApiProperty({ required: false, enum: ['ET', 'OU'], default: 'ET' })
  @IsOptional()
  @IsIn(['ET', 'OU'])
  conditionLogique?: 'ET' | 'OU';

  @ApiProperty({ required: false, description: "Le champ ne devient obligatoire que si ses conditions sont satisfaites." })
  @IsOptional()
  @IsBoolean()
  requisSiCondition?: boolean;
}

/**
 * Modification partielle d'un champ.
 *
 * `PartialType` rend tous les validateurs hérités optionnels. Étendre
 * `CreateChampDto` en redéclarant les propriétés ne suffisait pas : les
 * décorateurs `@IsString()` / `@IsIn()` de la classe parente restaient actifs,
 * et une requête ne portant que les conditions était rejetée en 400.
 */
export class UpdateChampDto extends PartialType(CreateChampDto) {}
