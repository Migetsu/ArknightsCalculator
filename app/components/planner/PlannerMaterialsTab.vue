<script setup lang="ts">
import { computed } from 'vue'
import rawItemsData from '~/../data/items.json'
import rawRecipesData from '~/../data/recipes.json'
import type { GameItem } from '~/../shared/schemas/item'
import type { CraftRecipe } from '~/../shared/schemas/recipe'
import { resolveI18nString, type ContentLocale } from '~/../shared/schemas/operator'
import { usePlannerStore } from '~/stores/planner'
import { useDepotStore } from '~/stores/depot'
import AkItemIcon from '~/components/ui/AkItemIcon.vue'
import AkButton from '~/components/ui/AkButton.vue'
import AkBadge from '~/components/ui/AkBadge.vue'
import AkSegmented from '~/components/ui/AkSegmented.vue'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const plannerStore = usePlannerStore()
const depotStore = useDepotStore()

const allItems = rawItemsData as unknown as readonly GameItem[]
const allRecipes = rawRecipesData as unknown as readonly CraftRecipe[]

const itemsMap = computed(() => {
  const map = new Map<string, GameItem>()
  for (const it of allItems) {
    map.set(it.id, it)
  }
  return map
})

const recipesMap = computed(() => {
  const map = new Map<string, CraftRecipe>()
  for (const r of allRecipes) {
    map.set(r.id, r)
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

const craftingSegmentOptions = computed(() => [
  { value: 'crafting', label: t('planner.craftingIncluded') },
  { value: 'direct', label: t('planner.directDeficit') },
])

const craftingMode = computed<'crafting' | 'direct'>({
  get: () => (plannerStore.includeCrafting ? 'crafting' : 'direct'),
  set: (val) => {
    plannerStore.includeCrafting = val === 'crafting'
  },
})

// Sort materials by rarity descending, then name
const sortedMaterialRows = computed(() => {
  return [...plannerStore.materialRows].sort((a, b) => {
    const rA = getItemRarity(a.id)
    const rB = getItemRarity(b.id)
    if (rB !== rA) return rB - rA
    return a.id.localeCompare(b.id)
  })
})

const detailedCrafts = computed(() => {
  return plannerStore.resolvedCrafts.map((order) => {
    const recipe = recipesMap.value.get(order.recipeId)
    const resultId = recipe?.resultId ?? ''
    const yieldCount = (recipe?.resultCount ?? 1) * order.times
    const lmdCost = (recipe?.goldCost ?? 0) * order.times
    const ingredients = (recipe?.ingredients ?? []).map((ing) => ({
      id: ing.id,
      count: ing.count * order.times,
    }))
    return {
      recipeId: order.recipeId,
      times: order.times,
      resultId,
      yieldCount,
      lmdCost,
      ingredients,
    }
  })
})

const sortedFarmDeficit = computed(() => {
  return [...plannerStore.resolvedRawDeficit].sort((a, b) => {
    const rA = getItemRarity(a.id)
    const rB = getItemRarity(b.id)
    if (rB !== rA) return rB - rA
    return a.id.localeCompare(b.id)
  })
})

const lmdDemand = computed(() => plannerStore.aggregatedDemand.lmd)
const lmdStock = computed(() => depotStore.currencies.lmd)
const lmdMissing = computed(() => Math.max(0, lmdDemand.value - lmdStock.value))
</script>

<template>
  <div class="planner-materials">
    <!-- Controls Header -->
    <div class="planner-materials__header">
      <div class="planner-materials__switch-wrap">
        <AkSegmented v-model="craftingMode" :options="craftingSegmentOptions" size="sm" />
      </div>

      <div class="planner-materials__header-actions">
        <AkButton
          v-if="plannerStore.missingItemsCount > 0"
          variant="secondary"
          size="sm"
          :to="localePath('/farming')"
          class="planner-materials__farming-btn"
        >
          {{ t('planner.findFarmingStages') }}
        </AkButton>

        <div class="planner-materials__summary-badge">
          <span class="planner-materials__missing-label"> {{ t('planner.missingItems') }}: </span>
          <b
            class="planner-materials__missing-value"
            :class="{
              'planner-materials__missing-value--alert': plannerStore.missingItemsCount > 0,
            }"
          >
            {{ plannerStore.missingItemsCount }}
          </b>
        </div>
      </div>
    </div>

    <!-- Materials Table -->
    <div class="planner-materials__table-card">
      <div class="planner-materials__table-head">
        <span class="planner-materials__col-material">{{ t('planner.material') }}</span>
        <span class="planner-materials__col-num">{{ t('planner.need') }}</span>
        <span class="planner-materials__col-num">{{ t('planner.have') }}</span>
        <span class="planner-materials__col-num">{{ t('planner.missing') }}</span>
      </div>

      <!-- Currency Row: LMD -->
      <div class="planner-materials__table-row">
        <div class="planner-materials__material-cell">
          <AkItemIcon item-id="4001" icon-id="GOLD" name="LMD" :tier="4" :size="40" />
          <div class="planner-materials__material-meta">
            <span class="planner-materials__material-name">LMD</span>
            <span class="planner-materials__material-type">Currency</span>
          </div>
        </div>
        <span class="planner-materials__col-num">
          {{ lmdDemand.toLocaleString() }}
        </span>
        <span class="planner-materials__col-num">
          {{ lmdStock.toLocaleString() }}
        </span>
        <b
          class="planner-materials__col-num"
          :class="
            lmdMissing > 0 ? 'planner-materials__val--missing' : 'planner-materials__val--satisfied'
          "
        >
          {{ lmdMissing.toLocaleString() }}
        </b>
      </div>

      <!-- Materials List -->
      <div v-for="row in sortedMaterialRows" :key="row.id" class="planner-materials__table-row">
        <div class="planner-materials__material-cell">
          <AkItemIcon
            :item-id="row.id"
            :icon-id="getItemIconId(row.id)"
            :name="getItemName(row.id)"
            :tier="getItemRarity(row.id)"
            :size="40"
          />
          <div class="planner-materials__material-meta">
            <div class="planner-materials__name-wrap">
              <span class="planner-materials__material-name">
                {{ getItemName(row.id) }}
              </span>
              <AkBadge
                v-if="craftingMode === 'crafting' && row.isCraftable"
                variant="neutral"
                size="sm"
              >
                {{ t('planner.craftable') }}
              </AkBadge>
            </div>
            <span class="planner-materials__material-type">T{{ getItemRarity(row.id) }}</span>
          </div>
        </div>
        <span class="planner-materials__col-num">
          {{ row.need.toLocaleString() }}
        </span>
        <span class="planner-materials__col-num">
          {{ row.have.toLocaleString() }}
        </span>
        <b
          class="planner-materials__col-num"
          :class="
            row.missing > 0
              ? 'planner-materials__val--missing'
              : 'planner-materials__val--satisfied'
          "
        >
          {{ row.missing.toLocaleString() }}
        </b>
      </div>

      <div v-if="sortedMaterialRows.length === 0" class="planner-materials__empty-row">
        {{ t('planner.noMaterialsNeeded') }}
      </div>
    </div>

    <!-- Dedicated Crafting Breakdown (Only in Crafting Mode) -->
    <div v-if="craftingMode === 'crafting'" class="planner-materials__craft-section">
      <div class="planner-materials__section-header">
        <h3 class="planner-materials__section-title">
          {{ t('planner.craftSectionTitle') }}
        </h3>
        <span class="planner-materials__lmd-cost">
          {{
            t('planner.craftTotalLmd', { cost: plannerStore.resolvedCraftLmdCost.toLocaleString() })
          }}
        </span>
      </div>

      <div class="planner-materials__crafts-grid">
        <div
          v-for="craft in detailedCrafts"
          :key="craft.recipeId"
          class="planner-materials__craft-card"
        >
          <div class="planner-materials__craft-target">
            <AkItemIcon
              :item-id="craft.resultId"
              :icon-id="getItemIconId(craft.resultId)"
              :name="getItemName(craft.resultId)"
              :tier="getItemRarity(craft.resultId)"
              :size="40"
            />
            <div class="planner-materials__craft-meta">
              <span class="planner-materials__craft-name"
                >{{ getItemName(craft.resultId) }} ×{{ craft.yieldCount }}</span
              >
              <span class="planner-materials__craft-runs">{{
                t('planner.craftRuns', { count: craft.times })
              }}</span>
            </div>
          </div>

          <div class="planner-materials__craft-ingredients">
            <div
              v-for="ing in craft.ingredients"
              :key="ing.id"
              class="planner-materials__craft-ingredient"
            >
              <AkItemIcon
                :item-id="ing.id"
                :icon-id="getItemIconId(ing.id)"
                :name="getItemName(ing.id)"
                :tier="getItemRarity(ing.id)"
                :size="36"
              />
              <span class="planner-materials__ingredient-count">×{{ ing.count }}</span>
            </div>
            <div v-if="craft.lmdCost > 0" class="planner-materials__craft-lmd">
              <AkItemIcon item-id="4001" icon-id="GOLD" name="LMD" :tier="4" :size="36" />
              <span class="planner-materials__ingredient-count">{{
                craft.lmdCost.toLocaleString()
              }}</span>
            </div>
          </div>
        </div>

        <div v-if="detailedCrafts.length === 0" class="planner-materials__section-empty">
          {{ t('planner.noCraftsNeeded') }}
        </div>
      </div>
    </div>

    <!-- Dedicated Farming Deficit Breakdown (Only in Crafting Mode) -->
    <div v-if="craftingMode === 'crafting'" class="planner-materials__farm-section">
      <div class="planner-materials__section-header">
        <h3 class="planner-materials__section-title">
          {{ t('planner.farmSectionTitle') }}
        </h3>
      </div>

      <div class="planner-materials__farm-grid">
        <div
          v-for="farmItem in sortedFarmDeficit"
          :key="farmItem.id"
          class="planner-materials__farm-card"
        >
          <AkItemIcon
            :item-id="farmItem.id"
            :icon-id="getItemIconId(farmItem.id)"
            :name="getItemName(farmItem.id)"
            :tier="getItemRarity(farmItem.id)"
            :size="40"
          />
          <div class="planner-materials__farm-meta">
            <span class="planner-materials__farm-name">{{ getItemName(farmItem.id) }}</span>
            <span class="planner-materials__farm-count">×{{ farmItem.count }}</span>
          </div>
        </div>

        <div v-if="sortedFarmDeficit.length === 0" class="planner-materials__section-empty">
          {{ t('planner.noFarmNeeded') }}
        </div>
      </div>
    </div>

    <!-- Farming Stages Navigation Button -->
    <div class="planner-materials__footer">
      <AkButton
        variant="outline"
        size="md"
        :to="localePath('/farming')"
        class="planner-materials__farming-btn"
      >
        {{ t('planner.findFarmingStages') }}
      </AkButton>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.planner-materials {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;

  &__header {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-sm);
  }

  &__switch-wrap {
    display: flex;
    align-items: center;
  }

  &__header-actions {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    flex-wrap: wrap;
  }

  &__summary-badge {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  &__missing-label {
    letter-spacing: var(--letter-spacing-mono);
    text-transform: uppercase;
  }

  &__missing-value {
    font-family: var(--font-mono);
    color: var(--color-status-success);

    &--alert {
      color: var(--color-accent-primary);
    }
  }

  &__table-card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    display: flex;
    flex-direction: column;
    overflow-x: auto;
  }

  &__table-head {
    display: grid;
    grid-template-columns: minmax(180px, 1fr) 90px 90px 90px;
    align-items: center;
    padding: var(--space-sm) var(--space-md);
    border-bottom: 1px solid var(--color-border-subtle);
    font-family: var(--font-body);
    font-size: var(--font-size-2xs);
    font-weight: 600;
    letter-spacing: 0.12em;
    color: var(--color-text-muted);
    text-transform: uppercase;
  }

  &__table-row {
    display: grid;
    grid-template-columns: minmax(180px, 1fr) 90px 90px 90px;
    align-items: center;
    padding: var(--space-sm) var(--space-md);
    border-bottom: 1px solid var(--color-border-subtle);
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    transition: background var(--transition-fast);

    &:hover {
      background: var(--color-bg-card-hover);
    }
  }

  &__material-cell {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    min-width: 0;
  }

  &__material-meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__material-name {
    font-family: var(--font-heading);
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__material-type {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-muted);
  }

  &__col-material {
    text-align: left;
  }

  &__col-num {
    text-align: right;
    font-family: var(--font-mono);
  }

  &__val--missing {
    color: var(--color-accent-primary);
  }

  &__val--satisfied {
    color: var(--color-status-success);
  }

  &__empty-row {
    padding: var(--space-xl);
    text-align: center;
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  &__footer {
    display: flex;
    margin-top: var(--space-xs);
  }

  &__farming-btn {
    align-self: flex-start;
  }

  &__name-wrap {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  &__craft-section,
  &__farm-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    padding: var(--space-md);
  }

  &__section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--color-border-subtle);
    padding-bottom: var(--space-xs);
  }

  &__section-title {
    font-family: var(--font-heading);
    font-size: var(--font-size-xs);
    font-weight: 700;
    letter-spacing: 0.12em;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    margin: 0;
  }

  &__lmd-cost {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-status-info);
  }

  &__crafts-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__craft-card {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-xs) var(--space-sm);
    background: var(--color-bg-surface-raised);
    border: 1px solid var(--color-border-subtle);
    gap: var(--space-sm);
  }

  &__craft-target {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  &__craft-meta {
    display: flex;
    flex-direction: column;
  }

  &__craft-name {
    font-family: var(--font-heading);
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-primary);
  }

  &__craft-runs {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-accent-primary);
  }

  &__craft-ingredients {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-sm);
  }

  &__craft-ingredient,
  &__craft-lmd {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
  }

  &__ingredient-count {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  &__farm-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--space-xs);
  }

  &__farm-card {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-xs) var(--space-sm);
    background: var(--color-bg-surface-raised);
    border: 1px solid var(--color-border-subtle);
  }

  &__farm-meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__farm-name {
    font-family: var(--font-heading);
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__farm-count {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-accent-primary);
    font-weight: 600;
  }

  &__section-empty {
    padding: var(--space-md);
    text-align: center;
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }
}
</style>
