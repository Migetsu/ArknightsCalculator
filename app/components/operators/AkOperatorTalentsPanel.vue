<script setup lang="ts">
import { computed } from 'vue'
import type { OperatorTalent } from '~/../shared/schemas/operator'
import { resolveI18nString } from '~/../shared/schemas/operator'
import AkRichText from '~/components/ui/AkRichText.vue'
import AkBadge from '~/components/ui/AkBadge.vue'
import AkTranslationBadge from '~/components/ui/AkTranslationBadge.vue'

interface Props {
  talents: OperatorTalent[]
}

const props = defineProps<Props>()

const { t, locale } = useI18n()

function getCandidateName(cand?: OperatorTalent['candidates'][number]): string {
  if (!cand) return 'Talent'
  return resolveI18nString(cand.name, locale.value as 'en' | 'zh') || cand.name?.en || 'Talent'
}

function getCandidateDesc(cand: OperatorTalent['candidates'][number]): string {
  return (
    resolveI18nString(cand.description, locale.value as 'en' | 'zh') || cand.description?.en || ''
  )
}

const visibleTalents = computed(() => {
  return props.talents
    .map((talent, index) => {
      const candidates = (talent.candidates || []).filter((cand) => {
        const name = (cand.name?.en || cand.name?.zh || '').trim()
        const desc = (cand.description?.en || cand.description?.zh || '').trim()
        return name.length > 0 && desc.length > 0 && desc !== '-'
      })
      const primaryCandidate = candidates[candidates.length - 1] ?? candidates[0]
      return {
        id: index,
        primaryCandidate,
        candidates,
      }
    })
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
      :key="talent.id"
      class="ak-operator-talents-panel__talent-card"
    >
      <!-- Talent Header (Rendered once per talent) -->
      <div class="ak-operator-talents-panel__header">
        <div class="ak-operator-talents-panel__title-wrap">
          <span v-if="visibleTalents.length > 1" class="ak-operator-talents-panel__index-badge">
            {{ t('operators.detail.talents.talentIndex', { index: tIdx + 1 }) }}
          </span>
          <h4 class="ak-operator-talents-panel__name">
            {{ getCandidateName(talent.primaryCandidate) }}
          </h4>
          <AkTranslationBadge
            v-if="
              talent.primaryCandidate?.name?.source === 'machine' ||
              talent.primaryCandidate?.name?.source === 'pending' ||
              talent.primaryCandidate?.name?.stale
            "
            :source="talent.primaryCandidate?.name?.source"
            :stale="talent.primaryCandidate?.name?.stale"
          />
        </div>
      </div>

      <!-- Progression List (Stages of this talent) -->
      <div class="ak-operator-talents-panel__progression-list">
        <div
          v-for="(candidate, cIdx) in talent.candidates"
          :key="cIdx"
          class="ak-operator-talents-panel__stage-row"
        >
          <div class="ak-operator-talents-panel__stage-header">
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
            <span
              v-if="getCandidateName(candidate) !== getCandidateName(talent.primaryCandidate)"
              class="ak-operator-talents-panel__stage-name"
            >
              {{ getCandidateName(candidate) }}
            </span>
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

  &__talent-card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-sm);
    padding: var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-sm);
    padding-bottom: var(--space-xs);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  &__title-wrap {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  &__index-badge {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-accent-amber);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-mono);
    text-transform: uppercase;
    background: rgb(255 106 61 / 10%);
    border: 1px solid rgb(255 106 61 / 30%);
    border-radius: var(--radius-xs);
    padding: 2px 6px;
  }

  &__name {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    margin: 0;
  }

  &__progression-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  &__stage-row {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);

    &:not(:last-child) {
      padding-bottom: var(--space-xs);
    }
  }

  &__stage-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  &__stage-name {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    font-style: italic;
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
