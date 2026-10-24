<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const { t } = useI18n()

const isOpen = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)

function toggle(): void {
  isOpen.value = !isOpen.value
}

function close(): void {
  if (isOpen.value) {
    isOpen.value = false
    triggerRef.value?.focus()
  }
}

function handleKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && isOpen.value) {
    event.preventDefault()
    close()
  }
}

function handleClickOutside(event: MouseEvent): void {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div ref="rootRef" class="gacha-pity-tooltip">
    <button
      ref="triggerRef"
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

    <Transition name="gacha-pity-tooltip-fade">
      <div
        v-if="isOpen"
        class="gacha-pity-tooltip__popover"
        role="dialog"
        :aria-label="t('gacha.pity.title')"
      >
        <div class="gacha-pity-tooltip__header">
          <span class="gacha-pity-tooltip__title">{{ t('gacha.pity.title') }}</span>
          <button
            type="button"
            class="gacha-pity-tooltip__close-btn"
            aria-label="Close"
            @click.stop="close"
          >
            ✕
          </button>
        </div>

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
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
.gacha-pity-tooltip {
  position: relative;
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

  &__popover {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: var(--z-index-dropdown, 100);
    width: 360px;
    max-width: calc(100vw - 32px);
    background-color: var(--color-bg-surface);
    border: 1px solid var(--color-accent-amber);
    box-shadow: 0 8px 24px rgb(0 0 0 / 60%);
    padding: var(--space-md, 16px);
    display: flex;
    flex-direction: column;
    gap: var(--space-sm, 12px);
    clip-path: polygon(
      0 0,
      calc(100% - 10px) 0,
      100% 10px,
      100% 100%,
      10px 100%,
      0 calc(100% - 10px)
    );

    @media (width <= 480px) {
      right: -40px;
      width: calc(100vw - 32px);
      padding: var(--space-sm, 12px);
      gap: var(--space-xs, 8px);
    }
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: var(--space-xs, 8px);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  &__title {
    font-family: var(--font-mono, monospace);
    font-size: var(--font-size-xs, 12px);
    font-weight: var(--font-weight-bold, 700);
    color: var(--color-accent-amber);
    letter-spacing: 0.08em;
  }

  &__close-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    background: transparent;
    border: none;
    color: var(--color-text-tertiary);
    font-size: 14px;
    cursor: pointer;
    transition: color var(--transition-fast);

    &:hover {
      color: var(--color-text-primary);
    }
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm, 12px);
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__section-title {
    margin: 0;
    font-family: var(--font-heading, sans-serif);
    font-size: var(--font-size-xs, 12px);
    font-weight: var(--font-weight-semibold, 600);
    color: var(--color-text-primary);
    letter-spacing: 0.04em;
  }

  &__text {
    margin: 0;
    font-family: var(--font-body, sans-serif);
    font-size: var(--font-size-xs, 12px);
    line-height: 1.45;
    color: var(--color-text-secondary);
  }
}

.gacha-pity-tooltip-fade-enter-active,
.gacha-pity-tooltip-fade-leave-active {
  transition:
    opacity var(--transition-fast),
    transform var(--transition-fast);
}

.gacha-pity-tooltip-fade-enter-from,
.gacha-pity-tooltip-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
