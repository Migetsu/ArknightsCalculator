import type { OperatorModule } from '../../schemas/operator'

/**
 * Checks whether an operator module is an actionable combat module (X / Y / Δ / Specialized)
 * with upgrade stages 1–3, excluding initial mission badges.
 *
 * Rules:
 * 1. Must NOT be an initial/mission module (type !== 'INITIAL' and id does not contain '_001_').
 * 2. Must have upgrade stages/costs defined.
 */
export function isPlannerModule(mod: OperatorModule): boolean {
  if (mod.type === 'INITIAL' || /_001_/.test(mod.id)) {
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
