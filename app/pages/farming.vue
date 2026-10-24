<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useFarmingStore } from '~/stores/farming'
import { useSettingsStore } from '~/stores/settings'
import { usePlannerStore } from '~/stores/planner'
import { useDepotStore } from '~/stores/depot'
import { getModuleById } from '~/config/modules'
import type { ServerRegion } from '~/../shared/schemas/operator'
import { fetchFarmingData } from '~/composables/useFarmingData'
import { asJsonFetcher, fetchJson } from '~/utils/fetchJson'
import AkContainer from '~/components/ui/AkContainer.vue'
import AkPageHeader from '~/components/ui/AkPageHeader.vue'
import AkAlert from '~/components/ui/AkAlert.vue'
import AkBadge from '~/components/ui/AkBadge.vue'
import AkButton from '~/components/ui/AkButton.vue'
import AkEmptyState from '~/components/ui/AkEmptyState.vue'
import AkItemIcon from '~/components/ui/AkItemIcon.vue'
import AkSegmented from '~/components/ui/AkSegmented.vue'
import FarmingDeficitTable from '~/components/farming/FarmingDeficitTable.vue'

const { t } = useI18n()
const localePath = useLocalePath()
const farmingStore = useFarmingStore()
const settingsStore = useSettingsStore()
const plannerStore = usePlannerStore()
const depotStore = useDepotStore()
const moduleConfig = getModuleById('farming')

const { data: farmingData } = await useAsyncData(
  () => `farming-data-${settingsStore.dropDataServer}`,
  () => {
    const fetcher = import.meta.server ? asJsonFetcher(useRequestFetch()) : fetchJson
    return fetchFarmingData(settingsStore.dropDataServer, fetcher)
  },
  {
    watch: [() => settingsStore.dropDataServer],
  },
)

watch(
  farmingData,
  (newData) => {
    if (newData) {
      farmingStore.setData(newData)
    }
  },
  { immediate: true },
)

const depotItemCount = computed(() => Object.values(depotStore.items).filter((c) => c > 0).length)

const breakdownItems = computed(() => {
  return Object.entries(farmingStore.activeDeficit)
    .map(([id, count]) => ({
      id,
      remaining: count,
      have: depotStore.getItemCount(id),
    }))
    .sort((a, b) => b.remaining - a.remaining || a.id.localeCompare(b.id))
})

function getItemRarity(itemId: string): 1 | 2 | 3 | 4 | 5 {
  return farmingStore.getItemRarity(itemId)
}

function getItemIconId(itemId: string): string | undefined {
  return farmingStore.getItemIconId(itemId)
}

function getItemName(itemId: string): string {
  return farmingStore.getItemName(itemId)
}

onMounted(async () => {
  if (plannerStore.status === 'idle') {
    void plannerStore.init()
  }
  if (farmingStore.status === 'idle') {
    await farmingStore.init()
  }
  if (depotStore.status === 'idle') {
    void depotStore.init()
  }
})

const serverOptions = computed(() => [
  { value: 'global', label: t('farming.serverGlobal') },
  { value: 'cn', label: t('farming.serverCn') },
])

const activeServerModel = computed<'global' | 'cn'>({
  get: () => settingsStore.dropDataServer,
  set: (val: ServerRegion) => settingsStore.setDropDataServer(val),
})

const craftingOptions = computed(() => [
  { value: 'crafting', label: t('farming.craftingEnabled') },
  { value: 'direct', label: t('farming.craftingDisabled') },
])

const activeCraftingModel = computed<'crafting' | 'direct'>({
  get: () => (settingsStore.farmingAllowCrafting ? 'crafting' : 'direct'),
  set: (val: 'crafting' | 'direct') => settingsStore.setFarmingAllowCrafting(val === 'crafting'),
})

function formatDropRate(rate?: number, itemId?: string): string {
  if (rate === undefined || rate <= 0) return '0%'
  if (itemId === '4001' || rate >= 100) {
    return Math.round(rate).toLocaleString('en-US')
  }
  return `${Math.round(rate * 1000) / 10}%`
}

