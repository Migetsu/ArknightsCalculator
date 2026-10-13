<script setup lang="ts">
import { computed } from 'vue'
import type { OperatorClass, ServerRegion } from '~/../shared/schemas/operator'
import { OperatorClassSchema } from '~/../shared/schemas/operator'
import type { OperatorFilterState, OperatorSortOption } from '~/../shared/utils/operatorFilters'
import { DEFAULT_OPERATOR_FILTERS } from '~/../shared/utils/operatorFilters'
import AkInput from '~/components/ui/AkInput.vue'
import AkButton from '~/components/ui/AkButton.vue'
import AkChip from '~/components/ui/AkChip.vue'

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

const serverOptions: { value: ServerRegion; label: string }[] = [
  { value: 'global', label: 'Global' },
  { value: 'cn', label: 'CN All' },
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

function toggleAllClasses(): void {
  updateField('classes', [])
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
    <!-- Top toolbar: Search, Server switch, Reset -->
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
            v-for="opt in serverOptions"
            :key="opt.value"
            type="button"
            class="ak-operator-filters__server-btn"
            :class="{
              'ak-operator-filters__server-btn--active': modelValue.server === opt.value,
            }"
            :aria-pressed="modelValue.server === opt.value"
            @click="setServer(opt.value)"
          >
            {{ opt.label }}
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

    <!-- Class filter chips -->
    <fieldset class="ak-operator-filters__group">
      <legend class="ak-operator-filters__label">
        {{ t('operators.filters.class') }}
      </legend>
      <div class="ak-operator-filters__chips-row" role="group">
        <AkChip
          class="ak-operator-filters__chip"
          :model-value="modelValue.classes.length === 0"
          @click="toggleAllClasses"
        >
          {{ t('operators.filters.allClasses') }}
        </AkChip>

        <AkChip
          v-for="cls in classesList"
          :key="cls"
          class="ak-operator-filters__chip"
          :class="{
            'ak-operator-filters__chip--active': modelValue.classes.includes(cls),
          }"
          :model-value="modelValue.classes.includes(cls)"
          @click="toggleClass(cls)"
        >
          {{ t('operators.classes.' + cls) }}
        </AkChip>
      </div>
    </fieldset>

    <!-- Rarity filter chips -->
    <fieldset class="ak-operator-filters__group">
      <legend class="ak-operator-filters__label">
        {{ t('operators.filters.rarity') }}
      </legend>
      <div class="ak-operator-filters__chips-row" role="group">
        <AkChip
          v-for="r in raritiesList"
          :key="r"
          class="ak-operator-filters__chip ak-operator-filters__chip--rarity"
          :class="[
            `ak-operator-filters__chip--rarity-${r}`,
            { 'ak-operator-filters__chip--active': modelValue.rarities.includes(r) },
          ]"
          :model-value="modelValue.rarities.includes(r)"
          @click="toggleRarity(r)"
        >
          {{ r }}★
        </AkChip>
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
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-bold);
  border-radius: var(--radius-none);
  min-width: 0;

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
    background-color: var(--color-bg-deep);
    border-radius: var(--radius-none);
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
      background-color var(--transition-fast),
      color var(--transition-fast);

    &:hover {
      color: var(--color-text-primary);
    }

    &:focus-visible {
      outline: 2px solid var(--color-accent-primary);
      outline-offset: -2px;
    }

    &--active {
      background-color: var(--color-accent-primary);
      color: var(--color-text-inverse);
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
    color: var(--color-text-muted);
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
    // Custom rarity modifiers
    &--rarity-6.ak-chip--active {
      border-color: var(--color-rarity-6);
      color: var(--color-rarity-6);
    }

    &--rarity-5.ak-chip--active {
      border-color: var(--color-rarity-5);
      color: var(--color-rarity-5);
    }

    &--rarity-4.ak-chip--active {
      border-color: var(--color-rarity-4);
      color: var(--color-rarity-4);
    }

    &--rarity-3.ak-chip--active {
      border-color: var(--color-rarity-3);
      color: var(--color-rarity-3);
    }

    &--rarity-2.ak-chip--active {
      border-color: var(--color-rarity-2);
      color: var(--color-rarity-2);
    }

    &--rarity-1.ak-chip--active {
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
    gap: var(--space-2xs);
    min-width: 0;
  }

  &__select {
    padding: var(--space-xs) var(--space-sm);
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    background-color: var(--color-bg-deep);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-bold);
    border-radius: var(--radius-none);
    cursor: pointer;
    transition: border-color var(--transition-fast);

    @include focus-ring;

    &:hover {
      border-color: var(--color-accent-primary);
    }
  }
}
</style>
