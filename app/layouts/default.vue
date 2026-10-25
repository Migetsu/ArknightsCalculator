<script setup lang="ts">
import { computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import AkHeader from '~/components/ui/AkHeader.vue'
import AkInstallApp from '~/components/ui/AkInstallApp.vue'
import { useProfile } from '~/composables/useProfile'
import { useCloudSync } from '~/composables/useCloudSync'
import { buildCurrentPayload } from '~/utils/cloudSync/applyToStores'
import { usePlannerStore } from '~/stores/planner'
import { useSettingsStore } from '~/stores/settings'
import { useDepotStore } from '~/stores/depot'
import { useRosterStore } from '~/stores/roster'

const { t } = useI18n()
const route = useRoute()

const { userId } = useProfile()
const cloudSync = useCloudSync()
const { isApplyingCloudData, isInitialSyncDone } = cloudSync
const plannerStore = usePlannerStore()
const settingsStore = useSettingsStore()
const depotStore = useDepotStore()
const rosterStore = useRosterStore()

async function syncUserData(): Promise<void> {
  if (!userId.value) return
  await cloudSync.syncUserData({
    plannerStore,
    settingsStore,
    depotStore,
    rosterStore,
  })
}

let stopGlobalAutoSync: (() => void) | null = null

function setupAutoSync(): void {
  if (stopGlobalAutoSync) {
    stopGlobalAutoSync()
    stopGlobalAutoSync = null
  }

  if (!userId.value) return

  let timer: ReturnType<typeof setTimeout> | null = null

  const unwatch = watch(
    [
      () => plannerStore.plans,
      () => depotStore.items,
      () => depotStore.currencies,
      () => settingsStore.dropDataServer,
      () => settingsStore.farmingMaxSanity,
      () => settingsStore.farmingRegenMinutes,
      () => settingsStore.farmingAllowCrafting,
    ],
    () => {
      if (!isInitialSyncDone.value) return
      if (isApplyingCloudData.value) return
      if (!userId.value) return
      cloudSync.hasPendingChanges.value = true
      if (timer) clearTimeout(timer)
      timer = setTimeout(async () => {
        if (!isInitialSyncDone.value) return
        if (isApplyingCloudData.value) return
        if (!userId.value) return
        await cloudSync.push(
          buildCurrentPayload({
            plannerStore,
            settingsStore,
            depotStore,
            rosterStore,
          }),
        )
      }, 1500)
    },
    { deep: true },
  )

  stopGlobalAutoSync = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    unwatch()
  }
}

onMounted(async () => {
  if (userId.value) {
    await syncUserData()
    setupAutoSync()
  }
})

watch(
  userId,
  async (newId, oldId) => {
    if (newId && newId !== oldId) {
      await syncUserData()
      setupAutoSync()
    } else if (!newId && oldId) {
      if (stopGlobalAutoSync) {
        stopGlobalAutoSync()
        stopGlobalAutoSync = null
      }
      cloudSync.reset()
    }
  },
  { immediate: false },
)

onBeforeUnmount(() => {
  if (stopGlobalAutoSync) {
    stopGlobalAutoSync()
    stopGlobalAutoSync = null
  }
})

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

const isTransparentHeader = computed(() => {
  const p = route.path
  return p.includes('/operators/') && !p.endsWith('/operators')
})
</script>

<template>
  <div
    class="layout-default"
    :class="{ 'layout-default--transparent-header': isTransparentHeader }"
  >
    <AkHeader />

    <main class="layout-default__main">
      <slot />
    </main>

    <footer class="layout-default__footer">
      <div class="layout-default__footer-content">
        <p class="layout-default__disclaimer">
          {{ t('layout.footer.disclaimer') }}
        </p>
        <p class="layout-default__attribution">
          {{ t('layout.footer.attribution') }}
        </p>
        <AkInstallApp />
      </div>
    </footer>
  </div>
</template>

<style lang="scss" scoped>
.layout-default {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: radial-gradient(ellipse at 80% 0, var(--color-bg-glow) 0, var(--color-bg-base) 55%);
  background-color: var(--color-bg-base);
  color: var(--color-text-primary);
  font-family: var(--font-body);

  &--transparent-header {
    .ak-header {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      background-color: transparent;
      border-bottom-color: transparent;
    }
  }

  &__main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__footer {
    padding: var(--space-md) var(--space-xl);
    background-color: var(--color-bg-base);
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

  &__attribution {
    font-size: var(--font-size-2xs);
    color: var(--color-text-muted);
    line-height: var(--line-height-relaxed);
    margin: var(--space-3xs) 0 0;
  }
}
</style>
