<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  src?: string
  name: string
  rarity?: 1 | 2 | 3 | 4 | 5 | 6
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  src: undefined,
  rarity: 6,
  size: 'md',
})

const hasError = ref(false)

function handleError(): void {
  hasError.value = true
}

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
        v-if="src && !hasError"
        :src="src"
        :alt="name"
        class="ak-avatar__image"
        loading="lazy"
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
    background: linear-gradient(135deg, var(--color-bg-surface), var(--color-bg-subtle));
    color: var(--color-text-secondary);
  }

  &__initials {
    font-family: var(--font-mono);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-mono);
    text-transform: uppercase;
  }

  &__rarity-bar {
    height: 3px;
    width: 100%;
    background-color: var(--color-border-subtle);
  }

  // Sizes
  &--size-sm {
    width: 2rem;

    .ak-avatar__frame {
      height: 2rem;
    }

    .ak-avatar__initials {
      font-size: var(--font-size-2xs);
    }

    .ak-avatar__rarity-bar {
      height: 2px;
    }
  }

  &--size-md {
    width: 2.75rem;

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
    width: 3.5rem;

    .ak-avatar__frame {
      height: 3.5rem;
    }

    .ak-avatar__initials {
      font-size: var(--font-size-sm);
    }

    .ak-avatar__rarity-bar {
      height: 4px;
    }
  }

  // Rarity styling
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
    background: linear-gradient(90deg, var(--color-rarity-6), var(--color-rarity-6-gold));
    box-shadow: 0 0 6px rgb(255 109 0 / 40%);
  }
}
</style>
