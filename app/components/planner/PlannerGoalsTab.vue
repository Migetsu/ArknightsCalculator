<script setup lang="ts">
import { computed } from 'vue'
import {
  resolveI18nString,
  type OperatorDetail,
  type ContentLocale,
} from '~/../shared/schemas/operator'
import { usePlannerStore } from '~/stores/planner'
import AkAvatar from '~/components/ui/AkAvatar.vue'
import AkSkillIcon from '~/components/ui/AkSkillIcon.vue'
import AkModuleIcon from '~/components/ui/AkModuleIcon.vue'
import AkStepper from '~/components/ui/AkStepper.vue'
import AkButton from '~/components/ui/AkButton.vue'

interface Props {
  planId: string
  detail: OperatorDetail
}

const props = defineProps<Props>()

const { t, locale } = useI18n()
const plannerStore = usePlannerStore()

const plan = computed(() => plannerStore.plans.find((p) => p.id === props.planId) ?? null)

const maxElite = computed(() => Math.max(0, props.detail.phases.length - 1))

const currentMaxLevel = computed(() => {
  if (!plan.value) return 50
  const phase = props.detail.phases[plan.value.current.elite]
  return phase?.maxLevel ?? 50
})

const targetMaxLevel = computed(() => {
  if (!plan.value) return 90
  const phase = props.detail.phases[plan.value.target.elite]
  return phase?.maxLevel ?? 90
})

function updateCurrentElite(val: number): void {
  if (!plan.value) return
  const safeElite = Math.max(0, Math.min(maxElite.value, val))
  const maxLvl = props.detail.phases[safeElite]?.maxLevel ?? 50
  const safeLvl = Math.min(plan.value.current.level, maxLvl)

  // Target elite cannot be lower than current elite
  const targetElite = Math.max(safeElite, plan.value.target.elite)
  const targetMaxLvl = props.detail.phases[targetElite]?.maxLevel ?? 90
  let targetLvl = plan.value.target.level
  if (targetElite === safeElite && targetLvl < safeLvl) {
    targetLvl = safeLvl
  }
  targetLvl = Math.min(targetMaxLvl, targetLvl)

  void plannerStore.updatePlan(plan.value.id, {
    current: {
      ...plan.value.current,
      elite: safeElite,
      level: safeLvl,
    },
    target: {
      ...plan.value.target,
      elite: targetElite,
      level: targetLvl,
    },
  })
}

function updateCurrentLevel(val: number): void {
  if (!plan.value) return
  const safeLvl = Math.max(1, Math.min(currentMaxLevel.value, val))
  let targetLvl = plan.value.target.level
  if (plan.value.target.elite === plan.value.current.elite && targetLvl < safeLvl) {
    targetLvl = safeLvl
  }

  void plannerStore.updatePlan(plan.value.id, {
    current: {
      ...plan.value.current,
      level: safeLvl,
    },
    target: {
      ...plan.value.target,
      level: targetLvl,
    },
  })
}

function updateTargetElite(val: number): void {
  if (!plan.value) return
  const safeElite = Math.max(plan.value.current.elite, Math.min(maxElite.value, val))
  const maxLvl = props.detail.phases[safeElite]?.maxLevel ?? 90
  let safeLvl = Math.min(plan.value.target.level, maxLvl)
  if (safeElite === plan.value.current.elite && safeLvl < plan.value.current.level) {
    safeLvl = plan.value.current.level
  }

  void plannerStore.updatePlan(plan.value.id, {
    target: {
      ...plan.value.target,
      elite: safeElite,
      level: safeLvl,
    },
  })
}

function updateTargetLevel(val: number): void {
  if (!plan.value) return
  const minLvl = plan.value.target.elite === plan.value.current.elite ? plan.value.current.level : 1
  const safeLvl = Math.max(minLvl, Math.min(targetMaxLevel.value, val))

  void plannerStore.updatePlan(plan.value.id, {
    target: {
      ...plan.value.target,
      level: safeLvl,
    },
  })
}

function updateCurrentSkillLevel(val: number): void {
  if (!plan.value) return
  const safe = Math.max(1, Math.min(7, val))
  const targetSkill = Math.max(safe, plan.value.target.skillLevel)

  void plannerStore.updatePlan(plan.value.id, {
    current: {
      ...plan.value.current,
      skillLevel: safe,
    },
    target: {
      ...plan.value.target,
      skillLevel: targetSkill,
    },
  })
}

