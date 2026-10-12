<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { resolveAsset } from '~/../shared/utils/resolveAsset'
import AkIcon from '~/components/ui/AkIcon.vue'

interface Props {
  operatorId: string
  name: string
  elite: number
  maxElite: number
}

const props = defineProps<Props>()

const activeVariant = ref<number>(props.elite)

watch(
  () => props.elite,
  (newVal) => {
    activeVariant.value = newVal
  },
)

const candidateUrls = computed(() => {
  // Variant '2' for Elite 2 portrait, '1' for Elite 0/1 (or custom variant)
  const variantSuffix = activeVariant.value >= 2 ? '2' : '1'
  return resolveAsset('portrait', props.operatorId, { variant: variantSuffix })
})

const currentCandidateIndex = ref(0)
const hasError = ref(false)

watch(
  candidateUrls,
  () => {
    currentCandidateIndex.value = 0
    hasError.value = false
  },
  { immediate: true },
)

const currentSrc = computed(() => {
  if (hasError.value) return null
  return candidateUrls.value[currentCandidateIndex.value] ?? null
})

function handleImageError(): void {
  if (currentCandidateIndex.value < candidateUrls.value.length - 1) {
    currentCandidateIndex.value += 1
  } else {
    hasError.value = true
  }
}
</script>

<template>
  <div class="ak-operator-portrait">
    <div class="ak-operator-portrait__frame">
      <img
        v-if="currentSrc"
        :src="currentSrc"
        :alt="name"
        class="ak-operator-portrait__image"
        loading="lazy"
        decoding="async"
        @error="handleImageError"
      />
      <div v-else class="ak-operator-portrait__fallback">
        <AkIcon name="lucide:user" size="xl" class="ak-operator-portrait__fallback-icon" />
        <span class="ak-operator-portrait__fallback-name">{{ name }}</span>
      </div>
    </div>

    <!-- Variant selector if operator has Elite 2 -->
    <div v-if="maxElite >= 2" class="ak-operator-portrait__variants">
      <button
        type="button"
        class="ak-operator-portrait__variant-btn"
        :class="{ 'ak-operator-portrait__variant-btn--active': activeVariant < 2 }"
        @click="activeVariant = 0"
      >
        E0/E1
      </button>
      <button
        type="button"
        class="ak-operator-portrait__variant-btn"
        :class="{ 'ak-operator-portrait__variant-btn--active': activeVariant >= 2 }"
        @click="activeVariant = 2"
      >
        E2
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ak-operator-portrait {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;

  &__frame {
    position: relative;
    width: 100%;
    max-width: 380px;
    aspect-ratio: 1 / 1.25;
    background:
      radial-gradient(circle at 50% 50%, rgb(255 255 255 / 4%) 0%, rgb(12 13 16 / 80%) 100%),
      var(--color-bg-surface);
    border: 1px solid var(--color-border-bold);
    clip-path: polygon(
      0 var(--cut-corner-size),
      var(--cut-corner-size) 0,
      100% 0,
      100% calc(100% - var(--cut-corner-size)),
      calc(100% - var(--cut-corner-size)) 100%,
      0 100%
    );
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
    transition: transform 0.3s ease;

    &:hover {
      transform: scale(1.02);
    }
  }

  &__fallback {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    color: var(--color-text-secondary);
    text-align: center;
    padding: var(--space-md);
  }

  &__fallback-icon {
    opacity: 0.4;
  }

  &__fallback-name {
    font-size: var(--font-size-sm);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  &__variants {
    display: flex;
    gap: var(--space-xs);
    background: var(--color-bg-base);
    border: 1px solid var(--color-border-bold);
    padding: 2px;
  }

  &__variant-btn {
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    padding: var(--space-xs) var(--space-sm);
    cursor: pointer;
    transition: all 0.2s ease;

    @include cut-corner(4px, top-right);

    &:hover {
      color: var(--color-text-primary);
    }

    &--active {
      background: var(--color-accent-warning);
      color: var(--color-bg-base);
      box-shadow: 0 0 8px var(--color-accent-warning-glow);
    }
  }
}
</style>
