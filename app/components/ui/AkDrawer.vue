<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

interface Props {
  modelValue: boolean
  tag?: string
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  tag: 'PRTS // TACTICAL HUD',
  title: 'NAVIGATION',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
}>()

const drawerRef = ref<HTMLElement | null>(null)
let previousActiveElement: HTMLElement | null = null

function closeDrawer(): void {
  emit('update:modelValue', false)
  emit('close')
}

function handleKeydown(event: KeyboardEvent): void {
  if (!props.modelValue) return

  if (event.key === 'Escape') {
    event.preventDefault()
    closeDrawer()
    return
  }

  // Focus trap inside drawer
  if (event.key === 'Tab' && drawerRef.value) {
    const focusableElements = drawerRef.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

      if (drawerRef.value) {
        const firstFocusable = drawerRef.value.querySelector<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
        if (firstFocusable) {
          firstFocusable.focus()
        } else {
          drawerRef.value.focus()
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
  <Teleport to="body">
    <div v-if="modelValue" class="ak-drawer" role="dialog" aria-modal="true" :aria-label="title">
      <div class="ak-drawer__backdrop" @click="closeDrawer" />

      <aside ref="drawerRef" class="ak-drawer__panel" tabindex="-1">
        <header class="ak-drawer__header">
          <div class="ak-drawer__title-group">
            <span v-if="tag" class="ak-drawer__tag">{{ tag }}</span>
            <h2 v-if="title" class="ak-drawer__title">{{ title }}</h2>
          </div>

          <button
            type="button"
            class="ak-drawer__close"
            aria-label="Close navigation"
            @click="closeDrawer"
          >
            <span class="ak-drawer__close-label">CLOSE</span>
            <span class="ak-drawer__close-icon">✕</span>
          </button>
        </header>

        <div v-if="$slots.user" class="ak-drawer__user">
          <slot name="user" />
        </div>

        <nav class="ak-drawer__body" aria-label="Tactical Navigation">
          <slot />
        </nav>

        <footer class="ak-drawer__footer">
          <slot name="footer">
            <div class="ak-drawer__status">
              <span class="ak-drawer__status-dot" />
              <span class="ak-drawer__status-text">PRTS KERNEL v4.12</span>
            </div>
            <span class="ak-drawer__status-label">STATUS: OPTIMAL</span>
          </slot>
        </footer>
      </aside>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.ak-drawer {
  position: fixed;
  inset: 0;
  z-index: var(--z-drawer);
  display: flex;
  justify-content: flex-end;

  &__backdrop {
    position: absolute;
    inset: 0;
    background-color: var(--color-bg-overlay);
    backdrop-filter: blur(2px);
    transition: opacity var(--transition-base);
  }

  &__panel {
    position: relative;
    width: 380px;
    max-width: 88vw;
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--color-bg-surface);
    border-left: 1px solid var(--color-border-bold);
    box-shadow: -4px 0 24px rgb(0 0 0 / 60%);
    z-index: 1;
    overflow-y: auto;

    @include focus-ring;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    padding: var(--space-md) var(--space-lg);
    border-bottom: 1px solid var(--color-border-subtle);
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
  }

  &__title {
    font-family: var(--font-heading);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-heading);
    color: var(--color-text-primary);
    text-transform: uppercase;
    margin: 0;
    line-height: 1.2;
  }

  &__close {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2xs);
    padding: var(--space-2xs) var(--space-xs);
    border: 1px solid var(--color-border-base);
    background-color: var(--color-bg-subtle);
    color: var(--color-text-primary);
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-mono);
    cursor: pointer;
    transition:
      border-color var(--transition-fast),
      color var(--transition-fast),
      background-color var(--transition-fast);

    @include focus-ring;

    &:hover {
      border-color: var(--color-accent-primary);
      color: var(--color-accent-primary);
      background-color: var(--color-accent-primary-subtle);
    }
  }

  &__close-label {
    line-height: 1;
  }

  &__close-icon {
    line-height: 1;
  }

  &__user {
    padding: var(--space-md) var(--space-lg);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  &__body {
    display: flex;
    flex-direction: column;
    padding: var(--space-md) var(--space-lg);
    gap: var(--space-xs);
    flex: 1;
    overflow-y: auto;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-sm) var(--space-lg);
    border-top: 1px solid var(--color-border-subtle);
    background-color: var(--color-bg-elevated);
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    letter-spacing: var(--letter-spacing-mono);
    color: var(--color-text-secondary);
  }

  &__status {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  &__status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--color-accent-success);
    box-shadow: 0 0 6px var(--color-accent-success);
  }

  &__status-text {
    line-height: 1;
  }

  &__status-label {
    line-height: 1;
    color: var(--color-accent-primary);
  }
}
</style>
