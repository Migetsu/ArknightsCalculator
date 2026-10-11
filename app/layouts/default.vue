<script setup lang="ts">
import { useScrollLock } from '@vueuse/core'

interface NavLinkItem {
  to: string
  labelKey: string
}

const { t } = useI18n()
const localePath = useLocalePath()

const head = useLocaleHead({
  seo: true,
})

useHead(() => ({
  htmlAttrs: {
    lang: head.value.htmlAttrs?.lang,
    dir: head.value.htmlAttrs?.dir,
  },
  link: [...(head.value.link || [])],
  meta: [...(head.value.meta || [])],
}))

const navLinks: NavLinkItem[] = [
  { to: '/operators', labelKey: 'navigation.operators' },
  { to: '/planner', labelKey: 'navigation.planner' },
  { to: '/depot', labelKey: 'navigation.depot' },
  { to: '/farm', labelKey: 'navigation.farm' },
  { to: '/recruit', labelKey: 'navigation.recruit' },
  { to: '/gacha', labelKey: 'navigation.gacha' },
]

const isMobileMenuOpen = ref(false)
const burgerButtonRef = ref<HTMLButtonElement | null>(null)
const mobileMenuRef = ref<HTMLElement | null>(null)

// Lock body scroll while mobile drawer is open
const isLocked = useScrollLock(typeof document !== 'undefined' ? document.body : null)

function openMobileMenu(): void {
  isMobileMenuOpen.value = true
  isLocked.value = true
  nextTick(() => {
    const firstLink = mobileMenuRef.value?.querySelector<HTMLAnchorElement>('a')
    firstLink?.focus()
  })
}

function closeMobileMenu(): void {
  if (!isMobileMenuOpen.value) return
  isMobileMenuOpen.value = false
  isLocked.value = false
  nextTick(() => {
    burgerButtonRef.value?.focus()
  })
}

function toggleMobileMenu(): void {
  if (isMobileMenuOpen.value) {
    closeMobileMenu()
  } else {
    openMobileMenu()
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && isMobileMenuOpen.value) {
    event.preventDefault()
    closeMobileMenu()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  isLocked.value = false
})
</script>

<template>
  <div class="layout-default">
    <header class="layout-default__header">
      <div class="layout-default__brand-group">
        <NuxtLink :to="localePath('/')" class="layout-default__brand">
          <span class="layout-default__brand-tag">PRTS</span>
          <span class="layout-default__brand-text">{{ t('layout.header.title') }}</span>
        </NuxtLink>
      </div>

      <nav class="layout-default__desktop-nav" aria-label="Main Navigation">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="localePath(link.to)"
          class="layout-default__nav-link"
        >
          {{ t(link.labelKey) }}
        </NuxtLink>
      </nav>

      <div class="layout-default__actions">
        <LayoutLanguageSwitcher />

        <button
          ref="burgerButtonRef"
          type="button"
          class="layout-default__burger"
          :aria-expanded="isMobileMenuOpen"
          aria-controls="mobile-navigation"
          :aria-label="t('layout.menu.toggle')"
          @click="toggleMobileMenu"
        >
          <span class="layout-default__burger-line" />
          <span class="layout-default__burger-line" />
          <span class="layout-default__burger-line" />
        </button>
      </div>
    </header>

    <!-- Mobile Drawer Overlay -->
    <div
      v-if="isMobileMenuOpen"
      class="layout-default__mobile-overlay"
      aria-hidden="true"
      @click="closeMobileMenu"
    />

    <!-- Mobile Drawer Menu -->
    <aside
      id="mobile-navigation"
      ref="mobileMenuRef"
      class="layout-default__mobile-menu"
      :class="{ 'layout-default__mobile-menu--open': isMobileMenuOpen }"
      :aria-hidden="!isMobileMenuOpen"
    >
      <div class="layout-default__mobile-header">
        <span class="layout-default__mobile-title">{{ t('layout.header.title') }}</span>
        <button
          type="button"
          class="layout-default__mobile-close"
          :aria-label="t('layout.menu.close')"
          @click="closeMobileMenu"
        >
          <span class="layout-default__mobile-close-icon">✕</span>
        </button>
      </div>

      <nav class="layout-default__mobile-nav" aria-label="Mobile Navigation">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="localePath(link.to)"
          class="layout-default__mobile-nav-link"
          @click="closeMobileMenu"
        >
          {{ t(link.labelKey) }}
        </NuxtLink>
      </nav>
    </aside>

    <main class="layout-default__main">
      <slot />
    </main>

    <footer class="layout-default__footer">
      <div class="layout-default__footer-content">
        <p class="layout-default__disclaimer">
          {{ t('layout.footer.disclaimer') }}
        </p>
      </div>
    </footer>
  </div>
