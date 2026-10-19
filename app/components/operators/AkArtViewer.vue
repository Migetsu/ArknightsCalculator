<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { OperatorDetail } from '~/../shared/schemas/operator'
import type { Skin } from '~/../shared/schemas/skin'
import { resolveAsset, LOW_RARITY_OPERATOR_IDS } from '~/../shared/utils/resolveAsset'
import { sortOperatorSkins } from '~/../shared/utils/skin'

interface Props {
  modelValue: boolean
  operator: OperatorDetail
  activeStage?: string
  skins?: Skin[]
}

const props = withDefaults(defineProps<Props>(), {
  activeStage: 'e2',
  skins: () => [],
})

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'update:activeStage', val: string): void
}>()

const rootRef = ref<HTMLElement | null>(null)
const closeBtnRef = ref<HTMLButtonElement | null>(null)
const previousActiveElement = ref<HTMLElement | null>(null)

// Zoom & Pan transformation state
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const isDragging = ref(false)
const isLoading = ref(true)

interface VariantOption {
  id: string
  label: string
}

const hasElite2 = computed(() => {
  return props.operator.rarity >= 4 && !LOW_RARITY_OPERATOR_IDS.has(props.operator.id)
})

// Only cosmetic skins in the viewer tabs (as default appearances are already covered by E0/E1 and E2).
// Canonical appearance is determined strictly by isDefault === true, never by #1/#2 suffixes.
const cosmeticSkins = computed(() => {
  return sortOperatorSkins(props.skins.filter((s) => !s.isDefault))
})

const availableVariants = computed<VariantOption[]>(() => {
  const list: VariantOption[] = [{ id: 'e0', label: 'E0 / E1' }]
  if (hasElite2.value) {
    list.push({ id: 'e2', label: 'E2' })
  }
  for (const s of cosmeticSkins.value) {
    const name = s.skinName.en || s.skinName.zh || s.skinId
    list.push({
      id: s.skinId,
      label: name,
    })
  }
  return list
})

const currentStage = computed<string>(() => {
  const match = availableVariants.value.find((v) => v.id === props.activeStage)
  if (match) return match.id

  // Handle canonical default skin identifiers (e.g. char_002_amiya#1 -> e0, char_002_amiya#2 -> e2)
  const defaultSkinMatch = props.skins.find((s) => s.skinId === props.activeStage && s.isDefault)
  if (defaultSkinMatch) {
    return defaultSkinMatch.skinId.endsWith('#2') && hasElite2.value ? 'e2' : 'e0'
  }

  if (props.activeStage === 'e2' && !hasElite2.value) return 'e0'
  return hasElite2.value ? 'e2' : 'e0'
})

// High-resolution artwork candidate URLs (full original without thumbnail)
const activeArtUrls = computed(() => {
  let variant = currentStage.value
  if (variant === 'e2') variant = '2'
  else if (variant === 'e0') variant = '1'
  return resolveAsset('art', props.operator.id, { variant })
})

const currentStageLabel = computed(() => {
  if (currentStage.value === 'e0') return 'ELITE 0 / 1'
  if (currentStage.value === 'e2') return 'ELITE 2'
  const match = cosmeticSkins.value.find((s) => s.skinId === currentStage.value)
  if (match) {
    return (match.skinName.en || match.skinName.zh || 'OUTFIT').toUpperCase()
  }
  return currentStage.value.toUpperCase()
})

const currentArtSrc = ref('')

watch(
  activeArtUrls,
  (urls) => {
    isLoading.value = true
    currentArtSrc.value = urls[0] || ''
  },
  { immediate: true },
)

function onImageLoad(): void {
  isLoading.value = false
}

function onImageError(): void {
  const urls = activeArtUrls.value
  const next = urls.find((u) => u !== currentArtSrc.value)
  if (next) {
    currentArtSrc.value = next
  } else {
    isLoading.value = false
  }
}

// Stage switching helpers
function setStage(stage: string): void {
  if (stage === currentStage.value) return
  resetTransform()
  emit('update:activeStage', stage)
}

function prevStage(): void {
  const vars = availableVariants.value
  if (vars.length <= 1) return
  const currentIndex = vars.findIndex((v) => v.id === currentStage.value)
  const prevIndex = (currentIndex - 1 + vars.length) % vars.length
  setStage(vars[prevIndex]!.id)
}

function nextStage(): void {
  const vars = availableVariants.value
  if (vars.length <= 1) return
  const currentIndex = vars.findIndex((v) => v.id === currentStage.value)
  const nextIndex = (currentIndex + 1) % vars.length
  setStage(vars[nextIndex]!.id)
}

// Zoom controls
function zoomIn(): void {
  zoom.value = Math.min(4, +(zoom.value + 0.25).toFixed(2))
}

function zoomOut(): void {
  zoom.value = Math.max(0.5, +(zoom.value - 0.25).toFixed(2))
}

function resetTransform(): void {
  zoom.value = 1
  panX.value = 0
  panY.value = 0
}

function handleDoubleClick(): void {
  if (zoom.value > 1.05) {
    resetTransform()
  } else {
    zoom.value = 2
  }
}

