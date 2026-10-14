<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePlannerStore } from '~/stores/planner'
import {
  validatePlannerImport,
  computePlannerImportPreview,
  type PlanItem,
  type PlannerImportPreview,
} from '~/schemas/planner'
import { decodeShareCode } from '../../../shared/utils/planner/shareCode'
import AkModal from '~/components/ui/AkModal.vue'
import AkButton from '~/components/ui/AkButton.vue'
import AkAlert from '~/components/ui/AkAlert.vue'
import AkTabs, { type TabItem } from '~/components/ui/AkTabs.vue'
import AkBadge from '~/components/ui/AkBadge.vue'

interface Props {
  modelValue: boolean
  initialTab?: 'export' | 'import' | 'share'
  initialShareCode?: string
  teleport?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  initialTab: 'export',
  initialShareCode: '',
  teleport: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const { t } = useI18n()
const plannerStore = usePlannerStore()

const activeTab = ref<'export' | 'import' | 'share'>('export')

const modalTabs = computed<TabItem[]>(() => [
  { id: 'export', label: t('planner.modal.exportTab') },
  { id: 'share', label: t('planner.modal.shareTab') },
  { id: 'import', label: t('planner.modal.importTab') },
])

// Export state
const exportedJson = computed(() => plannerStore.exportJson())
const copyJsonSuccess = ref(false)

// Share state
const shareCode = ref('')
const shareLink = ref('')
const copyCodeSuccess = ref(false)
const copyLinkSuccess = ref(false)
const shareError = ref<string | null>(null)

// Import state
const importInput = ref('')
const importMode = ref<'merge' | 'replace'>('merge')
const importError = ref<string | null>(null)
const importSuccess = ref(false)
const parsedIncomingPlans = ref<PlanItem[] | null>(null)

const preview = computed<PlannerImportPreview | null>(() => {
  if (!parsedIncomingPlans.value) return null
  return computePlannerImportPreview(plannerStore.plans, parsedIncomingPlans.value)
})

async function ensureShareCode(): Promise<void> {
  if (plannerStore.plans.length > 0) {
    try {
      shareCode.value = await plannerStore.exportShareCode()
      if (typeof window !== 'undefined') {
        shareLink.value = `${window.location.origin}/planner?plan=${shareCode.value}`
      }
      shareError.value = null
    } catch (err) {
      shareCode.value = ''
      shareLink.value = ''
      shareError.value = err instanceof Error ? err.message : 'Failed to generate share code'
    }
  } else {
    shareCode.value = ''
    shareLink.value = ''
    shareError.value = null
  }
}

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      activeTab.value = props.initialTab
      importError.value = null
      importSuccess.value = false
      copyJsonSuccess.value = false
      copyCodeSuccess.value = false
      copyLinkSuccess.value = false
      importMode.value = 'merge'

      await ensureShareCode()

      // If initial code passed via URL query
      if (props.initialShareCode) {
        activeTab.value = 'import'
        importInput.value = props.initialShareCode
        await handleParseInput(props.initialShareCode)
      } else {
        importInput.value = ''
        parsedIncomingPlans.value = null
      }
    }
  },
  { immediate: true },
)

watch(activeTab, async (newTab) => {
  if (newTab === 'share' && props.modelValue) {
    await ensureShareCode()
  }
})

watch(
  () => plannerStore.plans.length,
  async () => {
    if (props.modelValue && activeTab.value === 'share') {
      await ensureShareCode()
    }
  },
)

async function handleCopyJson(): Promise<void> {
  try {
    if (navigator?.clipboard) {
      await navigator.clipboard.writeText(exportedJson.value)
      copyJsonSuccess.value = true
      setTimeout(() => {
        copyJsonSuccess.value = false
      }, 2500)
    }
  } catch {
    copyJsonSuccess.value = false
  }
}