</template>

<style lang="scss" scoped>
.layout-default {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-base);
  color: var(--color-text-primary);

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm) var(--space-md);
    background-color: var(--color-bg-surface);
    border-bottom: 1px solid var(--color-border-subtle);
    position: sticky;
    top: 0;
    z-index: var(--z-header);

    @include mq(md) {
      padding: var(--space-sm) var(--space-xl);
    }
  }

  &__brand-group {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  &__brand {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    font-family: var(--font-heading);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    text-transform: uppercase;
    letter-spacing: 0.05em;

    @include focus-ring;
  }

  &__brand-tag {
    display: inline-block;
    padding: var(--space-2xs) var(--space-xs);
    font-size: var(--font-size-xs);
    font-family: var(--font-mono);
    font-weight: var(--font-weight-bold);
    background-color: var(--color-accent-primary);
    color: var(--color-text-inverse);
    border-radius: var(--radius-xs);
  }

  &__brand-text {
    font-size: var(--font-size-md);
  }

  &__desktop-nav {
    display: none;
    align-items: center;
    gap: var(--space-md);

    @include mq(md) {
      display: flex;
    }
  }

  &__nav-link {
    font-family: var(--font-heading);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: var(--space-2xs) var(--space-xs);
    border-bottom: 2px solid transparent;
    transition:
      color var(--transition-fast),
      border-color var(--transition-fast);

    @include focus-ring;

    &:hover {
      color: var(--color-text-primary);
      border-bottom-color: var(--color-accent-primary);
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  &__burger {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    width: 2rem;
    height: 2rem;
    padding: 4px;
    cursor: pointer;
    background: transparent;
    border: 1px solid var(--color-border-base);
    border-radius: var(--radius-xs);
    color: var(--color-text-primary);

    @include focus-ring;

    @include mq(md) {
      display: none;
    }
  }

  &__burger-line {
    width: 100%;
    height: 2px;
    background-color: currentcolor;
    border-radius: 1px;
    transition: transform var(--transition-fast);
  }

  &__mobile-overlay {
    position: fixed;
    inset: 0;
    background-color: var(--color-bg-overlay);
    z-index: var(--z-backdrop);
    backdrop-filter: blur(2px);

    @include mq(md) {
      display: none;
    }
  }

  &__mobile-menu {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 280px;
    max-width: 80vw;
    background-color: var(--color-bg-surface);
    border-left: 1px solid var(--color-border-base);
    z-index: var(--z-drawer);
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-panel);
    transform: translateX(100%);
    visibility: hidden;
    pointer-events: none;
    transition:
      transform var(--transition-base),
      visibility var(--transition-base);

    @include mq(md) {
      display: none;
    }

    &--open {
      transform: translateX(0);
      visibility: visible;
      pointer-events: auto;
    }
  }

  &__mobile-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  &__mobile-title {
    font-family: var(--font-heading);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;

    @include text-truncate;
  }

  &__mobile-close {
    padding: var(--space-2xs) var(--space-xs);
    color: var(--color-text-muted);
    font-size: var(--font-size-md);

    @include focus-ring;

    &:hover {
      color: var(--color-text-primary);
    }
  }

  &__mobile-close-icon {
    display: inline-block;
  }

  &__mobile-nav {
    display: flex;
    flex-direction: column;
    padding: var(--space-md);
    gap: var(--space-xs);
    flex: 1;
    overflow-y: auto;
  }

  &__mobile-nav-link {
    font-family: var(--font-heading);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: var(--space-sm) var(--space-md);
    border-left: 3px solid transparent;
    background-color: var(--color-bg-elevated);
    transition:
      border-color var(--transition-fast),
      background-color var(--transition-fast);

    @include focus-ring;

    &:hover {
      border-left-color: var(--color-accent-primary);
      background-color: var(--color-bg-subtle);
    }
  }

  &__main {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  &__footer {
    padding: var(--space-md) var(--space-lg);
    background-color: var(--color-bg-surface);
    border-top: 1px solid var(--color-border-subtle);
    text-align: center;
  }

  &__footer-content {
    max-width: 1200px;
    margin: 0 auto;
  }

  &__disclaimer {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    line-height: var(--line-height-relaxed);
    margin: 0;
  }
}
</style>
