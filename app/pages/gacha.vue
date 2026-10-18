<script setup lang="ts">
import { ref, computed, shallowRef, onMounted } from 'vue'
import rawBannersData from '~/../data/banners.json'
import rawOperatorsIndex from '~/../data/operators-index.json'
import type { GachaBanner, BannerType } from '~/../shared/schemas/banner'
import type { OperatorSummary } from '~/../shared/schemas/operator'
import { getModuleById } from '~/config/modules'
import { useDepotStore } from '~/stores/depot'
import AkContainer from '~/components/ui/AkContainer.vue'
import AkPageHeader from '~/components/ui/AkPageHeader.vue'
import AkEmptyState from '~/components/ui/AkEmptyState.vue'
import AkAlert from '~/components/ui/AkAlert.vue'
import AkButton from '~/components/ui/AkButton.vue'
import AkSegmented, { type SegmentOption } from '~/components/ui/AkSegmented.vue'
import GachaBannerCard from '~/components/gacha/GachaBannerCard.vue'
import GachaCalculator from '~/components/gacha/GachaCalculator.vue'

const { t } = useI18n()
const localePath = useLocalePath()
const depotStore = useDepotStore()
const moduleConfig = getModuleById('gacha')

useHead({
  title: computed(() => `${t('gacha.title')} | ArkCalc`),
  meta: [
    {
      name: 'description',
      content: computed(() => t('gacha.metaDescription')),
    },
  ],
})

onMounted(async () => {
  if (depotStore.status === 'idle') {
    await depotStore.init()
  }
})

// Datasets
const banners = shallowRef<readonly GachaBanner[]>(
  rawBannersData as unknown as readonly GachaBanner[],
)
const operatorsMap = computed(() => {
  const map = new Map<string, OperatorSummary>()
  for (const op of rawOperatorsIndex as OperatorSummary[]) {
    map.set(op.id, op)
  }
  return map
})

// States & Filters
type PageState = 'ready' | 'loading' | 'error'
const pageState = ref<PageState>('ready')

type DateMode = 'cn' | 'global'
const dateMode = ref<DateMode>('global')

const dateModeOptions = computed<SegmentOption<DateMode>[]>(() => [
  { value: 'cn', label: t('gacha.dates.cn') },
  { value: 'global', label: t('gacha.dates.estimatedGlobal') },
])

type FilterChoice = 'all' | BannerType
const selectedFilter = ref<FilterChoice>('all')

const filterOptions = computed<{ value: FilterChoice; label: string }[]>(() => [
  { value: 'all', label: t('gacha.filter.all') },
  { value: 'standard', label: t('gacha.filter.standard') },
  { value: 'limited', label: t('gacha.filter.limited') },
  { value: 'joint_operation', label: t('gacha.filter.jointOperation') },
])

const isCalculatorVisible = ref(true)

const filteredBanners = computed<GachaBanner[]>(() => {
  if (selectedFilter.value === 'all') {
    return [...banners.value]
  }
  return banners.value.filter((b) => b.type === selectedFilter.value)
})

const activeBannerId = ref<string | null>(null)

watch(
  filteredBanners,
  (list) => {
    if (list.length > 0) {
      if (!activeBannerId.value || !list.some((b) => b.id === activeBannerId.value)) {
        activeBannerId.value = list[0]?.id ?? null
      }
    } else {
      activeBannerId.value = null
    }
  },
  { immediate: true },
)

const activeBanner = computed<GachaBanner | null>(() => {
  if (!activeBannerId.value) return filteredBanners.value[0] ?? null
  return (
    filteredBanners.value.find((b) => b.id === activeBannerId.value) ??
    filteredBanners.value[0] ??
    null
  )
})

function selectBanner(id: string): void {
  activeBannerId.value = id
}
</script>

