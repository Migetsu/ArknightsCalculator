<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { resolveAsset } from '~/../shared/utils/resolveAsset'

export type AkSkillIconSize = 36 | 40 | 48 | 56 | 'sm' | 'md' | 'lg'

interface Props {
  /**
   * Unique skill identifier (e.g. 'skchr_texas_2', 'skcom_charge_cost[3]').
   */
  skillId?: string
  /**
   * Optional skill icon identifier (e.g. 'skcom_powerstrike[3]').
   */
  iconId?: string
  /**
   * Skill display name for accessibility alt text and tooltip.
   */
  name: string
  /**
   * Skill slot index (1, 2, 3) for fallback abbreviation (e.g. S1, S2, S3).
   */
  skillIndex?: 1 | 2 | 3
  /**
   * Mastery level (1, 2, 3) or rank level (1..7). Displayed as badge if provided.
   */
  mastery?: 1 | 2 | 3 | 'M1' | 'M2' | 'M3'
  rank?: number | string
  /**
   * Icon dimension (default: 48px per DESIGN.md).
   */
  size?: AkSkillIconSize
}

const props = withDefaults(defineProps<Props>(), {
  skillId: undefined,
  iconId: undefined,
  skillIndex: 1,
  mastery: undefined,
  rank: undefined,
  size: 48,
})

const candidateUrls = computed(() => {
  if (!props.skillId && !props.iconId) return []
  const targetId = props.skillId || props.iconId || ''
  return resolveAsset('skill', targetId, { iconId: props.iconId })
})

const currentCandidateIndex = ref(0)
const hasError = ref(false)

watch(
  () => props.skillId,
  () => {
    currentCandidateIndex.value = 0
    hasError.value = false
  },
)

const activeSrc = computed(() => {
  if (hasError.value) return undefined
  return candidateUrls.value[currentCandidateIndex.value]
})

function handleError(): void {
  if (currentCandidateIndex.value + 1 < candidateUrls.value.length) {
    currentCandidateIndex.value++
  } else {
    hasError.value = true
  }
}

const normalizedSize = computed<number>(() => {
  const s = props.size
  if (typeof s === 'number') return s
  switch (s) {
    case 'sm':
      return 36
    case 'lg':
      return 56
    case 'md':
    default:
      return 48
  }
})

const badgeText = computed<string | undefined>(() => {
  if (props.mastery !== undefined && props.mastery !== null) {
    if (typeof props.mastery === 'string') return props.mastery
    return `M${props.mastery}`
  }
  if (props.rank !== undefined && props.rank !== null) {
    return String(props.rank)
  }
  return undefined
})

const isMastery = computed(() => {
  return props.mastery !== undefined && props.mastery !== null
})

const fallbackText = computed(() => {
  return `S${props.skillIndex}`
})
</script>

<template>
  <div
    class="ak-skill-icon"
    :class="[`ak-skill-icon--size-${normalizedSize}`]"
    :title="name"
    :style="{
      width: `${normalizedSize}px`,
      height: `${normalizedSize}px`,
    }"
  >
    <div class="ak-skill-icon__circle">
      <img
        v-if="activeSrc"
        :src="activeSrc"
        :alt="name"
        :width="normalizedSize"
        :height="normalizedSize"
        class="ak-skill-icon__image"
        loading="lazy"
        decoding="async"
        @error="handleError"
      />
      <div v-else class="ak-skill-icon__fallback">
        <span class="ak-skill-icon__slot-label">{{ fallbackText }}</span>
      </div>
    </div>

    <!-- Mastery / Rank badge -->
    <span
      v-if="badgeText"
      class="ak-skill-icon__badge"
      :class="{ 'ak-skill-icon__badge--mastery': isMastery }"
    >
      {{ badgeText }}
    </span>
  </div>
</template>

<style lang="scss" scoped>
.ak-skill-icon {
  display: inline-flex;
  position: relative;
  flex-shrink: 0;
  box-sizing: border-box;
  user-select: none;

  &__circle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 2px solid var(--color-border-gold);
    background-color: var(--color-bg-deep);
    overflow: hidden;
    box-sizing: border-box;
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &__fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background-color: var(--color-bg-elevated);
    color: var(--color-text-accent);
    font-family: var(--font-display);
    font-weight: var(--font-weight-bold);
  }

  &__slot-label {
    font-size: var(--font-size-xs);
    letter-spacing: 0.05em;
  }

  &__badge {
    position: absolute;
    right: -4px;
    bottom: -4px;
    padding: 1px 4px;
    min-width: 16px;
    text-align: center;
    font-family: var(--font-display);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-bold);
    line-height: 1.1;
    color: var(--color-text-inverse);
    background-color: var(--color-text-accent);
    border: 1px solid var(--color-bg-base);
    border-radius: var(--radius-none);
    pointer-events: none;
    box-shadow: 0 2px 6px rgb(0 0 0 / 60%);

    &--mastery {
      color: var(--color-text-inverse);
      background-color: var(--color-accent-primary); // Ember badge for mastery
    }
  }
}
</style>
