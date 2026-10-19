<script setup lang="ts">
import { computed, ref } from 'vue'
import type { OperatorDetail, OperatorSkill } from '~/../shared/schemas/operator'
import { resolveI18nString } from '~/../shared/schemas/operator'
import { getBaseSkillUpgradeSummary } from '~/../shared/utils/upgradeCosts'
import rawItemsData from '~/../data/items.json'
import type { GameItem } from '~/../shared/schemas/item'
import AkRichText from '~/components/ui/AkRichText.vue'
import AkBadge from '~/components/ui/AkBadge.vue'
import AkButton from '~/components/ui/AkButton.vue'
import AkSkillIcon from '~/components/ui/AkSkillIcon.vue'
import AkItemIcon from '~/components/ui/AkItemIcon.vue'
import AkTranslationBadge from '~/components/ui/AkTranslationBadge.vue'
import AkRangeGrid from '~/components/ui/AkRangeGrid.vue'

interface Props {
  skills: OperatorSkill[]
  allSkillLvlup?: OperatorDetail['allSkillLvlup']
  defaultRangeId?: string
}

const props = withDefaults(defineProps<Props>(), {
  allSkillLvlup: () => [],
  defaultRangeId: undefined,
})

const { t, locale } = useI18n()

const baseSkillSummary = computed(() => getBaseSkillUpgradeSummary(props.allSkillLvlup))

const itemsMap = new Map((rawItemsData as unknown as GameItem[]).map((it) => [it.id, it]))

function getItemName(id: string): string {
  if (id === '4001') return 'LMD'
  const it = itemsMap.get(id)
  if (!it) return id
  return resolveI18nString(it.name, locale.value as 'en' | 'zh') || it.name.en || id
}

function getItemIconId(id: string): string | undefined {
  return itemsMap.get(id)?.iconId
}

function getItemRarity(id: string): 1 | 2 | 3 | 4 | 5 {
  const r = itemsMap.get(id)?.rarity ?? 1
  return Math.max(1, Math.min(5, r)) as 1 | 2 | 3 | 4 | 5
}

// Track chosen level per skill (default: max level/mastery)
const selectedLevels = ref<Record<string, number>>(
  Object.fromEntries(props.skills.map((s) => [s.skillId, Math.max(1, s.levels.length)])),
)

function getSkillName(skill: OperatorSkill, lvlIndex: number): string {
  const lvlData = skill.levels[lvlIndex]
  if (!lvlData) return skill.skillId
  return resolveI18nString(lvlData.name, locale.value as 'en' | 'zh') || lvlData.name.en
}

function getSkillDesc(skill: OperatorSkill, lvlIndex: number): string {
  const lvlData = skill.levels[lvlIndex]
  if (!lvlData) return ''
  return (
    resolveI18nString(lvlData.description, locale.value as 'en' | 'zh') ||
    lvlData.description?.en ||
    ''
  )
}

function getSkillBlackboard(skill: OperatorSkill, lvlIndex: number): Record<string, number> {
  const lvlData = skill.levels[lvlIndex]
  return lvlData?.blackboard ?? {}
}

function getLevelLabel(idx: number): string {
  if (idx <= 7) return `Lv ${idx}`
  return `M${idx - 7}`
}

function getSkillRangeId(skill: OperatorSkill, lvlIndex: number): string | undefined {
  const custom = skill.levels[lvlIndex]?.rangeId
  if (custom && custom.trim()) return custom.trim()
  return props.defaultRangeId
}

function isCustomSkillRange(skill: OperatorSkill, lvlIndex: number): boolean {
  const custom = skill.levels[lvlIndex]?.rangeId
  return Boolean(custom && custom.trim())
}
</script>

