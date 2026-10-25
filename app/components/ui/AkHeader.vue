<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue'
import { useRoute } from 'vue-router'
import AkButton from './AkButton.vue'
import AkDrawer from './AkDrawer.vue'
import { APP_MODULES } from '~/config/modules'

const SyncAccountModal = defineAsyncComponent(
  () => import('~/components/sync/SyncAccountModal.vue'),
)

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
    return currentPath === localizedTarget
  }
  return currentPath.startsWith(localizedTarget)
}
</script>

<template>
  <header class="ak-header">
    <div class="ak-header__brand-group">
      <NuxtLink :to="localePath('/')" class="ak-header__brand">
        <span class="ak-header__brand-logo" aria-hidden="true">
          <img src="/logo-mark.svg" class="ak-header__brand-svg" width="22" height="22" alt="" />
        </span>

        <span class="ak-header__brand-title layout-default__brand-title">RHODESLAB</span>
      </NuxtLink>

      <!-- Desktop horizontal navigation -->
      <nav class="ak-header__nav" aria-label="Main Navigation">
        <NuxtLink
          v-for="item in navModules"
          :key="item.id"
          :to="localePath(item.route)"
          class="ak-header__nav-link"
          :class="{
            'ak-header__nav-link--active': isModuleActive(item.route),
            'ak-header__nav-link--soon': item.status === 'soon',
          }"
        >
          {{ t(item.navKey ?? item.nameKey) }}
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
        {{ t('nav.settings') }}
      </NuxtLink>

      <!-- Sync Button with tactical SVG icon -->
      <AkButton
        variant="outline"
        size="sm"
        class="ak-header__sync-btn layout-default__sync-btn"
        :aria-label="t('common.sync')"
        @click="openSyncModal"
      >
        <template #icon>
          <svg
            class="ak-header__sync-icon"
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
        </template>
        <span class="ak-header__sync-dot" aria-hidden="true" />
        <span class="ak-header__sync-text">{{ t('common.sync') }}</span>
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
            variant="outline"
            size="sm"
            class="layout-default__user-sync-btn ak-header__drawer-sync-btn"
            @click="openSyncModal"
          >
            <template #icon>
              <svg
                class="ak-header__sync-icon"
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M3 21v-5h5" />
              </svg>
            </template>
            <span class="ak-header__sync-dot" aria-hidden="true" />
            <span>{{ t('common.sync') }}</span>
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
    <SyncAccountModal v-if="isSyncModalOpen" v-model="isSyncModalOpen" />
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
    height: 36px;
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
    display: inline-flex;
    align-items: center;
    height: 36px;
    line-height: 36px;
    position: relative;
    box-shadow: none;
    transition:
      color var(--transition-fast),
      box-shadow var(--transition-fast);

    @include focus-ring;

    &:hover {
      color: var(--color-text-accent);
    }

    &--soon {
      color: var(--color-text-muted);
      opacity: 0.75;

      &:hover {
        color: var(--color-text-secondary);
        opacity: 1;
      }
    }

    &--active {
      color: var(--color-text-accent);
      box-shadow: inset 0 -2px 0 0 var(--color-accent-primary);
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    height: 36px;
    gap: 16px;
    flex-shrink: 0;
  }

  &__settings-link {
    display: none;
    align-items: center;
    height: 36px;
    line-height: 36px;
    position: relative;
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    text-decoration: none;
    box-shadow: none;
    transition:
      color var(--transition-fast),
      box-shadow var(--transition-fast);

    @include mq(lg) {
      display: inline-flex;
    }

    @include focus-ring;

    &:hover {
      color: var(--color-text-accent);
    }

    &--active {
      color: var(--color-text-accent);
      box-shadow: inset 0 -2px 0 0 var(--color-accent-primary);
    }
  }

  &__sync-btn {
    height: 36px;
    box-sizing: border-box;
    font-size: var(--font-size-xs);

    &:hover .ak-header__sync-icon {
      transform: rotate(180deg);
    }
  }

  &__sync-icon {
    display: block;
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    transition: transform var(--transition-normal);

    @include reduced-motion;
  }

  &__sync-dot {
    display: none;
  }

  &__sync-text {
    line-height: 1;
  }

  &__drawer-sync-btn {
    font-size: var(--font-size-xs);

    &:hover .ak-header__sync-icon {
      transform: rotate(180deg);
    }
  }

  &__burger {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2xs);

    @include mq(lg) {
      display: none !important;
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
