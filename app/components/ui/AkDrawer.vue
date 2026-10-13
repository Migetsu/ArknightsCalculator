<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

interface Props {
  modelValue: boolean
  tag?: string
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  tag: 'TERMINAL // NAVIGATION',
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
  }
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      id="tactical-drawer"
      class="ak-drawer"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
    >
      <div class="ak-drawer__backdrop" aria-hidden="true" @click="closeDrawer" />

      <aside ref="drawerRef" class="ak-drawer__panel" tabindex="-1">
        <header class="ak-drawer__header">
          <div class="ak-drawer__header-meta">
            <span class="ak-drawer__tag">{{ tag }}</span>
            <h2 class="ak-drawer__title">{{ title }}</h2>
          </div>

          <button
            type="button"
            class="ak-drawer__close"
            aria-label="Close navigation"
            @click="closeDrawer"
          >
            &times;
          </button>
        </header>

        <div v-if="$slots.user" class="ak-drawer__user-slot">
          <slot name="user" />
        </div>

        <nav class="ak-drawer__body" aria-label="Mobile navigation">
          <slot />
        </nav>

        <footer v-if="$slots.footer" class="ak-drawer__footer">
          <slot name="footer" />
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
    background-color: rgb(7 5 10 / 80%);
    backdrop-filter: blur(4px);
    transition: opacity var(--transition-base);
  }

  &__panel {
    position: relative;
    width: 100%;
    max-width: 380px;
    height: 100%;
    background-color: var(--color-bg-surface); // #17110f
    border-left: 1px solid var(--color-border-bold);
    box-shadow: var(--shadow-modal);
    display: flex;
    flex-direction: column;
    z-index: 1;

    @include focus-ring;
  }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--color-border-subtle);
  }

  &__header-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__tag {
    font-family: var(--font-body);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-caption);
    color: var(--color-text-accent);
    text-transform: uppercase;
  }

  &__title {
    font-family: var(--font-display);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
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

  &__user-slot {
    padding: 16px 24px;
    border-bottom: 1px solid var(--color-border-subtle);
    background-color: var(--color-bg-deep);
  }

  &__body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 24px;

    @include tech-scrollbar;
  }

  &__footer {
    padding: 16px 24px;
    border-top: 1px solid var(--color-border-subtle);
  }
}
</style>
