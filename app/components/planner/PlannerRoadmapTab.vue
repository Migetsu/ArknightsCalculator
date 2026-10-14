<script setup lang="ts">
import { ref, computed } from 'vue'
import rawItemsData from '~/../data/items.json'
import type { GameItem } from '~/../shared/schemas/item'
import {
  resolveI18nString,
  type OperatorDetail,
  type ContentLocale,
} from '~/../shared/schemas/operator'
import type { RoadmapStep } from '~/../shared/utils/planner/types'
import { usePlannerStore } from '~/stores/planner'
import { useDepotStore } from '~/stores/depot'
import rawConstantsData from '~/../data/constants.json'
import type { GameConstants } from '~/../shared/schemas/gameConstants'
import { calculateRoadmap } from '~/../shared/utils/planner/calculateRoadmap'
import type { PlanItem } from '~/schemas/planner'
import AkAvatar from '~/components/ui/AkAvatar.vue'
import AkItemIcon from '~/components/ui/AkItemIcon.vue'
import AkSkillIcon from '~/components/ui/AkSkillIcon.vue'
import AkModuleIcon from '~/components/ui/AkModuleIcon.vue'
import AkButton from '~/components/ui/AkButton.vue'
import AkBadge from '~/components/ui/AkBadge.vue'
import AkSegmented from '~/components/ui/AkSegmented.vue'
import AkEmptyState from '~/components/ui/AkEmptyState.vue'

interface Props {
  planId?: string
  plan?: PlanItem | null
  detail?: OperatorDetail | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'apply-step', step: RoadmapStep): void
}>()

const { t, locale } = useI18n()
const plannerStore = usePlannerStore()
const depotStore = useDepotStore()

const constants = rawConstantsData as unknown as GameConstants

const allItems = rawItemsData as unknown as readonly GameItem[]
const itemsMap = computed(() => {
  const map = new Map<string, GameItem>()
  for (const it of allItems) {
    map.set(it.id, it)
  }
  return map
})

function getItemName(id: string): string {
  const entry = itemsMap.value.get(id)
  if (!entry) return id
  return resolveI18nString(entry.name, locale.value as ContentLocale)
}

function getItemRarity(id: string): 1 | 2 | 3 | 4 | 5 {
  const entry = itemsMap.value.get(id)
  const r = entry?.rarity ?? 1
  return Math.max(1, Math.min(5, r)) as 1 | 2 | 3 | 4 | 5
}

function getItemIconId(id: string): string | undefined {
  return itemsMap.value.get(id)?.iconId
}

// Active plan and operator detail
const activePlan = computed(() => {
  if (props.plan) return props.plan
  const id = props.planId ?? plannerStore.selectedPlanId
  if (!id) return null
  return plannerStore.plans.find((p) => p.id === id) ?? null
})

const activeDetail = computed(() => {
  if (props.detail) return props.detail
  if (!activePlan.value) return null
  return plannerStore.operatorDetailsCache.get(activePlan.value.operatorId) ?? null
})

const roadmap = computed(() => {
  if (activePlan.value && activeDetail.value) {
    const depotSnapshot = {
      items: depotStore.items,
      lmd: depotStore.currencies.lmd,
    }
    return calculateRoadmap(
      activeDetail.value,
      activePlan.value.current,
      activePlan.value.target,
      constants,
      depotSnapshot,
    )
  }
  return null
})

// Step filter
type StepFilter = 'all' | 'ready' | 'missing'
const currentFilter = ref<StepFilter>('all')

const filterOptions = computed(() => [
  { value: 'all', label: t('planner.roadmapFilterAll') },
  { value: 'ready', label: t('planner.roadmapFilterReady') },
  { value: 'missing', label: t('planner.roadmapFilterMissing') },
])

const filteredSteps = computed<RoadmapStep[]>(() => {
  if (!roadmap.value) return []
  const steps = roadmap.value.steps
  if (currentFilter.value === 'ready') {
    return steps.filter((s) => s.readiness.isReady)
  }
  if (currentFilter.value === 'missing') {
    return steps.filter((s) => !s.readiness.isReady)
  }
  return steps
})

const applyingStepId = ref<string | null>(null)

