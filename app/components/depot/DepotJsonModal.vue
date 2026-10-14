<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDepotStore } from '~/stores/depot'
import { validateDepotImport, type DepotData } from '~/schemas/depot'
import AkModal from '~/components/ui/AkModal.vue'
import AkButton from '~/components/ui/AkButton.vue'
import AkAlert from '~/components/ui/AkAlert.vue'

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const { t } = useI18n()
const depotStore = useDepotStore()

const activeTab = ref<'export' | 'import'>('export')

// Export state
const exportedJson = ref('')
const copySuccess = ref(false)

// Import state
const importInput = ref('')
const importError = ref<string | null>(null)
const previewData = ref<DepotData | null>(null)
const importSuccess = ref(false)

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      exportedJson.value = depotStore.exportJson()
      copySuccess.value = false
      importInput.value = ''
      importError.value = null
      previewData.value = null
      importSuccess.value = false
    }
  },
)

async function handleCopy(): Promise<void> {
  try {
    if (navigator?.clipboard) {
      await navigator.clipboard.writeText(exportedJson.value)
      copySuccess.value = true
      setTimeout(() => {
        copySuccess.value = false
      }, 2500)
    }
  } catch {
    // Clipboard API might be unavailable in some test environments
    copySuccess.value = false
  }
}

