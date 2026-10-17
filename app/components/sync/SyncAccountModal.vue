<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AkModal from '~/components/ui/AkModal.vue'

interface Props {
  modelValue: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'load-demo'): void
}>()

const { t } = useI18n()

type SyncTab = 'yostar' | 'json' | 'demo'
const activeTab = ref<SyncTab>('yostar')
const selectedRegion = ref('EN')
const email = ref('')
const verificationCode = ref('')
const isCodeSent = ref(false)

const tabs: { id: SyncTab; labelKey: string }[] = [
  { id: 'yostar', labelKey: 'syncModal.tabs.yostar' },
  { id: 'json', labelKey: 'syncModal.tabs.json' },
  { id: 'demo', labelKey: 'syncModal.tabs.demo' },
]

const regions = ['EN', 'JP', 'KR', 'CN']

function handleClose(): void {
  emit('update:modelValue', false)
}

function handleSendCode(): void {
  if (!email.value) return
  isCodeSent.value = true
}

function handleStartSync(): void {
  // UI stub: closes dialog
  handleClose()
}

function handleLoadDemo(): void {
  emit('load-demo')
  handleClose()
}
</script>

<template>
  <AkModal
    :model-value="modelValue"
    :title="t('syncModal.title')"
    :tag="t('syncModal.tag')"
    width="620px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="sync-modal">
      <!-- Unofficial login advisory (4px Ember border on panel, advisory amber box) -->
      <div class="sync-modal__alert" role="alert">
        <strong class="sync-modal__alert-strong">{{ t('syncModal.risk.safetyLabel') }}.</strong>
        <span> {{ t('syncModal.risk.safetyDesc') }}</span>
        <br />
        <span class="sync-modal__alert-muted">{{ t('syncModal.risk.privacyDesc') }}</span>
      </div>

      <!-- Navigation Tabs -->
      <div class="sync-modal__tabs" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.id"
          class="sync-modal__tab"
          :class="{ 'sync-modal__tab--active': activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ t(tab.labelKey) }}
        </button>
      </div>

      <!-- Yostar Email Code Tab -->
      <div v-if="activeTab === 'yostar'" class="sync-modal__content">
        <label class="sync-modal__field-label">{{ t('syncModal.region.label') }}</label>
        <div
          class="sync-modal__regions"
          role="radiogroup"
          :aria-label="t('syncModal.region.label')"
        >
          <button
            v-for="reg in regions"
            :key="reg"
            type="button"
            role="radio"
            :aria-checked="selectedRegion === reg"
            class="sync-modal__reg-btn"
            :class="{ 'sync-modal__reg-btn--active': selectedRegion === reg }"
            @click="selectedRegion = reg"
          >
            {{ reg }}
          </button>
        </div>

        <div class="sync-modal__email-group">
          <label class="sync-modal__field-label">
            {{ t('syncModal.email.label') }}
            <input
              v-model="email"
              type="email"
              placeholder="you@example.com"
              class="sync-modal__input"
            />
          </label>
          <button
            type="button"
            class="sync-modal__send-btn"
            :disabled="!email"
            @click="handleSendCode"
          >
            {{ isCodeSent ? t('syncModal.code.sent') : t('syncModal.code.send') }}
          </button>
        </div>

        <p class="sync-modal__hint">{{ t('syncModal.email.hint') }}</p>

        <label class="sync-modal__field-label">
          {{ t('syncModal.code.label') }}
          <input
            v-model="verificationCode"
            type="text"
            inputmode="numeric"
            maxlength="6"
            placeholder="000000"
            class="sync-modal__input sync-modal__input--code"
          />
        </label>
      </div>

      <!-- JSON File Import Tab -->
      <div v-else-if="activeTab === 'json'" class="sync-modal__content">
        <div class="sync-modal__placeholder-box">
          <p class="sync-modal__placeholder-desc">{{ t('syncModal.json.description') }}</p>
          <button type="button" class="sync-modal__btn-outline">
            {{ t('syncModal.json.selectFile') }}
          </button>
        </div>
      </div>

      <!-- Demo Data Tab -->
      <div v-else-if="activeTab === 'demo'" class="sync-modal__content">
        <div class="sync-modal__placeholder-box">
          <p class="sync-modal__placeholder-desc">{{ t('syncModal.demo.description') }}</p>
          <button type="button" class="sync-modal__btn-primary" @click="handleLoadDemo">
            {{ t('syncModal.demo.loadButton') }}
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="sync-modal__footer-actions">
        <button type="button" class="sync-modal__btn-cancel" @click="handleClose">
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="sync-modal__btn-primary"
          :disabled="activeTab === 'yostar' && (!email || !verificationCode)"
          @click="handleStartSync"
        >
          {{ t('syncModal.startSync') }}
        </button>
      </div>
    </template>
  </AkModal>
</template>

