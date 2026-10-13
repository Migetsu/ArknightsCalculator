<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { resolveI18nString } from '~/../shared/schemas/operator'
import { calculateOperatorStats, MAX_LEVEL_BY_RARITY } from '~/../shared/utils/stats/calculateStats'
import AkContainer from '~/components/ui/AkContainer.vue'
import AkTabs, { type TabItem } from '~/components/ui/AkTabs.vue'
import AkBadge from '~/components/ui/AkBadge.vue'
import AkButton from '~/components/ui/AkButton.vue'
import AkEmptyState from '~/components/ui/AkEmptyState.vue'
import AkOperatorPortrait from '~/components/operators/AkOperatorPortrait.vue'
import AkOperatorStatsPanel from '~/components/operators/AkOperatorStatsPanel.vue'
import AkOperatorSkillsPanel from '~/components/operators/AkOperatorSkillsPanel.vue'
import AkOperatorTalentsPanel from '~/components/operators/AkOperatorTalentsPanel.vue'
import AkOperatorModulesPanel from '~/components/operators/AkOperatorModulesPanel.vue'
import AkOperatorInfoPanel from '~/components/operators/AkOperatorInfoPanel.vue'

const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const { t, locale } = useI18n()

const id = computed(() => (route.params.id as string) || '')

// Asynchronous operator detail fetching composable (isomorphic SSR + lazy client chunks)
const { data: operator, status } = await useOperatorDetail(id)

const displayName = computed(() => {
  if (!operator.value) return ''
  return (
    resolveI18nString(operator.value.name, locale.value as 'en' | 'ru' | 'zh') ||
    operator.value.name.en ||
    operator.value.name.zh
  )
})

const operatorCode = computed(() => operator.value?.displayNumber || 'OPS-04')
const operatorSubclass = computed(() => operator.value?.subclass ?? '')
const operatorClass = computed(() => operator.value?.class ?? 'PIONEER')
const operatorRarity = computed(() => (operator.value?.rarity ?? 1) as 1 | 2 | 3 | 4 | 5 | 6)
const isCnOnly = computed(() => {
  const srvs = operator.value?.servers ?? []
  return srvs.includes('cn') && !srvs.includes('global')
})

const maxElitePhase = computed(() => Math.max(0, (operator.value?.phases?.length ?? 1) - 1))

// State initialization helpers to guarantee identical SSR & client values
const getInitialElite = (op: typeof operator.value) => {
  if (!op) return 0
  const maxE = Math.max(0, op.phases.length - 1)
  const qElite = parseInt(route.query.elite as string, 10)
  return !isNaN(qElite) && qElite >= 0 && qElite <= maxE ? qElite : maxE
}

const getInitialLevel = (op: typeof operator.value, elite: number) => {
  if (!op) return 1
  const maxLvl = MAX_LEVEL_BY_RARITY[op.rarity]?.[elite] ?? 50
  const qLevel = parseInt(route.query.level as string, 10)
  return !isNaN(qLevel) && qLevel >= 1 && qLevel <= maxLvl ? qLevel : maxLvl
}

const getInitialTrust = () => {
  const qTrust = parseInt(route.query.trust as string, 10)
  return !isNaN(qTrust) && qTrust >= 0 && qTrust <= 100 ? qTrust : 100
}

const getInitialPot = () => {
  const qPot = parseInt(route.query.pot as string, 10)
  return !isNaN(qPot) && qPot >= 1 && qPot <= 6 ? qPot : 1
}

const getInitialModule = (op: typeof operator.value) => {
  if (!op) return undefined
  const qMod = route.query.mod as string
  const matchingMod = (op.modules ?? []).find((m) => m.id === qMod)
  return matchingMod ? matchingMod.id : undefined
}

const getInitialStage = () => {
  const qStage = parseInt(route.query.stage as string, 10)
  return !isNaN(qStage) && qStage >= 1 && qStage <= 3 ? qStage : 3
}

// URL Query State Synchronization
const activeTab = ref<string>((route.query.tab as string) || 'stats')
const eliteState = ref<number>(getInitialElite(operator.value))
const levelState = ref<number>(getInitialLevel(operator.value, eliteState.value))
const trustState = ref<number>(getInitialTrust())
const potState = ref<number>(getInitialPot())
const selectedModuleId = ref<string | undefined>(getInitialModule(operator.value))
const moduleStage = ref<number>(getInitialStage())

