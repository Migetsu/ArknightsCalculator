<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import AkButton from '~/components/ui/AkButton.vue'
import AkDrawer from '~/components/ui/AkDrawer.vue'
import SyncAccountModal from '~/components/sync/SyncAccountModal.vue'

interface ModuleItem {
  to: string
  code: string
  labelKey: string
  descKey: string
  icon: string
}

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

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

const modules: ModuleItem[] = [
  {
    to: '/',
    code: 'DSH-00',
    labelKey: 'navigation.dashboard',
    descKey: 'navigation.dashboardDesc',
    icon: '⊞',
  },
  {
    to: '/planner',
    code: 'PLN-01',
    labelKey: 'navigation.planner',
    descKey: 'navigation.plannerDesc',
    icon: '📋',
  },
  {
    to: '/gacha',
    code: 'GCH-02',
    labelKey: 'navigation.gacha',
    descKey: 'navigation.gachaDesc',
    icon: '✦',
  },
  {
    to: '/recruit',
    code: 'RCR-03',
    labelKey: 'navigation.recruit',
    descKey: 'navigation.recruitDesc',
    icon: '🔍',
  },
  {
    to: '/operators',
    code: 'OPS-04',
    labelKey: 'navigation.operators',
    descKey: 'navigation.operatorsDesc',
    icon: '👥',
  },
  {
    to: '/depot',
    code: 'INV-05',
    labelKey: 'navigation.depot',
    descKey: 'navigation.depotDesc',
    icon: '📦',
  },
  {
    to: '/settings',
    code: 'SET-06',
    labelKey: 'navigation.settings',
    descKey: 'navigation.settingsDesc',
    icon: '⚙',
  },
]

const isDrawerOpen = ref(false)
const isSyncModalOpen = ref(false)

function openDrawer(): void {
  isDrawerOpen.value = true
}

function closeDrawer(): void {
  isDrawerOpen.value = false
}

function openSyncModal(): void {
  isSyncModalOpen.value = true
}

function isModuleActive(path: string): boolean {
  const currentPath = route.path
  const localizedTarget = localePath(path)
  if (path === '/') {
    return currentPath === localizedTarget || currentPath === '/ru'
  }
  return currentPath.startsWith(localizedTarget)
}
</script>

