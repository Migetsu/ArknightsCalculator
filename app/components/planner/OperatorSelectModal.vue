<script setup lang="ts">
import { ref, computed } from 'vue'
import rawOperatorsData from '~/../data/operators-index.json'
import {
  resolveI18nString,
  type OperatorSummary,
  type ContentLocale,
} from '~/../shared/schemas/operator'
import AkModal from '~/components/ui/AkModal.vue'
import AkInput from '~/components/ui/AkInput.vue'
import AkAvatar from '~/components/ui/AkAvatar.vue'
import AkBadge from '~/components/ui/AkBadge.vue'
import AkOperatorName from '~/components/ui/AkOperatorName.vue'

interface Props {
  modelValue: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'select', operatorId: string): void
}>()

const { t, locale } = useI18n()
const searchQuery = ref('')
const selectedClass = ref<string>('all')

const allOperators = rawOperatorsData as unknown as readonly OperatorSummary[]

const classOptions = [
  { value: 'all', labelKey: 'operators.filters.allClasses' },
  { value: 'PIONEER', labelKey: 'operators.classes.PIONEER' },
  { value: 'WARRIOR', labelKey: 'operators.classes.WARRIOR' },
  { value: 'TANK', labelKey: 'operators.classes.TANK' },
  { value: 'SNIPER', labelKey: 'operators.classes.SNIPER' },
  { value: 'CASTER', labelKey: 'operators.classes.CASTER' },
  { value: 'MEDIC', labelKey: 'operators.classes.MEDIC' },
  { value: 'SUPPORT', labelKey: 'operators.classes.SUPPORT' },
  { value: 'SPECIALIST', labelKey: 'operators.classes.SPECIALIST' },
]

const filteredOperators = computed<OperatorSummary[]>(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const cls = selectedClass.value
  const currentLocale = locale.value as ContentLocale

  return allOperators
    .filter((op) => {
      if (cls !== 'all' && op.class !== cls) return false
      if (!q) return true

      const locName = resolveI18nString(op.name, currentLocale).toLowerCase()
      const enName = (op.name.en || '').toLowerCase()
      const zhName = (op.name.zh || '').toLowerCase()
      const idStr = op.id.toLowerCase()

      return locName.includes(q) || enName.includes(q) || zhName.includes(q) || idStr.includes(q)
    })
    .slice(0, 48) // Limit rendered items for snappy performance
})

function getRarity(r: number): 1 | 2 | 3 | 4 | 5 | 6 {
  return (r >= 1 && r <= 6 ? r : 5) as 1 | 2 | 3 | 4 | 5 | 6
}

function handleSelect(id: string): void {
  emit('select', id)
  emit('update:modelValue', false)
  searchQuery.value = ''
}
</script>

<template>
  <AkModal
    :model-value="modelValue"
    :title="t('planner.addOperatorModalTitle')"
    tag="OPERATOR SELECTION"
    width="680px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="op-modal">
      <div class="op-modal__search-bar">
        <AkInput
          v-model="searchQuery"
          :placeholder="t('planner.searchOperatorPlaceholder')"
          size="md"
          clearable
          autofocus
        />
      </div>

      <div class="op-modal__classes">
        <button
          v-for="opt in classOptions"
          :key="opt.value"
          type="button"
          class="op-modal__class-btn"
          :class="{ 'op-modal__class-btn--active': selectedClass === opt.value }"
          @click="selectedClass = opt.value"
        >
          {{ t(opt.labelKey) }}
        </button>
      </div>

      <div class="op-modal__list" role="listbox">
        <button
          v-for="op in filteredOperators"
          :key="op.id"
          type="button"
          class="op-modal__item"
          role="option"
          @click="handleSelect(op.id)"
        >
          <AkAvatar
            :id="op.id"
            :name="resolveI18nString(op.name, locale as ContentLocale)"
            :rarity="getRarity(op.rarity)"
            size="48"
          />
          <div class="op-modal__item-info">
            <span class="op-modal__item-name">
              <AkOperatorName :name="resolveI18nString(op.name, locale as ContentLocale)" />
            </span>
            <div class="op-modal__item-tags">
              <AkBadge variant="neutral" size="sm">★{{ op.rarity }}</AkBadge>
              <span class="op-modal__item-class">{{ t('operators.classes.' + op.class) }}</span>
            </div>
          </div>
        </button>

        <div v-if="filteredOperators.length === 0" class="op-modal__empty">
          {{ t('planner.noOperatorsFound') }}
        </div>
      </div>
    </div>
  </AkModal>
</template>

<style lang="scss" scoped>
.op-modal {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  max-height: 70vh;

  &__search-bar {
    display: flex;
    flex-direction: column;
  }

  &__classes {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  &__class-btn {
    padding: var(--space-2xs) var(--space-sm);
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-none);
    cursor: pointer;
    transition:
      color var(--transition-fast),
      border-color var(--transition-fast);

    &:hover {
      color: var(--color-text-primary);
      border-color: var(--color-accent-primary);
    }

    &--active {
      color: var(--color-bg-base);
      background: var(--color-accent-primary);
      border-color: var(--color-accent-primary);
      font-weight: 600;
    }
  }

  &__list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--space-xs);
    overflow-y: auto;
    max-height: 420px;
    padding-right: var(--space-2xs);

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--color-border-bold);
    }
  }

  &__item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-xs) var(--space-sm);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-none);
    cursor: pointer;
    text-align: left;
    transition:
      background var(--transition-fast),
      border-color var(--transition-fast);

    &:hover {
      background: var(--color-bg-card-hover);
      border-color: var(--color-accent-primary);
    }
  }

  &__item-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__item-name {
    font-family: var(--font-heading);
    font-size: var(--font-size-sm);
    font-weight: 700;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__item-tags {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  &__item-class {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-muted);
  }

  &__empty {
    grid-column: 1 / -1;
    text-align: center;
    padding: var(--space-xl);
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }
}
</style>
