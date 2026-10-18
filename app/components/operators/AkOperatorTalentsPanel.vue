<script setup lang="ts">
import { computed } from 'vue'
import type { OperatorTalent } from '~/../shared/schemas/operator'
import { resolveI18nString } from '~/../shared/schemas/operator'
import AkRichText from '~/components/ui/AkRichText.vue'
import AkBadge from '~/components/ui/AkBadge.vue'

interface Props {
  talents: OperatorTalent[]
}

const props = defineProps<Props>()

const { t, locale } = useI18n()

function getCandidateName(cand: OperatorTalent['candidates'][number]): string {
  return resolveI18nString(cand.name, locale.value as 'en' | 'zh') || cand.name?.en || 'Talent'
}

function getCandidateDesc(cand: OperatorTalent['candidates'][number]): string {
  return (
    resolveI18nString(cand.description, locale.value as 'en' | 'zh') || cand.description?.en || ''
  )
}

const visibleTalents = computed(() => {
  return props.talents
    .map((talent) => ({
      ...talent,
      candidates: talent.candidates.filter((cand) => {
        const name = (cand.name?.en || cand.name?.zh || '').trim()
        const desc = (cand.description?.en || cand.description?.zh || '').trim()
        return name.length > 0 && desc.length > 0 && desc !== '-'
      }),
    }))
    .filter((talent) => talent.candidates.length > 0)
})
</script>

<template>
  <div class="ak-operator-talents-panel">
    <div v-if="visibleTalents.length === 0" class="ak-operator-talents-panel__empty">
      {{ t('operators.detail.talents.noTalents') }}
    </div>

    <div
      v-for="(talent, tIdx) in visibleTalents"
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
            <AkTranslationBadge
              v-if="
                candidate.name?.source === 'machine' ||
                candidate.name?.source === 'pending' ||
                candidate.name?.stale
              "
              :source="candidate.name?.source"
              :stale="candidate.name?.stale"
            />
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
          <div
            v-if="
              candidate.description?.source === 'pending' ||
              candidate.description?.source === 'machine' ||
              candidate.description?.stale
            "
            class="ak-operator-talents-panel__desc-badge"
          >
            <AkTranslationBadge
              :source="candidate.description?.source"
              :stale="candidate.description?.stale"
            />
          </div>
          <AkRichText
            :text="getCandidateDesc(candidate)"
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
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-sm);
    padding: var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
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
    border-left: 3px solid var(--color-accent-amber);
    border-radius: var(--radius-xs);
    padding: var(--space-sm) var(--space-md);
    line-height: var(--line-height-relaxed);
  }

  &__desc-badge {
    margin-bottom: var(--space-xs);
  }
}
</style>
