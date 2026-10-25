<script setup lang="ts">
import { ref } from 'vue'
import AkModal from '~/components/ui/AkModal.vue'

interface Props {
  teleport?: boolean
}

withDefaults(defineProps<Props>(), {
  teleport: true,
})

const { t } = useI18n()

const isOpen = ref(false)

function toggle(): void {
  isOpen.value = !isOpen.value
}

function close(): void {
  isOpen.value = false
}
</script>

<template>
  <div class="gacha-pity-tooltip">
    <button
      type="button"
      class="gacha-pity-tooltip__trigger"
      :class="{ 'gacha-pity-tooltip__trigger--active': isOpen }"
      :aria-expanded="isOpen"
      aria-haspopup="dialog"
      :aria-label="t('gacha.pity.trigger')"
      @click.stop="toggle"
    >
      <span class="gacha-pity-tooltip__icon" aria-hidden="true">?</span>
    </button>

    <AkModal
      v-model="isOpen"
      :title="t('gacha.pity.title')"
      tag="GACHA // RULES & RATES"
      width="560px"
      :teleport="teleport"
      @close="close"
    >
      <div class="gacha-pity-tooltip__body">
        <div class="gacha-pity-tooltip__section">
          <h4 class="gacha-pity-tooltip__section-title">
            {{ t('gacha.pity.baseRateTitle') }}
          </h4>
          <p class="gacha-pity-tooltip__text">
            {{ t('gacha.pity.baseRate') }}
          </p>
        </div>

        <div class="gacha-pity-tooltip__section">
          <h4 class="gacha-pity-tooltip__section-title">
            {{ t('gacha.pity.limitedTitle') }}
          </h4>
          <p class="gacha-pity-tooltip__text">
            {{ t('gacha.pity.limited') }}
          </p>
        </div>

        <div class="gacha-pity-tooltip__section">
          <h4 class="gacha-pity-tooltip__section-title">
            {{ t('gacha.pity.standardSoloTitle') }}
          </h4>
          <p class="gacha-pity-tooltip__text">
            {{ t('gacha.pity.standardSolo') }}
          </p>
        </div>

        <div class="gacha-pity-tooltip__section">
          <h4 class="gacha-pity-tooltip__section-title">
            {{ t('gacha.pity.currencyTitle') }}
          </h4>
          <p class="gacha-pity-tooltip__text">
            {{ t('gacha.pity.currency') }}
          </p>
        </div>
      </div>
    </AkModal>
  </div>
</template>

<style lang="scss" scoped>
.gacha-pity-tooltip {
  display: inline-flex;
  align-items: center;

  &__trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border-radius: 50%;
    background-color: var(--color-bg-deep);
    border: 1px solid var(--color-border-subtle);
    color: var(--color-text-secondary);
    font-family: var(--font-mono, monospace);
    font-size: var(--font-size-xs, 12px);
    font-weight: var(--font-weight-bold, 700);
    line-height: 1;
    cursor: pointer;
    transition:
      border-color var(--transition-fast),
      color var(--transition-fast),
      background-color var(--transition-fast);

    &:hover,
    &--active {
      border-color: var(--color-accent-amber);
      color: var(--color-accent-amber);
      background-color: rgb(255 157 43 / 10%);
    }

    &:focus-visible {
      outline: 2px solid var(--color-accent-amber);
      outline-offset: 2px;
    }
  }

  &__icon {
    display: block;
    user-select: none;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm, 12px);
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: var(--space-sm, 12px);
    background-color: var(--color-bg-base);
    border: 1px solid var(--color-border-subtle);
    border-left: 3px solid var(--color-accent-amber);
  }

  &__section-title {
    margin: 0;
    font-family: var(--font-heading, sans-serif);
    font-size: var(--font-size-xs, 12px);
    font-weight: var(--font-weight-bold, 700);
    color: var(--color-accent-amber);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &__text {
    margin: 0;
    font-family: var(--font-body, sans-serif);
    font-size: var(--font-size-sm, 14px);
    line-height: var(--line-height-relaxed, 1.6);
    color: var(--color-text-secondary);
  }
}
</style>