function handleWheel(e: WheelEvent): void {
  e.preventDefault()
  const delta = e.deltaY < 0 ? 0.15 : -0.15
  zoom.value = Math.max(0.5, Math.min(4, +(zoom.value + delta).toFixed(2)))
}

// Pointer Events Drag & Multi-touch Pinch
interface PointerCoord {
  x: number
  y: number
}
const activePointers = new Map<number, PointerCoord>()
let dragStartPointer: PointerCoord = { x: 0, y: 0 }
let dragStartPan: PointerCoord = { x: 0, y: 0 }
let initialPinchDistance = 0
let initialPinchZoom = 1

function onPointerDown(e: PointerEvent): void {
  const target = e.currentTarget as HTMLElement
  target.setPointerCapture(e.pointerId)
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

  if (activePointers.size === 1) {
    isDragging.value = true
    dragStartPointer = { x: e.clientX, y: e.clientY }
    dragStartPan = { x: panX.value, y: panY.value }
  } else if (activePointers.size === 2) {
    isDragging.value = false
    const pts = Array.from(activePointers.values())
    if (pts[0] && pts[1]) {
      initialPinchDistance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      initialPinchZoom = zoom.value
    }
  }
}

function onPointerMove(e: PointerEvent): void {
  if (!activePointers.has(e.pointerId)) return
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

  if (activePointers.size === 1 && isDragging.value) {
    const dx = e.clientX - dragStartPointer.x
    const dy = e.clientY - dragStartPointer.y
    panX.value = Math.round(dragStartPan.x + dx)
    panY.value = Math.round(dragStartPan.y + dy)
  } else if (activePointers.size === 2) {
    const pts = Array.from(activePointers.values())
    if (pts[0] && pts[1] && initialPinchDistance > 0) {
      const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      const ratio = currentDist / initialPinchDistance
      zoom.value = Math.max(0.5, Math.min(4, +(initialPinchZoom * ratio).toFixed(2)))
    }
  }
}

function onPointerUp(e: PointerEvent): void {
  activePointers.delete(e.pointerId)
  if (activePointers.size === 0) {
    isDragging.value = false
  }
}

// Modal lifecycle & focus trap
function closeViewer(): void {
  emit('update:modelValue', false)
}