// Watch for changes if operator prop changes dynamically
watch(operator, (op) => {
  if (!op) return
  eliteState.value = getInitialElite(op)
  levelState.value = getInitialLevel(op, eliteState.value)
  trustState.value = getInitialTrust()
  potState.value = getInitialPot()
  selectedModuleId.value = getInitialModule(op)
  moduleStage.value = getInitialStage()
})

// Sync query back to router when state changes on client
watch(
  [activeTab, eliteState, levelState, trustState, potState, selectedModuleId, moduleStage],
  () => {
    if (import.meta.server || !operator.value) return
    const newQuery: Record<string, string> = {}
    if (activeTab.value !== 'stats') newQuery.tab = activeTab.value
    newQuery.elite = eliteState.value.toString()
    newQuery.level = levelState.value.toString()
    if (trustState.value !== 100) newQuery.trust = trustState.value.toString()
    if (potState.value !== 1) newQuery.pot = potState.value.toString()
    if (selectedModuleId.value) newQuery.mod = selectedModuleId.value
    if (selectedModuleId.value && moduleStage.value !== 3) {
      newQuery.stage = moduleStage.value.toString()
    }

    // Compare with current query
    const isSame =
      Object.keys(newQuery).length === Object.keys(route.query).length &&
      Object.keys(newQuery).every((k) => newQuery[k] === route.query[k])

    if (!isSame) {
      router.replace({ query: newQuery })
    }
  },
)

// Reactive key stats for the top banner
const calculatedStats = computed(() => {
  if (!operator.value) return null
  try {
    return calculateOperatorStats(operator.value, {
      elite: eliteState.value as 0 | 1 | 2,
      level: levelState.value,
      trust: trustState.value,
      potential: potState.value,
      module:
        selectedModuleId.value && moduleStage.value > 0
          ? {
              id: selectedModuleId.value,
              stage: moduleStage.value as 1 | 2 | 3,
            }
          : undefined,
    })
  } catch (_err) {
    return null
  }
})

const heroMeta = computed(() => {
  if (!operator.value) return ''
  const faction = operator.value.faction ? t('operators.factions.' + operator.value.faction) : ''
  const parts = [
    `${operatorRarity.value}★`,
    t('operators.classes.' + operatorClass.value),
    operatorSubclass.value,
    faction,
  ].filter(Boolean)
  return parts.join(' / ').toUpperCase()
})

const tabs = computed<TabItem[]>(() => [
  { id: 'stats', label: t('operators.detail.tabs.stats') },
  { id: 'skills', label: t('operators.detail.tabs.skills') },
  { id: 'talents', label: t('operators.detail.tabs.talents') },
  { id: 'modules', label: t('operators.detail.tabs.modules') },
  { id: 'info', label: t('operators.detail.tabs.info') },
])

// SEO & Meta Annotations
useSeoMeta({
  title: () =>
    operator.value
      ? `${displayName.value} | ${t('operators.title')} | ${t('common.appName')}`
      : `${t('operators.detail.notFoundTitle')} | ${t('common.appName')}`,
  description: () =>
    operator.value
      ? `${displayName.value} (${operatorRarity.value}★ ${t('operators.classes.' + operatorClass.value)}) - ${operator.value.itemUsage?.en || t('operators.subtitle')}`
      : t('operators.detail.notFoundDesc', { id: id.value }),
})

// Schema.org Person semantic entity
useSchemaOrg([
  definePerson({
    name: () => displayName.value,
    alternateName: () => operator.value?.name.zh,
    jobTitle: () => `${operatorClass.value} Operator`,
    description: () => operator.value?.itemUsage?.en,
  }),
])
</script>

