<script setup lang="ts">
import type { OperatorDetail, I18nString } from '~/../shared/schemas/operator'
import { resolveI18nString, isPendingTranslation } from '~/../shared/schemas/operator'
import { isRecruitTag } from '~/../shared/utils/recruit'
import AkBadge from '~/components/ui/AkBadge.vue'
import AkTranslationBadge from '~/components/ui/AkTranslationBadge.vue'
import AkOperatorDossierPanel from '~/components/operators/AkOperatorDossierPanel.vue'

interface Props {
  operator: OperatorDetail
}

defineProps<Props>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

function getLocalizedField(field?: I18nString | null): string {
  if (!field) return '—'
  return resolveI18nString(field, locale.value as 'en' | 'zh') || field.en || field.zh || '—'
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

      <div v-if="operator.subclass" class="ak-operator-info-panel__item">
        <span class="ak-operator-info-panel__label">{{ t('operators.filters.subclass') }}</span>
        <span class="ak-operator-info-panel__value">{{ operator.subclass }}</span>
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
        <template v-for="tag in operator.tagList" :key="tag">
          <NuxtLink
            v-if="isRecruitTag(tag)"
            :to="localePath({ path: '/recruit', query: { tags: tag } })"
            class="ak-operator-info-panel__tag-link"
            :title="t('operators.detail.info.recruitTagTooltip', { tag })"
            :aria-label="t('operators.detail.info.recruitTagTooltip', { tag })"
          >
            <AkBadge size="sm" variant="cyan">
              {{ tag }}
            </AkBadge>
          </NuxtLink>
          <AkBadge v-else size="sm" variant="cyan">
            {{ tag }}
          </AkBadge>
        </template>
      </div>
    </div>

    <!-- Lore / Usage Text -->
    <div v-if="operator.itemUsage" class="ak-operator-info-panel__dossier-card">
      <div class="ak-operator-info-panel__dossier-header">
        <span class="ak-operator-info-panel__dossier-title">
          {{ t('operators.detail.info.itemUsage') }}
        </span>
        <AkTranslationBadge
          v-if="operator.itemUsage.source"
          :source="operator.itemUsage.source"
          :stale="operator.itemUsage.stale"
        />
      </div>
      <p
        class="ak-operator-info-panel__dossier-text"
        :class="{
          'ak-operator-info-panel__dossier-text--pending':
            operator.itemUsage.source === 'pending' || isPendingTranslation(operator.itemUsage),
        }"
      >
        {{ getLocalizedField(operator.itemUsage) }}
      </p>
    </div>

    <div v-if="operator.itemDesc" class="ak-operator-info-panel__dossier-card">
      <div class="ak-operator-info-panel__dossier-header">
        <span class="ak-operator-info-panel__dossier-title">
          {{ t('operators.detail.info.itemDesc') }}
        </span>
        <AkTranslationBadge
          v-if="operator.itemDesc.source"
          :source="operator.itemDesc.source"
          :stale="operator.itemDesc.stale"
        />
      </div>
      <p
        class="ak-operator-info-panel__dossier-text"
        :class="{
          'ak-operator-info-panel__dossier-text--pending':
            operator.itemDesc.source === 'pending' || isPendingTranslation(operator.itemDesc),
        }"
      >
        {{ getLocalizedField(operator.itemDesc) }}
      </p>
    </div>

    <!-- Operator Dossier (Basic Profile, Physical Evaluation, Archival Stories) -->
    <AkOperatorDossierPanel :char-id="operator.id" />
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
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-sm);
    padding: var(--space-md);
  }

  &__item {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__label {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  &__value {
    font-family: var(--font-body);
    font-weight: var(--font-weight-semibold);
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

  &__tag-link {
    display: inline-flex;
    text-decoration: none;
    cursor: pointer;
    border-radius: var(--radius-none);
    transition:
      opacity var(--transition-fast),
      transform var(--transition-fast);

    &:hover {
      opacity: 0.85;
      transform: translateY(-1px);
    }

    &:focus-visible {
      outline: 2px solid var(--color-accent-cyan);
      outline-offset: 2px;
    }
  }

  &__dossier-card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-left: 3px solid var(--color-accent-amber);
    border-radius: var(--radius-sm);
    padding: var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__dossier-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-xs);
  }

  &__dossier-title {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.08em;
    color: var(--color-accent-amber);
    text-transform: uppercase;
  }

  &__dossier-text {
    margin: 0;
    line-height: var(--line-height-relaxed);
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);

    &--pending {
      font-style: italic;
      color: var(--color-text-muted);
    }
  }
}
</style>