function updateTargetSkillLevel(val: number): void {
  if (!plan.value) return
  const safe = Math.max(plan.value.current.skillLevel, Math.min(7, val))

  void plannerStore.updatePlan(plan.value.id, {
    target: {
      ...plan.value.target,
      skillLevel: safe,
    },
  })
}

function updateCurrentMastery(skillId: string, val: number): void {
  if (!plan.value) return
  const safe = Math.max(0, Math.min(3, val))
  const currentSkills = { ...plan.value.current.skills, [skillId]: safe }
  const targetSkills = { ...plan.value.target.skills }
  if ((targetSkills[skillId] ?? 0) < safe) {
    targetSkills[skillId] = safe
  }

  void plannerStore.updatePlan(plan.value.id, {
    current: {
      ...plan.value.current,
      skills: currentSkills,
    },
    target: {
      ...plan.value.target,
      skills: targetSkills,
    },
  })
}

function updateTargetMastery(skillId: string, val: number): void {
  if (!plan.value) return
  const cur = plan.value.current.skills[skillId] ?? 0
  const safe = Math.max(cur, Math.min(3, val))
  const targetSkills = { ...plan.value.target.skills, [skillId]: safe }

  void plannerStore.updatePlan(plan.value.id, {
    target: {
      ...plan.value.target,
      skills: targetSkills,
    },
  })
}

function updateCurrentModuleStage(moduleId: string, val: number): void {
  if (!plan.value) return
  const safe = Math.max(0, Math.min(3, val))
  const currentModules = { ...plan.value.current.modules, [moduleId]: safe }
  const targetModules = { ...plan.value.target.modules }
  if ((targetModules[moduleId] ?? 0) < safe) {
    targetModules[moduleId] = safe
  }

  void plannerStore.updatePlan(plan.value.id, {
    current: {
      ...plan.value.current,
      modules: currentModules,
    },
    target: {
      ...plan.value.target,
      modules: targetModules,
    },
  })
}

function updateTargetModuleStage(moduleId: string, val: number): void {
  if (!plan.value) return
  const cur = plan.value.current.modules[moduleId] ?? 0
  const safe = Math.max(cur, Math.min(3, val))
  const targetModules = { ...plan.value.target.modules, [moduleId]: safe }

  void plannerStore.updatePlan(plan.value.id, {
    target: {
      ...plan.value.target,
      modules: targetModules,
    },
  })
}

const heroRarity = computed<1 | 2 | 3 | 4 | 5 | 6>(() => {
  const r = props.detail.rarity
  return (r >= 1 && r <= 6 ? r : 5) as 1 | 2 | 3 | 4 | 5 | 6
})

function getSkillIndex(idx: number): 1 | 2 | 3 {
  const num = idx + 1
  return (num >= 1 && num <= 3 ? num : 1) as 1 | 2 | 3
}
</script>

