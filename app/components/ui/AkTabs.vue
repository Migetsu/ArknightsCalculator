<script setup lang="ts">
export interface TabItem {
  id: string
  label: string
  disabled?: boolean
}

interface Props {
  modelValue: string
  items: TabItem[]
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
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
  <div class="ak-tabs">
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

  &__list {
    display: flex;
    gap: var(--space-xs);
    border-bottom: 2px solid var(--color-border-subtle);
    overflow-x: auto;
    padding-bottom: 1px;
  }

  &__tab {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-md);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-secondary);
    background-color: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-bottom: none;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-mono);
    clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
    position: relative;
    top: 2px;
    transition:
      color var(--transition-fast),
      background-color var(--transition-fast),
      border-color var(--transition-fast);
    white-space: nowrap;

    @include focus-ring-clipped;

    &:hover:not(:disabled, .ak-tabs__tab--active) {
      color: var(--color-text-primary);
      background-color: var(--color-bg-subtle);
      border-color: var(--color-border-base);
    }

    &--active {
      color: var(--color-text-inverse);
      background-color: var(--color-accent-primary);
      border-color: var(--color-accent-primary);
      box-shadow: 0 0 12px rgb(0 240 255 / 35%);
    }

    &--disabled {
      cursor: not-allowed;
      opacity: 0.35;
    }
  }

  &__label {
    display: inline-block;
  }

  &__content {
    @include focus-ring;
  }
}
</style>
