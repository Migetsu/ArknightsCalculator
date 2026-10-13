<script setup lang="ts">
import { ref } from 'vue'

export interface TabItem {
  id: string
  label: string
  disabled?: boolean
}

interface Props {
  modelValue: string
  items: TabItem[]
  variant?: 'buttons' | 'underline'
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'buttons',
  ariaLabel: 'Tabs',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const tabRefs = ref<HTMLElement[]>([])

function selectTab(id: string): void {
  const target = props.items.find((item) => item.id === id)
  if (!target || target.disabled) return
  emit('update:modelValue', id)
}

function getEnabledIndices(): number[] {
  return props.items.map((item, idx) => (item.disabled ? -1 : idx)).filter((idx) => idx !== -1)
}

function handleKeydown(event: KeyboardEvent, currentIndex: number): void {
  const enabled = getEnabledIndices()
  if (enabled.length === 0) return

  const enabledPos = enabled.indexOf(currentIndex)
  let nextIndex: number | undefined

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    const nextPos = (enabledPos + 1) % enabled.length
    nextIndex = enabled[nextPos]
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    const prevPos = (enabledPos - 1 + enabled.length) % enabled.length
    nextIndex = enabled[prevPos]
  } else if (event.key === 'Home') {
    event.preventDefault()
    nextIndex = enabled[0]
  } else if (event.key === 'End') {
    event.preventDefault()
    nextIndex = enabled[enabled.length - 1]
  }

  if (nextIndex !== undefined) {
    const nextItem = props.items[nextIndex]
    if (nextItem) {
      selectTab(nextItem.id)
      const el = tabRefs.value[nextIndex]
      el?.focus()
    }
  }
}
</script>

<template>
  <div class="ak-tabs" :class="`ak-tabs--${variant}`">
    <div class="ak-tabs__list" role="tablist" :aria-label="ariaLabel">
      <button
        v-for="(item, idx) in items"
        :id="`tab-${item.id}`"
        :key="item.id"
        :ref="(el) => (tabRefs[idx] = el as HTMLElement)"
        type="button"
        role="tab"
        class="ak-tabs__tab"
        :class="{
          'ak-tabs__tab--active': item.id === modelValue,
          'ak-tabs__tab--disabled': item.disabled,
        }"
        :aria-selected="item.id === modelValue"
        :aria-controls="`panel-${item.id}`"
        :tabindex="item.id === modelValue ? 0 : -1"
        :disabled="item.disabled"
        @click="selectTab(item.id)"
        @keydown="handleKeydown($event, idx)"
      >
        <span class="ak-tabs__label">{{ item.label }}</span>
      </button>
    </div>

    <div
      :id="`panel-${modelValue}`"
      class="ak-tabs__content"
      role="tabpanel"
      :aria-labelledby="`tab-${modelValue}`"
      tabindex="0"
    >
      <slot :active-tab="modelValue" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ak-tabs {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);

  // Variant: buttons (Active Ember #ff6a3d, inactive transparent/panel with border)
  &--buttons {
    .ak-tabs__list {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .ak-tabs__tab {
      padding: 10px 20px;
      font-family: var(--font-body);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
      background-color: var(--color-bg-surface);
      border: 1px solid var(--color-border-bold);
      border-radius: var(--radius-none);
      cursor: pointer;
      white-space: nowrap;
      transition:
        background-color var(--transition-fast),
        border-color var(--transition-fast),
        color var(--transition-fast);

      @include focus-ring;

      &:hover:not(:disabled, .ak-tabs__tab--active) {
        border-color: var(--color-text-accent);
        color: var(--color-text-accent);
      }

      &--active {
        background-color: var(--color-accent-primary);
        border-color: var(--color-accent-primary);
        color: var(--color-text-inverse);

        &:hover:not(:disabled) {
          background-color: var(--color-accent-primary-hover);
          color: var(--color-text-inverse);
        }
      }

      &--disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }
    }
  }

  // Variant: underline (Used in sync-modal and operator-detail)
  &--underline {
    .ak-tabs__list {
      display: flex;
      gap: 16px;
      max-width: 100%;
      border-bottom: 1px solid var(--color-border-base);
      overflow-x: auto;
      scrollbar-width: none;

      &::-webkit-scrollbar {
        display: none;
      }

      @include mq(md) {
        gap: 32px;
      }
    }

    .ak-tabs__tab {
      flex-shrink: 0;
      background: none;
      border: none;
      border-bottom: 3px solid transparent;
      padding: 0 0 12px;
      color: var(--color-text-secondary);
      font-family: var(--font-body);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      cursor: pointer;
      white-space: nowrap;
      transition:
        color var(--transition-fast),
        border-bottom-color var(--transition-fast);

      @include focus-ring;

      &:hover:not(:disabled, .ak-tabs__tab--active) {
        color: var(--color-text-accent);
      }

      &--active {
        color: var(--color-text-primary);
        border-bottom-color: var(--color-accent-primary);
      }

      &--disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }
    }
  }

  &__content {
    @include focus-ring;
  }
}
</style>
