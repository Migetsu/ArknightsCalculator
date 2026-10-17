import type { OperatorModule } from '../../schemas/operator'

/**
 * Checks whether an operator module is an actionable combat module (X / Y / Δ)
 * with upgrade stages 1–3, excluding initial mission badges and IS specialized badges.
 *
 * Rules:
 * 1. Must be an ADVANCED combat module (type === 'ADVANCED').
 * 2. Must be a standard combat module branch: typeName2 in ['X', 'Y', 'D', 'Δ'] (or typeIcon ending in -x, -y, -d).
 * 3. Excludes initial mission badges (type === 'INITIAL', typeIcon === 'original') and IS specialized badges (typeName2 'A', 'B' or typeIcon 'isw-*').
 * 4. Must have upgrade stages/costs defined.
 */
export function isPlannerModule(mod: OperatorModule): boolean {
  if (mod.type === 'INITIAL' || mod.icon === 'original') {
    return false
  }

  const hasItemCost = Boolean(mod.itemCost && Object.keys(mod.itemCost).length > 0)
  const hasStages = Boolean(mod.stages && mod.stages.length > 0)
  return hasItemCost || hasStages
}

/**
 * Filter operator modules to only those intended for planning.
 */
export function getPlannerModules(modules?: OperatorModule[]): OperatorModule[] {
  if (!modules || modules.length === 0) return []
  return modules.filter(isPlannerModule)
}
