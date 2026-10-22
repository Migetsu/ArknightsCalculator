<script setup lang="ts">
import { ref } from 'vue'
import { useSettingsStore } from '~/stores/settings'
import SyncAccountModal from '~/components/sync/SyncAccountModal.vue'
import metaData from '~/../data/meta.json'
import type { ServerRegion } from '~/../shared/schemas/operator'

const { t, locale } = useI18n()
const settingsStore = useSettingsStore()

const isSyncModalOpen = ref(false)
const notificationMessage = ref<string | null>(null)

function selectServer(server: ServerRegion): void {
  settingsStore.setDropDataServer(server)
}

function handleExport(): void {
  const exportPayload = {
    arkcalcVersion: '1.0.0',
    exportDate: new Date().toISOString(),
    settings: {
      dropDataServer: settingsStore.dropDataServer,
      locale: locale.value,
    },
  }
  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rhodeslab-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function handleImport(): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,application/json'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text) as {
        settings?: { dropDataServer?: ServerRegion; defaultServer?: ServerRegion }
      }
      const srv = data?.settings?.dropDataServer || data?.settings?.defaultServer
      if (srv) {
        settingsStore.setDropDataServer(srv)
      }
      notificationMessage.value = t('settings.yourData.importBackup') + ' OK'
      setTimeout(() => {
        notificationMessage.value = null
      }, 3000)
    } catch {
      notificationMessage.value = 'Invalid JSON file format'
      setTimeout(() => {
        notificationMessage.value = null
      }, 3000)
    }
  }
  input.click()
}

function handleResetData(): void {
  if (typeof window !== 'undefined' && window.confirm(t('settings.yourData.resetConfirm'))) {
    settingsStore.resetAllSettings()
    notificationMessage.value = t('settings.yourData.resetSuccess')
    setTimeout(() => {
      notificationMessage.value = null
    }, 4000)
  }
}

function openSyncModal(): void {
  isSyncModalOpen.value = true
}
</script>

<template>
  <div class="settings-page">
    <div class="settings-page__container">
      <h1 class="settings-page__title">{{ t('settings.title') }}</h1>

      <!-- Notification pill if an action occurred -->
      <div v-if="notificationMessage" class="settings-page__notification" role="status">
        {{ notificationMessage }}
      </div>

      <!-- 2. Drop Data Server Section -->
      <section class="settings-page__section">
        <div class="settings-page__section-header">
          <h2 class="settings-page__section-title">{{ t('settings.dropDataServer.title') }}</h2>
          <p class="settings-page__section-desc">
            {{ t('settings.dropDataServer.desc') }}
          </p>
        </div>
        <div class="settings-page__button-group">
          <button
            type="button"
            class="settings-page__toggle-btn"
            :class="{ 'settings-page__toggle-btn--active': settingsStore.dropDataServer === 'cn' }"
            @click="selectServer('cn')"
          >
            {{ t('settings.dropDataServer.cn') }}
          </button>
          <button
            type="button"
            class="settings-page__toggle-btn"
            :class="{
              'settings-page__toggle-btn--active': settingsStore.dropDataServer === 'global',
            }"
            @click="selectServer('global')"
          >
            {{ t('settings.dropDataServer.global') }}
          </button>
        </div>
      </section>

      <!-- 3. Farming Sanity Section -->
      <section class="settings-page__section">
        <div class="settings-page__section-header">
          <h2 class="settings-page__section-title">{{ t('settings.farmingSanity.title') }}</h2>
          <p class="settings-page__section-desc">
            {{ t('settings.farmingSanity.desc') }}
          </p>
        </div>
        <div class="settings-page__input-grid">
          <div class="settings-page__field">
            <label class="settings-page__label" for="max-sanity-input">
              {{ t('settings.farmingSanity.maxSanityLabel') }}
            </label>
            <input
              id="max-sanity-input"
              type="number"
              min="1"
              max="200"
              class="settings-page__number-input"
              :value="settingsStore.farmingMaxSanity"
              @input="
                settingsStore.setFarmingMaxSanity(Number(($event.target as HTMLInputElement).value))
              "
            />
          </div>
          <div class="settings-page__field">
            <label class="settings-page__label" for="regen-minutes-input">
              {{ t('settings.farmingSanity.regenMinutesLabel') }}
            </label>
            <input
              id="regen-minutes-input"
              type="number"
              min="1"
              max="60"
              class="settings-page__number-input"
              :value="settingsStore.farmingRegenMinutes"
              @input="
                settingsStore.setFarmingRegenMinutes(
                  Number(($event.target as HTMLInputElement).value),
                )
              "
            />
          </div>
        </div>
      </section>

      <!-- 4. Account Section -->
      <section class="settings-page__section">
        <div class="settings-page__section-header">
          <h2 class="settings-page__section-title">{{ t('settings.account.title') }}</h2>
          <p class="settings-page__section-desc">
            {{ t('settings.account.desc') }}
          </p>
        </div>
        <div class="settings-page__action-row">
          <button type="button" class="settings-page__btn-primary" @click="openSyncModal">
            {{ t('settings.account.syncBtn') }}
          </button>
          <button type="button" class="settings-page__btn-outline" @click="openSyncModal">
            {{ t('settings.account.cloudBtn') }}
          </button>
        </div>
      </section>

      <!-- 4. Your Data Section -->
      <section class="settings-page__section">
        <div class="settings-page__section-header">
          <h2 class="settings-page__section-title">{{ t('settings.yourData.title') }}</h2>
          <p class="settings-page__section-desc">
            {{ t('settings.yourData.desc') }}
          </p>
        </div>
        <div class="settings-page__action-row">
          <button type="button" class="settings-page__btn-outline" @click="handleExport">
            {{ t('settings.yourData.exportJson') }}
          </button>
          <button type="button" class="settings-page__btn-outline" @click="handleImport">
            {{ t('settings.yourData.importBackup') }}
          </button>
          <button type="button" class="settings-page__btn-danger" @click="handleResetData">
            {{ t('settings.yourData.resetLocal') }}
          </button>
        </div>
      </section>

      <!-- 5. Game Data Section -->
      <section class="settings-page__section">
        <div class="settings-page__section-header">
          <h2 class="settings-page__section-title">{{ t('settings.gameData.title') }}</h2>
          <p class="settings-page__section-desc">
            {{ t('settings.gameData.desc') }}
          </p>
        </div>
        <div class="settings-page__meta-content">
          <div class="settings-page__meta-row">
            <span class="settings-page__meta-label">{{ t('settings.gameData.versionLabel') }}</span>
            <b class="settings-page__meta-val">
              {{ metaData.enCommit.slice(0, 7) }} / {{ metaData.buildDate.slice(0, 10) }}
            </b>
          </div>
          <div class="settings-page__meta-row">
            <span class="settings-page__meta-label"
              >{{ t('settings.gameData.operatorsLabel') }}
            </span>
            <b class="settings-page__meta-val">
              {{ metaData.totalOperators }} ({{
                t('settings.gameData.globalCount', { count: metaData.globalOperators })
              }}, {{ t('settings.gameData.cnOnlyCount', { count: metaData.cnOnlyOperators }) }})
            </b>
          </div>
        </div>
      </section>

      <!-- 6. About Section -->
      <section class="settings-page__section">
        <div class="settings-page__section-header">
          <h2 class="settings-page__section-title">{{ t('settings.about.title') }}</h2>
          <p class="settings-page__section-desc">
            {{ t('settings.about.desc') }}
          </p>
        </div>
        <div>
          <a
            href="https://github.com/Migetsu/ArknightsCalculator"
            target="_blank"
            rel="noopener noreferrer"
            class="settings-page__btn-outline"
          >
            {{ t('settings.about.openSourceBtn') }}
          </a>
        </div>
      </section>
    </div>

    <!-- Account Sync Modal -->
    <SyncAccountModal v-model="isSyncModalOpen" />
  </div>
