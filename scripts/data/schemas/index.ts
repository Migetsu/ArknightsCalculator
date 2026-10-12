import type { ZodType } from 'zod'
import { RawCharacterTableSchema, type RawCharacterTable } from './character-table.schema'
import { RawSkillTableSchema, type RawSkillTable } from './skill-table.schema'
import { RawItemTableSchema, type RawItemTable } from './item-table.schema'
import { RawUniequipTableSchema, type RawUniequipTable } from './uniequip-table.schema'
import { RawBuildingDataSchema, type RawBuildingData } from './building-data.schema'
import { RawGachaTableSchema, type RawGachaTable } from './gacha-table.schema'
import { RawStageTableSchema, type RawStageTable } from './stage-table.schema'
import { RawHandbookInfoTableSchema, type RawHandbookInfoTable } from './handbook-info-table.schema'
import { RawCharPatchTableSchema, type RawCharPatchTable } from './char-patch-table.schema'

export * from './character-table.schema'
export * from './skill-table.schema'
export * from './item-table.schema'
export * from './uniequip-table.schema'
export * from './building-data.schema'
export * from './gacha-table.schema'
export * from './stage-table.schema'
export * from './handbook-info-table.schema'
export * from './char-patch-table.schema'

export type RawTableMap = {
  'character_table.json': RawCharacterTable
  'skill_table.json': RawSkillTable
  'item_table.json': RawItemTable
  'uniequip_table.json': RawUniequipTable
  'building_data.json': RawBuildingData
  'gacha_table.json': RawGachaTable
  'stage_table.json': RawStageTable
  'handbook_info_table.json': RawHandbookInfoTable
  'char_patch_table.json': RawCharPatchTable
}

export const RAW_TABLE_SCHEMAS: Record<string, ZodType<unknown>> = {
  'character_table.json': RawCharacterTableSchema,
  'skill_table.json': RawSkillTableSchema,
  'item_table.json': RawItemTableSchema,
  'uniequip_table.json': RawUniequipTableSchema,
  'building_data.json': RawBuildingDataSchema,
  'gacha_table.json': RawGachaTableSchema,
  'stage_table.json': RawStageTableSchema,
  'handbook_info_table.json': RawHandbookInfoTableSchema,
  'char_patch_table.json': RawCharPatchTableSchema,
}