<template>
  <div v-if="plan" class="planner-goals">
    <!-- Operator Hero Card -->
    <div class="planner-goals__hero">
      <AkAvatar
        :id="detail.id"
        :name="resolveI18nString(detail.name, locale as ContentLocale)"
        :rarity="heroRarity"
        size="84"
      />

      <div class="planner-goals__hero-info">
        <h2 class="planner-goals__hero-name">
          {{ resolveI18nString(detail.name, locale as ContentLocale) }}
        </h2>
        <span class="planner-goals__hero-sub">
          Elite {{ plan.current.elite }} → {{ plan.target.elite }} // Level
          {{ plan.current.level }} → {{ plan.target.level }}
        </span>
      </div>

      <div class="planner-goals__hero-actions">
        <AkButton
          variant="secondary"
          size="sm"
          class="planner-goals__action-btn"
          @click="plannerStore.setPlanNextGoal(plan.id)"
        >
          {{ t('planner.nextGoal') }}
        </AkButton>
        <AkButton
          variant="primary"
          size="sm"
          class="planner-goals__action-btn"
          @click="plannerStore.setPlanTargetMax(plan.id)"
        >
          {{ t('planner.maxTarget') }}
        </AkButton>
      </div>
    </div>

    <!-- Elite & Level Controls Section -->
    <div class="planner-goals__section">
      <h3 class="planner-goals__section-title">
        {{ t('planner.eliteAndLevel') }}
      </h3>

      <div class="planner-goals__controls-grid">
        <!-- Current State -->
        <div class="planner-goals__control-card">
          <span class="planner-goals__card-tag">{{ t('planner.current') }}</span>

          <div class="planner-goals__stepper-row">
            <span class="planner-goals__stepper-label">{{ t('planner.elitePhase') }}</span>
            <AkStepper
              :model-value="plan.current.elite"
              :min="0"
              :max="maxElite"
              @update:model-value="updateCurrentElite"
            />
          </div>

          <div class="planner-goals__stepper-row">
            <span class="planner-goals__stepper-label">{{ t('planner.level') }}</span>
            <AkStepper
              :model-value="plan.current.level"
              :min="1"
              :max="currentMaxLevel"
              @update:model-value="updateCurrentLevel"
            />
          </div>
        </div>

        <!-- Target State -->
        <div class="planner-goals__control-card planner-goals__control-card--target">
          <span class="planner-goals__card-tag">{{ t('planner.target') }}</span>

          <div class="planner-goals__stepper-row">
            <span class="planner-goals__stepper-label">{{ t('planner.elitePhase') }}</span>
            <AkStepper
              :model-value="plan.target.elite"
              :min="plan.current.elite"
              :max="maxElite"
              @update:model-value="updateTargetElite"
            />
          </div>

          <div class="planner-goals__stepper-row">
            <span class="planner-goals__stepper-label">{{ t('planner.level') }}</span>
            <AkStepper
              :model-value="plan.target.level"
              :min="plan.target.elite === plan.current.elite ? plan.current.level : 1"
              :max="targetMaxLevel"
              @update:model-value="updateTargetLevel"
            />
          </div>

          <!-- Slider -->
          <div class="planner-goals__slider-wrap">
            <input
              type="range"
              :min="plan.target.elite === plan.current.elite ? plan.current.level : 1"
              :max="targetMaxLevel"
              :value="plan.target.level"
              class="planner-goals__slider"
              @input="updateTargetLevel(Number(($event.target as HTMLInputElement).value))"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Common Skill Level (1..7) -->
    <div
      v-if="detail.allSkillLvlup && detail.allSkillLvlup.length > 0"
      class="planner-goals__section"
    >
      <h3 class="planner-goals__section-title">{{ t('planner.skillRank') }} (1 - 7)</h3>

      <div class="planner-goals__controls-grid">
        <div class="planner-goals__control-card">
          <span class="planner-goals__card-tag">{{ t('planner.current') }}</span>
          <div class="planner-goals__stepper-row">
            <span class="planner-goals__stepper-label">{{ t('planner.rank') }}</span>
            <AkStepper
              :model-value="plan.current.skillLevel"
              :min="1"
              :max="7"
              @update:model-value="updateCurrentSkillLevel"
            />
          </div>
        </div>

        <div class="planner-goals__control-card planner-goals__control-card--target">
          <span class="planner-goals__card-tag">{{ t('planner.target') }}</span>
          <div class="planner-goals__stepper-row">
            <span class="planner-goals__stepper-label">{{ t('planner.rank') }}</span>
            <AkStepper
              :model-value="plan.target.skillLevel"
              :min="plan.current.skillLevel"
              :max="7"
              @update:model-value="updateTargetSkillLevel"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Skill Masteries -->
    <div v-if="detail.skills && detail.skills.length > 0" class="planner-goals__section">
      <h3 class="planner-goals__section-title">
        {{ t('planner.skillMasteries') }}
      </h3>

      <div class="planner-goals__skills-grid">
        <div
          v-for="(skill, idx) in detail.skills"
          :key="skill.skillId"
          class="planner-goals__skill-card"
        >
          <div class="planner-goals__skill-header">
            <AkSkillIcon
              :skill-id="skill.skillId"
              :icon-id="skill.iconId ?? undefined"
              :name="
                resolveI18nString(skill.levels[0]?.name ?? detail.name, locale as ContentLocale)
              "
              :skill-index="getSkillIndex(idx)"
              :size="48"
            />
            <div class="planner-goals__skill-info">
              <span class="planner-goals__skill-name">
                {{
                  resolveI18nString(skill.levels[0]?.name ?? detail.name, locale as ContentLocale)
                }}
              </span>
              <span class="planner-goals__skill-sub">
                M{{ plan.current.skills[skill.skillId] ?? 0 }} → M{{
                  plan.target.skills[skill.skillId] ?? 0
                }}
              </span>
            </div>
          </div>

          <div class="planner-goals__skill-steppers">
            <div class="planner-goals__stepper-inline">
              <span class="planner-goals__inline-label">{{ t('planner.current') }}</span>
              <AkStepper
                :model-value="plan.current.skills[skill.skillId] ?? 0"
                :min="0"
                :max="3"
                @update:model-value="updateCurrentMastery(skill.skillId, $event)"
              />
            </div>
            <div class="planner-goals__stepper-inline">
              <span class="planner-goals__inline-label">{{ t('planner.target') }}</span>
              <AkStepper
                :model-value="plan.target.skills[skill.skillId] ?? 0"
                :min="plan.current.skills[skill.skillId] ?? 0"
                :max="3"
                @update:model-value="updateTargetMastery(skill.skillId, $event)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Operator Modules -->
    <div v-if="detail.modules && detail.modules.length > 0" class="planner-goals__section">
      <h3 class="planner-goals__section-title">
        {{ t('planner.operatorModules') }}
      </h3>

      <div class="planner-goals__skills-grid">
        <div v-for="mod in detail.modules" :key="mod.id" class="planner-goals__skill-card">
          <div class="planner-goals__skill-header">
            <AkModuleIcon
              :module-id="mod.id"
              :type-code="mod.typeName2"
              :name="resolveI18nString(mod.name, locale as ContentLocale)"
              :size="48"
            />
            <div class="planner-goals__skill-info">
              <span class="planner-goals__skill-name">
                {{ resolveI18nString(mod.name, locale as ContentLocale) }}
              </span>
              <span class="planner-goals__skill-sub">
                Stage {{ plan.current.modules[mod.id] ?? 0 }} → Stage
                {{ plan.target.modules[mod.id] ?? 0 }}
              </span>
            </div>
          </div>

          <div class="planner-goals__skill-steppers">
            <div class="planner-goals__stepper-inline">
              <span class="planner-goals__inline-label">{{ t('planner.current') }}</span>
              <AkStepper
                :model-value="plan.current.modules[mod.id] ?? 0"
                :min="0"
                :max="3"
                @update:model-value="updateCurrentModuleStage(mod.id, $event)"
              />
            </div>
            <div class="planner-goals__stepper-inline">
              <span class="planner-goals__inline-label">{{ t('planner.target') }}</span>
              <AkStepper
                :model-value="plan.target.modules[mod.id] ?? 0"
                :min="plan.current.modules[mod.id] ?? 0"
                :max="3"
                @update:model-value="updateTargetModuleStage(mod.id, $event)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.planner-goals {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-width: 0;

  &__hero {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-lg);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
  }

  &__hero-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    flex: 1;
    min-width: 180px;
  }

  &__hero-name {
    margin: 0;
    font-family: var(--font-heading);
    font-size: var(--font-size-xl);
    font-weight: 800;
    color: var(--color-text-primary);
  }

  &__hero-sub {
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  &__hero-actions {
    display: flex;
    gap: var(--space-sm);
    margin-left: auto;
  }

  &__action-btn {
    white-space: nowrap;
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  &__section-title {
    margin: 0;
    font-family: var(--font-heading);
    font-size: var(--font-size-sm);
    font-weight: 700;
    letter-spacing: var(--letter-spacing-heading);
    color: var(--color-text-primary);
  }

  &__controls-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-md);

    @include mq(md) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  &__control-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    padding: var(--space-md);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);

    &--target {
      border-color: rgb(255 106 61 / 40%);
    }
  }

  &__card-tag {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    letter-spacing: var(--letter-spacing-mono);
    color: var(--color-accent-primary);
    text-transform: uppercase;
  }

  &__stepper-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-sm);
  }

  &__stepper-label {
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  &__slider-wrap {
    margin-top: var(--space-2xs);
  }

  &__slider {
    width: 100%;
    accent-color: var(--color-accent-primary);
  }

  &__skills-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-md);

    @include mq(lg) {
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    }
  }

  &__skill-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    padding: var(--space-md);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
  }

  &__skill-header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  &__skill-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__skill-name {
    font-family: var(--font-heading);
    font-size: var(--font-size-sm);
    font-weight: 700;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__skill-sub {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  &__skill-steppers {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__stepper-inline {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-sm);
  }

  &__inline-label {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }
}
</style>