function handleKeydown(e: KeyboardEvent): void {
  if (!props.modelValue) return

  if (e.key === 'Escape') {
    e.preventDefault()
    closeViewer()
    return
  }

  if (e.key === 'ArrowRight') {
    e.preventDefault()
    nextStage()
    return
  }

  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    prevStage()
    return
  }

  // Focus trap
  if (e.key === 'Tab' && rootRef.value) {
    const focusable = rootRef.value.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last?.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first?.focus()
    }
  }
}

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      previousActiveElement.value = document.activeElement as HTMLElement
      resetTransform()
      document.body.style.overflow = 'hidden'
      await nextTick()
      closeBtnRef.value?.focus()
    } else {
      document.body.style.overflow = ''
      previousActiveElement.value?.focus()
    }
  },
)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      ref="rootRef"
      class="ak-art-viewer"
      role="dialog"
      aria-modal="true"
      :aria-label="`Artwork inspector for ${operator.name.en || operator.id}`"
    >
      <!-- Backdrop -->
      <div class="ak-art-viewer__backdrop" @click="closeViewer" />

      <!-- Top Controls Header -->
      <header class="ak-art-viewer__header">
        <div class="ak-art-viewer__title-wrap">
          <span class="ak-art-viewer__title">{{ operator.name.en }}</span>
          <span class="ak-art-viewer__stage-badge">
            {{ currentStageLabel }}
          </span>
        </div>

        <!-- Zoom & View Tools -->
        <div class="ak-art-viewer__tools">
          <button
            type="button"
            class="ak-art-viewer__btn"
            aria-label="Zoom out"
            :disabled="zoom <= 0.5"
            @click="zoomOut"
          >
            −
          </button>
          <span class="ak-art-viewer__zoom-val">{{ Math.round(zoom * 100) }}%</span>
          <button
            type="button"
            class="ak-art-viewer__btn"
            aria-label="Zoom in"
            :disabled="zoom >= 4"
            @click="zoomIn"
          >
            +
          </button>
          <button
            type="button"
            class="ak-art-viewer__btn ak-art-viewer__btn--reset"
            aria-label="Reset zoom and position"
            @click="resetTransform"
          >
            Reset
          </button>
          <button
            ref="closeBtnRef"
            type="button"
            class="ak-art-viewer__btn ak-art-viewer__btn--close"
            aria-label="Close artwork viewer"
            @click="closeViewer"
          >
            ✕
          </button>
        </div>
      </header>

      <!-- Stage Navigation Arrows -->
      <button
        v-if="availableVariants.length > 1"
        type="button"
        class="ak-art-viewer__nav-arrow ak-art-viewer__nav-arrow--prev"
        aria-label="Previous artwork stage"
        @click="prevStage"
      >
        ‹
      </button>

      <button
        v-if="availableVariants.length > 1"
        type="button"
        class="ak-art-viewer__nav-arrow ak-art-viewer__nav-arrow--next"
        aria-label="Next artwork stage"
        @click="nextStage"
      >
        ›
      </button>

      <!-- Interactive Viewport Canvas -->
      <main
        class="ak-art-viewer__canvas"
        @wheel="handleWheel"
        @dblclick="handleDoubleClick"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <!-- Loading State Indicator -->
        <div v-if="isLoading" class="ak-art-viewer__spinner" aria-live="polite">
          <span class="ak-art-viewer__spinner-icon">◌</span>
          <span>Loading Original Resolution...</span>
        </div>

        <div
          class="ak-art-viewer__img-container"
          :style="{
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            cursor: isDragging ? 'grabbing' : zoom > 1 ? 'grab' : 'zoom-in',
          }"
        >
          <img
            :src="currentArtSrc"
            :alt="`${operator.name.en} full artwork`"
            class="ak-art-viewer__art-img"
            draggable="false"
            @load="onImageLoad"
            @error="onImageError"
          />
        </div>
      </main>

      <!-- Bottom Thumbnails Switcher -->
      <footer v-if="availableVariants.length > 1" class="ak-art-viewer__footer">
        <div class="ak-art-viewer__thumbs">
          <button
            v-for="v in availableVariants"
            :key="v.id"
            type="button"
            class="ak-art-viewer__thumb-btn"
            :class="{ 'ak-art-viewer__thumb-btn--active': currentStage === v.id }"
            :aria-label="`Select ${v.label} artwork`"
            @click="setStage(v.id)"
          >
            <span class="ak-art-viewer__thumb-label">{{ v.label }}</span>
          </button>
        </div>
      </footer>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.ak-art-viewer {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  flex-direction: column;
  color: var(--color-text-primary);
  user-select: none;
  overflow: hidden;

  &__backdrop {
    position: absolute;
    inset: 0;
    background: rgb(18 13 11 / 94%);
    backdrop-filter: blur(8px);
    z-index: 1;
  }

  &__header {
    position: relative;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    background: linear-gradient(180deg, rgb(18 13 11 / 95%) 0%, rgb(18 13 11 / 0%) 100%);
    gap: 16px;
  }

  &__title-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__title {
    font-family: var(--font-display);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-display);
  }

  &__stage-badge {
    padding: 2px 8px;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-bold);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-accent-amber);
  }

  &__tools {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__zoom-val {
    min-width: 44px;
    text-align: center;
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  &__btn {
    min-width: 34px;
    height: 34px;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xs);
    color: var(--color-text-primary);
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition:
      border-color var(--transition-fast),
      background var(--transition-fast);

    @include focus-ring;

    &:hover:not(:disabled) {
      border-color: var(--color-accent-primary);
      background: rgb(255 106 61 / 12%);
    }

    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    &--close {
      border-color: var(--color-border-bold);
      color: var(--color-accent-amber);

      &:hover {
        background: rgb(255 106 61 / 25%);
        color: var(--color-text-primary);
      }
    }
  }

  &__nav-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 10;
    width: 48px;
    height: 64px;
    background: rgb(18 13 11 / 70%);
    border: 1px solid var(--color-border-subtle);
    color: var(--color-text-primary);
    font-size: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition:
      background var(--transition-fast),
      border-color var(--transition-fast);

    @include focus-ring;

    &:hover {
      background: var(--color-accent-primary);
      border-color: var(--color-accent-primary);
    }

    &--prev {
      left: 16px;
    }

    &--next {
      right: 16px;
    }
  }

  &__canvas {
    position: relative;
    z-index: 5;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    touch-action: none;
  }

  &__spinner {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    background: rgb(18 13 11 / 85%);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xs);
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    color: var(--color-accent-amber);
    z-index: 6;
  }

  &__spinner-icon {
    animation: ak-spin 1s linear infinite;
    display: inline-block;
  }

  &__img-container {
    transform-origin: center center;
    transition: transform 0.05s linear;
    display: flex;
    align-items: center;
    justify-content: center;
    max-width: 90vw;
    max-height: 85vh;
  }

  &__art-img {
    max-width: 90vw;
    max-height: 85vh;
    object-fit: contain;
    filter: drop-shadow(0 20px 40px rgb(0 0 0 / 85%));
    pointer-events: none;
  }

  &__footer {
    position: relative;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: linear-gradient(0deg, rgb(18 13 11 / 95%) 0%, rgb(18 13 11 / 0%) 100%);
  }

  &__thumbs {
    display: flex;
    gap: 12px;
    max-width: 100%;
    overflow-x: auto;
    padding: 4px;
    scrollbar-width: thin;
    -webkit-overflow-scrolling: touch;
  }

  &__thumb-btn {
    padding: 8px 18px;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xs);
    color: var(--color-text-secondary);
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition:
      border-color var(--transition-fast),
      background var(--transition-fast);

    @include focus-ring;

    &:hover {
      border-color: var(--color-accent-amber);
      color: var(--color-text-primary);
    }

    &--active {
      border-color: var(--color-accent-primary);
      background: rgb(255 106 61 / 20%);
      color: var(--color-text-primary);
    }
  }
}

@keyframes ak-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