<template>
  <div class="gacha-page">
    <AkContainer size="lg" class="gacha-page__container">
      <AkPageHeader
        :code="moduleConfig?.code ?? 'GCH-02'"
        tag-label="GACHA // RADAR"
        :title="t('gacha.title')"
        :subtitle="moduleConfig ? t(moduleConfig.descriptionKey) : ''"
        watermark="GACHA"
        :badge="t('modules.status.ready')"
        badge-variant="amber"
      >
        <template #actions>
          <AkButton
            variant="ghost"
            size="sm"
            class="gacha-page__calc-toggle"
            @click="isCalculatorVisible = !isCalculatorVisible"
          >
            {{ isCalculatorVisible ? '− HIDE CALCULATOR' : '+ SHOW CALCULATOR' }}
          </AkButton>
          <AkButton variant="ghost" size="sm" :to="localePath('/')">
            {{ t('common.backToDashboard') }}
          </AkButton>
        </template>
      </AkPageHeader>

      <div class="gacha-page__content">
        <!-- Loading State -->
        <div v-if="pageState === 'loading'" class="gacha-page__state-box">
          <span class="gacha-page__spinner" aria-hidden="true" />
          <p class="gacha-page__state-text">{{ t('common.loading') }}</p>
        </div>

        <!-- Error State -->
        <AkAlert
          v-else-if="pageState === 'error'"
          variant="danger"
          :title="t('modules.error.title')"
        >
          <p>{{ t('modules.error.description') }}</p>
          <template #actions>
            <AkButton variant="secondary" size="sm" @click="pageState = 'ready'">
              {{ t('common.retry') }}
            </AkButton>
          </template>
        </AkAlert>

        <!-- Ready State -->
        <div v-else class="gacha-page__body">
          <!-- Treasury and Spark Calculator -->
          <div v-if="isCalculatorVisible" class="gacha-page__calculator-section">
            <GachaCalculator
              :banner="activeBanner"
              :active-banner-type="activeBanner?.type ?? 'standard'"
              :operators-map="operatorsMap"
            />
          </div>

          <!-- Controls Bar: Date Switcher & Type Filters -->
          <div class="gacha-page__controls-bar">
            <!-- Date Mode Switcher -->
            <div class="gacha-page__date-switcher">
              <AkSegmented
                v-model="dateMode"
                :options="dateModeOptions"
                aria-label="Date Display Mode"
              />
            </div>

            <!-- Type Filter Buttons -->
            <div class="gacha-page__filter-group">
              <button
                v-for="opt in filterOptions"
                :key="opt.value"
                type="button"
                class="gacha-page__filter-btn"
                :class="{ 'gacha-page__filter-btn--active': selectedFilter === opt.value }"
                @click="selectedFilter = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Banner Cards Column -->
          <div class="gacha-page__banners-list">
            <GachaBannerCard
              v-for="banner in filteredBanners"
              :key="banner.id"
              :banner="banner"
              :date-mode="dateMode"
              :operators-map="operatorsMap"
              :is-selected="activeBanner?.id === banner.id"
              @select="selectBanner"
            />

            <!-- Empty Filter State -->
            <div v-if="filteredBanners.length === 0" class="gacha-page__empty-box">
              <AkEmptyState :title="t('gacha.empty')" />
            </div>
          </div>

          <!-- Disclaimer Note -->
          <p class="gacha-page__disclaimer">
            {{ t('gacha.dates.disclaimer') }}
          </p>
        </div>
      </div>
    </AkContainer>
  </div>
</template>

<style lang="scss" scoped>
.gacha-page {
  padding-top: var(--space-md);
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

  &__content {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    min-width: 0;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
    min-width: 0;
  }

  &__calculator-section {
    min-width: 0;
  }

  &__controls-bar {
    display: flex;
    align-items: center;
    gap: var(--space-md, 20px);
    flex-wrap: wrap;
    background-color: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    padding: var(--space-sm) var(--space-md);
    min-width: 0;

    @media (width <= 480px) {
      padding: var(--space-xs) var(--space-sm);
      gap: var(--space-xs);
    }
  }

  &__date-switcher {
    display: flex;
    align-items: center;
    min-width: 0;
    max-width: 100%;
  }

  &__filter-group {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    min-width: 0;
  }

  &__filter-btn {
    padding: 8px 14px;
    background-color: var(--color-bg-deep);
    border: 1px solid var(--color-border-subtle);
    color: var(--color-text-secondary);
    font-family: var(--font-body);
    font-size: var(--font-size-xs, 12px);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition:
      background-color var(--transition-fast),
      border-color var(--transition-fast),
      color var(--transition-fast);

    &:hover {
      color: var(--color-text-primary);
      border-color: var(--color-border-bold);
    }

    &:focus-visible {
      @include focus-ring;
    }

    &--active {
      background-color: var(--color-accent-primary);
      border-color: var(--color-accent-primary);
      color: var(--color-text-inverse);

      &:hover {
        background-color: var(--color-accent-primary-hover);
        color: var(--color-text-inverse);
      }
    }
  }

  &__banners-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-md, 16px);
    min-width: 0;
  }

  &__empty-box {
    padding: var(--space-2xl) var(--space-md);
    background-color: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    display: flex;
    justify-content: center;
    align-items: center;
  }

  &__disclaimer {
    margin: 0;
    font-family: var(--font-body);
    font-size: var(--font-size-xs, 13px);
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  &__state-box {
    padding: var(--space-2xl) var(--space-md);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    background-color: var(--color-bg-surface);
    border: 1px solid var(--color-border-bold);
  }

  &__spinner {
    width: 2rem;
    height: 2rem;
    border: 2px solid var(--color-border-subtle);
    border-top-color: var(--color-accent-amber);
    border-radius: var(--radius-full);
    animation: gacha-spin 0.8s linear infinite;
  }

  &__state-text {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    letter-spacing: var(--letter-spacing-mono);
    color: var(--color-text-secondary);
  }
}

@keyframes gacha-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
