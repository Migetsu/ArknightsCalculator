<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { resolveAsset, ITEM_ICON_DEFAULT_MAP } from '~/../shared/utils/resolveAsset'
import type { GameItem } from '~/../shared/schemas/item'
import { fetchItemMeta, getCachedItem } from '~/composables/useItemMeta'
import { asJsonFetcher, fetchJson } from '~/utils/fetchJson'

export type AkItemIconSize = 32 | 36 | 40 | 48 | 56 | 64 | 'sm' | 'md' | 'lg'

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
  name?: string
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
  name: undefined,
  tier: undefined,
  count: undefined,
  size: 48,
})

const itemMeta = ref<GameItem | null>(null)

// Check if we need to load item metadata (tier, name, or iconId are missing)
const isMetadataMissing = computed(() => {
  if (!props.itemId) return false
  return props.tier === undefined || !props.name || !props.iconId
})

function loadMetadata(id: string): void {
  const cached = getCachedItem(id)
  if (cached !== undefined) {
    itemMeta.value = cached
    return
  }

  const fetcher = import.meta.server ? asJsonFetcher(useRequestFetch()) : fetchJson

  void fetchItemMeta(id, fetcher).then((meta) => {
    if (props.itemId === id) {
      itemMeta.value = meta
    }
  })
}

watch(
  () => [props.itemId, isMetadataMissing.value] as const,
  ([newId, missing]) => {
    if (!newId || !missing) {
      itemMeta.value = null
      return
    }
    loadMetadata(newId)
  },
  { immediate: true },
)

if (props.itemId && isMetadataMissing.value) {
  const cached = getCachedItem(props.itemId)
  if (cached !== undefined) {
    itemMeta.value = cached
  } else {
    try {
      const fetcher = import.meta.server ? asJsonFetcher(useRequestFetch()) : fetchJson
      itemMeta.value = await fetchItemMeta(props.itemId, fetcher)
    } catch (_err) {
      itemMeta.value = null
    }
  }
}

const effectiveIconId = computed(() => {
  return (
    props.iconId ||
    itemMeta.value?.iconId ||
    (props.itemId ? ITEM_ICON_DEFAULT_MAP[props.itemId] : undefined)
  )
})

const effectiveTier = computed<1 | 2 | 3 | 4 | 5>(() => {
  if (props.tier !== undefined) return props.tier
  const r = itemMeta.value?.rarity ?? 1
  return Math.max(1, Math.min(5, r)) as 1 | 2 | 3 | 4 | 5
})

const effectiveName = computed<string>(() => {
  if (props.name && props.name !== props.itemId) {
    return props.name
  }
  if (itemMeta.value) {
    return itemMeta.value.name?.en || itemMeta.value.name?.zh || props.itemId || 'Item'
  }
  return props.name || props.itemId || 'Item'
})

const candidateUrls = computed(() => {
  if (!props.itemId && !props.iconId) return []
  const targetId = props.itemId || props.iconId || ''
  return resolveAsset('item', targetId, { iconId: effectiveIconId.value })
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
  const label = effectiveName.value
  if (!label) return 'ITM'
  const trimmed = label.trim()
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
    :class="[`ak-item-icon--tier-${effectiveTier}`, `ak-item-icon--size-${normalizedSize}`]"
    :title="effectiveName"
    :style="{
      width: `${normalizedSize}px`,
      height: `${normalizedSize}px`,
    }"
  >
    <div class="ak-item-icon__frame">
      <img
        v-if="activeSrc"
        :src="activeSrc"
        :alt="effectiveName"
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
