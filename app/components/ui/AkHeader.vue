<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import AkButton from './AkButton.vue'
import AkDrawer from './AkDrawer.vue'
import SyncAccountModal from '~/components/sync/SyncAccountModal.vue'
import { APP_MODULES } from '~/config/modules'

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

const isDrawerOpen = ref(false)
const isSyncModalOpen = ref(false)

// Navigation links exclude 'settings' as it has its own dedicated slot on the right
const navModules = computed(() => APP_MODULES.filter((m) => m.id !== 'settings'))

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
  <header class="ak-header">
    <div class="ak-header__brand-group">
      <NuxtLink :to="localePath('/')" class="ak-header__brand">
        <!-- Original geometric brand mark: Terminal Delta -->
        <span class="ak-header__brand-logo" aria-hidden="true">
          <svg class="ak-header__brand-svg" viewBox="0 0 24 24" width="22" height="22" fill="none">
            <rect x="2.5" y="2.5" width="19" height="19" stroke="currentColor" stroke-width="1.5" />
            <polygon points="12,6 18,17.5 6,17.5" fill="currentColor" />
          </svg>
        </span>

        <span class="ak-header__brand-title layout-default__brand-title">ARKCALC</span>
      </NuxtLink>

      <!-- Desktop horizontal navigation -->
      <nav class="ak-header__nav" aria-label="Main Navigation">
        <NuxtLink
          v-for="item in navModules"
          :key="item.id"
          :to="localePath(item.route)"
          class="ak-header__nav-link"
          :class="{ 'ak-header__nav-link--active': isModuleActive(item.route) }"
        >
          {{ t(item.nameKey) }}
          <span v-if="item.status === 'soon'" class="ak-header__soon-badge">
            {{ t('modules.status.soon') }}
          </span>
        </NuxtLink>
      </nav>
    </div>

    <div class="ak-header__actions">
      <!-- Dedicated Settings link per design mockups -->
      <NuxtLink
        :to="localePath('/settings')"
        class="ak-header__settings-link"
        :class="{ 'ak-header__settings-link--active': isModuleActive('/settings') }"
      >
        {{ t('navigation.settings') }}
      </NuxtLink>

      <!-- Sync Button for test compatibility -->
      <AkButton
        variant="ghost"
        size="sm"
        class="ak-header__sync-btn layout-default__sync-btn"
        :aria-label="t('common.sync')"
        @click="openSyncModal"
      >
        {{ t('common.sync') }}
      </AkButton>

      <!-- Mobile drawer toggle -->
      <AkButton
        variant="ghost"
        size="sm"
        class="ak-header__burger layout-default__burger"
        :aria-expanded="isDrawerOpen"
        aria-controls="tactical-drawer"
        :aria-label="t('layout.menu.toggle')"
        @click="openDrawer"
      >
        <span class="ak-header__burger-bars" aria-hidden="true">
          <span class="ak-header__burger-bar" />
          <span class="ak-header__burger-bar" />
          <span class="ak-header__burger-bar" />
        </span>
        <span class="ak-header__burger-text">
          {{ t('common.menu') }}
        </span>
      </AkButton>
    </div>

    <!-- Mobile Drawer -->
    <AkDrawer v-model="isDrawerOpen" :tag="t('layout.menu.tag')" :title="t('layout.menu.title')">
      <template #user>
        <div class="ak-header__drawer-user layout-default__user-card">
          <div class="ak-header__drawer-user-info">
            <span class="ak-header__drawer-user-title">{{ t('layout.doctor.title') }}</span>
            <span class="ak-header__drawer-user-subtitle layout-default__user-level">{{
              t('layout.doctor.server')
            }}</span>
          </div>
          <AkButton
            variant="secondary"
            size="sm"
            class="layout-default__user-sync-btn"
            @click="openSyncModal"
          >
            {{ t('common.sync') }}
          </AkButton>
        </div>
      </template>

      <div class="ak-header__drawer-nav">
        <NuxtLink
          v-for="item in APP_MODULES"
          :key="item.route"
          :to="localePath(item.route)"
          class="ak-header__drawer-link layout-default__nav-item"
          :class="{ 'ak-header__drawer-link--active': isModuleActive(item.route) }"
          @click="closeDrawer"
        >
          <span class="ak-header__drawer-icon" aria-hidden="true">{{ item.icon }}</span>
          <div class="ak-header__drawer-text">
            <div class="ak-header__drawer-label-row">
              <span class="ak-header__drawer-label">{{ t(item.nameKey) }}</span>
              <span v-if="item.status === 'soon'" class="ak-header__drawer-soon">
                {{ t('modules.status.soon') }}
              </span>
            </div>
            <span class="ak-header__drawer-desc">{{ t(item.descriptionKey) }}</span>
          </div>
          <span class="ak-header__drawer-arrow" aria-hidden="true">→</span>
        </NuxtLink>
      </div>
    </AkDrawer>

    <!-- Account Sync Modal -->
    <SyncAccountModal v-model="isSyncModalOpen" />
  </header>