function handleDownloadJson(): void {
  const blob = new Blob([exportedJson.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `arkcalc-plans-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function handleCopyShareCode(): Promise<void> {
  try {
    if (navigator?.clipboard) {
      await navigator.clipboard.writeText(shareCode.value)
      copyCodeSuccess.value = true
      setTimeout(() => {
        copyCodeSuccess.value = false
      }, 2500)
    }
  } catch {
    copyCodeSuccess.value = false
  }
}

async function handleCopyShareLink(): Promise<void> {
  try {
    if (navigator?.clipboard) {
      await navigator.clipboard.writeText(shareLink.value)
      copyLinkSuccess.value = true
      setTimeout(() => {
        copyLinkSuccess.value = false
      }, 2500)
    }
  } catch {
    copyLinkSuccess.value = false
  }
}

async function handleParseInput(input: string): Promise<void> {
  const trimmed = input.trim()
  importError.value = null
  parsedIncomingPlans.value = null

  if (!trimmed) {
    return
  }

  // 1. If starts with JSON structure
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const jsonRes = validatePlannerImport(trimmed)
    if (jsonRes.success && jsonRes.data) {
      parsedIncomingPlans.value = jsonRes.data.plans
      return
    }
    importError.value = jsonRes.error || t('planner.modal.invalidCode')
    return
  }

  // 2. Try decoding as compressed share code
  const shareRes = await decodeShareCode(trimmed)
  if (shareRes.success) {
    parsedIncomingPlans.value = shareRes.payload.plans
    return
  }

  if (shareRes.error === 'checksum_mismatch') {
    importError.value = t('planner.modal.invalidCode')
  } else if (shareRes.error === 'unsupported_version') {
    importError.value = t('planner.modal.versionMismatch', { version: 'unknown' })
  } else {
    importError.value = shareRes.message || t('planner.modal.invalidCode')
  }
}

async function handleFileSelect(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    importInput.value = text
    await handleParseInput(text)
  } catch {
    importError.value = t('planner.modal.emptyInputError')
  } finally {
    target.value = ''
  }
}

async function handleApplyImport(): Promise<void> {
  if (!parsedIncomingPlans.value || parsedIncomingPlans.value.length === 0) {
    importError.value = t('planner.modal.emptyInputError')
    return
  }

  await plannerStore.importPlans(parsedIncomingPlans.value, importMode.value)
  importSuccess.value = true

  setTimeout(() => {
    emit('update:modelValue', false)
  }, 1000)
}
</script>

<template>
  <AkModal
    :model-value="modelValue"
    :title="t('planner.modal.title')"
    :teleport="teleport"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="planner-modal">
      <AkTabs v-model="activeTab" :items="modalTabs" class="planner-modal__tabs" />

      <!-- EXPORT JSON TAB -->
      <div v-if="activeTab === 'export'" class="planner-modal__tab-content">
        <textarea
          :value="exportedJson"
          readonly
          class="planner-modal__textarea"
          rows="10"
          spellcheck="false"
        />
        <div class="planner-modal__actions">
          <AkButton variant="secondary" size="sm" @click="handleCopyJson">
            {{ copyJsonSuccess ? t('planner.modal.copied') : t('planner.modal.copy') }}
          </AkButton>
          <AkButton variant="primary" size="sm" @click="handleDownloadJson">
            {{ t('planner.modal.download') }}
          </AkButton>
        </div>
      </div>

      <!-- SHARE CODE TAB -->
      <div v-else-if="activeTab === 'share'" class="planner-modal__tab-content">
        <p class="planner-modal__hint">{{ t('planner.modal.shareCodeHint') }}</p>
        <div v-if="shareError" class="planner-modal__alert-box">
          <AkAlert variant="danger">{{ shareError }}</AkAlert>
        </div>
        <textarea
          v-else
          :value="shareCode"
          readonly
          class="planner-modal__textarea planner-modal__textarea--code"
          rows="5"
          spellcheck="false"
        />

        <div v-if="!shareError" class="planner-modal__actions">
          <AkButton variant="secondary" size="sm" @click="handleCopyShareCode">
            {{ copyCodeSuccess ? t('planner.modal.copied') : t('planner.modal.copy') }}
          </AkButton>
          <AkButton variant="primary" size="sm" @click="handleCopyShareLink">
            {{ copyLinkSuccess ? t('planner.modal.shareUrlCopied') : t('planner.modal.shareUrl') }}
          </AkButton>
        </div>
      </div>

      <!-- IMPORT TAB -->
      <div v-else-if="activeTab === 'import'" class="planner-modal__tab-content">
        <div v-if="initialShareCode" class="planner-modal__alert-box">
          <AkAlert variant="info" :title="t('planner.modal.sharePromptTitle')">
            {{ t('planner.modal.sharePromptDesc') }}
          </AkAlert>
        </div>

        <textarea
          v-model="importInput"
          class="planner-modal__textarea"
          rows="6"
          :placeholder="t('planner.modal.pastePlaceholder')"
          spellcheck="false"
          @input="handleParseInput(importInput)"
        />

        <div class="planner-modal__file-row">
          <label class="planner-modal__file-label">
            <input
              type="file"
              accept=".json,application/json"
              class="planner-modal__file-input"
              @change="handleFileSelect"
            />
            <span class="planner-modal__file-btn">
              {{ t('depot.modal.chooseFile') }}
            </span>
          </label>
        </div>

        <!-- Error Alert -->
        <div v-if="importError" class="planner-modal__alert-box">
          <AkAlert variant="danger">{{ importError }}</AkAlert>
        </div>

        <!-- Success Alert -->
        <div v-if="importSuccess" class="planner-modal__alert-box">
          <AkAlert variant="success">{{ t('depot.modal.importSuccess') }}</AkAlert>
        </div>

        <!-- Preview Section -->
        <div v-if="preview && !importError" class="planner-modal__preview">
          <h4 class="planner-modal__preview-title">
            {{ t('planner.modal.previewTitle') }} ({{ preview.totalIncoming }})
          </h4>
          <div class="planner-modal__preview-stats">
            <AkBadge variant="green" size="sm">
              {{ t('planner.modal.plansToAdd', { count: preview.plansToAdd.length }) }}
            </AkBadge>
            <AkBadge variant="amber" size="sm">
              {{ t('planner.modal.plansToUpdate', { count: preview.plansToUpdate.length }) }}
            </AkBadge>
          </div>

          <!-- Mode Selection -->
          <div class="planner-modal__modes">
            <label class="planner-modal__radio-label">
              <input v-model="importMode" type="radio" value="merge" class="planner-modal__radio" />
              <span>{{ t('planner.modal.modeMerge') }}</span>
            </label>
            <label class="planner-modal__radio-label">
              <input
                v-model="importMode"
                type="radio"
                value="replace"
                class="planner-modal__radio"
              />
              <span>{{ t('planner.modal.modeReplace') }}</span>
            </label>
          </div>

          <div class="planner-modal__actions">
            <AkButton variant="ghost" size="sm" @click="emit('update:modelValue', false)">
              {{ t('planner.modal.cancel') }}
            </AkButton>
            <AkButton variant="primary" size="sm" @click="handleApplyImport">
              {{ t('planner.modal.applyImport') }}
            </AkButton>
          </div>
        </div>
      </div>
    </div>
  </AkModal>
</template>

<style lang="scss" scoped>
.planner-modal {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);

  &__tabs {
    margin-bottom: var(--space-sm);
  }

  &__tab-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  &__hint {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  &__textarea {
    width: 100%;
    background: var(--color-bg-deep);
    border: 1px solid var(--color-border-base);
    color: var(--color-text-primary);
    font-family: var(--font-family-mono);
    font-size: var(--font-size-xs);
    padding: var(--space-sm);
    box-sizing: border-box;
    resize: vertical;

    &:focus {
      outline: none;
      border-color: var(--color-brand-ember, #ff6a3d);
    }

    &--code {
      word-break: break-all;
    }
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: var(--space-sm);
    margin-top: var(--space-xs);
  }

  &__alert-box {
    margin-top: var(--space-2xs);
  }

  &__file-row {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  &__file-label {
    position: relative;
    cursor: pointer;
  }

  &__file-input {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    border: 0;
  }

  &__file-btn {
    display: inline-block;
    padding: var(--space-2xs) var(--space-sm);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-subtle);
    font-family: var(--font-family-display);
    font-size: var(--font-size-xs);
    color: var(--color-text-primary);
    cursor: pointer;
    transition: border-color var(--transition-fast);

    &:hover {
      border-color: var(--color-border-base);
    }
  }

  &__preview {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    padding: var(--space-sm) var(--space-md);
  }

  &__preview-title {
    margin: 0;
    font-family: var(--font-family-display);
    font-size: var(--font-size-sm);
    font-weight: 700;
    color: var(--color-text-primary);
  }

  &__preview-stats {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    flex-wrap: wrap;
  }

  &__modes {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    margin: var(--space-xs) 0;
  }

  &__radio-label {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    cursor: pointer;
  }

  &__radio {
    accent-color: var(--color-brand-ember, #ff6a3d);
  }
}
</style>
