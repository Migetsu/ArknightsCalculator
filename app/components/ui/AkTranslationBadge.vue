<script setup lang="ts">
import type { I18nSource } from '~~/shared/schemas/operator'

interface Props {
  source?: I18nSource
  stale?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  source: 'official',
  stale: false,
})

const { t } = useI18n()

// Only show badge when source is 'machine' or translation is stale
const isVisible = computed(() => props.source === 'machine' || props.stale)

const label = computed(() => {
  if (props.stale) return 'STALE'
  return 'MT'
})

const tooltipText = computed(() => {
  if (props.stale) return t('operators.detail.staleTranslation')
  return t('operators.detail.machineTranslation')
})
</script>

<template>
  <span
    v-if="isVisible"
    class="ak-translation-badge"
    :class="{
      'ak-translation-badge--stale': stale,
      'ak-translation-badge--machine': !stale && source === 'machine',
    }"
    :title="tooltipText"
    role="note"
    :aria-label="tooltipText"
  >
    <span class="ak-translation-badge__dot" aria-hidden="true" />
    <span class="ak-translation-badge__label">{{ label }}</span>
  </span>
</template>

<style lang="scss" scoped>
.ak-translation-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3xs, 4px);
  padding: 1px 5px;
  font-family: var(--font-mono, monospace);
  font-size: var(--font-size-2xs, 10px);
  font-weight: var(--font-weight-bold, 700);
  letter-spacing: 0.06em;
  line-height: 1.2;
  text-transform: uppercase;
  border-radius: var(--radius-none, 0);
  user-select: none;
  cursor: help;
  vertical-align: middle;

  &__dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background-color: currentcolor;
  }

  &__label {
    line-height: 1;
  }

  &--machine {
    border: 1px solid rgb(255 184 77 / 35%);
    background: rgb(255 184 77 / 10%);
    color: var(--color-accent-warning, #ffb84d);
  }

  &--stale {
    border: 1px solid rgb(235 87 87 / 40%);
    background: rgb(235 87 87 / 10%);
    color: var(--color-accent-danger, #eb5757);
  }
}
</style>
