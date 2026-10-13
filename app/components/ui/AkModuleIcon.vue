<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { resolveAsset } from '~/../shared/utils/resolveAsset'

export type AkModuleIconSize = 36 | 40 | 48 | 56 | 'sm' | 'md' | 'lg'

interface Props {
  /**
   * Module equipment identifier (e.g. 'uniequip_002_texas', 'uniequip_001_svrash').
   */
  moduleId?: string
  /**
   * Module name for alt text and tooltip.
   */
  name: string
  /**
   * Module type code (e.g. 'X', 'Y', 'D', 'INITIAL') for fallback.
   */
  typeCode?: string
  /**
   * Optional stage upgrade level (1, 2, 3). Displayed as small badge.
   */
  stage?: 1 | 2 | 3
  /**
   * Module icon dimension in pixels or t-shirt size (default: 48px per DESIGN.md).
   */
  size?: AkModuleIconSize
}

const props = withDefaults(defineProps<Props>(), {
  moduleId: undefined,
  typeCode: undefined,
  stage: undefined,
  size: 48,
})

const candidateUrls = computed(() => {
  if (!props.moduleId) return []
  return resolveAsset('equip', props.moduleId)
})

const currentCandidateIndex = ref(0)
const hasError = ref(false)

watch(
  () => props.moduleId,
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

const fallbackText = computed(() => {
  if (props.typeCode) {
    const code = props.typeCode.trim()
    if (code.length <= 4) return code.toUpperCase()
    return code.slice(0, 3).toUpperCase()
  }
  return 'MOD'
})
</script>

<template>
  <div
    class="ak-module-icon"
    :class="[`ak-module-icon--size-${normalizedSize}`]"
    :title="name"
    :style="{
      width: `${normalizedSize}px`,
      height: `${normalizedSize}px`,
    }"
  >
    <!-- Outer diamond frame providing 2px ember border -->
    <div class="ak-module-icon__diamond-border">
      <div class="ak-module-icon__diamond-inner">
        <img
          v-if="activeSrc"
          :src="activeSrc"
          :alt="name"
          :width="normalizedSize"
          :height="normalizedSize"
          class="ak-module-icon__image"
          loading="lazy"
          decoding="async"
          @error="handleError"
        />
        <div v-else class="ak-module-icon__fallback">
          <span class="ak-module-icon__code">{{ fallbackText }}</span>
        </div>
      </div>
    </div>

    <!-- Optional stage badge (e.g. 1, 2, 3) -->
    <span v-if="stage !== undefined && stage !== null" class="ak-module-icon__stage">
      {{ stage }}
    </span>
  </div>
</template>

<style lang="scss" scoped>
.ak-module-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
  box-sizing: border-box;
  user-select: none;

  // Diamond outer contour (Ember border)
  &__diamond-border {
    width: 100%;
    height: 100%;
    background-color: var(--color-accent-primary); // Ember #ff6a3d border
    clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px; // 2px border width
    box-sizing: border-box;
  }

  // Diamond inner surface
  &__diamond-inner {
    width: 100%;
    height: 100%;
    background-color: var(--color-bg-deep); // Deep dark background
    clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  &__image {
    width: 90%;
    height: 90%;
    object-fit: contain;
    display: block;
  }

  &__fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background-color: var(--color-bg-deep);
    color: var(--color-accent-primary);
  }

  &__code {
    font-family: var(--font-display);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.05em;
  }

  &__stage {
    position: absolute;
    right: -2px;
    bottom: -2px;
    padding: 1px 4px;
    min-width: 14px;
    text-align: center;
    font-family: var(--font-display);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-bold);
    line-height: 1.1;
    color: var(--color-text-inverse);
    background-color: var(--color-text-accent); // Gold stage badge
    border: 1px solid var(--color-bg-base);
    border-radius: var(--radius-none);
    pointer-events: none;
    box-shadow: 0 2px 6px rgb(0 0 0 / 60%);
  }
}
</style>
