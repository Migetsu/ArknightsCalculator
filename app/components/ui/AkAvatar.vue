<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { resolveAsset } from '~/../shared/utils/resolveAsset'

export type AkAvatarSize =
  | 44
  | 48
  | 52
  | 56
  | 64
  | 84
  | '44'
  | '48'
  | '52'
  | '56'
  | '64'
  | '84'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl'

interface Props {
  /**
   * Optional operator identifier (e.g. 'char_102_texas').
   * If provided, candidate URLs are automatically resolved via resolveAsset.
   */
  id?: string
  /**
   * Explicit image source URL. If provided, used as the primary candidate.
   */
  src?: string
  /**
   * Operator name for alt text, title, and fallback initials.
   */
  name: string
  /**
   * Operator rarity (1..6) for rarity underline bar and fallback styling.
   */
  rarity?: 1 | 2 | 3 | 4 | 5 | 6
  /**
   * Avatar display size: 44, 48, 52, 56, 64, 84px (or standard t-shirt sizes).
   */
  size?: AkAvatarSize
  /**
   * Optional variant for promoted artwork (e.g. '2' for Elite 2 avatar).
   */
  variant?: string
}

const props = withDefaults(defineProps<Props>(), {
  id: undefined,
  src: undefined,
  rarity: 6,
  size: 48,
  variant: undefined,
})

const candidateUrls = computed(() => {
  const urls: string[] = []
  if (props.src) {
    urls.push(props.src)
  }
  if (props.id) {
    const resolved = resolveAsset('avatar', props.id, { variant: props.variant })
    for (const url of resolved) {
      if (!urls.includes(url)) {
        urls.push(url)
      }
    }
  }
  return urls
})

const currentCandidateIndex = ref(0)
const hasError = ref(false)

// Reset state if target operator, explicit src or variant changes
watch(
  () => [props.id, props.src, props.variant],
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
  const numeric = Number.parseInt(s, 10)
  if (!Number.isNaN(numeric) && [44, 48, 52, 56, 64, 84].includes(numeric)) {
    return numeric
  }
  switch (s) {
    case 'sm':
      return 44
    case 'md':
      return 48
    case 'lg':
      return 56
    case 'xl':
      return 64
    case '2xl':
      return 84
    default:
      return 48
  }
})

const initials = computed(() => {
  if (!props.name) return 'OP'
  const parts = props.name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0]?.slice(0, 2).toUpperCase() ?? 'OP'
  }
  const first = parts[0]?.[0] ?? ''
  const second = parts[1]?.[0] ?? ''
  return (first + second).toUpperCase()
})
</script>

<template>
  <div
    class="ak-avatar"
    :class="[`ak-avatar--size-${normalizedSize}`, `ak-avatar--rarity-${rarity}`]"
    :title="name"
    :style="{
      width: `${normalizedSize}px`,
      height: `${normalizedSize}px`,
    }"
  >
    <div class="ak-avatar__frame">
      <img
        v-if="activeSrc"
        :src="activeSrc"
        :alt="name"
        :width="normalizedSize"
        :height="normalizedSize - 3"
        class="ak-avatar__image"
        loading="lazy"
        decoding="async"
        @error="handleError"
      />
      <div v-else class="ak-avatar__fallback">
        <span class="ak-avatar__initials">{{ initials }}</span>
      </div>
    </div>
    <div class="ak-avatar__rarity-bar" />
  </div>
</template>

<style lang="scss" scoped>
.ak-avatar {
  display: inline-flex;
  flex-direction: column;
  position: relative;
  flex-shrink: 0;
  box-sizing: border-box;

  &__frame {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: calc(100% - 3px);
    background-color: var(--color-bg-elevated);
    border: 1px solid var(--color-border-subtle);
    border-bottom: none;
    overflow: hidden;
    box-sizing: border-box;
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    image-rendering: auto;
    transform: translateZ(0);
    backface-visibility: hidden;
  }

  &__fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background-color: var(--color-bg-deep);
    color: var(--color-text-primary);
  }

  &__initials {
    font-family: var(--font-display);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-mono);
    text-transform: uppercase;
    user-select: none;
  }

  // Exact 3px bottom line of operator rarity per DESIGN.md
  &__rarity-bar {
    height: 3px;
    width: 100%;
    background-color: var(--color-border-subtle);
    flex-shrink: 0;
  }

  // Font sizing according to avatar dimensions
  &--size-44 .ak-avatar__initials {
    font-size: var(--font-size-2xs);
  }

  &--size-48 .ak-avatar__initials {
    font-size: var(--font-size-xs);
  }

  &--size-52 .ak-avatar__initials {
    font-size: var(--font-size-xs);
  }

  &--size-56 .ak-avatar__initials {
    font-size: var(--font-size-sm);
  }

  &--size-64 .ak-avatar__initials {
    font-size: var(--font-size-md);
  }

  &--size-84 .ak-avatar__initials {
    font-size: var(--font-size-lg);
  }

  // Rarity styling (3px bottom line in DESIGN.md)
  &--rarity-1 .ak-avatar__rarity-bar {
    background-color: var(--color-rarity-1);
  }

  &--rarity-2 .ak-avatar__rarity-bar {
    background-color: var(--color-rarity-2);
  }

  &--rarity-3 .ak-avatar__rarity-bar {
    background-color: var(--color-rarity-3);
  }

  &--rarity-4 .ak-avatar__rarity-bar {
    background-color: var(--color-rarity-4);
  }

  &--rarity-5 .ak-avatar__rarity-bar {
    background-color: var(--color-rarity-5);
  }

  &--rarity-6 .ak-avatar__rarity-bar {
    background-color: var(--color-rarity-6);
  }
}
</style>