<template>
  <div class="layout-default">
    <header class="layout-default__header">
      <div class="layout-default__brand-group">
        <NuxtLink :to="localePath('/')" class="layout-default__brand">
          <!-- Original geometric symbol: Terminal Delta (NOT Rhodes Island logo) -->
          <span class="layout-default__brand-logo" aria-hidden="true">
            <svg
              class="layout-default__brand-svg"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
            >
              <rect
                x="2.5"
                y="2.5"
                width="19"
                height="19"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <polygon points="12,6 18,17.5 6,17.5" fill="currentColor" />
            </svg>
          </span>

          <div class="layout-default__brand-text-block">
            <span class="layout-default__brand-title">ARKCALC</span>
            <span class="layout-default__brand-sub">
              {{ t('layout.header.brandSubtitle') }}
            </span>
          </div>
        </NuxtLink>
      </div>

      <div class="layout-default__actions">
        <!-- Doctor Status Pill -->
        <div class="layout-default__doctor-pill" title="Doctor Status">
          <span class="layout-default__status-dot" aria-hidden="true" />
          <span class="layout-default__doctor-name">
            {{ t('layout.doctor.title') }}
          </span>
          <span class="layout-default__doctor-lvl"> {{ t('layout.doctor.level') }} [EN] </span>
        </div>

        <!-- Sync Button -->
        <AkButton
          variant="secondary"
          size="sm"
          class="layout-default__sync-btn"
          @click="openSyncModal"
        >
          <span class="layout-default__sync-icon" aria-hidden="true">⟳</span>
          {{ t('common.sync') }}
        </AkButton>

        <!-- Menu Button (Opens Drawer) -->
        <AkButton
          variant="ghost"
          size="sm"
          class="layout-default__burger"
          :aria-expanded="isDrawerOpen"
          aria-controls="tactical-drawer"
          :aria-label="t('layout.menu.toggle')"
          @click="openDrawer"
        >
          <span class="layout-default__burger-bars" aria-hidden="true">
            <span class="layout-default__burger-bar" />
            <span class="layout-default__burger-bar" />
            <span class="layout-default__burger-bar" />
          </span>
          <span class="layout-default__burger-text">
            {{ t('common.menu') }}
          </span>
        </AkButton>

        <!-- Language Switcher -->
        <LayoutLanguageSwitcher />
      </div>
    </header>

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

    <!-- Tactical Navigation Drawer -->
    <AkDrawer v-model="isDrawerOpen" :tag="t('layout.menu.tag')" :title="t('layout.menu.title')">
      <template #user>
        <div class="layout-default__user-card">
          <div class="layout-default__user-avatar">
            <span class="layout-default__user-initials">DR</span>
            <span class="layout-default__user-dot" aria-hidden="true" />
          </div>

          <div class="layout-default__user-meta">
            <div class="layout-default__user-row">
              <span class="layout-default__user-title">
                {{ t('layout.doctor.title') }}
              </span>
              <span class="layout-default__user-level">
                {{ t('layout.doctor.level') }}
              </span>
            </div>
            <span class="layout-default__user-server">
              {{ t('layout.doctor.server') }}
            </span>
          </div>

          <AkButton variant="secondary" size="sm" @click="openSyncModal">
            {{ t('common.sync') }}
          </AkButton>
        </div>
      </template>

      <div class="layout-default__nav-list">
        <div class="layout-default__nav-header">
          <span class="layout-default__nav-heading">
            {{ t('layout.menu.modulesTitle') }} [07]
          </span>
        </div>

        <NuxtLink
          v-for="item in modules"
          :key="item.to"
          :to="localePath(item.to)"
          class="layout-default__nav-item"
          :class="{ 'layout-default__nav-item--active': isModuleActive(item.to) }"
          @click="closeDrawer"
        >
          <div class="layout-default__nav-icon-box" aria-hidden="true">
            <span class="layout-default__nav-icon">{{ item.icon }}</span>
          </div>

          <div class="layout-default__nav-text">
            <div class="layout-default__nav-title-row">
              <span class="layout-default__nav-label">{{ t(item.labelKey) }}</span>
              <span class="layout-default__nav-code">{{ item.code }}</span>
            </div>
            <span class="layout-default__nav-desc">{{ t(item.descKey) }}</span>
          </div>

          <span class="layout-default__nav-arrow" aria-hidden="true">→</span>
        </NuxtLink>
      </div>
    </AkDrawer>

    <!-- Account Sync Modal -->
    <SyncAccountModal v-model="isSyncModalOpen" />
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
    padding: var(--space-xs) var(--space-md);
    background-color: var(--color-bg-surface);
    border-bottom: 1px solid var(--color-border-bold);
    position: sticky;
    top: 0;
    z-index: var(--z-header);

    @include mq(md) {
      padding: var(--space-xs) var(--space-xl);
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
    color: var(--color-text-primary);
    text-decoration: none;

    @include focus-ring;
  }

  &__brand-logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--color-accent-primary);
    line-height: 1;
  }

  &__brand-svg {
    display: block;
  }

  &__brand-text-block {
    display: flex;
    flex-direction: column;
  }

  &__brand-title {
    font-family: var(--font-heading);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-heading);
    color: var(--color-text-primary);
    line-height: 1.1;
  }

  &__brand-sub {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-mono);
    color: var(--color-accent-primary);
    line-height: 1.1;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  &__doctor-pill {
    display: none;
    align-items: center;
    gap: var(--space-2xs);
    padding: var(--space-2xs) var(--space-xs);
    border: 1px solid var(--color-border-subtle);
    background-color: var(--color-bg-elevated);
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-secondary);

    @include mq(md) {
      display: inline-flex;
    }
  }

  &__status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--color-accent-warning);
    box-shadow: 0 0 6px var(--color-accent-warning);
  }

  &__doctor-name {
    color: var(--color-text-primary);
    font-weight: var(--font-weight-bold);
  }

  &__doctor-lvl {
    color: var(--color-text-secondary);
  }

  &__sync-btn {
    font-size: var(--font-size-2xs);
  }

  &__sync-icon {
    line-height: 1;
  }

  &__burger {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2xs);
  }

  &__burger-bars {
    display: inline-flex;
    flex-direction: column;
    gap: 3px;
    width: 14px;
  }

  &__burger-bar {
    display: block;
    height: 2px;
    width: 100%;
    background-color: currentcolor;
  }

  &__burger-text {
    font-size: var(--font-size-2xs);
  }

  &__main {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  &__footer {
    padding: var(--space-md);
    background-color: var(--color-bg-surface);
    border-top: 1px solid var(--color-border-subtle);
  }

  &__footer-content {
    max-width: 1400px;
    margin: 0 auto;
    text-align: center;
  }

  &__disclaimer {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    line-height: var(--line-height-relaxed);
    margin: 0;
  }

  // Drawer User Card
  &__user-card {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm);
    border: 1px solid var(--color-border-subtle);
    background-color: var(--color-bg-elevated);
  }

  &__user-avatar {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    background-color: var(--color-bg-subtle);
    border: 1px solid var(--color-accent-primary);
    color: var(--color-accent-primary);
    font-family: var(--font-mono);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-xs);
  }

  &__user-initials {
    line-height: 1;
  }

  &__user-dot {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--color-accent-warning);
  }

  &__user-meta {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    gap: 2px;
  }

  &__user-row {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
  }

  &__user-title {
    font-family: var(--font-heading);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  &__user-level {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    padding: 1px 4px;
    background-color: var(--color-accent-primary-subtle);
    color: var(--color-accent-primary);
  }

  &__user-server {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-secondary);
  }

  // Drawer Navigation
  &__nav-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__nav-header {
    padding-bottom: var(--space-2xs);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  &__nav-heading {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-mono);
    color: var(--color-text-secondary);
    text-transform: uppercase;
  }

  &__nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm);
    border: 1px solid var(--color-border-subtle);
    background-color: var(--color-bg-elevated);
    color: var(--color-text-primary);
    text-decoration: none;
    transition:
      border-color var(--transition-fast),
      background-color var(--transition-fast),
      box-shadow var(--transition-fast);

    @include focus-ring;

    &:hover {
      border-color: var(--color-border-bold);
      background-color: var(--color-bg-subtle);
    }

    &--active {
      border-color: var(--color-accent-primary);
      background-color: var(--color-accent-primary-subtle);
      box-shadow: inset 2px 0 0 var(--color-accent-primary);

      .layout-default__nav-icon-box {
        border-color: var(--color-accent-primary);
        color: var(--color-accent-primary);
        background-color: var(--color-bg-surface);
      }

      .layout-default__nav-code {
        color: var(--color-accent-primary);
      }

      .layout-default__nav-arrow {
        color: var(--color-accent-primary);
      }
    }
  }

  &__nav-icon-box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: 1px solid var(--color-border-subtle);
    background-color: var(--color-bg-surface);
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    flex-shrink: 0;
  }

  &__nav-icon {
    line-height: 1;
  }

  &__nav-text {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    gap: 2px;
  }

  &__nav-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-xs);
  }

  &__nav-label {
    font-family: var(--font-heading);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-heading);
    text-transform: uppercase;
    color: var(--color-text-primary);

    @include text-truncate;
  }

  &__nav-code {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-mono);
    color: var(--color-text-secondary);
  }

  &__nav-desc {
    font-size: var(--font-size-2xs);
    color: var(--color-text-secondary);
    line-height: 1.2;

    @include text-truncate;
  }

  &__nav-arrow {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    flex-shrink: 0;
  }
}
</style>
