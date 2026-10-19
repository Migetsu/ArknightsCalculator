<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { resolveI18nString } from '~/../shared/schemas/operator'
import { calculateOperatorStats, MAX_LEVEL_BY_RARITY } from '~/../shared/utils/stats/calculateStats'
import AkContainer from '~/components/ui/AkContainer.vue'
import AkTabs, { type TabItem } from '~/components/ui/AkTabs.vue'
import AkEmptyState from '~/components/ui/AkEmptyState.vue'
import AkOperatorHero from '~/components/operators/AkOperatorHero.vue'
import AkArtViewer from '~/components/operators/AkArtViewer.vue'
import AkOperatorStatsPanel from '~/components/operators/AkOperatorStatsPanel.vue'
import AkOperatorSkillsPanel from '~/components/operators/AkOperatorSkillsPanel.vue'
import AkOperatorTalentsPanel from '~/components/operators/AkOperatorTalentsPanel.vue'
import AkOperatorModulesPanel from '~/components/operators/AkOperatorModulesPanel.vue'
import AkOperatorInfoPanel from '~/components/operators/AkOperatorInfoPanel.vue'
import AkOperatorSkinsPanel from '~/components/operators/AkOperatorSkinsPanel.vue'
import { useOperatorSkins } from '~/composables/useOperatorSkins'
import { LOW_RARITY_OPERATOR_IDS } from '~/../shared/utils/resolveAsset'

const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const { t, locale } = useI18n()

const id = computed(() => (route.params.id as string) || '')

// Asynchronous operator detail fetching composable (isomorphic SSR + lazy client chunks)
const { data: operator, status } = await useOperatorDetail(id)
const { data: skins } = await useOperatorSkins(id)

const displayName = computed(() => {
  if (!operator.value) return ''
  return (
    resolveI18nString(operator.value.name, locale.value as 'en' | 'zh') ||
    operator.value.name.en ||
    operator.value.name.zh
  )
})

const operatorCode = computed(() => operator.value?.displayNumber || 'OPS-04')
const operatorSubclass = computed(() => operator.value?.subclass ?? '')
const operatorClass = computed(() => operator.value?.class ?? 'PIONEER')
const operatorRarity = computed(() => (operator.value?.rarity ?? 1) as 1 | 2 | 3 | 4 | 5 | 6)

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

const getInitialArt = (op: typeof operator.value): string => {
  if (!op) return 'e2'
  const hasE2 = op.rarity >= 4 && !LOW_RARITY_OPERATOR_IDS.has(op.id)
  const qArt = route.query.art as string
  if (qArt) return qArt
  if (!hasE2) return 'e0'
  // Default to E2 if elite >= 2, else E0
  const initialElite = getInitialElite(op)
  return initialElite >= 2 ? 'e2' : 'e0'
}

// URL Query State Synchronization
const activeTab = ref<string>((route.query.tab as string) || 'stats')
const eliteState = ref<number>(getInitialElite(operator.value))
const levelState = ref<number>(getInitialLevel(operator.value, eliteState.value))
const trustState = ref<number>(getInitialTrust())
const potState = ref<number>(getInitialPot())
const selectedModuleId = ref<string | undefined>(getInitialModule(operator.value))
const moduleStage = ref<number>(getInitialStage())
const artState = ref<string>(getInitialArt(operator.value))
const userSelectedArt = ref<boolean>(Boolean(route.query.art))
const isViewerOpen = ref(false)

function handleArtChange(val: string) {
  userSelectedArt.value = true
  artState.value = val
}

function handleInspectSkin(skinId: string) {
  artState.value = skinId
  userSelectedArt.value = true
  isViewerOpen.value = true
}

// Sync art with elite level when user hasn't overridden art manually
watch(eliteState, (newElite) => {
  if (!operator.value) return
  const hasE2 = operator.value.rarity >= 4 && !LOW_RARITY_OPERATOR_IDS.has(operator.value.id)
  if (!hasE2) return
  if (!userSelectedArt.value) {
    artState.value = newElite >= 2 ? 'e2' : 'e0'
  }
})

// Watch for changes if operator prop changes dynamically
watch(operator, (op) => {
  if (!op) return
  eliteState.value = getInitialElite(op)
  levelState.value = getInitialLevel(op, eliteState.value)
  trustState.value = getInitialTrust()
  potState.value = getInitialPot()
  selectedModuleId.value = getInitialModule(op)
  moduleStage.value = getInitialStage()
  artState.value = getInitialArt(op)
  userSelectedArt.value = Boolean(route.query.art)
})

// Sync query back to router when state changes on client
watch(
  [
    activeTab,
    eliteState,
    levelState,
    trustState,
    potState,
    selectedModuleId,
    moduleStage,
    artState,
  ],
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
    const hasE2 = operator.value.rarity >= 4 && !LOW_RARITY_OPERATOR_IDS.has(operator.value.id)
    if (hasE2 && userSelectedArt.value) {
      newQuery.art = artState.value
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
  { id: 'skins', label: t('operators.detail.tabs.skins') },
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
    <!-- Loading State -->
    <AkContainer
      v-if="status === 'pending' && !operator"
      size="lg"
      class="ak-operator-detail-page__container"
    >
      <div class="ak-operator-detail-page__loading">
        <div class="ak-operator-detail-page__skeleton-header" />
        <div class="ak-operator-detail-page__skeleton-stats" />
        <div class="ak-operator-detail-page__skeleton-content" />
      </div>
    </AkContainer>

    <!-- Loaded Operator Detail -->
    <div v-else-if="operator" class="ak-operator-detail-page__loaded">
      <!-- Full-bleed Hero and Key Stats Bar -->
      <AkOperatorHero
        :model-value-art="artState"
        :operator="operator!"
        :display-name="displayName"
        :operator-code="operatorCode"
        :hero-meta="heroMeta"
        :stats="calculatedStats"
        @update:model-value-art="handleArtChange"
        @open-viewer="isViewerOpen = true"
      />

      <!-- Main Content Area with Margins and Underline Tabs -->
      <div class="ak-operator-detail-page__main-content">
        <!-- Interactive Tabs Section -->
        <div class="ak-operator-detail-page__tabs-wrap">
          <AkTabs
            v-model="activeTab"
            :items="tabs"
            variant="underline"
            aria-label="Operator Sections"
          >
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

              <!-- Outfits / Skins Tab -->
              <div v-else-if="currentTab === 'skins'">
                <AkOperatorSkinsPanel
                  :operator="operator!"
                  :skins="skins ?? []"
                  @inspect="handleInspectSkin"
                />
              </div>

              <!-- Dossier Info Tab -->
              <div v-else-if="currentTab === 'info'">
                <AkOperatorInfoPanel :operator="operator!" />
              </div>
            </template>
          </AkTabs>
        </div>
      </div>

      <!-- Fullscreen Art Viewer Modal -->
      <AkArtViewer
        v-model="isViewerOpen"
        v-model:active-stage="artState"
        :operator="operator!"
        :skins="skins ?? []"
      />
    </div>

    <!-- 404 / Operator Not Found State -->
    <AkContainer v-else size="lg" class="ak-operator-detail-page__container">
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
    </AkContainer>
  </div>
</template>

<style lang="scss" scoped>
.ak-operator-detail-page {
  padding-bottom: var(--space-3xl);

  &__container {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    padding-top: var(--space-md);
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
    gap: 0;
  }

  &__main-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    width: 100%;
    max-width: 1760px;
    margin: var(--space-xl) auto 0;
    padding: 0 var(--space-md);

    @include mq(md) {
      margin-top: 48px;
      padding: 0 var(--space-2xl);
    }
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
