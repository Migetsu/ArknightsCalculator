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
  width: '620px',
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
  }
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <Teleport :to="teleport ? 'body' : undefined" :disabled="!teleport">
    <div
      v-if="modelValue"
      class="ak-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="title ?? 'Dialog'"
    >
      <div class="ak-modal__backdrop" aria-hidden="true" @click="closeModal" />

      <div ref="modalPanelRef" class="ak-modal__panel" :style="{ maxWidth: width }" tabindex="-1">
        <header v-if="tag || title || $slots.header" class="ak-modal__header">
          <slot name="header">
            <div class="ak-modal__title-group">
              <span v-if="tag" class="ak-modal__tag">{{ tag }}</span>
              <h2 v-if="title" class="ak-modal__title">{{ title }}</h2>
            </div>
          </slot>

          <button type="button" class="ak-modal__close" aria-label="Close" @click="closeModal">
            &times;
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
    background-color: rgb(7 5 10 / 80%);
    backdrop-filter: blur(4px);
    transition: opacity var(--transition-base);
  }

  &__panel {
    position: relative;
    width: 100%;
    background-color: var(--color-bg-surface); // #17110f
    border: 1px solid var(--color-border-bold);
    border-left: 4px solid var(--color-accent-primary); // 4px ember bar per DESIGN.md
    border-radius: var(--radius-none);
    box-shadow: var(--shadow-modal);
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 2 * var(--space-lg));
    z-index: 1;

    @include focus-ring;
  }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-md);
    padding: 24px 28px 18px;
    border-bottom: 1px solid var(--color-border-subtle);
  }

  &__title-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  &__tag {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-caption);
    color: var(--color-text-accent);
    text-transform: uppercase;
  }

  &__title {
    font-family: var(--font-display);
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    line-height: var(--line-height-tight);
    margin: 0;
  }

  &__close {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--color-text-secondary);
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    padding: 4px;
    transition: color var(--transition-fast);

    @include focus-ring;

    &:hover {
      color: var(--color-text-accent);
    }
  }

  &__body {
    padding: 24px 28px;
    overflow-y: auto;
    flex: 1;
    min-width: 0;

    @include tech-scrollbar;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-sm);
    padding: 18px 28px;
    border-top: 1px solid var(--color-border-subtle);
    background-color: rgb(0 0 0 / 15%);
  }
}
</style>
