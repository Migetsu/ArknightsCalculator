<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AkModal from '~/components/ui/AkModal.vue'
import AkAlert from '~/components/ui/AkAlert.vue'
import AkTabs, { type TabItem } from '~/components/ui/AkTabs.vue'
import AkButton from '~/components/ui/AkButton.vue'
import AkInput from '~/components/ui/AkInput.vue'
import AkBadge from '~/components/ui/AkBadge.vue'

interface Props {
  modelValue: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'load-demo'): void
}>()

const { t } = useI18n()

const activeTab = ref('yostar')
const selectedRegion = ref('EN')
const email = ref('')
const verificationCode = ref('')
const isCodeSent = ref(false)

const tabs: TabItem[] = [
  { id: 'yostar', label: t('syncModal.tabs.yostar') },
  { id: 'json', label: t('syncModal.tabs.json') },
  { id: 'demo', label: t('syncModal.tabs.demo') },
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
    width="580px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="sync-modal">
      <AkAlert variant="warning" class="sync-modal__alert">
        <template #badge>
          <span class="sync-modal__alert-title"> ⚠ {{ t('syncModal.risk.title') }} </span>
          <AkBadge variant="green" size="sm"> 🔒 {{ t('syncModal.risk.zeroStorage') }} </AkBadge>
        </template>
        <div class="sync-modal__alert-text">
          <p class="sync-modal__alert-p">
            <strong class="sync-modal__alert-strong">{{ t('syncModal.risk.safetyLabel') }}:</strong>
            {{ t('syncModal.risk.safetyDesc') }}
          </p>
          <p class="sync-modal__alert-p">
            <strong class="sync-modal__alert-strong"
              >{{ t('syncModal.risk.privacyLabel') }}:</strong
            >
            {{ t('syncModal.risk.privacyDesc') }}
          </p>
        </div>
      </AkAlert>

      <AkTabs v-model="activeTab" :items="tabs" aria-label="Sync options">
        <template #default="{ activeTab: currentTab }">
          <!-- Yostar Email Code Tab -->
          <div v-if="currentTab === 'yostar'" class="sync-modal__tab-content">
            <div class="sync-modal__field-group">
              <span class="sync-modal__field-label">
                {{ t('syncModal.region.label') }}
              </span>
              <div
                class="sync-modal__regions"
                role="radiogroup"
                :aria-label="t('syncModal.region.label')"
              >
                <button
                  v-for="region in regions"
                  :key="region"
                  type="button"
                  role="radio"
                  :aria-checked="selectedRegion === region"
                  class="sync-modal__region-btn"
                  :class="{ 'sync-modal__region-btn--active': selectedRegion === region }"
                  @click="selectedRegion = region"
                >
                  {{ region }}
                </button>
              </div>
            </div>

            <div class="sync-modal__email-row">
              <div class="sync-modal__email-input">
                <AkInput
                  v-model="email"
                  type="email"
                  :label="t('syncModal.email.label')"
                  placeholder="doctor@example.com"
                  :hint="t('syncModal.email.hint')"
                />
              </div>
              <div class="sync-modal__send-btn-wrap">
                <AkButton variant="secondary" size="md" :disabled="!email" @click="handleSendCode">
                  {{ isCodeSent ? t('syncModal.code.sent') : t('syncModal.code.send') }}
                </AkButton>
              </div>
            </div>

            <div class="sync-modal__field-group">
              <AkInput
                v-model="verificationCode"
                type="text"
                :label="t('syncModal.code.label')"
                placeholder="1 2 3 4 5 6"
                :hint="t('syncModal.code.hint')"
              />
            </div>
          </div>

          <!-- Manual JSON Import Tab -->
          <div v-else-if="currentTab === 'json'" class="sync-modal__tab-content">
            <div class="sync-modal__json-box">
              <p class="sync-modal__json-desc">
                {{ t('syncModal.json.description') }}
              </p>
              <AkButton variant="secondary" size="md">
                {{ t('syncModal.json.selectFile') }}
              </AkButton>
            </div>
          </div>

          <!-- Demo Preview Tab -->
          <div v-else-if="currentTab === 'demo'" class="sync-modal__tab-content">
            <div class="sync-modal__demo-box">
              <p class="sync-modal__demo-desc">
                {{ t('syncModal.demo.description') }}
              </p>
              <AkButton variant="primary" size="md" @click="handleLoadDemo">
                {{ t('syncModal.demo.loadButton') }}
              </AkButton>
            </div>
          </div>
        </template>
      </AkTabs>
    </div>

    <template #footer>
      <AkButton variant="ghost" size="md" @click="handleClose">
        {{ t('common.cancel') }}
      </AkButton>
      <AkButton
        variant="primary"
        size="md"
        :disabled="activeTab === 'yostar' && (!email || !verificationCode)"
        @click="handleStartSync"
      >
        {{ t('syncModal.startSync') }}
      </AkButton>
    </template>
  </AkModal>
</template>

<style lang="scss" scoped>
.sync-modal {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);

  &__alert {
    width: 100%;
  }

  &__alert-title {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-mono);
    color: var(--color-accent-warning);
    text-transform: uppercase;
  }

  &__alert-text {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    font-size: var(--font-size-xs);
    line-height: var(--line-height-relaxed);
  }

  &__alert-p {
    margin: 0;
  }

  &__alert-strong {
    color: var(--color-text-primary);
  }

  &__tab-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    padding-top: var(--space-xs);
  }

  &__field-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
  }

  &__field-label {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-mono);
    color: var(--color-text-secondary);
    text-transform: uppercase;
  }

  &__regions {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-xs);
  }

  &__region-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-xs);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-mono);
    border: 1px solid var(--color-border-bold);
    background-color: var(--color-bg-elevated);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition:
      border-color var(--transition-fast),
      color var(--transition-fast),
      background-color var(--transition-fast),
      box-shadow var(--transition-fast);

    @include cut-corner(4px, top-right);
    @include focus-ring;

    &:hover {
      border-color: var(--color-accent-primary);
      color: var(--color-text-primary);
    }

    &--active {
      border-color: var(--color-accent-primary);
      background-color: var(--color-accent-primary-subtle);
      color: var(--color-accent-primary);
      box-shadow: 0 0 8px var(--color-accent-primary-glow);
    }
  }

  &__email-row {
    display: flex;
    align-items: flex-start;
    gap: var(--space-sm);
  }

  &__email-input {
    flex: 1;
    min-width: 0;
  }

  &__send-btn-wrap {
    margin-top: 1.35rem; // aligns with the input field below its label
    flex-shrink: 0;
  }

  &__json-box,
  &__demo-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: var(--space-xl) var(--space-md);
    gap: var(--space-md);
    border: 1px dashed var(--color-border-bold);
    background: linear-gradient(135deg, rgb(16 18 23 / 60%) 0%, rgb(8 9 12 / 70%) 100%);

    @include cut-corner(8px, top-right);
  }

  &__json-desc,
  &__demo-desc {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    line-height: var(--line-height-relaxed);
    max-width: 440px;
    margin: 0;
  }
}
</style>
