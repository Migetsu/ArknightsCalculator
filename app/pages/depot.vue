<script setup lang="ts">
import { ref, computed, shallowRef, onMounted } from 'vue'
import { resolveI18nString, type ContentLocale } from '~/../shared/schemas/operator'
import rawItemsData from '~/../data/items.json'
import { useDepotStore } from '~/stores/depot'
import type { DepotItemEntry } from '~/components/depot/DepotItemCard.vue'
import DepotItemCard from '~/components/depot/DepotItemCard.vue'
import DepotJsonModal from '~/components/depot/DepotJsonModal.vue'
import AkContainer from '~/components/ui/AkContainer.vue'
import AkInput from '~/components/ui/AkInput.vue'
import AkButton from '~/components/ui/AkButton.vue'
import AkAlert from '~/components/ui/AkAlert.vue'
import AkEmptyState from '~/components/ui/AkEmptyState.vue'
import AkItemIcon from '~/components/ui/AkItemIcon.vue'
import AkStepper from '~/components/ui/AkStepper.vue'

import { isPlanItem } from '~/../shared/constants/planItems'

const { t, locale } = useI18n()
const depotStore = useDepotStore()

useHead({
  title: computed(() => `${t('depot.title')} | ArkCalc`),
  meta: [
    {
      name: 'description',
      content: computed(() => t('depot.metaDescription')),
    },
  ],
})

// Progressive tier hydration for high performance on slow mobile devices
const visibleTiers = ref<Set<number>>(new Set([5, 4]))

onMounted(async () => {
  if (depotStore.status === 'idle') {
    await depotStore.init()
  }
  // Schedule remaining tiers after first paint
  requestAnimationFrame(() => {
    visibleTiers.value = new Set([5, 4, 3, 2, 1])
  })
})

// Item catalog
const allItems = shallowRef<readonly DepotItemEntry[]>(
  rawItemsData as unknown as readonly DepotItemEntry[],
)

// Filters
const searchQuery = ref('')
type FilterType = 'all' | 'material' | 'chip' | 'exp' | 'other'
const activeType = ref<FilterType>('all')
const isJsonModalOpen = ref(false)

const typeOptions: { value: FilterType; labelKey: string }[] = [
  { value: 'all', labelKey: 'depot.types.all' },
  { value: 'material', labelKey: 'depot.types.materials' },
  { value: 'chip', labelKey: 'depot.types.chips' },
  { value: 'exp', labelKey: 'depot.types.exp' },
  { value: 'other', labelKey: 'depot.types.other' },
]

// Exclude standalone top-bar currencies from main inventory grid
const CURRENCY_IDS = new Set(['4001', '4002', '4003'])

const filteredItems = computed<DepotItemEntry[]>(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const filterType = activeType.value
  const currentLocale = locale.value as ContentLocale

  return allItems.value.filter((item) => {
    // Exclude currency items and obsolete negative sort tokens
    if (CURRENCY_IDS.has(item.id) || item.sortId < 0) {
      return false
    }

    // Default filters show items needed for plans; 'other' shows tokens and non-plan items
    if (filterType === 'other') {
      if (isPlanItem(item.id)) return false
    } else {
      if (!isPlanItem(item.id)) return false
    }

    // Sub-type filters
    if (filterType === 'material' && item.type !== 'material' && item.type !== 'catalyst') {
      return false
    }
    if (filterType === 'chip' && item.type !== 'chip' && item.type !== 'chip_pack') {
      return false
    }
    if (filterType === 'exp' && item.type !== 'exp_card') {
      return false
    }

    // Search query filter
    if (query) {
      const locName = resolveI18nString(item.name, currentLocale).toLowerCase()
      const enName = (item.name.en || '').toLowerCase()
      const zhName = (item.name.zh || '').toLowerCase()
      const idStr = item.id.toLowerCase()

      const matches =
        locName.includes(query) ||
        enName.includes(query) ||
        zhName.includes(query) ||
        idStr.includes(query)

      if (!matches) return false
    }

    return true
  })
})

const tiers = [5, 4, 3, 2, 1] as const

const itemsByTier = computed(() => {
  const map: Record<number, DepotItemEntry[]> = {
    5: [],
    4: [],
    3: [],
    2: [],
    1: [],
  }

  for (const item of filteredItems.value) {
    const tier = item.rarity
    if (tier in map) {
      map[tier]!.push(item)
    }
  }

  // Sort inside each tier by sortId ascending
  for (const tier of tiers) {
    map[tier]!.sort((a, b) => a.sortId - b.sortId)
  }

  return map
})

const filteredItemsCount = computed(() => filteredItems.value.length)
</script>

