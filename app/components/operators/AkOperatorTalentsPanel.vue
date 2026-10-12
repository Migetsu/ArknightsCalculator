<script setup lang="ts">
import type { OperatorTalent } from '~/../shared/schemas/operator'
import { resolveI18nString } from '~/../shared/schemas/operator'
import AkRichText from '~/components/ui/AkRichText.vue'
import AkBadge from '~/components/ui/AkBadge.vue'

interface Props {
  talents: OperatorTalent[]
}

defineProps<Props>()

const { t, locale } = useI18n()

function getCandidateName(cand: OperatorTalent['candidates'][number]): string {
  return (
    resolveI18nString(cand.name, locale.value as 'en' | 'ru' | 'zh') || cand.name?.en || 'Talent'
  )
}

function getCandidateDesc(cand: OperatorTalent['candidates'][number]): string {
  return (
    resolveI18nString(cand.description, locale.value as 'en' | 'ru' | 'zh') ||
    cand.description?.en ||
    ''
  )
}
</script>

<template>
  <div class="ak-operator-talents-panel">
    <div v-if="talents.length === 0" class="ak-operator-talents-panel__empty">
      {{ t('operators.detail.talents.noTalents') }}
    </div>

    <div
      v-for="(talent, tIdx) in talents"
      :key="tIdx"
      class="ak-operator-talents-panel__talent-block"
    >
      <div
        v-for="(candidate, cIdx) in talent.candidates"
        :key="cIdx"
        class="ak-operator-talents-panel__candidate-card"
      >
        <div class="ak-operator-talents-panel__header">
          <h4 class="ak-operator-talents-panel__name">
            {{ getCandidateName(candidate) }}
          </h4>

          <div class="ak-operator-talents-panel__badges">
            <AkBadge size="sm" variant="cyan">
              {{
                t('operators.detail.talents.unlockedAt', {
                  elite: candidate.unlockCond.phase,
                  level: candidate.unlockCond.level,
                })
              }}
            </AkBadge>
            <AkBadge v-if="candidate.unlockCond.potential > 0" size="sm" variant="amber">
              {{
                t('operators.detail.talents.requiresPot', {
                  pot: candidate.unlockCond.potential + 1,
                })
              }}
            </AkBadge>
          </div>
        </div>

        <div class="ak-operator-talents-panel__desc">
          <AkRichText
            :raw-text="getCandidateDesc(candidate)"
            :blackboard="candidate.blackboard ?? {}"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ak-operator-talents-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);

  &__empty {
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
    padding: var(--space-md);
  }

  &__talent-block {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  &__candidate-card {
    background: linear-gradient(135deg, var(--color-bg-surface) 0%, var(--color-bg-card) 100%);
    border: 1px solid var(--color-border-bold);
    padding: var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);

    @include cut-corner(8px, top-right);
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-sm);
  }

  &__name {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    margin: 0;
  }

  &__badges {
    display: flex;
    gap: var(--space-xs);
    flex-wrap: wrap;
  }

  &__desc {
    background: var(--color-bg-base);
    border-left: 3px solid var(--color-accent-success);
    padding: var(--space-sm) var(--space-md);
    line-height: var(--line-height-relaxed);

    @include cut-corner(4px, top-right);
  }
}
</style>
