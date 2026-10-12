<script setup lang="ts">
import { ref } from 'vue'
import AkContainer from '~/components/ui/AkContainer.vue'
import AkPageHeader from '~/components/ui/AkPageHeader.vue'
import AkEmptyState from '~/components/ui/AkEmptyState.vue'
import AkAlert from '~/components/ui/AkAlert.vue'
import AkButton from '~/components/ui/AkButton.vue'
import { getModuleById } from '~/config/modules'

const { t } = useI18n()
const localePath = useLocalePath()
const moduleConfig = getModuleById('settings')

type PageState = 'empty' | 'loading' | 'error'
const pageState = ref<PageState>('empty')
</script>

<template>
  <div class="module-page">
    <AkContainer size="lg" class="module-page__container">
      <AkPageHeader
        :code="moduleConfig?.code ?? 'SET-06'"
        :tag-label="t('modules.tag')"
        :title="moduleConfig ? t(moduleConfig.nameKey) : 'Settings'"
        :subtitle="moduleConfig ? t(moduleConfig.descriptionKey) : ''"
        watermark="SETTINGS"
        :badge="t('modules.status.soon')"
        badge-variant="amber"
      >
        <template #actions>
          <AkButton variant="ghost" size="sm" :to="localePath('/')">
            {{ t('common.backToDashboard') }}
          </AkButton>
        </template>
      </AkPageHeader>

      <div class="module-page__content">
        <!-- Loading State -->
        <div v-if="pageState === 'loading'" class="module-page__state-box">
          <span class="module-page__spinner" aria-hidden="true" />
          <p class="module-page__state-text">{{ t('common.loading') }}</p>
        </div>

        <!-- Error State -->
        <AkAlert
          v-else-if="pageState === 'error'"
          variant="danger"
          :title="t('modules.error.title')"
        >
          <p>{{ t('modules.error.description') }}</p>
          <template #actions>
            <AkButton variant="secondary" size="sm" @click="pageState = 'empty'">
              {{ t('common.retry') }}
            </AkButton>
          </template>
        </AkAlert>

        <!-- Empty / Coming Soon State -->
        <div v-else class="module-page__empty-box">
          <AkEmptyState
            :title="t('modules.empty.title')"
            :description="t('modules.empty.description')"
          >
            <template #actions>
              <AkButton variant="secondary" size="md" :to="localePath('/')">
                {{ t('common.backToDashboard') }}
              </AkButton>
            </template>
          </AkEmptyState>
        </div>
      </div>
    </AkContainer>
  </div>
</template>

<style lang="scss" scoped>
.module-page {
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

  &__content {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    min-width: 0;
  }

  &__empty-box {
    padding: var(--space-xl) var(--space-md);
    background-color: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    display: flex;
    justify-content: center;
    align-items: center;
    min-width: 0;
  }

  &__state-box {
    padding: var(--space-2xl) var(--space-md);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    background-color: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
  }

  &__spinner {
    width: 2rem;
    height: 2rem;
    border: 2px solid var(--color-border-subtle);
    border-top-color: var(--color-accent-primary);
    border-radius: var(--radius-full);
    animation: module-spin 0.8s linear infinite;
  }

  &__state-text {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    letter-spacing: var(--letter-spacing-mono);
    color: var(--color-text-secondary);
  }
}

@keyframes module-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
