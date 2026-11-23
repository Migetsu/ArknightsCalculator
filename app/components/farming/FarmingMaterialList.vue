<script setup lang="ts">
import { computed } from 'vue'
import AkItemIcon from '~/components/ui/AkItemIcon.vue'
import { useFarmingStore } from '~/stores/farming'

export interface MaterialUsage {
  name: string
  amount: number
}

export interface MaterialRow {
  id: string
  name: string
  /** Total requirement: plan demand plus consumption by crafts. */
  need: number
  have: number
  /** Planned workshop crafts of this item. */
  craft: number
  /** Whole units still missing after stock and crafts. */
  farm: number
  /** Whether the item is a direct planner goal (not only a crafting ingredient). */
  isGoal: boolean
  /** Ingredients consumed by crafting this item, formatted for display. */
  recipe: MaterialUsage[]
  /** Crafted items that consume this item. */
  usages: MaterialUsage[]
}

interface Props {
  items: readonly MaterialRow[] | MaterialRow[]
}

const props = defineProps<Props>()
const { t } = useI18n()
const farmingStore = useFarmingStore()

const toFarm = computed(() => props.items.filter((item) => item.farm > 0))
const covered = computed(() => props.items.filter((item) => item.farm === 0))

function getItemRarity(itemId: string): 1 | 2 | 3 | 4 | 5 {
  return farmingStore.getItemRarity(itemId)
}

function getItemIconId(itemId: string): string | undefined {
  return farmingStore.getItemIconId(itemId)
}

function formatUsages(usages: readonly MaterialUsage[]): string {
  return usages.map((usage) => `${usage.name} ×${usage.amount.toLocaleString('en-US')}`).join(', ')
}
</script>

<template>
  <div class="farming-material-list">
    <div class="farming-material-list__summary">
      <span class="farming-material-list__summary-item farming-material-list__summary-item--farm">
        {{ t('farming.materialsSummaryFarm', { count: toFarm.length }) }}
      </span>
      <span class="farming-material-list__summary-item">
        {{ t('farming.materialsSummaryCovered', { count: covered.length }) }}
      </span>
    </div>

    <section class="farming-material-list__section">
      <h3 class="farming-material-list__section-title">
        {{ t('farming.materialsToFarm') }}
      </h3>
      <p v-if="toFarm.length === 0" class="farming-material-list__empty">
        {{ t('farming.materialsNothingToFarm') }}
      </p>
      <ul v-else class="farming-material-list__items">
        <li
          v-for="item in toFarm"
          :key="item.id"
          class="farming-material-list__row"
          data-testid="farming-material-row"
        >
          <AkItemIcon
            :item-id="item.id"
            :icon-id="getItemIconId(item.id)"
            :name="item.name"
            :tier="getItemRarity(item.id)"
            :size="36"
            class="farming-material-list__icon"
          />
          <div class="farming-material-list__body">
            <div class="farming-material-list__headline">
              <span class="farming-material-list__name" :title="item.name">{{ item.name }}</span>
              <span class="farming-material-list__farm">{{
                t('farming.materialsFarmValue', { count: item.farm.toLocaleString('en-US') })
              }}</span>
            </div>
            <div class="farming-material-list__numbers">
              <span>{{
                t('farming.materialsNeed', { count: item.need.toLocaleString('en-US') })
              }}</span>
              <span>{{
                t('farming.materialsHave', { count: item.have.toLocaleString('en-US') })
              }}</span>
              <span>{{
                t('farming.materialsCraft', { count: item.craft.toLocaleString('en-US') })
              }}</span>
            </div>
            <p v-if="item.recipe.length > 0" class="farming-material-list__detail">
              <span class="farming-material-list__detail-label">{{
                t('farming.materialsRecipe')
              }}</span>
              {{ formatUsages(item.recipe) }}
            </p>
            <p v-if="item.usages.length > 0" class="farming-material-list__detail">
              <span class="farming-material-list__detail-label">{{
                t('farming.materialsUsedFor')
              }}</span>
              {{ formatUsages(item.usages) }}
            </p>
          </div>
        </li>
      </ul>
    </section>

    <section v-if="covered.length > 0" class="farming-material-list__section">
      <h3 class="farming-material-list__section-title">
        {{ t('farming.materialsCovered') }}
      </h3>
      <ul class="farming-material-list__items">
        <li
          v-for="item in covered"
          :key="item.id"
          class="farming-material-list__row farming-material-list__row--covered"
          data-testid="farming-material-row"
        >
          <AkItemIcon
            :item-id="item.id"
            :icon-id="getItemIconId(item.id)"
            :name="item.name"
            :tier="getItemRarity(item.id)"
            :size="36"
            class="farming-material-list__icon"
          />
          <div class="farming-material-list__body">
            <div class="farming-material-list__headline">
              <span class="farming-material-list__name" :title="item.name">{{ item.name }}</span>
              <span class="farming-material-list__farm farming-material-list__farm--covered">{{
                t('farming.materialsCoveredValue')
              }}</span>
            </div>
            <div class="farming-material-list__numbers">
              <span>{{
                t('farming.materialsNeed', { count: item.need.toLocaleString('en-US') })
              }}</span>
              <span>{{
                t('farming.materialsHave', { count: item.have.toLocaleString('en-US') })
              }}</span>
              <span>{{
                t('farming.materialsCraft', { count: item.craft.toLocaleString('en-US') })
              }}</span>
            </div>
            <p v-if="item.recipe.length > 0" class="farming-material-list__detail">
              <span class="farming-material-list__detail-label">{{
                t('farming.materialsRecipe')
              }}</span>
              {{ formatUsages(item.recipe) }}
            </p>
            <p v-if="item.usages.length > 0" class="farming-material-list__detail">
              <span class="farming-material-list__detail-label">{{
                t('farming.materialsUsedFor')
              }}</span>
              {{ formatUsages(item.usages) }}
            </p>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.farming-material-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);

  &__summary {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
    padding: var(--space-xs) var(--space-sm);
  }

  &__summary-item {
    padding: 2px var(--space-sm);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-semibold);

    &--farm {
      border-color: var(--color-accent-ember);
      color: var(--color-accent-ember-light);
    }
  }

  &__section {
    display: flex;
    flex-direction: column;
  }

  &__section-title {
    margin: 0;
    padding: var(--space-sm) var(--space-sm) var(--space-xs);
    color: var(--color-text-secondary);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  &__empty {
    margin: 0;
    padding: 0 var(--space-sm) var(--space-sm);
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
  }

  &__items {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__row {
    display: flex;
    gap: var(--space-sm);
    padding: var(--space-sm);
    border-top: 1px solid var(--color-border-subtle);

    &--covered {
      opacity: 0.72;
    }
  }

  &__icon {
    flex-shrink: 0;
  }

  &__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__headline {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-sm);
  }

  &__name {
    overflow: hidden;
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__farm {
    flex-shrink: 0;
    color: var(--color-accent-ember-light);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);

    &--covered {
      color: var(--color-text-muted);
    }
  }

  &__numbers {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
  }

  &__detail {
    margin: 0;
    color: var(--color-text-muted);
    font-size: var(--font-size-2xs);
    line-height: 1.4;
  }

  &__detail-label {
    margin-right: 4px;
    color: var(--color-text-secondary);
    font-weight: var(--font-weight-semibold);
  }
}
</style>