const weekDays = [
  { id: 1, key: 'mon' },
  { id: 2, key: 'tue' },
  { id: 3, key: 'wed' },
  { id: 4, key: 'thu' },
  { id: 5, key: 'fri' },
  { id: 6, key: 'sat' },
  { id: 7, key: 'sun' },
] as const

const snapshotDateFormatted = computed(() => {
  const d = farmingStore.activeSnapshot?.fetchedAt
  return d ? d.slice(0, 10) : '—'
})
</script>

<template>
  <div class="farming-page">
    <AkContainer size="lg" class="farming-page__container">
      <AkPageHeader
        :code="moduleConfig?.code ?? 'FRM-07'"
        :tag-label="t('modules.tag')"
        :title="moduleConfig ? t(moduleConfig.nameKey) : 'Farming Efficiency'"
        :subtitle="moduleConfig ? t(moduleConfig.descriptionKey) : ''"
        watermark="FARMING"
        :badge="t('modules.status.ready')"
        badge-variant="green"
      >
        <template #actions>
          <div class="farming-page__server-switch">
            <AkSegmented v-model="activeServerModel" :options="serverOptions" size="sm" />
          </div>
          <AkButton variant="secondary" size="sm" :to="localePath('/')">
            {{ t('common.backToDashboard') }}
          </AkButton>
        </template>
      </AkPageHeader>

      <!-- Alert if snapshot is outdated (> 30 days) -->
      <AkAlert
        v-if="farmingStore.isSnapshotOutdated"
        variant="warning"
        closable
        class="farming-page__alert"
      >
        {{ t('farming.outdatedAlert', { date: snapshotDateFormatted }) }}
      </AkAlert>

      <!-- Loading State -->
      <div v-if="farmingStore.status === 'loading'" class="farming-page__state-box">
        <span class="farming-page__spinner" aria-hidden="true" />
        <p class="farming-page__state-text">{{ t('common.loading') }}</p>
      </div>

      <!-- Error State -->
      <AkAlert
        v-else-if="farmingStore.status === 'error'"
        variant="danger"
        :title="t('modules.error.title')"
      >
        <p>{{ farmingStore.error || t('modules.error.description') }}</p>
        <template #actions>
          <AkButton variant="secondary" size="sm" @click="farmingStore.init()">
            {{ t('common.retry') }}
          </AkButton>
        </template>
      </AkAlert>

      <!-- Main Content Layout -->
      <div v-else class="farming-page__content">
        <!-- Top Subheader meta: Drop source & snapshot -->
        <div class="farming-page__meta-bar">
          <span class="farming-page__meta-source">{{ t('farming.dropDataLabel') }}</span>
          <span class="farming-page__meta-date">
            {{ t('farming.snapshotDate', { date: snapshotDateFormatted }) }}
          </span>
        </div>

        <!-- Empty State (No deficit) -->
        <div v-if="!farmingStore.hasDeficit" class="farming-page__empty-wrap">
          <div class="farming-page__empty-box">
            <AkEmptyState
              :title="
                plannerStore.plans.length === 0
                  ? t('farming.emptyState.noPlansTitle')
                  : t('farming.emptyState.allCoveredTitle')
              "
              :description="
                plannerStore.plans.length === 0
                  ? t('farming.emptyState.noPlansDesc')
                  : t('farming.emptyState.allCoveredDesc')
              "
            >
              <div v-if="depotItemCount > 0" class="farming-page__empty-badge">
                <AkBadge variant="green" size="sm">
                  {{ t('farming.depotBadge', { count: depotItemCount }) }}
                </AkBadge>
              </div>
              <template #action>
                <div class="farming-page__empty-actions">
                  <AkButton variant="primary" size="md" :to="localePath('/planner')">
                    {{ t('farming.emptyState.openPlannerBtn') }}
                  </AkButton>
                  <AkButton variant="secondary" size="md" :to="localePath('/depot')">
                    {{ t('farming.emptyState.openDepotBtn') }}
                  </AkButton>
                </div>
              </template>
            </AkEmptyState>
          </div>

          <!-- Supply Schedule Card (Always accessible even without deficit) -->
          <div class="farming-page__card farming-page__schedule-card">
            <h2 class="farming-page__card-title">{{ t('farming.supplyScheduleTitle') }}</h2>

            <div class="farming-page__day-picker" role="tablist">
              <button
                v-for="d in weekDays"
                :key="d.id"
                type="button"
                role="tab"
                class="farming-page__day-btn"
                :class="{
                  'farming-page__day-btn--active': farmingStore.selectedDay === d.id,
                  'farming-page__day-btn--today': farmingStore.currentServerDay === d.id,
                }"
                :aria-selected="farmingStore.selectedDay === d.id"
                @click="farmingStore.setSelectedDay(d.id)"
              >
                {{ t(`farming.days.${d.key}`) }}
              </button>
            </div>

            <div class="farming-page__schedule-list">
              <div
                v-for="grp in farmingStore.openSupplyGroups"
                :key="grp.zoneId"
                class="farming-page__schedule-item"
              >
                <span class="farming-page__schedule-badge">{{ grp.codePrefix }}</span>
                <div class="farming-page__schedule-info">
                  <b class="farming-page__schedule-name">{{ grp.rewardDescription }}</b>
                  <span class="farming-page__schedule-stages">
                    {{
                      t('farming.openStages', {
                        stages: grp.stages.map((s) => s.code).join(', '),
                      })
                    }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Active Farming Grid (With deficit) -->
        <div v-else class="farming-page__grid">
          <!-- Left Column: Best Stages List -->
          <div class="farming-page__card farming-page__stages-card">
            <div class="farming-page__card-header">
              <h2 class="farming-page__card-title">{{ t('farming.bestStagesTitle') }}</h2>
              <div class="farming-page__crafting-switch">
                <AkSegmented
                  v-model="activeCraftingModel"
                  :options="craftingOptions"
                  size="sm"
                  class="farming-page__crafting-segmented"
                />
              </div>
            </div>

            <div class="farming-page__stage-list">
              <div
                v-for="plan in farmingStore.optimizationResult.stages"
                :key="plan.stageId"
                class="farming-page__stage-row"
              >
                <div class="farming-page__stage-code">
                  {{ plan.code }}
                </div>

                <div class="farming-page__stage-drops">
                  <div
                    v-for="item in plan.contributions"
                    :key="item.itemId"
                    class="farming-page__item-badge"
                    :title="`${getItemName(item.itemId)}: ~${item.expectedQuantity.toLocaleString('en-US')} (${formatDropRate(item.dropRate, item.itemId)}/run)`"
                  >
                    <AkItemIcon
                      :item-id="item.itemId"
                      :icon-id="getItemIconId(item.itemId)"
                      :name="getItemName(item.itemId)"
                      :tier="getItemRarity(item.itemId)"
                      :size="40"
                    />
                    <div class="farming-page__item-meta">
                      <span class="farming-page__item-qty"
                        >x{{ item.expectedQuantity.toLocaleString('en-US') }}</span
                      >
                      <span v-if="item.dropRate !== undefined" class="farming-page__item-rate">
                        {{
                          t('farming.dropRatePerRun', {
                            rate: formatDropRate(item.dropRate, item.itemId),
                          })
                        }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="farming-page__stage-runs">
                  {{ t('farming.runsLeft', { count: plan.runs }) }}
                </div>

                <div class="farming-page__stage-sanity">
                  {{ t('farming.sanity', { count: plan.sanity }) }}
                </div>
              </div>
            </div>

            <!-- Notice for uncovered items (if any) -->
            <div
              v-if="farmingStore.optimizationResult.uncoveredItems.length > 0"
              class="farming-page__uncovered-box"
            >
              <b class="farming-page__uncovered-title">{{ t('farming.uncoveredTitle') }}</b>
              <div class="farming-page__uncovered-list">
                <div
                  v-for="u in farmingStore.optimizationResult.uncoveredItems"
                  :key="u.itemId"
                  class="farming-page__uncovered-tag"
                >
                  <AkItemIcon
                    :item-id="u.itemId"
                    :icon-id="getItemIconId(u.itemId)"
                    :name="getItemName(u.itemId)"
                    :tier="getItemRarity(u.itemId)"
                    :size="36"
                  />
                  <span class="farming-page__uncovered-name">
                    {{ getItemName(u.itemId) }} (x{{ u.remainingQuantity }})
                  </span>
                </div>
              </div>
              <p class="farming-page__uncovered-desc">{{ t('farming.uncoveredDesc') }}</p>
            </div>
          </div>

          <!-- Right Column: Total Cost & Supply Schedule -->
          <div class="farming-page__side-col">
            <!-- Total Cost Card -->
            <div class="farming-page__card farming-page__cost-card">
              <h2 class="farming-page__card-title">{{ t('farming.totalCostTitle') }}</h2>
              <div class="farming-page__cost-val">
                {{ farmingStore.optimizationResult.totalSanity.toLocaleString() }}
                <span class="farming-page__cost-unit">AP</span>
                <AkBadge v-if="depotItemCount > 0" variant="green" size="sm">
                  {{ t('farming.depotBadge', { count: depotItemCount }) }}
                </AkBadge>
              </div>
              <p class="farming-page__cost-sub">
                {{
                  t('farming.naturalRegenEstimate', {
                    days: farmingStore.optimizationResult.naturalRegenDays,
                    op: farmingStore.optimizationResult.originitePrimeCost,
                  })
                }}
              </p>
              <p class="farming-page__cost-disclaimer">
                {{
                  t('farming.estimateDisclaimer', {
                    maxSanity: settingsStore.farmingMaxSanity,
                    regenMinutes: settingsStore.farmingRegenMinutes,
                  })
                }}
              </p>
            </div>

            <!-- Material Breakdown Card -->
            <div
              v-if="breakdownItems.length > 0"
              class="farming-page__card farming-page__breakdown-card"
            >
              <h2 class="farming-page__card-title">{{ t('farming.breakdownTitle') }}</h2>
              <FarmingDeficitTable :items="breakdownItems" />
            </div>

            <!-- Supply Schedule Card -->
            <div class="farming-page__card farming-page__schedule-card">
              <h2 class="farming-page__card-title">{{ t('farming.supplyScheduleTitle') }}</h2>

              <div class="farming-page__day-picker" role="tablist">
                <button
                  v-for="d in weekDays"
                  :key="d.id"
                  type="button"
                  role="tab"
                  class="farming-page__day-btn"
                  :class="{
                    'farming-page__day-btn--active': farmingStore.selectedDay === d.id,
                    'farming-page__day-btn--today': farmingStore.currentServerDay === d.id,
                  }"
                  :aria-selected="farmingStore.selectedDay === d.id"
                  @click="farmingStore.setSelectedDay(d.id)"
                >
                  {{ t(`farming.days.${d.key}`) }}
                </button>
              </div>

              <div class="farming-page__schedule-list">
                <div
                  v-for="grp in farmingStore.openSupplyGroups"
                  :key="grp.zoneId"
                  class="farming-page__schedule-item"
                >
                  <span class="farming-page__schedule-badge">{{ grp.codePrefix }}</span>
                  <div class="farming-page__schedule-info">
                    <b class="farming-page__schedule-name">{{ grp.rewardDescription }}</b>
                    <span class="farming-page__schedule-stages">
                      {{
                        t('farming.openStages', {
                          stages: grp.stages.map((s) => s.code).join(', '),
                        })
                      }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer / Attribution -->
        <footer class="farming-page__footer">
          <p class="farming-page__attribution">
            {{ t('farming.attribution') }}
            <a
              href="https://penguin-stats.io/"
              target="_blank"
              rel="noopener noreferrer"
              class="farming-page__footer-link"
            >
              penguin-stats.io ↗
            </a>
          </p>
        </footer>
      </div>
    </AkContainer>
  </div>
</template>

<style lang="scss" scoped>
.farming-page {
  padding-top: var(--space-lg);
  padding-bottom: var(--space-2xl);
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;

  @include mq(md) {
    padding-top: var(--space-xl);
  }

  &__container {
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
    min-width: 0;
  }

  &__server-switch {
    display: flex;
    align-items: center;
  }

  &__alert {
    margin-bottom: var(--space-sm);
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    min-width: 0;
  }

  &__meta-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: var(--space-xs);
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  &__meta-source {
    letter-spacing: var(--letter-spacing-mono);
    text-transform: uppercase;
  }

  &__meta-date {
    font-family: var(--font-mono);
  }

  &__empty-wrap {
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
    min-width: 0;
  }

  &__empty-box {
    padding: var(--space-2xl) var(--space-md);
    background: linear-gradient(135deg, var(--color-bg-surface) 0%, var(--color-bg-card) 100%);
    border: 1px solid var(--color-border-bold);
    display: flex;
    justify-content: center;
    align-items: center;
    min-width: 0;
  }

  &__empty-actions {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex-wrap: wrap;
    justify-content: center;
  }

  &__empty-badge {
    margin-top: var(--space-xs);
    display: flex;
    justify-content: center;
  }

  &__grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    min-width: 0;

    @include mq(lg) {
      display: grid;
      grid-template-columns: 3fr 2fr;
      align-items: start;
      gap: var(--space-xl);
    }
  }

  &__stages-card {
    min-width: 0;

    @media (width <= 768px) {
      order: 2;
    }
  }

  &__cost-card {
    @media (width <= 768px) {
      order: 1;
    }
  }

  &__breakdown-card {
    @media (width <= 768px) {
      order: 3;
    }
  }

  &__schedule-card {
    @media (width <= 768px) {
      order: 4;
    }
  }

  &__side-col {
    display: contents;

    @include mq(md) {
      display: flex;
      flex-direction: column;
      gap: var(--space-lg);
      min-width: 0;
    }
  }

  &__card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    padding: var(--space-lg);
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__card-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    padding-bottom: var(--space-md);
    border-bottom: 1px solid var(--color-border-subtle);
    margin-bottom: var(--space-sm);
  }

  &__crafting-switch {
    display: flex;
    align-items: center;

    @media (width <= 480px) {
      width: 100%;
      min-width: 0;
    }
  }

  &__crafting-segmented {
    @media (width <= 480px) {
      display: flex;
      width: 100%;
    }
  }

  &__card-title {
    margin: 0;
    font-family: var(--font-headline);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-wide);
    color: var(--color-text-primary);
  }

  &__stage-list {
    display: flex;
    flex-direction: column;
  }

  &__stage-row {
    display: grid;
    grid-template-columns: 80px 1fr;
    gap: var(--space-sm);
    align-items: center;
    padding: var(--space-md) 0;
    border-bottom: 1px solid var(--color-border-subtle);

    @include mq(sm) {
      grid-template-columns: 90px 1fr 100px 90px;
      gap: var(--space-md);
    }

    &:last-child {
      border-bottom: none;
    }
  }

  &__stage-code {
    font-family: var(--font-headline);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-extrabold);
    color: var(--color-text-primary);
    white-space: nowrap;
  }

  &__stage-drops {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    flex-wrap: wrap;
    min-width: 0;
  }

  &__item-badge {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    background: var(--color-bg-card);
    padding: 2px 6px 2px 2px;
    border: 1px solid var(--color-border-subtle);
  }

  &__item-meta {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  &__item-qty {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    line-height: 1.1;
  }

  &__item-rate {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-muted);
    line-height: 1.1;
  }

  &__stage-runs {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    white-space: nowrap;
  }

  &__stage-sanity {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-accent-amber);
    white-space: nowrap;
    text-align: right;
  }

  &__cost-card {
    gap: var(--space-sm);

    @media (width <= 768px) {
      order: 1;
    }
  }

  &__breakdown-card {
    gap: var(--space-sm);

    @media (width <= 768px) {
      order: 2;
    }
  }

  &__cost-val {
    display: flex;
    align-items: baseline;
    gap: var(--space-xs);
    flex-wrap: wrap;
    font-family: var(--font-headline);
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-extrabold);
    color: var(--color-accent-amber);
    line-height: 1.1;
    margin-top: var(--space-2xs);
  }

  &__cost-unit {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-secondary);
    margin-left: var(--space-2xs);
  }

  &__cost-sub {
    margin: 0;
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    line-height: 1.5;
  }

  &__cost-disclaimer {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-muted);
  }

  &__schedule-card {
    gap: var(--space-md);

    @media (width <= 768px) {
      order: 3;
    }
  }

  &__day-picker {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  &__day-btn {
    flex: 1;
    min-width: 40px;
    padding: 8px 0;
    text-align: center;
    background: var(--color-bg-card);
    border: 1px solid var(--color-border-subtle);
    color: var(--color-text-secondary);
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition:
      background var(--transition-fast),
      color var(--transition-fast),
      border-color var(--transition-fast);

    &:hover:not(&--active) {
      color: var(--color-text-primary);
      border-color: var(--color-border-bold);
    }

    &--active {
      background: var(--color-accent-primary);
      color: var(--color-text-inverse);
      border-color: var(--color-accent-primary);
    }

    &--today:not(&--active) {
      border-color: var(--color-accent-primary);
      color: var(--color-accent-primary);
    }
  }

  &__schedule-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__schedule-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-xs) var(--space-sm);
    background: var(--color-bg-card);
    border: 1px solid var(--color-border-subtle);
  }

  &__schedule-badge {
    flex-shrink: 0;
    padding: 2px 8px;
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent-primary);
    background: rgb(255 106 61 / 12%);
    border: 1px solid rgb(255 106 61 / 30%);
  }

  &__schedule-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__schedule-name {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    color: var(--color-text-primary);
  }

  &__schedule-stages {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-muted);
  }

  &__uncovered-box {
    margin-top: var(--space-md);
    padding: var(--space-md);
    background: var(--color-bg-card);
    border: 1px solid var(--color-border-subtle);
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__uncovered-title {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    color: var(--color-accent-amber);
    text-transform: uppercase;
  }

  &__uncovered-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2xs);
  }

  &__uncovered-tag {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    padding: 2px 6px 2px 2px;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    color: var(--color-text-secondary);
  }

  &__uncovered-name {
    white-space: nowrap;
  }

  &__uncovered-desc {
    margin: 0;
    font-family: var(--font-body);
    font-size: var(--font-size-2xs);
    color: var(--color-text-muted);
  }

  &__footer {
    display: flex;
    justify-content: center;
    padding-top: var(--space-lg);
    border-top: 1px solid var(--color-border-subtle);
  }

  &__attribution {
    margin: 0;
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-align: center;
  }

  &__footer-link {
    color: var(--color-accent-primary);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  &__state-box {
    padding: var(--space-2xl) var(--space-md);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    background: linear-gradient(135deg, var(--color-bg-surface) 0%, var(--color-bg-card) 100%);
    border: 1px solid var(--color-border-bold);
  }

  &__spinner {
    width: 2rem;
    height: 2rem;
    border: 2px solid var(--color-border-subtle);
    border-top-color: var(--color-accent-primary);
    border-radius: var(--radius-full);
    box-shadow: 0 0 10px var(--color-accent-primary-glow);
    animation: farming-spin 0.8s linear infinite;
  }

  &__state-text {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    letter-spacing: var(--letter-spacing-mono);
    color: var(--color-text-secondary);
  }
}

@keyframes farming-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
