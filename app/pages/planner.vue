<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { usePlannerStore } from '~/stores/planner'
import { useDepotStore } from '~/stores/depot'
import { getModuleById } from '~/config/modules'
import AkContainer from '~/components/ui/AkContainer.vue'
import AkPageHeader from '~/components/ui/AkPageHeader.vue'
import AkAlert from '~/components/ui/AkAlert.vue'
import AkButton from '~/components/ui/AkButton.vue'
import AkTabs, { type TabItem } from '~/components/ui/AkTabs.vue'
import AkEmptyState from '~/components/ui/AkEmptyState.vue'
import PlannerSidebar from '~/components/planner/PlannerSidebar.vue'
import PlannerGoalsTab from '~/components/planner/PlannerGoalsTab.vue'
import PlannerMaterialsTab from '~/components/planner/PlannerMaterialsTab.vue'
import PlannerRoadmapTab from '~/components/planner/PlannerRoadmapTab.vue'
import OperatorSelectModal from '~/components/planner/OperatorSelectModal.vue'
import PlannerJsonModal from '~/components/planner/PlannerJsonModal.vue'

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const plannerStore = usePlannerStore()
const depotStore = useDepotStore()
const moduleConfig = getModuleById('planner')

const isAddModalOpen = ref(false)
const isJsonModalOpen = ref(false)
const jsonModalInitialTab = ref<'export' | 'import' | 'share'>('export')
const sharedCodeFromUrl = ref('')
const activeTab = ref<'goals' | 'materials' | 'roadmap'>('goals')

const tabs = computed<TabItem[]>(() => [
  { id: 'goals', label: t('planner.tabs.goals') },
  { id: 'materials', label: t('planner.tabs.materials') },
  { id: 'roadmap', label: t('planner.tabs.roadmap') },
])

onMounted(async () => {
  if (depotStore.status === 'idle') {
    void depotStore.init()
  }
  if (plannerStore.status === 'idle') {
    await plannerStore.init()
  }

  // Check URL ?plan=<code query for shared plan link without auto-applying
  const planQuery = route.query.plan
  if (typeof planQuery === 'string' && planQuery.trim()) {
    sharedCodeFromUrl.value = planQuery.trim()
    jsonModalInitialTab.value = 'import'
    isJsonModalOpen.value = true
  }
})

function openJsonModal(tab: 'export' | 'import' | 'share' = 'export'): void {
  sharedCodeFromUrl.value = ''
  jsonModalInitialTab.value = tab
  isJsonModalOpen.value = true
}

// Current selected operator detail
const currentDetail = computed(() => {
  const plan = plannerStore.selectedPlan
  if (!plan) return null
  return plannerStore.operatorDetailsCache.get(plan.operatorId) ?? null
})

// Automatically fetch detail if missing
watch(
  () => plannerStore.selectedPlan?.operatorId,
  (opId) => {
    if (opId) {
      void plannerStore.ensureOperatorDetail(opId)
    }
  },
  { immediate: true },
)

function handleAddOperator(opId: string): void {
  void plannerStore.addPlan(opId)
}
</script>