<template>
  <div class="ak-operator-skills-panel">
    <div v-if="skills.length === 0" class="ak-operator-skills-panel__empty">
      {{ t('operators.detail.skills.noSkills') }}
    </div>

    <!-- Base Skill Levels (1 -> 7) Section -->
    <section
      v-if="baseSkillSummary.steps.length > 0"
      class="ak-operator-skills-panel__base-section"
    >
      <div class="ak-operator-skills-panel__base-header">
        <div class="ak-operator-skills-panel__base-title-wrap">
          <span class="ak-operator-skills-panel__base-tag">
            {{ t('operators.detail.skills.baseTrainingTag') }}
          </span>
          <h3 class="ak-operator-skills-panel__base-title">
            {{ t('operators.detail.skills.baseTrainingTitle') }}
          </h3>
          <p class="ak-operator-skills-panel__base-desc">
            {{ t('operators.detail.skills.baseTrainingDesc') }}
          </p>
        </div>
      </div>

      <!-- Total Materials Summary Banner -->
      <div
        v-if="baseSkillSummary.totalMaterials.length > 0"
        class="ak-operator-skills-panel__base-totals"
      >
        <span class="ak-operator-skills-panel__base-totals-title">
          {{ t('operators.detail.skills.baseTotalTitle') }}:
        </span>
        <div class="ak-operator-skills-panel__base-totals-items">
          <AkItemIcon
            v-for="mat in baseSkillSummary.totalMaterials"
            :key="mat.id"
            :item-id="mat.id"
            :icon-id="getItemIconId(mat.id)"
            :name="getItemName(mat.id)"
            :tier="getItemRarity(mat.id)"
            :count="mat.count"
            size="sm"
          />
        </div>
      </div>

      <!-- Step-by-Step Level Grid -->
      <div class="ak-operator-skills-panel__base-grid">
        <div
          v-for="step in baseSkillSummary.steps"
          :key="step.toLevel"
          class="ak-operator-skills-panel__base-step"
        >
          <div class="ak-operator-skills-panel__base-step-header">
            <span class="ak-operator-skills-panel__base-step-name">
              {{
                t('operators.detail.skills.levelTransition', {
                  from: step.fromLevel,
                  to: step.toLevel,
                })
              }}
            </span>
            <span class="ak-operator-skills-panel__base-step-req">
              {{
                t('operators.detail.skills.unlockReq', {
                  phase: step.unlockCond.phase,
                  level: step.unlockCond.level,
                })
              }}
            </span>
          </div>

          <div class="ak-operator-skills-panel__base-step-items">
            <AkItemIcon
              v-for="mat in step.materials"
              :key="mat.id"
              :item-id="mat.id"
              :icon-id="getItemIconId(mat.id)"
              :name="getItemName(mat.id)"
              :tier="getItemRarity(mat.id)"
              :count="mat.count"
              size="sm"
            />
          </div>
        </div>
      </div>
    </section>

    <div v-for="skill in skills" :key="skill.skillId" class="ak-operator-skills-panel__skill-card">
      <!-- Skill Header -->
      <div class="ak-operator-skills-panel__header">
        <AkSkillIcon
          :skill-id="skill.iconId || skill.skillId"
          :name="getSkillName(skill, (selectedLevels[skill.skillId] ?? 1) - 1)"
          size="lg"
        />

        <div class="ak-operator-skills-panel__info">
          <h4 class="ak-operator-skills-panel__title">
            {{ getSkillName(skill, (selectedLevels[skill.skillId] ?? 1) - 1) }}
            <AkTranslationBadge
              v-if="
                skill.levels[(selectedLevels[skill.skillId] ?? 1) - 1]?.name?.source ===
                  'machine' ||
                skill.levels[(selectedLevels[skill.skillId] ?? 1) - 1]?.name?.source ===
                  'pending' ||
                skill.levels[(selectedLevels[skill.skillId] ?? 1) - 1]?.name?.stale
              "
              :source="skill.levels[(selectedLevels[skill.skillId] ?? 1) - 1]?.name?.source"
              :stale="skill.levels[(selectedLevels[skill.skillId] ?? 1) - 1]?.name?.stale"
            />
          </h4>
          <div class="ak-operator-skills-panel__badges">
            <AkBadge
              v-if="skill.levels[0]?.spType !== 8 && skill.levels[0]?.spType !== '8'"
              size="sm"
              variant="cyan"
            >
              {{ t('operators.detail.skills.spTypes.' + (skill.levels[0]?.spType ?? 'PASSIVE')) }}
            </AkBadge>
            <AkBadge size="sm" variant="amber">
              {{ skill.levels[(selectedLevels[skill.skillId] ?? 1) - 1]?.skillType ?? 'MANUAL' }}
            </AkBadge>
          </div>
        </div>
      </div>

      <!-- Skill Level Selector (1..7, M1..M3) -->
      <div class="ak-operator-skills-panel__levels-bar">
        <AkButton
          v-for="lvl in skill.levels.length"
          :key="lvl"
          size="sm"
          :variant="
            selectedLevels[skill.skillId] === lvl ? (lvl > 7 ? 'secondary' : 'primary') : 'ghost'
          "
          class="ak-operator-skills-panel__lvl-btn"
          @click="selectedLevels[skill.skillId] = lvl"
        >
          {{ getLevelLabel(lvl) }}
        </AkButton>
      </div>

      <!-- SP & Duration Telemetry -->
      <div class="ak-operator-skills-panel__telemetry">
        <div class="ak-operator-skills-panel__telemetry-item">
          <span class="ak-operator-skills-panel__telemetry-label">
            {{ t('operators.detail.skills.spCost') }}:
          </span>
          <span class="ak-operator-skills-panel__telemetry-val">
            {{ skill.levels[(selectedLevels[skill.skillId] ?? 1) - 1]?.spCost ?? 0 }}
          </span>
        </div>
        <div class="ak-operator-skills-panel__telemetry-item">
          <span class="ak-operator-skills-panel__telemetry-label">
            {{ t('operators.detail.skills.initialSp') }}:
          </span>
          <span class="ak-operator-skills-panel__telemetry-val">
            {{ skill.levels[(selectedLevels[skill.skillId] ?? 1) - 1]?.initSp ?? 0 }}
          </span>
        </div>
        <div
          v-if="skill.levels[(selectedLevels[skill.skillId] ?? 1) - 1]?.duration"
          class="ak-operator-skills-panel__telemetry-item"
        >
          <span class="ak-operator-skills-panel__telemetry-label">
            {{ t('operators.detail.skills.duration') }}:
          </span>
          <span class="ak-operator-skills-panel__telemetry-val">
            {{ skill.levels[(selectedLevels[skill.skillId] ?? 1) - 1]?.duration }}s
          </span>
        </div>
      </div>

      <!-- Skill Attack Range Section -->
      <div
        v-if="getSkillRangeId(skill, (selectedLevels[skill.skillId] ?? 1) - 1)"
        class="ak-operator-skills-panel__range-row"
      >
        <AkRangeGrid
          :range-id="getSkillRangeId(skill, (selectedLevels[skill.skillId] ?? 1) - 1)"
          size="sm"
          :variant="
            isCustomSkillRange(skill, (selectedLevels[skill.skillId] ?? 1) - 1)
              ? 'modified'
              : 'inherited'
          "
        />
      </div>

      <!-- Description using AkRichText -->
      <div class="ak-operator-skills-panel__desc">
        <div
          v-if="
            skill.levels[(selectedLevels[skill.skillId] ?? 1) - 1]?.description?.source ===
              'pending' ||
            skill.levels[(selectedLevels[skill.skillId] ?? 1) - 1]?.description?.source ===
              'machine' ||
            skill.levels[(selectedLevels[skill.skillId] ?? 1) - 1]?.description?.stale
          "
          class="ak-operator-skills-panel__desc-badge"
        >
          <AkTranslationBadge
            :source="skill.levels[(selectedLevels[skill.skillId] ?? 1) - 1]?.description?.source"
            :stale="skill.levels[(selectedLevels[skill.skillId] ?? 1) - 1]?.description?.stale"
          />
        </div>
        <AkRichText
          :text="getSkillDesc(skill, (selectedLevels[skill.skillId] ?? 1) - 1)"
          :blackboard="getSkillBlackboard(skill, (selectedLevels[skill.skillId] ?? 1) - 1)"
        />
      </div>

      <!-- Upgrade Cost Materials (Masteries 8..10 / M1..M3) -->
      <div
        v-if="
          (selectedLevels[skill.skillId] ?? 1) > 7 &&
          skill.masteryCosts?.[(selectedLevels[skill.skillId] ?? 1) - 8]?.levelUpCost?.length
        "
        class="ak-operator-skills-panel__cost-section"
      >
        <span class="ak-operator-skills-panel__cost-title">
          {{ t('operators.detail.skills.materials') }}:
        </span>
        <div class="ak-operator-skills-panel__cost-list">
          <AkItemIcon
            v-for="item in skill.masteryCosts[(selectedLevels[skill.skillId] ?? 1) - 8]!
              .levelUpCost"
            :key="item.id"
            :item-id="item.id"
            :icon-id="getItemIconId(item.id)"
            :name="getItemName(item.id)"
            :tier="getItemRarity(item.id)"
            :count="item.count"
            size="sm"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ak-operator-skills-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);

  &__empty {
    color: var(--color-text-secondary);
    font-family: var(--font-body);
    padding: var(--space-md);
  }

  &__skill-card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-sm);
    padding: var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  &__header {
    display: flex;
    align-items: center;
    gap: var(--space-md);
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__title {
    font-family: var(--font-heading);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    margin: 0;
  }

  &__badges {
    display: flex;
    gap: var(--space-xs);
    flex-wrap: wrap;
  }

  &__levels-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    background: var(--color-bg-base);
    padding: var(--space-xs);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xs);
  }

  &__lvl-btn {
    min-width: 44px;
    font-family: var(--font-mono);
  }

  &__telemetry {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-md);
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
  }

  &__telemetry-item {
    display: flex;
    gap: var(--space-xs);
  }

  &__telemetry-label {
    color: var(--color-text-secondary);
  }

  &__telemetry-val {
    color: var(--color-accent-amber);
    font-weight: var(--font-weight-semibold);
  }

  &__range-row {
    display: flex;
    align-items: flex-start;
  }

  &__desc {
    background: var(--color-bg-base);
    border-left: 3px solid var(--color-accent-primary);
    border-radius: var(--radius-xs);
    padding: var(--space-sm) var(--space-md);
    line-height: var(--line-height-relaxed);
  }

  &__desc-badge {
    margin-bottom: var(--space-xs);
  }

  &__cost-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__cost-title {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  &__cost-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
  }

  // Base Skill Levels (1 -> 7) Section
  &__base-section {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xs);
    padding: var(--space-md) var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  &__base-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--color-border-subtle);
    padding-bottom: var(--space-xs);
  }

  &__base-title-wrap {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
  }

  &__base-tag {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.16em;
    color: var(--color-accent-amber);
    text-transform: uppercase;
  }

  &__base-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-display);
    color: var(--color-text-primary);
    text-transform: uppercase;
  }

  &__base-desc {
    margin: 0;
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  &__base-totals {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    background: var(--color-bg-deep);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xs);
    padding: var(--space-sm) var(--space-md);

    @include mq(sm) {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }

  &__base-totals-title {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent-primary);
    text-transform: uppercase;
    white-space: nowrap;
  }

  &__base-totals-items {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-sm);
  }

  &__base-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-sm);

    @include mq(sm) {
      grid-template-columns: repeat(2, 1fr);
    }

    @include mq(lg) {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  &__base-step {
    background: var(--color-bg-deep);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xs);
    padding: var(--space-sm) var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__base-step-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-xs);
  }

  &__base-step-name {
    font-family: var(--font-display);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  &__base-step-req {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-accent-amber);
    background: rgb(255 157 43 / 10%);
    border: 1px solid var(--color-accent-amber);
    border-radius: var(--radius-xs);
    padding: 1px 6px;
  }

  &__base-step-items {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-xs);
  }
}
</style>