</template>

<style lang="scss" scoped>
.settings-page {
  padding: var(--space-xl) var(--space-md);
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;

  @include mq(md) {
    padding: 36px 48px;
  }

  &__container {
    max-width: 960px;
    width: 100%;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
  }

  &__title {
    margin: 0 0 var(--space-xs);
    font-family: var(--font-display);
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    line-height: var(--line-height-tight);

    @include mq(md) {
      font-size: 34px;
    }
  }

  &__notification {
    padding: 10px 16px;
    background-color: var(--color-accent-primary-subtle);
    border: 1px solid var(--color-accent-primary);
    color: var(--color-accent-primary);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
  }

  &__section {
    background-color: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    box-sizing: border-box;
  }

  &__section-header {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__section-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    line-height: 1.2;
  }

  &__section-desc {
    margin: 0;
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    line-height: var(--line-height-base);
    color: var(--color-text-secondary);
  }

  &__button-group {
    display: flex;
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
  }

  &__input-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-md);

    @include mq(sm) {
      grid-template-columns: repeat(2, minmax(0, 260px));
    }
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
  }

  &__label {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  &__number-input {
    width: 100%;
    padding: 8px 12px;
    background-color: var(--color-bg-card);
    border: 1px solid var(--color-border-bold);
    color: var(--color-text-primary);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    box-sizing: border-box;

    @include focus-ring;
  }

  &__toggle-btn {
    padding: 11px 26px;
    background-color: var(--color-bg-deep);
    border: 1px solid var(--color-border-bold);
    color: var(--color-text-primary);
    cursor: pointer;
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    transition:
      background-color var(--transition-fast),
      color var(--transition-fast);

    @include focus-ring;

    &--active {
      background-color: var(--color-accent-primary);
      border-color: var(--color-accent-primary);
      color: var(--color-text-inverse);
    }
  }

  &__action-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  &__btn-primary {
    padding: 11px 22px;
    background-color: var(--color-accent-primary);
    border: 0;
    color: var(--color-text-inverse);
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition: background-color var(--transition-fast);

    @include focus-ring;

    &:hover {
      background-color: var(--color-accent-primary-hover);
    }
  }

  &__btn-outline {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    padding: 11px 20px;
    background-color: transparent;
    border: 1px solid var(--color-border-gold);
    color: var(--color-text-accent);
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition:
      border-color var(--transition-fast),
      color var(--transition-fast);

    @include focus-ring;

    &:hover {
      border-color: var(--color-text-accent);
    }
  }

  &__btn-danger {
    padding: 11px 20px;
    background-color: transparent;
    border: 1px solid var(--color-border-danger);
    color: var(--color-accent-ember-light);
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition: border-color var(--transition-fast);

    @include focus-ring;

    &:hover {
      border-color: var(--color-accent-primary);
    }
  }

  &__meta-content {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    line-height: var(--line-height-relaxed);
    color: var(--color-text-secondary);
  }

  &__meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  &__meta-label {
    color: var(--color-text-secondary);
  }

  &__meta-val {
    color: var(--color-text-primary);
    font-weight: var(--font-weight-semibold);
  }
}
</style>