<template>
  <div class="planner-page">
    <AkContainer size="lg" class="planner-page__container">
      <AkPageHeader
        :code="moduleConfig?.code ?? 'PLN-01'"
        :tag-label="t('modules.tag')"
        :title="moduleConfig ? t(moduleConfig.nameKey) : 'Operator Planner'"
        :subtitle="moduleConfig ? t(moduleConfig.descriptionKey) : ''"
        watermark="PLANNER"
        :badge="t('modules.status.ready')"
        badge-variant="green"
      >
        <template #actions>
          <AkButton variant="secondary" size="sm" @click="openJsonModal('export')">
            {{ t('planner.importExportJson') }}
          </AkButton>
          <AkButton variant="ghost" size="sm" @click="openJsonModal('share')">
            {{ t('planner.shareCode') }}
          </AkButton>
          <AkButton variant="ghost" size="sm" :to="localePath('/')">
            {{ t('common.backToDashboard') }}
          </AkButton>
        </template>
      </AkPageHeader>

      <!-- Alert when storage corrupted -->
      <AkAlert
        v-if="plannerStore.isCorrupted"
        variant="warning"
        closable
        @close="plannerStore.dismissCorruptionAlert"
      >
        {{ t('planner.corruptedAlert', { backup: plannerStore.corruptedBackupKey }) }}
      </AkAlert>

      <!-- Error State -->
      <AkAlert
        v-if="plannerStore.status === 'error'"
        variant="danger"
        :title="t('modules.error.title')"
      >
        <p>{{ plannerStore.error || t('modules.error.description') }}</p>
        <template #actions>
          <AkButton variant="secondary" size="sm" @click="plannerStore.init()">
            {{ t('common.retry') }}
          </AkButton>
        </template>
      </AkAlert>

      <!-- Loading State -->
      <div
        v-else-if="plannerStore.status === 'loading' || plannerStore.status === 'idle'"
        class="planner-page__state-box"
      >
        <span class="planner-page__spinner" aria-hidden="true" />
        <p class="planner-page__state-text">{{ t('common.loading') }}</p>
      </div>

      <!-- Empty State (No plans) -->
      <div v-else-if="plannerStore.plans.length === 0" class="planner-page__empty-box">
        <AkEmptyState :title="t('planner.emptyTitle')" :description="t('planner.emptyDescription')">
          <template #action>
            <div class="planner-page__empty-actions">
              <AkButton variant="primary" size="md" @click="isAddModalOpen = true">
                {{ t('planner.addOperator') }}
              </AkButton>
              <AkButton variant="secondary" size="md" @click="openJsonModal('import')">
                {{ t('planner.importExportJson') }}
              </AkButton>
            </div>
          </template>
        </AkEmptyState>
      </div>

      <!-- Main Planner Grid -->
      <div v-else class="planner-page__layout">
        <!-- Left Sidebar -->
        <PlannerSidebar :is-modal-open="isAddModalOpen" @open-add-modal="isAddModalOpen = true" />

        <!-- Right Content Area -->
        <main class="planner-page__main">
          <!-- Navigation Tabs -->
          <div class="planner-page__tabs">
            <AkTabs
              v-model="activeTab"
              :items="tabs"
              variant="buttons"
              aria-label="Planner Views"
            />
          </div>

          <!-- Tab Content Views -->
          <div class="planner-page__view">
            <!-- Goals Tab -->
            <template v-if="activeTab === 'goals'">
              <PlannerGoalsTab
                v-if="plannerStore.selectedPlan && currentDetail"
                :plan-id="plannerStore.selectedPlan.id"
                :detail="currentDetail"
              />
              <div v-else class="planner-page__state-box">
                <span class="planner-page__spinner" aria-hidden="true" />
                <p class="planner-page__state-text">{{ t('common.loading') }}</p>
              </div>
            </template>

            <!-- Materials Tab -->
            <template v-else-if="activeTab === 'materials'">
              <PlannerMaterialsTab />
            </template>

            <!-- Roadmap Tab -->
            <template v-else-if="activeTab === 'roadmap'">
              <PlannerRoadmapTab
                v-if="plannerStore.selectedPlan && currentDetail"
                :plan-id="plannerStore.selectedPlan.id"
                :detail="currentDetail"
              />
              <div v-else class="planner-page__state-box">
                <span class="planner-page__spinner" aria-hidden="true" />
                <p class="planner-page__state-text">{{ t('common.loading') }}</p>
              </div>
            </template>
          </div>
        </main>
      </div>
    </AkContainer>

    <!-- Modal to Search & Add Operator -->
    <OperatorSelectModal v-model="isAddModalOpen" @select="handleAddOperator" />

    <!-- Modal for JSON Import/Export and Share Code -->
    <PlannerJsonModal
      v-model="isJsonModalOpen"
      :initial-tab="jsonModalInitialTab"
      :initial-share-code="sharedCodeFromUrl"
    />
  </div>
</template>

<style lang="scss" scoped>
.planner-page {
  padding-top: var(--space-md);
  padding-bottom: var(--space-2xl);
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;

  @include mq(md) {
    padding-top: var(--space-xl);
  }

  &__container {
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
    min-width: 0;
  }

  &__layout {
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
    min-width: 0;

    @include mq(lg) {
      display: grid;
      grid-template-columns: 320px 1fr;
      align-items: start;
      gap: 28px;
    }
  }

  &__main {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    min-width: 0;
  }

  &__tabs {
    display: flex;
    align-items: center;
  }

  &__view {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__empty-box {
    padding: var(--space-2xl) var(--space-md);
    background: linear-gradient(135deg, var(--color-bg-surface) 0%, var(--color-bg-card) 100%);
    border: 1px solid var(--color-border-bold);
    display: flex;
    justify-content: center;
    align-items: center;
    min-width: 0;
  }

  &__empty-actions {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex-wrap: wrap;
    justify-content: center;
  }

  &__state-box {
    padding: var(--space-2xl) var(--space-md);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    background: linear-gradient(135deg, var(--color-bg-surface) 0%, var(--color-bg-card) 100%);
    border: 1px solid var(--color-border-bold);
  }

  &__spinner {
    width: 2rem;
    height: 2rem;
    border: 2px solid var(--color-border-subtle);
    border-top-color: var(--color-accent-primary);
    border-radius: var(--radius-full);
    box-shadow: 0 0 10px var(--color-accent-primary-glow);
    animation: planner-spin 0.8s linear infinite;
  }

  &__state-text {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    letter-spacing: var(--letter-spacing-mono);
    color: var(--color-text-secondary);
  }
}

@keyframes planner-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
