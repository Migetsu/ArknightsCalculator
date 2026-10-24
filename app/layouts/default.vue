<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AkHeader from '~/components/ui/AkHeader.vue'
import AkInstallApp from '~/components/ui/AkInstallApp.vue'
import AkModal from '~/components/ui/AkModal.vue'
import AkButton from '~/components/ui/AkButton.vue'
import { useProfile } from '~/composables/useProfile'
import { useCloudSync } from '~/composables/useCloudSync'
import {
  hasLocalData,
  hasCloudData,
  applyCloudDataToLocalStores,
  buildCurrentPayload,
} from '~/utils/cloudSync/applyToStores'
import { usePlannerStore } from '~/stores/planner'
import { useSettingsStore } from '~/stores/settings'
import { useDepotStore } from '~/stores/depot'
import { useRosterStore } from '~/stores/roster'

const { t } = useI18n()
const route = useRoute()

const { userId } = useProfile()
const cloudSync = useCloudSync()
const { cloudUserData } = cloudSync
const plannerStore = usePlannerStore()
const settingsStore = useSettingsStore()
const depotStore = useDepotStore()
const rosterStore = useRosterStore()

const isConflictModalOpen = ref(false)

const conflictDateString = computed(() => {
  if (!cloudUserData.value?.updated_at) return ''
  try {
    return new Date(cloudUserData.value.updated_at).toLocaleString()
  } catch {
    return cloudUserData.value.updated_at
  }
})

async function handleUseCloud(): Promise<void> {
  if (cloudUserData.value) {
    await applyCloudDataToLocalStores(cloudUserData.value, {
      plannerStore,
      settingsStore,
      depotStore,
    })
  }
  isConflictModalOpen.value = false
}

async function handleUseLocal(): Promise<void> {
  await cloudSync.push(
    buildCurrentPayload({
      plannerStore,
      settingsStore,
      depotStore,
      rosterStore,
    }),
  )
  isConflictModalOpen.value = false
}

watch(
  userId,
  async (newId, oldId) => {
    if (newId && !oldId) {
      await Promise.all([plannerStore.init(), depotStore.init(), rosterStore.init()])
      const pullResult = await cloudSync.pull()
      if (pullResult === 'empty') {
        if (hasLocalData({ plannerStore, settingsStore, depotStore })) {
          await cloudSync.push(
            buildCurrentPayload({
              plannerStore,
              settingsStore,
              depotStore,
              rosterStore,
            }),
          )
        }
      } else if (pullResult === 'loaded') {
        const localHasData = hasLocalData({ plannerStore, settingsStore, depotStore })
        const cloudHasData = hasCloudData(cloudUserData.value)

        if (cloudHasData && !localHasData) {
          if (cloudUserData.value) {
            await applyCloudDataToLocalStores(cloudUserData.value, {
              plannerStore,
              settingsStore,
              depotStore,
            })
          }
        } else if (cloudHasData && localHasData) {
          isConflictModalOpen.value = true
        } else if (!cloudHasData && localHasData) {
          await cloudSync.push(
            buildCurrentPayload({
              plannerStore,
              settingsStore,
              depotStore,
              rosterStore,
            }),
          )
        }
      }
    } else if (!newId && oldId) {
      cloudSync.reset()
    }
  },
  { immediate: false },
)

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

    <!-- Cloud data conflict resolution modal -->
    <AkModal v-model="isConflictModalOpen" :title="t('settings.cloudSync.conflictModalTitle')">
      <p class="layout-default__conflict-text">
        {{
          t('settings.cloudSync.conflictModalBody', {
            date: conflictDateString,
          })
        }}
      </p>

      <template #footer>
        <div class="layout-default__conflict-actions">
          <AkButton variant="primary" @click="handleUseCloud">
            {{ t('settings.cloudSync.useCloud') }}
          </AkButton>
          <AkButton variant="secondary" @click="handleUseLocal">
            {{ t('settings.cloudSync.useLocal') }}
          </AkButton>
        </div>
      </template>
    </AkModal>
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

  &__conflict-text {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    line-height: var(--line-height-relaxed);
    margin: 0;
  }

  &__conflict-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
    width: 100%;
  }
}
</style>
