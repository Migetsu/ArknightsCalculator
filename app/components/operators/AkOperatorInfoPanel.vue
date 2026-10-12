<script setup lang="ts">
import type { OperatorDetail } from '~/../shared/schemas/operator'
import { resolveI18nString } from '~/../shared/schemas/operator'
import AkBadge from '~/components/ui/AkBadge.vue'

interface Props {
  operator: OperatorDetail
}

defineProps<Props>()

const { t, locale } = useI18n()

function getLocalizedField(
  field?: { en: string; zh: string; isMachineTranslation?: boolean; ru?: string } | null,
): string {
  if (!field) return '—'
  return (
    resolveI18nString(
      {
        en: field.en,
        zh: field.zh,
        ru: field.ru,
        isMachineTranslation: field.isMachineTranslation ?? false,
      },
      locale.value as 'en' | 'ru' | 'zh',
    ) ||
    field.en ||
    field.zh ||
    '—'
  )
}
</script>

<template>
  <div class="ak-operator-info-panel">
    <div class="ak-operator-info-panel__grid">
      <div class="ak-operator-info-panel__item">
        <span class="ak-operator-info-panel__label">{{ t('operators.detail.code') }}</span>
        <span class="ak-operator-info-panel__value">{{
          operator.displayNumber || operator.id
        }}</span>
      </div>

      <div class="ak-operator-info-panel__item">
        <span class="ak-operator-info-panel__label">{{ t('operators.detail.faction') }}</span>
        <span class="ak-operator-info-panel__value">
          {{ operator.faction ? t('operators.factions.' + operator.faction) : '—' }}
        </span>
      </div>

      <div class="ak-operator-info-panel__item">
        <span class="ak-operator-info-panel__label">{{
          t('operators.detail.info.illustrator')
        }}</span>
        <span class="ak-operator-info-panel__value">{{ operator.artist || '—' }}</span>
      </div>

      <div class="ak-operator-info-panel__item">
        <span class="ak-operator-info-panel__label">{{
          t('operators.detail.info.voiceActor')
        }}</span>
        <span class="ak-operator-info-panel__value">{{ operator.va || '—' }}</span>
      </div>
    </div>

    <!-- Tags -->
    <div v-if="operator.tagList?.length" class="ak-operator-info-panel__tags-section">
      <span class="ak-operator-info-panel__label">{{ t('operators.detail.info.tags') }}</span>
      <div class="ak-operator-info-panel__tags-list">
        <AkBadge v-for="tag in operator.tagList" :key="tag" size="sm" variant="cyan">
          {{ tag }}
        </AkBadge>
      </div>
    </div>

    <!-- Lore / Usage Text -->
    <div v-if="operator.itemUsage" class="ak-operator-info-panel__dossier-card">
      <span class="ak-operator-info-panel__dossier-title">
        {{ t('operators.detail.info.itemUsage') }}
      </span>
      <p class="ak-operator-info-panel__dossier-text">
        {{ getLocalizedField(operator.itemUsage) }}
      </p>
    </div>

    <div v-if="operator.itemDesc" class="ak-operator-info-panel__dossier-card">
      <span class="ak-operator-info-panel__dossier-title">
        {{ t('operators.detail.info.itemDesc') }}
      </span>
      <p class="ak-operator-info-panel__dossier-text">
        {{ getLocalizedField(operator.itemDesc) }}
      </p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ak-operator-info-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-md);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    padding: var(--space-md);
  }

  &__item {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__label {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-dim);
    text-transform: uppercase;
  }

  &__value {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-md);
    color: var(--color-text-primary);
  }

  &__tags-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  &__dossier-card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-left: 2px solid var(--color-accent-amber);
    padding: var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__dossier-title {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-xs);
    color: var(--color-accent-amber);
    text-transform: uppercase;
  }

  &__dossier-text {
    margin: 0;
    line-height: var(--line-height-relaxed);
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
  }
}
</style>