<template>
  <div class="ak-depot">
    <AkContainer>
      <!-- Alerts -->
      <AkAlert
        v-if="depotStore.isCorrupted"
        variant="warning"
        class="ak-depot__alert"
        closable
        @close="depotStore.dismissCorruptionAlert"
      >
        {{ t('depot.corruptedAlert', { backup: depotStore.corruptedBackupKey }) }}
      </AkAlert>

      <AkAlert v-if="depotStore.status === 'error'" variant="danger" class="ak-depot__alert">
        {{ depotStore.error || t('depot.storageError') }}
      </AkAlert>

      <div class="ak-depot__layout">
        <!-- Sidebar filters -->
        <aside class="ak-depot__aside">
          <div class="ak-depot__aside-panel">
            <h1 class="ak-depot__title">{{ t('depot.title') }}</h1>

            <div class="ak-depot__search-wrap">
              <AkInput
                v-model="searchQuery"
                type="search"
                :placeholder="t('depot.searchPlaceholder')"
                :aria-label="t('depot.searchPlaceholder')"
              />
            </div>

            <!-- Future plan filters (disabled with clear notice) -->
            <div class="ak-depot__plan-filters">
              <label
                class="ak-depot__checkbox-label ak-depot__checkbox-label--disabled"
                :title="t('depot.plansComingSoon')"
              >
                <input type="checkbox" disabled class="ak-depot__checkbox-input" />
                <span class="ak-depot__checkbox-text">{{ t('depot.onlyNeededInPlans') }}</span>
                <span class="ak-depot__badge-soon">{{ t('depot.comingSoon') }}</span>
              </label>

              <label
                class="ak-depot__checkbox-label ak-depot__checkbox-label--disabled"
                :title="t('depot.plansComingSoon')"
              >
                <input type="checkbox" disabled class="ak-depot__checkbox-input" />
                <span class="ak-depot__checkbox-text">{{ t('depot.onlyMissing') }}</span>
                <span class="ak-depot__badge-soon">{{ t('depot.comingSoon') }}</span>
              </label>
            </div>

            <!-- Type filters -->
            <div class="ak-depot__type-section">
              <span class="ak-depot__section-heading">{{ t('depot.type') }}</span>
              <div class="ak-depot__type-btns">
                <button
                  v-for="opt in typeOptions"
                  :key="opt.value"
                  type="button"
                  class="ak-depot__type-btn"
                  :class="{ 'ak-depot__type-btn--active': activeType === opt.value }"
                  @click="activeType = opt.value"
                >
                  {{ t(opt.labelKey) }}
                </button>
              </div>
            </div>

            <!-- Actions -->
            <div class="ak-depot__actions">
              <AkButton
                variant="secondary"
                size="md"
                class="ak-depot__action-btn"
                @click="isJsonModalOpen = true"
              >
                {{ t('depot.importExportJson') }}
              </AkButton>
            </div>
          </div>
        </aside>

        <!-- Main depot content -->
        <main class="ak-depot__main">
          <!-- Currencies Top Bar -->
          <section class="ak-depot__currencies" aria-label="Currencies">
            <!-- LMD (id: 4001) -->
            <div class="ak-depot__currency-item">
              <AkItemIcon item-id="4001" icon-id="GOLD" name="LMD" :tier="4" :size="48" />
              <div class="ak-depot__currency-meta">
                <span class="ak-depot__currency-name">LMD</span>
                <AkStepper
                  :model-value="depotStore.currencies.lmd"
                  :min="0"
                  :max="999999999"
                  :step="1000"
                  aria-label="LMD"
                  @update:model-value="depotStore.setCurrency('lmd', $event)"
                />
              </div>
            </div>

            <!-- Orundum (id: 4003) -->
            <div class="ak-depot__currency-item">
              <AkItemIcon
                item-id="4003"
                icon-id="DIAMOND_SHD"
                name="Orundum"
                :tier="5"
                :size="48"
              />
              <div class="ak-depot__currency-meta">
                <span class="ak-depot__currency-name">Orundum</span>
                <AkStepper
                  :model-value="depotStore.currencies.orundum"
                  :min="0"
                  :max="999999999"
                  :step="100"
                  aria-label="Orundum"
                  @update:model-value="depotStore.setCurrency('orundum', $event)"
                />
              </div>
            </div>

            <!-- Originite Prime (id: 4002) -->
            <div class="ak-depot__currency-item">
              <AkItemIcon
                item-id="4002"
                icon-id="DIAMOND"
                name="Originite Prime"
                :tier="5"
                :size="48"
              />
              <div class="ak-depot__currency-meta">
                <span class="ak-depot__currency-name">Originite Prime</span>
                <AkStepper
                  :model-value="depotStore.currencies.originitePrime"
                  :min="0"
                  :max="999999"
                  :step="1"
                  aria-label="Originite Prime"
                  @update:model-value="depotStore.setCurrency('originitePrime', $event)"
                />
              </div>
            </div>
          </section>

          <!-- Loading state -->
          <div v-if="depotStore.status === 'loading'" class="ak-depot__loading">
            <span class="ak-depot__loading-spinner" />
            <p>{{ t('depot.loading') }}</p>
          </div>

          <!-- Empty search/filter results -->
          <AkEmptyState
            v-else-if="filteredItemsCount === 0"
            :title="t('depot.noItemsFound')"
            :description="t('depot.noItemsFoundDesc')"
          />

          <!-- Tiers sections (Tier 5 down to Tier 1) -->
          <div v-else class="ak-depot__tiers">
            <template v-for="tier in tiers" :key="tier">
              <section
                v-if="itemsByTier[tier]?.length && visibleTiers.has(tier)"
                class="ak-depot__tier-panel"
                :aria-label="t('depot.tier', { n: tier })"
              >
                <h2 class="ak-depot__tier-title">
                  {{ t('depot.tier', { n: tier }) }}
                </h2>
                <div class="ak-depot__grid">
                  <DepotItemCard
                    v-for="item in itemsByTier[tier]"
                    :key="item.id"
                    :item="item"
                    :count="depotStore.getItemCount(item.id)"
                    @update:count="depotStore.setItemCount(item.id, $event)"
                  />
                </div>
              </section>
            </template>
          </div>
        </main>
      </div>

      <!-- JSON Import/Export Modal -->
      <DepotJsonModal v-model="isJsonModalOpen" />
    </AkContainer>
  </div>