<template>
  <div class="ak-operator-detail-page operator-detail-page">
    <AkContainer size="lg" class="ak-operator-detail-page__container">
      <!-- Loading State -->
      <div v-if="status === 'pending' && !operator" class="ak-operator-detail-page__loading">
        <div class="ak-operator-detail-page__skeleton-header" />
        <div class="ak-operator-detail-page__skeleton-stats" />
        <div class="ak-operator-detail-page__skeleton-content" />
      </div>

      <!-- Loaded Operator Detail -->
      <div v-else-if="operator" class="ak-operator-detail-page__loaded">
        <!-- CN Exclusive Banner / Alert -->
        <div v-if="isCnOnly" class="ak-operator-detail-page__cn-alert">
          <div class="ak-operator-detail-page__cn-badge-wrap">
            <AkBadge size="sm" variant="amber">
              {{ t('operators.detail.cnExclusive') }}
            </AkBadge>
          </div>
          <p class="ak-operator-detail-page__cn-text">
            {{ t('operators.detail.cnNotice') }}
          </p>
        </div>

        <!-- Ember Editorial Hero Section -->
        <section class="ak-operator-detail-page__hero">
          <div class="ak-operator-detail-page__hero-back">
            <AkButton variant="ghost" size="sm" :to="localePath('/operators')">
              {{ t('operators.detail.backToList') }}
            </AkButton>
          </div>

          <div class="ak-operator-detail-page__hero-body">
            <div class="ak-operator-detail-page__hero-info">
              <span class="ak-operator-detail-page__hero-code ak-page-header__code">
                {{ operatorCode }}
              </span>
              <p class="ak-operator-detail-page__hero-meta">{{ heroMeta }}</p>
              <h1 class="ak-operator-detail-page__hero-name ak-page-header__title">
                {{ displayName }}
              </h1>
            </div>

            <div class="ak-operator-detail-page__hero-portrait">
              <AkOperatorPortrait
                :operator-id="operator!.id"
                :name="displayName"
                :elite="eliteState"
                :max-elite="maxElitePhase"
              />
            </div>
          </div>
        </section>

        <!-- Key Stats Overlapping Section -->
        <section class="ak-operator-detail-page__key-stats">
          <div class="ak-operator-detail-page__key-stat">
            <span class="ak-operator-detail-page__key-stat-label">HP</span>
            <div class="ak-operator-detail-page__key-stat-val">
              {{ calculatedStats?.hp ?? '—' }}
            </div>
          </div>

          <div
            class="ak-operator-detail-page__key-stat ak-operator-detail-page__key-stat--highlight"
          >
            <span class="ak-operator-detail-page__key-stat-label">ATK</span>
            <div class="ak-operator-detail-page__key-stat-val">
              {{ calculatedStats?.atk ?? '—' }}
            </div>
          </div>

          <div class="ak-operator-detail-page__key-stat">
            <span class="ak-operator-detail-page__key-stat-label">DEF</span>
            <div class="ak-operator-detail-page__key-stat-val">
              {{ calculatedStats?.def ?? '—' }}
            </div>
          </div>

          <div class="ak-operator-detail-page__key-stat">
            <span class="ak-operator-detail-page__key-stat-label">RES</span>
            <div class="ak-operator-detail-page__key-stat-val">
              {{ calculatedStats?.res ?? '—' }}
            </div>
          </div>
        </section>

        <!-- Interactive Tabs Section -->
        <div class="ak-operator-detail-page__tabs-wrap">
          <AkTabs v-model="activeTab" :items="tabs" aria-label="Operator Sections">
            <template #default="{ activeTab: currentTab }">
              <!-- Attributes / Stats Tab -->
              <div v-if="currentTab === 'stats'">
                <AkOperatorStatsPanel
                  v-model:elite="eliteState"
                  v-model:level="levelState"
                  v-model:trust="trustState"
                  v-model:potential="potState"
                  v-model:selected-module-id="selectedModuleId"
                  v-model:module-stage="moduleStage"
                  :operator="operator!"
                />
              </div>

              <!-- Skills Tab -->
              <div v-else-if="currentTab === 'skills'">
                <AkOperatorSkillsPanel :skills="operator!.skills ?? []" />
              </div>

              <!-- Talents Tab -->
              <div v-else-if="currentTab === 'talents'">
                <AkOperatorTalentsPanel :talents="operator!.talents ?? []" />
              </div>

              <!-- Modules Tab -->
              <div v-else-if="currentTab === 'modules'">
                <AkOperatorModulesPanel :modules="operator!.modules ?? []" />
              </div>

              <!-- Dossier Info Tab -->
              <div v-else-if="currentTab === 'info'">
                <AkOperatorInfoPanel :operator="operator!" />
              </div>
            </template>
          </AkTabs>
        </div>
      </div>

      <!-- 404 / Operator Not Found State -->
      <template v-else>
        <div class="ak-operator-detail-page__not-found">
          <AkEmptyState
            icon="lucide:user-x"
            :title="t('operators.detail.notFoundTitle')"
            :description="t('operators.detail.notFoundDesc', { id })"
            action-label="Back to Operator Catalog"
            action-variant="secondary"
            @action="navigateTo(localePath('/operators'))"
          />
        </div>
      </template>
    </AkContainer>
  </div>