</template>

<style lang="scss" scoped>
.ak-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-lg);
  padding: 16px var(--space-md);
  background-color: var(--color-bg-base);
  border-bottom: 1px solid var(--color-border-subtle);
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  box-sizing: border-box;

  @include mq(md) {
    padding: 18px var(--space-xl);
  }

  @include mq(xl) {
    padding: 22px 48px;
  }

  &__brand-group {
    display: flex;
    align-items: center;
    gap: 28px;
    min-width: 0;
  }

  &__brand {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    color: var(--color-text-primary);
    text-decoration: none;
    flex-shrink: 0;

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

  &__brand-title {
    font-family: var(--font-display);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-display);
    color: var(--color-text-primary);
    line-height: 1;
  }

  // Desktop Navigation
  &__nav {
    display: none;
    align-items: center;
    gap: 24px;
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);

    @include mq(lg) {
      display: flex;
    }
  }

  &__nav-link {
    color: var(--color-text-secondary);
    text-decoration: none;
    padding-bottom: 4px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-bottom: 2px solid transparent;
    transition:
      color var(--transition-fast),
      border-color var(--transition-fast);

    @include focus-ring;

    &:hover {
      color: var(--color-text-accent);
    }

    &--active {
      color: var(--color-text-accent);
      border-bottom-color: var(--color-accent-primary);
    }
  }

  &__soon-badge {
    font-family: var(--font-mono);
    font-size: 0.625rem;
    padding: 1px 4px;
    background-color: var(--color-border-subtle);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    flex-shrink: 0;
  }

  &__settings-link {
    display: none;
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    text-decoration: none;
    padding-bottom: 4px;
    border-bottom: 2px solid transparent;
    transition:
      color var(--transition-fast),
      border-color var(--transition-fast);

    @include mq(lg) {
      display: inline-block;
    }

    @include focus-ring;

    &:hover {
      color: var(--color-text-accent);
    }

    &--active {
      color: var(--color-text-accent);
      border-bottom-color: var(--color-accent-primary);
    }
  }

  &__burger {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2xs);

    @include mq(lg) {
      display: none;
    }
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

  // Drawer styles
  &__drawer-user {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    padding: var(--space-sm);
    background-color: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
  }

  &__drawer-user-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__drawer-user-title {
    font-family: var(--font-heading);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  &__drawer-user-subtitle {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-secondary);
  }

  &__drawer-nav {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__drawer-link {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm);
    border: 1px solid var(--color-border-subtle);
    background-color: var(--color-bg-surface);
    color: var(--color-text-primary);
    text-decoration: none;
    transition:
      border-color var(--transition-fast),
      background-color var(--transition-fast);

    @include focus-ring;

    &:hover {
      border-color: var(--color-border-bold);
      background-color: var(--color-bg-elevated);
    }

    &--active {
      border-color: var(--color-accent-primary);
      border-left: 3px solid var(--color-accent-primary);
      background-color: var(--color-accent-primary-subtle);
    }
  }

  &__drawer-icon {
    font-size: var(--font-size-md);
    width: 24px;
    text-align: center;
    flex-shrink: 0;
  }

  &__drawer-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  &__drawer-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-xs);
  }

  &__drawer-label {
    font-family: var(--font-heading);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    text-transform: uppercase;
    color: var(--color-text-primary);

    @include text-truncate;
  }

  &__drawer-soon {
    font-family: var(--font-mono);
    font-size: 0.625rem;
    padding: 1px 4px;
    background-color: var(--color-border-subtle);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    flex-shrink: 0;
  }

  &__drawer-desc {
    font-size: var(--font-size-2xs);
    color: var(--color-text-secondary);

    @include text-truncate;
  }

  &__drawer-arrow {
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
    flex-shrink: 0;
  }
}
</style>