function handleDownload(): void {
  const blob = new Blob([exportedJson.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const dateStr = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `arkcalc-depot-${dateStr}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function handleFileUpload(event: Event): void {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result
    if (typeof text === 'string') {
      importInput.value = text
      handlePreview()
    }
  }
  reader.readAsText(file)
}

function handlePreview(): void {
  importError.value = null
  previewData.value = null
  importSuccess.value = false

  if (!importInput.value.trim()) {
    importError.value = t('depot.modal.emptyInputError')
    return
  }

  const result = validateDepotImport(importInput.value)
  if (!result.success || !result.data) {
    importError.value = result.error || t('depot.modal.invalidFormatError')
    return
  }

  previewData.value = result.data
}

interface ItemDiff {
  itemId: string
  before: number
  after: number
}

const diffSummary = computed(() => {
  if (!previewData.value) return null

  const targetItems = previewData.value.items
  const currentItems = depotStore.items

  const itemDiffs: ItemDiff[] = []
  const allItemIds = new Set([...Object.keys(currentItems), ...Object.keys(targetItems)])

  for (const id of allItemIds) {
    const before = currentItems[id] ?? 0
    const after = targetItems[id] ?? 0
    if (before !== after) {
      itemDiffs.push({ itemId: id, before, after })
    }
  }

  const currencyDiffs = {
    lmd: {
      before: depotStore.currencies.lmd,
      after: previewData.value.currencies.lmd,
      changed: depotStore.currencies.lmd !== previewData.value.currencies.lmd,
    },
    orundum: {
      before: depotStore.currencies.orundum,
      after: previewData.value.currencies.orundum,
      changed: depotStore.currencies.orundum !== previewData.value.currencies.orundum,
    },
    originitePrime: {
      before: depotStore.currencies.originitePrime,
      after: previewData.value.currencies.originitePrime,
      changed: depotStore.currencies.originitePrime !== previewData.value.currencies.originitePrime,
    },
  }

  return {
    itemDiffs,
    itemsChangedCount: itemDiffs.length,
    currencyDiffs,
    hasCurrencyChange:
      currencyDiffs.lmd.changed ||
      currencyDiffs.orundum.changed ||
      currencyDiffs.originitePrime.changed,
  }
})

async function handleApplyImport(): Promise<void> {
  if (!previewData.value) return

  const res = await depotStore.importJson(importInput.value)
  if (res.success) {
    importSuccess.value = true
    setTimeout(() => {
      emit('update:modelValue', false)
    }, 600)
  } else {
    importError.value = res.error || 'Failed to apply import'
  }
}

function handleClose(): void {
  emit('update:modelValue', false)
}
</script>

<template>
  <AkModal
    :model-value="modelValue"
    :title="t('depot.modal.title')"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="ak-depot-modal">
      <div class="ak-depot-modal__tabs">
        <button
          type="button"
          class="ak-depot-modal__tab-btn"
          :class="{ 'ak-depot-modal__tab-btn--active': activeTab === 'export' }"
          @click="activeTab = 'export'"
        >
          {{ t('depot.modal.exportTab') }}
        </button>
        <button
          type="button"
          class="ak-depot-modal__tab-btn"
          :class="{ 'ak-depot-modal__tab-btn--active': activeTab === 'import' }"
          @click="activeTab = 'import'"
        >
          {{ t('depot.modal.importTab') }}
        </button>
      </div>

      <!-- Export Tab -->
      <div v-if="activeTab === 'export'" class="ak-depot-modal__pane">
        <p class="ak-depot-modal__desc">
          {{ t('depot.modal.exportDesc') }}
        </p>

        <textarea
          class="ak-depot-modal__textarea"
          readonly
          :value="exportedJson"
          :aria-label="t('depot.modal.exportedJsonAria')"
          rows="10"
        />

        <div class="ak-depot-modal__actions">
          <AkButton variant="secondary" @click="handleCopy">
            {{ copySuccess ? t('depot.modal.copied') : t('depot.modal.copy') }}
          </AkButton>
          <AkButton variant="primary" @click="handleDownload">
            {{ t('depot.modal.download') }}
          </AkButton>
        </div>
      </div>

      <!-- Import Tab -->
      <div v-else class="ak-depot-modal__pane">
        <p class="ak-depot-modal__desc">
          {{ t('depot.modal.importDesc') }}
        </p>

        <div class="ak-depot-modal__file-picker">
          <label class="ak-depot-modal__file-label">
            <span>{{ t('depot.modal.chooseFile') }}</span>
            <input
              type="file"
              accept=".json,application/json"
              class="ak-depot-modal__file-input"
              @change="handleFileUpload"
            />
          </label>
        </div>

        <textarea
          v-model="importInput"
          class="ak-depot-modal__textarea"
          :placeholder="t('depot.modal.pastePlaceholder')"
          :aria-label="t('depot.modal.importJsonAria')"
          rows="8"
          @input="previewData = null"
        />

        <AkAlert v-if="importError" variant="danger" class="ak-depot-modal__alert">
          {{ importError }}
        </AkAlert>

        <AkAlert v-if="importSuccess" variant="success" class="ak-depot-modal__alert">
          {{ t('depot.modal.importSuccess') }}
        </AkAlert>

        <!-- Preview Diff Section -->
        <div v-if="previewData && diffSummary" class="ak-depot-modal__diff">
          <h3 class="ak-depot-modal__diff-title">
            {{ t('depot.modal.previewTitle') }}
          </h3>

          <div class="ak-depot-modal__diff-summary">
            <span v-if="diffSummary.hasCurrencyChange" class="ak-depot-modal__diff-tag">
              {{ t('depot.modal.currenciesChanged') }}
            </span>
            <span class="ak-depot-modal__diff-tag">
              {{ t('depot.modal.itemsCountChanged', { count: diffSummary.itemsChangedCount }) }}
            </span>
          </div>

          <div v-if="diffSummary.hasCurrencyChange" class="ak-depot-modal__diff-currencies">
            <div v-if="diffSummary.currencyDiffs.lmd.changed" class="ak-depot-modal__diff-row">
              <span class="ak-depot-modal__diff-name">LMD:</span>
              <span class="ak-depot-modal__diff-val">{{
                diffSummary.currencyDiffs.lmd.before
              }}</span>
              <span class="ak-depot-modal__diff-arrow">&rarr;</span>
              <span class="ak-depot-modal__diff-val ak-depot-modal__diff-val--next">{{
                diffSummary.currencyDiffs.lmd.after
              }}</span>
            </div>
            <div v-if="diffSummary.currencyDiffs.orundum.changed" class="ak-depot-modal__diff-row">
              <span class="ak-depot-modal__diff-name">Orundum:</span>
              <span class="ak-depot-modal__diff-val">{{
                diffSummary.currencyDiffs.orundum.before
              }}</span>
              <span class="ak-depot-modal__diff-arrow">&rarr;</span>
              <span class="ak-depot-modal__diff-val ak-depot-modal__diff-val--next">{{
                diffSummary.currencyDiffs.orundum.after
              }}</span>
            </div>
            <div
              v-if="diffSummary.currencyDiffs.originitePrime.changed"
              class="ak-depot-modal__diff-row"
            >
              <span class="ak-depot-modal__diff-name">Originite Prime:</span>
              <span class="ak-depot-modal__diff-val">{{
                diffSummary.currencyDiffs.originitePrime.before
              }}</span>
              <span class="ak-depot-modal__diff-arrow">&rarr;</span>
              <span class="ak-depot-modal__diff-val ak-depot-modal__diff-val--next">{{
                diffSummary.currencyDiffs.originitePrime.after
              }}</span>
            </div>
          </div>
        </div>

        <div class="ak-depot-modal__actions">
          <AkButton
            v-if="!previewData"
            variant="secondary"
            :disabled="!importInput.trim()"
            @click="handlePreview"
          >
            {{ t('depot.modal.preview') }}
          </AkButton>
          <AkButton v-else variant="primary" @click="handleApplyImport">
            {{ t('depot.modal.applyImport') }}
          </AkButton>
          <AkButton variant="ghost" @click="handleClose">
            {{ t('depot.modal.cancel') }}
          </AkButton>
        </div>
      </div>
    </div>
  </AkModal>
</template>

<style lang="scss" scoped>
.ak-depot-modal {
  display: flex;
  flex-direction: column;
  gap: var(--space-md, 16px);

  &__tabs {
    display: flex;
    gap: var(--space-xs, 12px);
    border-bottom: 1px solid var(--color-border-subtle);
    padding-bottom: var(--space-2xs, 8px);
  }

  &__tab-btn {
    padding: var(--space-2xs, 8px) var(--space-sm, 14px);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--color-text-secondary);
    font-family: var(--font-body);
    font-size: var(--font-size-sm, 14px);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition:
      color var(--transition-fast),
      border-color var(--transition-fast);

    &:hover {
      color: var(--color-text-primary);
    }

    &--active {
      color: var(--color-accent-primary);
      border-bottom-color: var(--color-accent-primary);
    }
  }

  &__pane {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm, 14px);
  }

  &__desc {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm, 14px);
    line-height: 1.4;
  }

  &__file-picker {
    display: flex;
  }

  &__file-label {
    display: inline-flex;
    align-items: center;
    padding: var(--space-2xs, 8px) var(--space-sm, 14px);
    background-color: var(--color-bg-deep);
    border: 1px dashed var(--color-border-bold);
    color: var(--color-text-accent);
    font-size: var(--font-size-xs, 12px);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition: background-color var(--transition-fast);

    &:hover {
      background-color: var(--color-bg-elevated);
    }
  }

  &__file-input {
    display: none;
  }

  &__textarea {
    width: 100%;
    box-sizing: border-box;
    padding: var(--space-sm, 12px);
    background-color: var(--color-bg-deep);
    border: 1px solid var(--color-border-bold);
    color: var(--color-text-primary);
    font-family: var(--font-mono, monospace);
    font-size: var(--font-size-xs, 12px);
    line-height: 1.4;
    resize: vertical;
    border-radius: var(--radius-none);

    &:focus-visible {
      outline: 2px solid var(--color-accent-primary);
      outline-offset: -1px;
    }
  }

  &__alert {
    margin-top: var(--space-2xs, 8px);
  }

  &__diff {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs, 10px);
    padding: var(--space-sm, 12px);
    background-color: var(--color-bg-deep);
    border: 1px solid var(--color-border-subtle);
  }

  &__diff-title {
    margin: 0;
    font-family: var(--font-heading);
    font-size: var(--font-size-sm, 14px);
    color: var(--color-text-primary);
  }

  &__diff-summary {
    display: flex;
    gap: var(--space-xs, 8px);
    flex-wrap: wrap;
  }

  &__diff-tag {
    display: inline-block;
    padding: 2px 8px;
    background-color: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    font-size: var(--font-size-xs, 12px);
    color: var(--color-text-accent);
  }

  &__diff-currencies {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: var(--font-size-xs, 12px);
  }

  &__diff-row {
    display: flex;
    align-items: center;
    gap: var(--space-2xs, 8px);
  }

  &__diff-name {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    min-width: 100px;
  }

  &__diff-val {
    color: var(--color-text-muted);

    &--next {
      color: var(--color-accent-primary);
      font-weight: var(--font-weight-bold);
    }
  }

  &__diff-arrow {
    color: var(--color-text-muted);
  }

  &__actions {
    display: flex;
    gap: var(--space-sm, 12px);
    justify-content: flex-end;
    margin-top: var(--space-xs, 8px);
  }
}
</style>
