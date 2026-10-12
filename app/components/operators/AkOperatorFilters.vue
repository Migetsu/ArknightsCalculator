<script setup lang="ts">
import { computed } from 'vue'
import type { OperatorClass, ServerRegion } from '~/../shared/schemas/operator'
import { OperatorClassSchema } from '~/../shared/schemas/operator'
import type { OperatorFilterState, OperatorSortOption } from '~/../shared/utils/operatorFilters'
import { DEFAULT_OPERATOR_FILTERS } from '~/../shared/utils/operatorFilters'
import AkInput from '~/components/ui/AkInput.vue'
import AkButton from '~/components/ui/AkButton.vue'

interface Props {
  modelValue: OperatorFilterState
  subclasses?: string[]
  factions?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  subclasses: () => [],
  factions: () => [],
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: OperatorFilterState): void
  (e: 'reset'): void
}>()

const { t } = useI18n()

const classesList: OperatorClass[] = OperatorClassSchema.options
const raritiesList = [6, 5, 4, 3, 2, 1]

const sortOptions: { value: OperatorSortOption; labelKey: string }[] = [
  { value: 'rarity_desc', labelKey: 'operators.sort.rarityDesc' },
  { value: 'rarity_asc', labelKey: 'operators.sort.rarityAsc' },
  { value: 'name_asc', labelKey: 'operators.sort.nameAsc' },
  { value: 'name_desc', labelKey: 'operators.sort.nameDesc' },
]

const isDefault = computed(() => {
  return (
    !props.modelValue.search &&
    props.modelValue.classes.length === 0 &&
    !props.modelValue.subclass &&
    props.modelValue.rarities.length === 0 &&
    !props.modelValue.faction &&
    props.modelValue.server === 'global' &&
    props.modelValue.sort === 'rarity_desc'
  )
})

function updateField<K extends keyof OperatorFilterState>(
  key: K,
  value: OperatorFilterState[K],
): void {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  })
}

function handleSearchInput(val: string): void {
  updateField('search', val)
}

function toggleClass(cls: OperatorClass): void {
  const current = props.modelValue.classes
  const next = current.includes(cls) ? current.filter((c) => c !== cls) : [...current, cls]
  updateField('classes', next)
}

function toggleRarity(r: number): void {
  const current = props.modelValue.rarities
  const next = current.includes(r) ? current.filter((item) => item !== r) : [...current, r]
  updateField('rarities', next)
}

function setServer(srv: ServerRegion): void {
  updateField('server', srv)
}

function handleReset(): void {
  emit('update:modelValue', { ...DEFAULT_OPERATOR_FILTERS })
  emit('reset')
}
</script>

