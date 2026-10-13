<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { resolveAsset } from '~/../shared/utils/resolveAsset'

export type AkItemIconSize = 36 | 40 | 48 | 56 | 64 | 'sm' | 'md' | 'lg'

interface Props {
  /**
   * Unique game item ID (e.g. '30012', '4001', 'mod_unlock_token').
   */
  itemId?: string
  /**
   * Optional item icon ID if different from itemId (e.g. 'MTL_SL_G2', 'GOLD').
   */
  iconId?: string
  /**
   * Item name for accessible alt text and fallback display.
   */
  name: string
  /**
   * Item material tier or rarity (1..5). Determines 1px border color.
   */
  tier?: 1 | 2 | 3 | 4 | 5
  /**
   * Optional quantity badge displayed at the bottom-right corner.
   */
  count?: number | string
  /**
   * Icon dimension in pixels or t-shirt size (default: 48px).
   */
  size?: AkItemIconSize
}

const props = withDefaults(defineProps<Props>(), {
  itemId: undefined,
  iconId: undefined,
  tier: 1,
  count: undefined,
  size: 48,
})

const candidateUrls = computed(() => {
  if (!props.itemId && !props.iconId) return []
  const targetId = props.itemId || props.iconId || ''
  return resolveAsset('item', targetId, { iconId: props.iconId })
})

const currentCandidateIndex = ref(0)
const hasError = ref(false)

watch(
  () => [props.itemId, props.iconId],
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
      return 40
    case 'lg':
      return 56
    case 'md':
    default:
      return 48
  }
})

const initials = computed(() => {
  if (!props.name) return 'ITM'
  const trimmed = props.name.trim()
  if (trimmed.length <= 4) return trimmed.toUpperCase()
  const words = trimmed.split(/\s+/)
  if (words.length > 1) {
    return words
      .slice(0, 3)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
  }
  return trimmed.slice(0, 3).toUpperCase()
})
</script>

<template>
  <div
    class="ak-item-icon"
    :class="[`ak-item-icon--tier-${tier}`, `ak-item-icon--size-${normalizedSize}`]"
    :title="name"
    :style="{
      width: `${normalizedSize}px`,
      height: `${normalizedSize}px`,
    }"
  >
    <div class="ak-item-icon__frame">
      <img
        v-if="activeSrc"
        :src="activeSrc"
        :alt="name"
        :width="normalizedSize"
        :height="normalizedSize"
        class="ak-item-icon__image"
        loading="lazy"
        decoding="async"
        @error="handleError"
      />
      <div v-else class="ak-item-icon__fallback">
        <span class="ak-item-icon__initials">{{ initials }}</span>
      </div>
    </div>

    <span v-if="count !== undefined && count !== null" class="ak-item-icon__count">
      {{ count }}
    </span>
  </div>
</template>

<style lang="scss" scoped>
.ak-item-icon {
  display: inline-flex;
  position: relative;
  flex-shrink: 0;
  box-sizing: border-box;
  background-color: var(--color-bg-deep);
  border: 1px solid var(--color-tier-1);
  border-radius: var(--radius-none);
  user-select: none;

  &__frame {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  &__fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: var(--color-text-secondary);
    font-family: var(--font-body);
    font-weight: var(--font-weight-semibold);
    text-align: center;
    padding: 2px;
  }

  &__initials {
    font-size: var(--font-size-2xs);
    letter-spacing: 0.05em;
  }

  &__count {
    position: absolute;
    right: 2px;
    bottom: 2px;
    padding: 1px 4px;
    font-family: var(--font-body);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-semibold);
    line-height: 1.1;
    color: var(--color-text-primary);
    background-color: rgb(14 10 9 / 88%);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-none);
    pointer-events: none;
    white-space: nowrap;
  }

  // Tier 1 - 5 borders matching DESIGN.md
  &--tier-1 {
    border-color: var(--color-tier-1);
  }

  &--tier-2 {
    border-color: var(--color-tier-2);
  }

  &--tier-3 {
    border-color: var(--color-tier-3);
  }

  &--tier-4 {
    border-color: var(--color-tier-4);
  }

  &--tier-5 {
    border-color: var(--color-tier-5);
  }
}
</style>