async function handleApplyStep(step: RoadmapStep): Promise<void> {
  emit('apply-step', step)
  if (!activePlan.value) return
  applyingStepId.value = step.id
  try {
    await plannerStore.applyRoadmapStep(activePlan.value.id, step)
  } finally {
    applyingStepId.value = null
  }
}

// Helpers for skill and module visuals
function getSkillIconId(skillId?: string): string | undefined {
  if (!skillId || !activeDetail.value?.skills) return undefined
  const sk = activeDetail.value.skills.find((s) => s.skillId === skillId)
  return sk?.iconId ?? undefined
}

function getModuleType(moduleId?: string): string | undefined {
  if (!moduleId || !activeDetail.value?.modules) return undefined
  const md = activeDetail.value.modules.find((m) => m.id === moduleId)
  return md?.typeName2 || undefined
}

function asRarity(r?: number): 1 | 2 | 3 | 4 | 5 | 6 {
  if (!r || r < 1 || r > 6) return 1
  return r as 1 | 2 | 3 | 4 | 5 | 6
}

function as123(n?: number): 1 | 2 | 3 {
  if (n === 2) return 2
  if (n === 3) return 3
  return 1
}
</script>

<template>
  <div class="planner-roadmap">
    <!-- No Plan Selected -->
    <div v-if="!activePlan || !activeDetail" class="planner-roadmap__empty">
      <AkEmptyState
        :title="t('planner.roadmapTitle')"
        :description="t('planner.roadmapSelectOperator')"
      />
    </div>

    <!-- Roadmap Content -->
    <template v-else>
      <!-- Top Summary Header -->
      <div class="planner-roadmap__header">
        <div class="planner-roadmap__hero">
          <AkAvatar
            :name="resolveI18nString(activeDetail.name, locale as ContentLocale)"
            :rarity="asRarity(activeDetail.rarity)"
            size="md"
          />
          <div class="planner-roadmap__hero-info">
            <h2 class="planner-roadmap__operator-name">
              {{ resolveI18nString(activeDetail.name, locale as ContentLocale) }}
            </h2>
            <p class="planner-roadmap__progress-text">
              {{
                t('planner.roadmapSummary', {
                  ready: roadmap?.readyStepsCount ?? 0,
                  total: roadmap?.totalSteps ?? 0,
                })
              }}
            </p>
          </div>
        </div>

        <!-- Filter Segment -->
        <div class="planner-roadmap__controls">
          <AkSegmented
            v-model="currentFilter"
            :options="filterOptions"
            size="sm"
            aria-label="Filter roadmap steps"
          />
        </div>
      </div>

      <!-- Steps List -->
      <div v-if="filteredSteps.length > 0" class="planner-roadmap__steps">
        <article
          v-for="(step, idx) in filteredSteps"
          :key="step.id"
          class="planner-roadmap__step-card"
          :class="{
            'planner-roadmap__step-card--ready': step.readiness.isReady,
            'planner-roadmap__step-card--next': step.isNextStep,
          }"
        >
          <!-- Step Order & Badge -->
          <div class="planner-roadmap__step-aside">
            <span class="planner-roadmap__step-num">{{ idx + 1 }}</span>
            <div class="planner-roadmap__step-icon">
              <!-- Level step icon -->
              <div v-if="step.kind === 'level'" class="planner-roadmap__icon-box">
                <span class="planner-roadmap__icon-text">LV</span>
              </div>
              <!-- Promotion step icon -->
              <div
                v-else-if="step.kind === 'promotion'"
                class="planner-roadmap__icon-box planner-roadmap__icon-box--promo"
              >
                <span class="planner-roadmap__icon-text">E{{ step.phase }}</span>
              </div>
              <!-- Skill rank icon -->
              <div v-else-if="step.kind === 'skill_rank'" class="planner-roadmap__icon-box">
                <span class="planner-roadmap__icon-text">SK</span>
              </div>
              <!-- Skill mastery icon -->
              <AkSkillIcon
                v-else-if="step.kind === 'skill_mastery'"
                :skill-id="step.skillId"
                :icon-id="getSkillIconId(step.skillId)"
                :name="step.title"
                :mastery="as123(step.masteryLevel)"
                size="sm"
              />
              <!-- Module icon -->
              <AkModuleIcon
                v-else-if="step.kind === 'module_stage'"
                :module-id="step.moduleId"
                :name="step.title"
                :type-code="getModuleType(step.moduleId)"
                :stage="as123(step.moduleStage)"
                size="sm"
              />
            </div>
          </div>

          <!-- Step Details -->
          <div class="planner-roadmap__step-body">
            <div class="planner-roadmap__step-head">
              <h3 class="planner-roadmap__step-title">{{ step.title }}</h3>
              <div class="planner-roadmap__step-badges">
                <AkBadge v-if="step.isNextStep" variant="amber" size="sm">
                  {{ t('planner.roadmapNextStep') }}
                </AkBadge>
                <AkBadge :variant="step.readiness.isReady ? 'green' : 'amber'" size="sm">
                  {{
                    step.readiness.isReady
                      ? t('planner.roadmapReadyBadge')
                      : t('planner.roadmapMissingBadge')
                  }}
                </AkBadge>
              </div>
            </div>
            <p class="planner-roadmap__step-subtitle">{{ step.subtitle }}</p>

            <!-- Resources Needed Grid -->
            <div class="planner-roadmap__costs">
              <!-- EXP -->
              <div v-if="step.costs.exp > 0" class="planner-roadmap__cost-item">
                <div class="planner-roadmap__item-badge planner-roadmap__item-badge--exp">EXP</div>
                <div class="planner-roadmap__cost-info">
                  <span class="planner-roadmap__cost-val">{{
                    step.costs.exp.toLocaleString()
                  }}</span>
                  <span class="planner-roadmap__cost-sub">{{ t('planner.roadmapExp') }}</span>
                </div>
              </div>

              <!-- LMD -->
              <div v-if="step.costs.lmd > 0" class="planner-roadmap__cost-item">
                <div class="planner-roadmap__item-badge planner-roadmap__item-badge--lmd">LMD</div>
                <div class="planner-roadmap__cost-info">
                  <span class="planner-roadmap__cost-val">{{
                    step.costs.lmd.toLocaleString()
                  }}</span>
                  <span class="planner-roadmap__cost-sub">{{ t('planner.roadmapLmd') }}</span>
                </div>
              </div>

              <!-- Materials -->
              <div
                v-for="item in step.costs.items"
                :key="item.id"
                class="planner-roadmap__cost-item"
              >
                <AkItemIcon
                  :icon-id="getItemIconId(item.id)"
                  :rarity="getItemRarity(item.id)"
                  :name="getItemName(item.id)"
                  size="sm"
                />
                <div class="planner-roadmap__cost-info">
                  <span class="planner-roadmap__cost-val">×{{ item.count }}</span>
                  <span
                    class="planner-roadmap__cost-stock"
                    :class="{
                      'planner-roadmap__cost-stock--missing':
                        depotStore.getItemCount(item.id) < item.count,
                    }"
                  >
                    {{ t('planner.have') }}: {{ depotStore.getItemCount(item.id) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Cumulative Cost Indicator -->
            <div class="planner-roadmap__cumulative">
              <span class="planner-roadmap__cumulative-title"
                >{{ t('planner.roadmapCumulative') }}:</span
              >
              <span v-if="step.cumulativeCosts.lmd > 0" class="planner-roadmap__cumulative-val">
                {{ step.cumulativeCosts.lmd.toLocaleString() }} LMD
              </span>
              <span v-if="step.cumulativeCosts.exp > 0" class="planner-roadmap__cumulative-val">
                {{ step.cumulativeCosts.exp.toLocaleString() }} EXP
              </span>
              <span
                v-if="step.cumulativeCosts.items.length > 0"
                class="planner-roadmap__cumulative-val"
              >
                {{ step.cumulativeCosts.items.length }} {{ t('planner.material') }}
              </span>
            </div>
          </div>

          <!-- Step Action Button -->
          <div class="planner-roadmap__step-action">
            <AkButton
              class="planner-roadmap__action-btn"
              :variant="step.readiness.isReady ? 'primary' : 'ghost'"
              size="sm"
              :disabled="applyingStepId === step.id"
              @click="handleApplyStep(step)"
            >
              {{ t('planner.roadmapApplyStep') }}
            </AkButton>
          </div>
        </article>
      </div>

      <!-- No Steps Matching / Complete State -->
      <div v-else class="planner-roadmap__empty">
        <AkEmptyState
          :title="t('planner.roadmapNoSteps')"
          :description="t('planner.roadmapNoStepsDesc')"
        />
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.planner-roadmap {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-width: 0;

  &__empty {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    padding: var(--space-2xl) var(--space-md);
  }

  &__header {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    padding: var(--space-lg) var(--space-xl);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    flex-wrap: wrap;
  }

  &__hero {
    display: flex;
    align-items: center;
    gap: var(--space-md);
  }

  &__hero-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
  }

  &__operator-name {
    margin: 0;
    font-family: var(--font-family-display);
    font-size: var(--font-size-xl);
    font-weight: 800;
    color: var(--color-text-primary);
    line-height: 1.2;
  }

  &__progress-text {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  &__controls {
    display: flex;
    align-items: center;
  }

  &__steps {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  &__step-card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    padding: var(--space-md) var(--space-lg);
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: var(--space-lg);
    transition: border-color var(--transition-fast);

    &--ready {
      border-left: 3px solid var(--color-accent-primary);
    }

    &--next {
      border-color: var(--color-brand-ember, #ff6a3d);
      box-shadow: 0 0 0 1px var(--color-brand-ember, #ff6a3d);
    }

    @media (width <= 768px) {
      grid-template-columns: 1fr;
      gap: var(--space-md);
    }
  }

  &__step-aside {
    display: flex;
    align-items: center;
    gap: var(--space-md);
  }

  &__step-num {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-subtle);
    font-family: var(--font-family-mono);
    font-size: var(--font-size-sm);
    font-weight: 700;
    color: var(--color-text-secondary);
  }

  &__step-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    flex: none;
  }

  &__icon-box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: var(--color-bg-deep);
    border: 1px solid var(--color-border-base);
    color: var(--color-text-primary);
    font-family: var(--font-family-display);
    font-weight: 800;
    font-size: var(--font-size-sm);

    &--promo {
      border-color: var(--color-accent-primary);
      color: var(--color-accent-primary);
    }
  }

  &__icon-text {
    letter-spacing: 0.05em;
  }

  &__step-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    min-width: 0;
  }

  &__step-head {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  &__step-badges {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2xs);
  }

  &__step-title {
    margin: 0;
    font-family: var(--font-family-display);
    font-size: var(--font-size-md);
    font-weight: 700;
    color: var(--color-text-primary);
  }

  &__step-subtitle {
    margin: 0;
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  &__costs {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    flex-wrap: wrap;
    margin-top: var(--space-xs);
  }

  &__cost-item {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    background: var(--color-bg-deep);
    border: 1px solid var(--color-border-subtle);
    padding: var(--space-2xs) var(--space-xs);
  }

  &__item-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-family-display);
    font-size: 10px;
    font-weight: 800;
    width: 28px;
    height: 28px;
    border: 1px solid var(--color-border-base);

    &--exp {
      background: #192b3a;
      border-color: var(--color-tier-3);
      color: var(--color-tier-3);
    }

    &--lmd {
      background: #2b2314;
      border-color: var(--color-tier-5);
      color: var(--color-tier-5);
    }
  }

  &__cost-info {
    display: flex;
    flex-direction: column;
    line-height: 1.15;
  }

  &__cost-val {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-xs);
    font-weight: 700;
    color: var(--color-text-primary);
  }

  &__cost-sub {
    font-size: 9px;
    color: var(--color-text-secondary);
    text-transform: uppercase;
  }

  &__cost-stock {
    font-size: 9px;
    color: var(--color-text-secondary);

    &--missing {
      color: var(--color-accent-primary);
      font-weight: 600;
    }
  }

  &__cumulative {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    flex-wrap: wrap;
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    margin-top: var(--space-2xs);
  }

  &__cumulative-title {
    font-weight: 600;
  }

  &__cumulative-val {
    font-family: var(--font-family-mono);
    color: var(--color-text-primary);
  }

  &__step-action {
    display: flex;
    align-items: center;
    justify-content: flex-end;

    @media (width <= 768px) {
      justify-content: stretch;
    }
  }

  &__action-btn {
    @media (width <= 768px) {
      width: 100%;
    }
  }
}
</style>