</template>

<style lang="scss" scoped>
.ak-operator-detail-page {
  padding-top: var(--space-md);
  padding-bottom: var(--space-3xl);

  &__container {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  &__loading {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  &__skeleton-header {
    height: 320px;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-sm);
    animation: pulse 1.5s infinite;
  }

  &__skeleton-stats {
    height: 100px;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-sm);
    animation: pulse 1.5s infinite;
  }

  &__skeleton-content {
    height: 380px;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-sm);
    animation: pulse 1.5s infinite;
  }

  &__loaded {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  &__cn-alert {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    background: rgb(255 157 43 / 10%);
    border: 1px solid var(--color-border-subtle);
    border-left: 4px solid var(--color-accent-amber);
    border-radius: var(--radius-xs);
    padding: var(--space-sm) var(--space-md);
  }

  &__cn-badge-wrap {
    flex-shrink: 0;
  }

  &__cn-text {
    margin: 0;
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    line-height: var(--line-height-normal);
  }

  &__hero {
    position: relative;
    overflow: hidden;
    background: radial-gradient(
      ellipse at 72% 40%,
      rgb(255 106 61 / 45%) 0%,
      rgb(122 42 20 / 28%) 38%,
      #120d0b 78%
    );
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-sm);
    padding: var(--space-lg) var(--space-md);

    @include mq(md) {
      padding: var(--space-xl) var(--space-2xl);
    }
  }

  &__hero-back {
    margin-bottom: var(--space-md);
  }

  &__hero-body {
    display: flex;
    flex-direction: column-reverse;
    align-items: center;
    gap: var(--space-xl);

    @include mq(md) {
      flex-direction: row;
      justify-content: space-between;
      align-items: flex-end;
    }
  }

  &__hero-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    z-index: 2;
  }

  &__hero-code {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    letter-spacing: 0.1em;
    color: var(--color-text-secondary);
  }

  &__hero-meta {
    margin: 0;
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.18em;
    color: var(--color-accent-amber);
    text-transform: uppercase;
  }

  &__hero-name {
    margin: 0;
    font-family: var(--font-heading);
    font-weight: 800;
    font-size: clamp(32px, 6vw, 68px);
    line-height: 1;
    letter-spacing: -0.02em;
    color: var(--color-text-primary);
  }

  &__hero-portrait {
    width: 100%;
    max-width: 280px;
    z-index: 1;

    @include mq(md) {
      max-width: 320px;
    }
  }

  &__key-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-md);
    background: #1b1411;
    border: 1px solid rgb(255 217 168 / 16%);
    border-radius: var(--radius-sm);
    padding: var(--space-md) var(--space-lg);
    box-shadow: var(--shadow-md);

    @include mq(sm) {
      grid-template-columns: repeat(4, 1fr);
      padding: var(--space-lg) var(--space-xl);
      gap: var(--space-lg);
    }

    @include mq(md) {
      margin-top: -36px;
      margin-left: var(--space-lg);
      margin-right: var(--space-lg);
      position: relative;
      z-index: 3;
    }
  }

  &__key-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;

    &--highlight {
      .ak-operator-detail-page__key-stat-val {
        color: var(--color-accent-primary);
      }
    }
  }

  &__key-stat-label {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.14em;
    color: var(--color-text-secondary);
    text-transform: uppercase;
  }

  &__key-stat-val {
    font-family: var(--font-heading);
    font-size: clamp(24px, 3.5vw, 40px);
    font-weight: 800;
    color: var(--color-text-primary);
    line-height: 1.1;
  }

  &__tabs-wrap {
    min-width: 0;
  }

  &__not-found {
    padding: var(--space-3xl) 0;
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.6;
  }

  50% {
    opacity: 0.3;
  }
}
</style>