<style lang="scss" scoped>
.sync-modal {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;

  &__alert {
    margin: 0 0 20px;
    padding: 14px 16px;
    background-color: var(--color-accent-warning-subtle);
    border: 1px solid var(--color-border-amber);
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    line-height: 1.55;
    color: var(--color-text-primary);

    @media (width <= 480px) {
      margin: 0 0 10px;
      padding: 8px 10px;
      font-size: var(--font-size-xs, 12px);
      line-height: 1.35;
    }
  }

  &__alert-strong {
    color: var(--color-accent-warning);
    font-weight: var(--font-weight-bold);
  }

  &__alert-muted {
    color: var(--color-text-secondary);
  }

  &__tabs {
    display: flex;
    gap: 24px;
    border-bottom: 1px solid var(--color-border-base);
    margin-bottom: 22px;

    @media (width <= 480px) {
      gap: 12px;
      margin-bottom: 12px;
    }
  }

  &__tab {
    background: none;
    border: 0;
    border-bottom: 3px solid transparent;
    padding: 0 0 12px;
    color: var(--color-text-secondary);
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition:
      color var(--transition-fast),
      border-color var(--transition-fast);

    @include focus-ring;

    @media (width <= 480px) {
      padding: 0 0 6px;
      font-size: var(--font-size-xs, 12px);
      white-space: nowrap;
    }

    &--active {
      color: var(--color-text-primary);
      border-bottom-color: var(--color-accent-primary);
    }
  }

  &__content {
    display: flex;
    flex-direction: column;
  }

  &__field-label {
    display: block;
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-caption);
    color: var(--color-text-secondary);
    text-transform: uppercase;
  }

  &__regions {
    display: flex;
    gap: 8px;
    margin: 8px 0 20px;

    @media (width <= 480px) {
      gap: 6px;
      margin: 4px 0 10px;
    }
  }

  &__reg-btn {
    flex: 1;
    padding: 11px 0;
    background-color: var(--color-bg-deep);
    border: 1px solid var(--color-border-bold);
    color: var(--color-text-primary);
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition:
      background-color var(--transition-fast),
      border-color var(--transition-fast),
      color var(--transition-fast);

    @include focus-ring;

    @media (width <= 480px) {
      padding: 6px 0;
      font-size: 12px;
    }

    &--active {
      background-color: var(--color-accent-primary);
      border-color: var(--color-accent-primary);
      color: var(--color-text-inverse);
    }
  }

  &__email-group {
    display: flex;
    gap: 10px;
    align-items: flex-end;
    margin-bottom: 6px;

    @media (width <= 480px) {
      gap: 6px;
      margin-bottom: 4px;

      .sync-modal__send-btn {
        padding: 8px 12px;
        font-size: 12px;
        height: 38px;
      }
    }

    .sync-modal__field-label {
      flex: 1;
    }
  }

  &__input {
    display: block;
    margin-top: 8px;
    width: 100%;
    box-sizing: border-box;
    padding: 12px 14px;
    background-color: var(--color-bg-deep);
    border: 1px solid var(--color-border-bold);
    color: var(--color-text-primary);
    font-family: var(--font-body);
    font-size: 15px;

    @include focus-ring;

    @media (width <= 480px) {
      margin-top: 4px;
      padding: 8px 10px;
      font-size: 13px;
      height: 38px;
    }

    &--code {
      letter-spacing: 0.5em;
      text-align: center;
      font-size: 20px;
      font-weight: var(--font-weight-semibold);

      @media (width <= 480px) {
        font-size: 17px;
        height: 38px;
        padding: 6px 8px;
        letter-spacing: 0.35em;
      }
    }
  }

  &__send-btn {
    padding: 13px 20px;
    background-color: transparent;
    border: 1px solid var(--color-text-accent);
    color: var(--color-text-accent);
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    white-space: nowrap;
    transition: background-color var(--transition-fast);

    @include focus-ring;

    &:hover:not(:disabled) {
      background-color: var(--color-bg-highlight);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__hint {
    margin: 0 0 18px;
    font-family: var(--font-body);
    font-size: 13px;
    color: var(--color-text-secondary);

    @media (width <= 480px) {
      margin: 0 0 10px;
      font-size: 11px;
    }
  }

  &__placeholder-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 36px 20px;
    text-align: center;
    gap: 16px;
    border: 1px dashed var(--color-border-bold);
    background-color: var(--color-bg-deep);
  }

  &__placeholder-desc {
    margin: 0;
    max-width: 440px;
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    line-height: var(--line-height-base);
  }

  &__footer-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    width: 100%;

    @media (width <= 480px) {
      gap: 8px;
    }
  }

  &__btn-cancel {
    padding: 12px 22px;
    background-color: transparent;
    border: 1px solid var(--color-border-bold);
    color: var(--color-text-primary);
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;

    @include focus-ring;

    @media (width <= 480px) {
      padding: 8px 14px;
      font-size: 12px;
    }
  }

  &__btn-primary {
    padding: 12px 26px;
    background-color: var(--color-accent-primary);
    border: 0;
    color: var(--color-text-inverse);
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition: background-color var(--transition-fast);

    @include focus-ring;

    @media (width <= 480px) {
      padding: 8px 16px;
      font-size: 12px;
    }

    &:hover:not(:disabled) {
      background-color: var(--color-accent-primary-hover);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__btn-outline {
    padding: 12px 22px;
    background-color: transparent;
    border: 1px solid var(--color-border-gold);
    color: var(--color-text-accent);
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;

    @include focus-ring;

    @media (width <= 480px) {
      padding: 8px 14px;
      font-size: 12px;
    }
  }
}
</style>