</template>

<style lang="scss" scoped>
.ak-depot {
  padding: var(--space-md, 24px) 0 var(--space-2xl, 64px);
  min-height: calc(100vh - 120px);
  box-sizing: border-box;

  &__alert {
    margin-bottom: var(--space-md, 16px);
  }

  &__layout {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: var(--space-lg, 28px);
    align-items: start;

    @media (width <= 860px) {
      grid-template-columns: 1fr;
    }
  }

  &__aside {
    align-self: start;
    min-width: 0;
  }

  &__aside-panel {
    background-color: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    padding: var(--space-md, 20px);
    display: flex;
    flex-direction: column;
    gap: var(--space-sm, 14px);
  }

  &__title {
    margin: 0;
    font-family: var(--font-heading);
    font-size: var(--font-size-2xl, 26px);
    font-weight: var(--font-weight-extrabold);
    color: var(--color-text-primary);
    line-height: 1.15;
  }

  &__search-wrap {
    width: 100%;
  }

  &__plan-filters {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs, 8px);
    padding: var(--space-xs, 8px) 0;
    border-top: 1px solid var(--color-border-subtle);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  &__checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--space-2xs, 8px);
    font-size: var(--font-size-xs, 12px);
    color: var(--color-text-secondary);
    user-select: none;

    &--disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
  }

  &__checkbox-input {
    margin: 0;
    cursor: not-allowed;
  }

  &__checkbox-text {
    flex: 1;
    min-width: 0;
  }

  &__badge-soon {
    font-size: var(--font-size-2xs, 10px);
    font-family: var(--font-mono, monospace);
    text-transform: uppercase;
    padding: 1px 4px;
    background-color: var(--color-bg-deep);
    border: 1px solid var(--color-border-subtle);
    color: var(--color-text-muted);
  }

  &__type-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs, 8px);
  }

  &__section-heading {
    color: var(--color-text-muted);
    letter-spacing: 0.12em;
    font-size: var(--font-size-xs, 11px);
    font-weight: var(--font-weight-bold);
    text-transform: uppercase;
  }

  &__type-btns {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  &__type-btn {
    padding: 7px 12px;
    background-color: var(--color-bg-deep);
    border: 1px solid var(--color-border-bold);
    color: var(--color-text-secondary);
    font-family: var(--font-body);
    font-size: var(--font-size-xs, 12px);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition:
      background-color var(--transition-fast),
      color var(--transition-fast),
      border-color var(--transition-fast);

    &:hover {
      color: var(--color-text-primary);
      border-color: var(--color-border-accent);
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

  &__actions {
    margin-top: var(--space-xs, 6px);
  }

  &__action-btn {
    width: 100%;
    justify-content: center;
  }

  &__main {
    display: flex;
    flex-direction: column;
    gap: var(--space-md, 20px);
    min-width: 0;
  }

  &__currencies {
    background-color: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    padding: var(--space-md, 18px) var(--space-md, 22px);
    display: flex;
    gap: var(--space-lg, 28px);
    align-items: center;
    flex-wrap: wrap;
  }

  &__currency-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm, 12px);
  }

  &__currency-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__currency-name {
    font-family: var(--font-body);
    font-size: var(--font-size-xs, 12px);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
  }

  &__loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-2xl, 48px);
    gap: var(--space-sm, 12px);
    color: var(--color-text-muted);
  }

  &__loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-border-subtle);
    border-top-color: var(--color-accent-primary);
    border-radius: 50%;
    animation: ak-spin 0.8s linear infinite;
  }

  &__tiers {
    display: flex;
    flex-direction: column;
    gap: var(--space-md, 20px);
  }

  &__tier-panel {
    background-color: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    padding: var(--space-md, 20px);
  }

  &__tier-title {
    margin: 0 0 var(--space-sm, 14px);
    font-family: var(--font-heading);
    font-size: var(--font-size-sm, 15px);
    font-weight: var(--font-weight-extrabold);
    color: var(--color-text-primary);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: var(--space-2xs, 8px);

    @media (width <= 480px) {
      grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    }
  }
}

@keyframes ak-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
