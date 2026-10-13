<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { resolveAsset } from '~/../shared/utils/resolveAsset'

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
   * Avatar display size: sm (32px), md (44px), lg (56px).
   */
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  id: undefined,
  src: undefined,
  rarity: 6,
  size: 'md',
})

const candidateUrls = computed(() => {
  const urls: string[] = []
  if (props.src) {
    urls.push(props.src)
  }
  if (props.id) {
    const resolved = resolveAsset('avatar', props.id)
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

// Reset state if target operator or explicit src changes
watch(
  () => [props.id, props.src],
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

const pixelDimensions = computed(() => {
  switch (props.size) {
    case 'sm':
      return 32
    case 'lg':
      return 56
    case 'md':
    default:
      return 44
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
    :class="[`ak-avatar--size-${size}`, `ak-avatar--rarity-${rarity}`]"
    :title="name"
  >
    <div class="ak-avatar__frame">
      <img
        v-if="activeSrc"
        :src="activeSrc"
        :alt="name"
        :width="pixelDimensions"
        :height="pixelDimensions"
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

  &__frame {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--color-bg-elevated);
    border: 1px solid var(--color-border-subtle);
    border-bottom: none;
    overflow: hidden;
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
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
  }

  &__rarity-bar {
    height: 3px;
    width: 100%;
    background-color: var(--color-border-subtle);
  }

  // Sizes (44/48/52/56/64/84 per DESIGN.md with backward compatibility)
  &--size-sm {
    width: 2.25rem; // 36px

    .ak-avatar__frame {
      height: 2.25rem;
    }

    .ak-avatar__initials {
      font-size: var(--font-size-2xs);
    }

    .ak-avatar__rarity-bar {
      height: 2px;
    }
  }

  &--size-md {
    width: 2.75rem; // 44px

    .ak-avatar__frame {
      height: 2.75rem;
    }

    .ak-avatar__initials {
      font-size: var(--font-size-xs);
    }

    .ak-avatar__rarity-bar {
      height: 3px;
    }
  }

  &--size-lg {
    width: 3.5rem; // 56px

    .ak-avatar__frame {
      height: 3.5rem;
    }

    .ak-avatar__initials {
      font-size: var(--font-size-sm);
    }

    .ak-avatar__rarity-bar {
      height: 3px;
    }
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