<template>
  <div class="ak-operator-filters">
    <!-- Top row: Search input & Server selector & Reset button -->
    <div class="ak-operator-filters__top-bar">
      <div class="ak-operator-filters__search-field">
        <AkInput
          :model-value="modelValue.search"
          :placeholder="t('operators.searchPlaceholder')"
          :label="t('operators.searchLabel')"
          type="search"
          class="ak-operator-filters__search-input"
          @update:model-value="handleSearchInput"
        />
      </div>

      <!-- Server toggle: Global / CN -->
      <fieldset class="ak-operator-filters__server-group">
        <legend class="ak-operator-filters__label">
          {{ t('operators.filters.server') }}
        </legend>
        <div class="ak-operator-filters__server-buttons" role="group">
          <button
            type="button"
            class="ak-operator-filters__server-btn"
            :class="{ 'ak-operator-filters__server-btn--active': modelValue.server === 'global' }"
            :aria-pressed="modelValue.server === 'global'"
            @click="setServer('global')"
          >
            {{ t('operators.filters.global') }}
          </button>
          <button
            type="button"
            class="ak-operator-filters__server-btn"
            :class="{ 'ak-operator-filters__server-btn--active': modelValue.server === 'cn' }"
            :aria-pressed="modelValue.server === 'cn'"
            @click="setServer('cn')"
          >
            {{ t('operators.filters.cn') }}
          </button>
        </div>
      </fieldset>

      <!-- Reset button -->
      <div v-if="!isDefault" class="ak-operator-filters__reset-wrapper">
        <AkButton
          variant="ghost"
          size="sm"
          class="ak-operator-filters__reset-btn"
          @click="handleReset"
        >
          {{ t('operators.filters.reset') }}
        </AkButton>
      </div>
    </div>

    <!-- Class filter buttons -->
    <fieldset class="ak-operator-filters__group">
      <legend class="ak-operator-filters__label">
        {{ t('operators.filters.class') }}
      </legend>
      <div class="ak-operator-filters__chips-row" role="group">
        <button
          v-for="cls in classesList"
          :key="cls"
          type="button"
          class="ak-operator-filters__chip"
          :class="{
            'ak-operator-filters__chip--active': modelValue.classes.includes(cls),
          }"
          :aria-pressed="modelValue.classes.includes(cls)"
          @click="toggleClass(cls)"
        >
          {{ t('operators.classes.' + cls) }}
        </button>
      </div>
    </fieldset>

    <!-- Rarity filter chips -->
    <fieldset class="ak-operator-filters__group">
      <legend class="ak-operator-filters__label">
        {{ t('operators.filters.rarity') }}
      </legend>
      <div class="ak-operator-filters__chips-row" role="group">
        <button
          v-for="r in raritiesList"
          :key="r"
          type="button"
          class="ak-operator-filters__chip ak-operator-filters__chip--rarity"
          :class="[
            `ak-operator-filters__chip--rarity-${r}`,
            { 'ak-operator-filters__chip--active': modelValue.rarities.includes(r) },
          ]"
          :aria-pressed="modelValue.rarities.includes(r)"
          @click="toggleRarity(r)"
        >
          {{ r }}★
        </button>
      </div>
    </fieldset>

    <!-- Dropdowns: Subclass, Faction, Sort -->
    <div class="ak-operator-filters__selects-grid">
      <!-- Subclass dropdown -->
      <div class="ak-operator-filters__select-wrapper">
        <label for="ak-filter-subclass" class="ak-operator-filters__label">
          {{ t('operators.filters.subclass') }}
        </label>
        <select
          id="ak-filter-subclass"
          class="ak-operator-filters__select"
          :value="modelValue.subclass || ''"
          @change="updateField('subclass', ($event.target as HTMLSelectElement).value || undefined)"
        >
          <option value="">{{ t('operators.filters.allSubclasses') }}</option>
          <option v-for="sub in subclasses" :key="sub" :value="sub">
            {{ sub }}
          </option>
        </select>
      </div>

      <!-- Faction dropdown -->
      <div class="ak-operator-filters__select-wrapper">
        <label for="ak-filter-faction" class="ak-operator-filters__label">
          {{ t('operators.filters.faction') }}
        </label>
        <select
          id="ak-filter-faction"
          class="ak-operator-filters__select"
          :value="modelValue.faction || ''"
          @change="updateField('faction', ($event.target as HTMLSelectElement).value || undefined)"
        >
          <option value="">{{ t('operators.filters.allFactions') }}</option>
          <option v-for="fac in factions" :key="fac" :value="fac">
            {{ t('operators.factions.' + fac) }}
          </option>
        </select>
      </div>

      <!-- Sort dropdown -->
      <div class="ak-operator-filters__select-wrapper">
        <label for="ak-filter-sort" class="ak-operator-filters__label">
          {{ t('operators.filters.sort') }}
        </label>
        <select
          id="ak-filter-sort"
          class="ak-operator-filters__select"
          :value="modelValue.sort"
          @change="
            updateField('sort', ($event.target as HTMLSelectElement).value as OperatorSortOption)
          "
        >
          <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
            {{ t(opt.labelKey) }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ak-operator-filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-md);
  background: linear-gradient(135deg, var(--color-bg-surface) 0%, var(--color-bg-card) 100%);
  border: 1px solid var(--color-border-bold);
  min-width: 0;

  @include cut-corner(12px, top-right);

  &__top-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--space-md);
    min-width: 0;
  }

  &__search-field {
    flex: 1;
    min-width: 240px;
  }

  &__server-group {
    border: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    min-width: 0;
  }

  &__server-buttons {
    display: flex;
    align-items: center;
    border: 1px solid var(--color-border-bold);
    background-color: var(--color-bg-subtle);

    @include cut-corner(4px, top-right);
  }

  &__server-btn {
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-mono);
    text-transform: uppercase;
    padding: var(--space-2xs) var(--space-sm);
    cursor: pointer;
    transition:
      background-color var(--duration-fast) var(--ease-tactical),
      color var(--duration-fast) var(--ease-tactical);

    &:hover {
      color: var(--color-text-primary);
    }

    &:focus-visible {
      outline: 2px solid var(--color-accent-primary);
      outline-offset: -2px;
    }

    &--active {
      background-color: var(--color-accent-primary);
      color: var(--color-bg-root);
      box-shadow: 0 0 8px var(--color-accent-primary-glow);
    }
  }

  &__reset-wrapper {
    display: flex;
    align-items: flex-end;
    margin-left: auto;
  }

  &__group {
    border: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    min-width: 0;
  }

  &__label {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-mono);
    text-transform: uppercase;
    color: var(--color-text-tertiary);
    margin-bottom: var(--space-2xs);
    display: block;
  }

  &__chips-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2xs);
    min-width: 0;
  }

  &__chip {
    border: 1px solid var(--color-border-subtle);
    background-color: var(--color-bg-subtle);
    color: var(--color-text-secondary);
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    padding: var(--space-2xs) var(--space-sm);
    cursor: pointer;
    line-height: var(--line-height-normal);
    transition:
      border-color var(--duration-fast) var(--ease-tactical),
      background-color var(--duration-fast) var(--ease-tactical),
      color var(--duration-fast) var(--ease-tactical),
      box-shadow var(--duration-fast) var(--ease-tactical);
    user-select: none;
    white-space: nowrap;

    @include cut-corner(4px, top-right);

    &:hover {
      border-color: var(--color-border-bold);
      color: var(--color-text-primary);
    }

    &:focus-visible {
      outline: none;
      border-color: var(--color-accent-primary);
      box-shadow: var(--shadow-focus);
    }

    &--active {
      border-color: var(--color-accent-primary);
      background-color: var(--color-accent-primary-subtle);
      color: var(--color-accent-primary);
      font-weight: var(--font-weight-semibold);
      box-shadow: 0 0 8px var(--color-accent-primary-glow);
    }

    &--rarity {
      font-family: var(--font-mono);
      min-width: 44px;
      text-align: center;
    }

    &--rarity-6.ak-operator-filters__chip--active {
      border-color: var(--color-rarity-6);
      color: var(--color-rarity-6);
      box-shadow: 0 0 8px rgb(243 144 0 / 40%);
    }

    &--rarity-5.ak-operator-filters__chip--active {
      border-color: var(--color-rarity-5);
      color: var(--color-rarity-5);
      box-shadow: 0 0 6px rgb(255 215 0 / 30%);
    }

    &--rarity-4.ak-operator-filters__chip--active {
      border-color: var(--color-rarity-4);
      color: var(--color-rarity-4);
    }

    &--rarity-3.ak-operator-filters__chip--active {
      border-color: var(--color-rarity-3);
      color: var(--color-rarity-3);
    }

    &--rarity-2.ak-operator-filters__chip--active {
      border-color: var(--color-rarity-2);
      color: var(--color-rarity-2);
    }

    &--rarity-1.ak-operator-filters__chip--active {
      border-color: var(--color-rarity-1);
      color: var(--color-rarity-1);
    }
  }

  &__selects-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-sm);
    min-width: 0;

    @include mq(sm) {
      grid-template-columns: repeat(2, 1fr);
    }

    @include mq(md) {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  &__select-wrapper {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__select {
    width: 100%;
    box-sizing: border-box;
    padding: var(--space-2xs) var(--space-sm);
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    background-color: var(--color-bg-base);
    border: 1px solid var(--color-border-bold);
    color: var(--color-text-primary);
    cursor: pointer;
    min-height: 2.25rem;

    @include cut-corner(4px, top-right);

    &:focus-visible {
      outline: none;
      border-color: var(--color-accent-primary);
      box-shadow: var(--shadow-focus);
    }
  }
}
</style>
