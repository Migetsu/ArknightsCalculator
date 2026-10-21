<script setup lang="ts">
interface PwaInstallApi {
  showInstallPrompt?: boolean
  install?: () => Promise<void>
}

const { $pwa } = useNuxtApp()
const { t } = useI18n()

const pwa = $pwa as PwaInstallApi | undefined
const mounted = ref(false)

onMounted(() => {
  mounted.value = true
})

const isStandalone = computed(() => {
  if (!import.meta.client) return false
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
})

const isIos = computed(() => {
  if (!import.meta.client) return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
})

const canInstall = computed(
  () => mounted.value && Boolean(pwa?.showInstallPrompt) && !isStandalone.value,
)
const showIosHint = computed(
  () => mounted.value && isIos.value && !isStandalone.value && !canInstall.value,
)

async function install(): Promise<void> {
  await pwa?.install?.()
}
</script>

<template>
  <div v-if="canInstall || showIosHint" class="ak-install-app">
    <button v-if="canInstall" type="button" class="ak-install-app__button" @click="install">
      <Icon name="ph:download-simple" aria-hidden="true" />
      {{ t('layout.footer.installApp') }}
    </button>
    <p v-else class="ak-install-app__hint">{{ t('layout.footer.installIos') }}</p>
  </div>
</template>

<style lang="scss" scoped>
.ak-install-app {
  display: flex;
  justify-content: center;

  &__button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-sm);
    border: 1px solid var(--color-border-amber);
    background: transparent;
    color: var(--color-accent-primary);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    letter-spacing: var(--letter-spacing-caption);
    text-transform: uppercase;
    cursor: pointer;

    @include focus-ring;

    &:hover {
      background: var(--color-bg-elevated);
    }
  }

  &__hint {
    margin: 0;
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
    text-align: center;
  }
}
</style>
