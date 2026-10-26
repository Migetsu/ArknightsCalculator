<script setup lang="ts">
import { computed } from 'vue'
import { useFarmingStore } from '~/stores/farming'
import AkItemIcon from '~/components/ui/AkItemIcon.vue'

export interface FarmingDeficitItem {
  id: string
  total?: number
  remaining: number
  have: number
}

interface Props {
  items: readonly FarmingDeficitItem[] | FarmingDeficitItem[]
}

const props = defineProps<Props>()

const { t } = useI18n()
const farmingStore = useFarmingStore()

function getItemRarity(itemId: string): 1 | 2 | 3 | 4 | 5 {
  return farmingStore.getItemRarity(itemId)
}

function getItemIconId(itemId: string): string | undefined {
  return farmingStore.getItemIconId(itemId)
}

function getItemName(itemId: string): string {
  return farmingStore.getItemName(itemId)
}

const visibleItems = computed(() => props.items.filter((item) => item.remaining > 0))
</script>

<template>
  <div class="farming-deficit-table">
    <table class="farming-deficit-table__table">
      <thead class="farming-deficit-table__head">
        <tr class="farming-deficit-table__row farming-deficit-table__row--head">
          <th scope="col" class="farming-deficit-table__th farming-deficit-table__th--item">
            {{ t('farming.breakdownColumnItem') }}
          </th>
          <th scope="col" class="farming-deficit-table__th farming-deficit-table__th--num">
            {{ t('farming.breakdownColumnNeed') }}
          </th>
          <th scope="col" class="farming-deficit-table__th farming-deficit-table__th--num">
            {{ t('farming.breakdownColumnHave') }}
          </th>
          <th scope="col" class="farming-deficit-table__th farming-deficit-table__th--num">
            {{ t('farming.breakdownColumnRemaining') }}
          </th>
        </tr>
      </thead>
      <tbody class="farming-deficit-table__body">
        <tr
          v-for="item in visibleItems"
          :key="item.id"
          class="farming-deficit-table__row"
          data-testid="farming-deficit-row"
        >
          <td class="farming-deficit-table__td farming-deficit-table__td--item">
            <div class="farming-deficit-table__item-wrap">
              <AkItemIcon
                :item-id="item.id"
                :icon-id="getItemIconId(item.id)"
                :name="getItemName(item.id)"
                :tier="getItemRarity(item.id)"
                :size="36"
                class="farming-deficit-table__item-icon"
              />
              <span class="farming-deficit-table__item-name">{{ getItemName(item.id) }}</span>
            </div>
          </td>
          <td
            class="farming-deficit-table__td farming-deficit-table__td--num farming-deficit-table__td--need"
          >
            <span class="farming-deficit-table__num farming-deficit-table__num--need">
              {{ item.total !== undefined ? item.total.toLocaleString() : '—' }}
            </span>
          </td>
          <td
            class="farming-deficit-table__td farming-deficit-table__td--num farming-deficit-table__td--have"
          >
            <span class="farming-deficit-table__num farming-deficit-table__num--have">
              {{ item.have.toLocaleString() }}
            </span>
          </td>
          <td
            class="farming-deficit-table__td farming-deficit-table__td--num farming-deficit-table__td--remaining"
          >
            <span class="farming-deficit-table__num farming-deficit-table__num--remaining">
              {{ item.remaining.toLocaleString() }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style lang="scss" scoped>
.farming-deficit-table {
  width: 100%;
  overflow-x: auto;

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-sm);
  }

  &__head {
    background-color: var(--color-bg-deep);
  }

  &__body {
    background-color: transparent;
  }

  &__row {
    border-bottom: 1px solid var(--color-border-subtle);
    transition: background-color 0.15s ease;

    &:last-child {
      border-bottom: none;
    }

    &:hover:not(&--head) {
      background-color: var(--color-bg-elevated);
    }

    &--head {
      border-bottom: 1px solid var(--color-border-base);
    }
  }

  &__th {
    padding: var(--space-xs) var(--space-sm);
    color: var(--color-text-secondary);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-caption);
    text-align: left;

    &--item {
      text-align: left;
    }

    &--num {
      text-align: right;
      white-space: nowrap;
    }
  }

  &__td {
    padding: var(--space-xs) var(--space-sm);
    vertical-align: middle;

    &--item {
      text-align: left;
    }

    &--num {
      text-align: right;
      white-space: nowrap;
    }

    &--need {
      color: var(--color-text-secondary);
    }

    &--have {
      color: var(--color-text-secondary);
    }

    &--remaining {
      color: var(--color-accent-ember-light);
    }
  }

  &__item-wrap {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    min-width: 0;
  }

  &__item-icon {
    flex-shrink: 0;
  }

  &__item-name {
    color: var(--color-text-primary);
    font-weight: var(--font-weight-medium);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__num {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-weight: var(--font-weight-semibold);

    &--need {
      color: var(--color-text-secondary);
    }

    &--have {
      color: var(--color-text-secondary);
    }

    &--remaining {
      color: var(--color-accent-ember-light);
    }
  }
}
</style>
