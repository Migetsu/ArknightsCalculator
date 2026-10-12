<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

interface Props {
  modelValue: boolean
  title?: string
  tag?: string
  width?: string
  teleport?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  tag: undefined,
  width: '560px',
  teleport: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
}>()

const modalPanelRef = ref<HTMLElement | null>(null)
let previousActiveElement: HTMLElement | null = null

function closeModal(): void {
  emit('update:modelValue', false)
  emit('close')
}

function handleKeydown(event: KeyboardEvent): void {
  if (!props.modelValue) return

  if (event.key === 'Escape') {
    event.preventDefault()
    closeModal()
    return
  }

  // Focus trap inside modal
  if (event.key === 'Tab' && modalPanelRef.value) {
    const focusableElements = modalPanelRef.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )

    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (!firstElement || !lastElement) return

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
  }
}

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      if (typeof document !== 'undefined') {
        previousActiveElement = document.activeElement as HTMLElement | null
        document.body.style.overflow = 'hidden'
      }

      await nextTick()

      // Focus first focusable element inside modal
      if (modalPanelRef.value) {
        const firstFocusable = modalPanelRef.value.querySelector<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
        if (firstFocusable) {
          firstFocusable.focus()
        } else {
          modalPanelRef.value.focus()
        }
      }
    } else {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = ''
        if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
          previousActiveElement.focus()
        }
      }
    }
  },
)

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeydown)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown)
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <Teleport to="body" :disabled="!teleport">
    <div
      v-if="modelValue"
      class="ak-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="title || tag || 'Modal Dialog'"
    >
      <div class="ak-modal__backdrop" @click="closeModal" />

      <div ref="modalPanelRef" class="ak-modal__panel" :style="{ maxWidth: width }" tabindex="-1">
        <div class="ak-modal__strip" />

        <div class="ak-modal__container">
          <header class="ak-modal__header">
            <div class="ak-modal__title-group">
              <span v-if="tag" class="ak-modal__tag">{{ tag }}</span>
              <h2 v-if="title" class="ak-modal__title">{{ title }}</h2>
            </div>

            <button
              type="button"
              class="ak-modal__close"
              aria-label="Close dialog"
              @click="closeModal"
            >
              <span class="ak-modal__close-icon">✕</span>
            </button>
          </header>

          <div class="ak-modal__body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="ak-modal__footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.ak-modal {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-md);

  &__backdrop {
    position: absolute;
    inset: 0;
    background-color: var(--color-bg-overlay);
    backdrop-filter: blur(4px);
    transition: opacity var(--transition-base);
  }

  &__panel {
    position: relative;
    width: 100%;
    display: flex;
    background: linear-gradient(135deg, var(--color-bg-surface) 0%, var(--color-bg-card) 100%);
    border: 1px solid var(--color-border-bold);
    box-shadow:
      var(--shadow-panel),
      0 0 35px rgb(0 0 0 / 80%);
    max-height: calc(100vh - var(--space-xl));
    overflow-y: auto;
    z-index: 1;

    @include cut-corner(16px, top-right);
    @include focus-ring-clipped;
  }

  &__strip {
    width: 5px;
    background-color: var(--color-accent-primary);
    box-shadow: 0 0 10px var(--color-accent-primary-glow);
    flex-shrink: 0;
  }

  &__container {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    padding: var(--space-md) var(--space-lg);
    border-bottom: 1px solid var(--color-border-bold);
    background-color: var(--color-bg-elevated);
  }

  &__title-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    min-width: 0;
  }

  &__tag {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-mono);
    color: var(--color-accent-primary);
    text-transform: uppercase;
    line-height: 1.2;

    @include text-truncate;
  }

  &__title {
    font-family: var(--font-heading);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-heading);
    color: var(--color-text-primary);
    margin: 0;
    line-height: 1.2;

    @include text-truncate;
  }

  &__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: 1px solid var(--color-border-bold);
    background-color: var(--color-bg-subtle);
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
    cursor: pointer;
    flex-shrink: 0;
    transition:
      border-color var(--transition-fast),
      color var(--transition-fast),
      background-color var(--transition-fast),
      box-shadow var(--transition-fast);

    @include cut-corner(4px, top-right);
    @include focus-ring;

    &:hover {
      border-color: var(--color-accent-primary);
      color: var(--color-accent-primary);
      background-color: var(--color-accent-primary-subtle);
      box-shadow: 0 0 8px var(--color-accent-primary-glow);
    }
  }

  &__close-icon {
    line-height: 1;
  }

  &__body {
    padding: var(--space-lg);
    flex: 1;
    overflow-y: auto;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-md);
    padding: var(--space-md) var(--space-lg);
    border-top: 1px solid var(--color-border-subtle);
    background-color: var(--color-bg-elevated);
  }
}
</style>
