import { z } from 'zod'
import { I18nStringSchema } from './operator'

/**
 * Single key-value item in structured handbook sections (Profile or Physical Exam).
 */
export const HandbookItemSchema = z.object({
  key: z.string(),
  title: I18nStringSchema,
  value: I18nStringSchema,
})

export type HandbookItem = z.infer<typeof HandbookItemSchema>

/**
 * Structured Operator Profile parsed from "Basic Info" / "基础档案".
 */
export const HandbookProfileSchema = z
  .object({
    codeName: I18nStringSchema.optional(),
    gender: I18nStringSchema.optional(),
    combatExperience: I18nStringSchema.optional(),
    placeOfBirth: I18nStringSchema.optional(),
    dateOfBirth: I18nStringSchema.optional(),
    race: I18nStringSchema.optional(),
    height: I18nStringSchema.optional(),
    infectionStatus: I18nStringSchema.optional(),
    // Robot & mechanical profiles
    model: I18nStringSchema.optional(),
    genderAssignment: I18nStringSchema.optional(),
    timeInService: I18nStringSchema.optional(),
    manufacturer: I18nStringSchema.optional(),
    placeOfProduction: I18nStringSchema.optional(),
    dateOfRelease: I18nStringSchema.optional(),
    inspectionReport: I18nStringSchema.optional(),
    // Non-standard metrics
    weight: I18nStringSchema.optional(),
    hornLength: I18nStringSchema.optional(),
    tailLength: I18nStringSchema.optional(),
    // Catch-all for extra tags
    customFields: z.record(z.string(), I18nStringSchema).optional(),
    // Ordered sequence of all parsed profile items
    allFields: z.array(HandbookItemSchema),
  })
  .catchall(I18nStringSchema)

export type HandbookProfile = z.infer<typeof HandbookProfileSchema>

/**
 * Structured Physical Exam / Combat Evaluations parsed from "Physical Exam" / "综合体检测试".
 */
export const HandbookPhysicalExamSchema = z
  .object({
    physicalStrength: I18nStringSchema.optional(),
    mobility: I18nStringSchema.optional(),
    physicalResilience: I18nStringSchema.optional(),
    tacticalAcumen: I18nStringSchema.optional(),
    combatSkill: I18nStringSchema.optional(),
    originiumArtsAssimilation: I18nStringSchema.optional(),
    // Robot performance review
    topSpeed: I18nStringSchema.optional(),
    climb: I18nStringSchema.optional(),
    brake: I18nStringSchema.optional(),
    endurance: I18nStringSchema.optional(),
    structuralIntegrity: I18nStringSchema.optional(),
    passability: I18nStringSchema.optional(),
    // Ordered sequence of all evaluation items
    allFields: z.array(HandbookItemSchema),
  })
  .catchall(I18nStringSchema)

export type HandbookPhysicalExam = z.infer<typeof HandbookPhysicalExamSchema>

/**
 * Narrative archive story (Profile, Clinical Analysis, Archive Files 1-5, Records).
 */
export const HandbookStorySchema = z.object({
  storyTitle: I18nStringSchema,
  text: I18nStringSchema,
  unlockType: z.string().optional(),
  unlockParam: z.string().optional(),
  patchCharId: z.string().optional(),
})

export type HandbookStory = z.infer<typeof HandbookStorySchema>

/**
 * Full operator dossier entry.
 */
export const OperatorHandbookSchema = z.object({
  charId: z.string(),
  infoName: I18nStringSchema,
  profile: HandbookProfileSchema,
  physicalExam: HandbookPhysicalExamSchema,
  stories: z.array(HandbookStorySchema),
})

export type OperatorHandbook = z.infer<typeof OperatorHandbookSchema>

/**
 * Dictionary of all operator dossiers in the game, keyed by charId.
 */
export const HandbookDatasetSchema = z.record(z.string(), OperatorHandbookSchema)

export type HandbookDataset = z.infer<typeof HandbookDatasetSchema>
