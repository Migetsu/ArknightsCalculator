import { z } from 'zod'

/**
 * Skill state: current and target levels (1-7) and masteries (0-3).
 */
export const SkillTargetStateSchema = z.object({
  skillId: z.string(),
  current: z.number().int().min(1).max(10), // 1-7 (ranks), 8=M1, 9=M2, 10=M3
  target: z.number().int().min(1).max(10),
})

export type SkillTargetState = z.infer<typeof SkillTargetStateSchema>

/**
 * Module state: stage 0 (locked) to stage 3.
 */
export const ModuleTargetStateSchema = z.object({
  moduleId: z.string(),
  current: z.number().int().min(0).max(3),
  target: z.number().int().min(0).max(3),
})

export type ModuleTargetState = z.infer<typeof ModuleTargetStateSchema>

/**
 * General operator state for planning.
 */
export const OperatorStateSchema = z.object({
  elite: z.number().int().min(0).max(2),
  level: z.number().int().min(1),
  /** Common skill rank (1-7) for ranks shared across skills */
  skillLevel: z.number().int().min(1).max(7).default(1),
  /** Skill masteries by skillId, with mastery level 0..3 */
  skills: z.record(z.string(), z.number().int().min(0).max(3)).default({}),
  /** Module stages by moduleId, with stage 0..3 */
  modules: z.record(z.string(), z.number().int().min(0).max(3)).default({}),
})

export type OperatorState = z.infer<typeof OperatorStateSchema>

export const CURRENT_PLANNER_SCHEMA_VERSION = 1

/**
 * Single operator training goal plan.
 */
export const PlanItemSchema = z.object({
  id: z.string(),
  operatorId: z.string(),
  current: OperatorStateSchema,
  target: OperatorStateSchema,
  priority: z.number().int().default(1),
  note: z.string().default(''),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
})

export type PlanItem = z.infer<typeof PlanItemSchema>

/**
 * Root versioned schema for persistent operator planner state.
 */
export const PlannerDataSchema = z.object({
  schemaVersion: z.literal(CURRENT_PLANNER_SCHEMA_VERSION),
  updatedAt: z.string(),
  plans: z.array(PlanItemSchema).default([]),
})

export type PlannerData = z.infer<typeof PlannerDataSchema>

/**
 * Breakdown of item costs by category.
 */
export interface CostCategoryBreakdown {
  elite: Array<{ id: string; count: number }>
  skills: Array<{ id: string; count: number }>
  masteries: Array<{ id: string; count: number }>
  modules: Array<{ id: string; count: number }>
}

/**
 * Complete cost calculated for transitioning from current to target state.
 */
export interface CalculatedCost {
  lmd: number
  exp: number
  items: Array<{ id: string; count: number }>
  breakdown: {
    lmd: {
      levelUp: number
      evolve: number
      skills: number
      modules: number
    }
    exp: number
    items: CostCategoryBreakdown
  }
}

/**
 * Recommendation for battle record / EXP cards usage.
 */
export interface ExpCardPlan {
  /** Map of exp card item ID to count needed */
  cards: Record<string, number>
  /** Total exp provided by the planned cards */
  totalExp: number
  /** Overcapped / wasted EXP beyond the required amount */
  wasteExp: number
}

export type RoadmapStepKind =
  'level' | 'promotion' | 'skill_rank' | 'skill_mastery' | 'module_stage'

export interface RoadmapStepCosts {
  lmd: number
  exp: number
  items: Array<{ id: string; count: number }>
}

export interface RoadmapStepReadiness {
  isReady: boolean
  missingLmd: number
  missingExp: number
  missingItems: Array<{ id: string; count: number }>
  completionPercent: number
}

export interface RoadmapStep {
  id: string
  kind: RoadmapStepKind
  title: string
  subtitle: string
  phase: number
  levelRange?: { from: number; to: number }
  skillId?: string
  masteryLevel?: number
  moduleId?: string
  moduleStage?: number
  costs: RoadmapStepCosts
  cumulativeCosts: RoadmapStepCosts
  isNextStep: boolean
  resultingState: OperatorState
  readiness: RoadmapStepReadiness
}

export interface RoadmapPlan {
  operatorId: string
  steps: RoadmapStep[]
  totalSteps: number
  readyStepsCount: number
  nextStepId?: string
}
