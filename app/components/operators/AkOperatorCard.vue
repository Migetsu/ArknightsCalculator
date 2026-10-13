<script setup lang="ts">
import { computed } from 'vue'
import type { OperatorSummary } from '~/../shared/schemas/operator'
import { resolveI18nString } from '~/../shared/schemas/operator'
import { resolveAsset } from '~/../shared/utils/resolveAsset'
import assetManifest from '~/../data/asset-manifest.json'

interface Props {
  operator: OperatorSummary
  loading?: 'lazy' | 'eager'
}

const props = withDefaults(defineProps<Props>(), {
  loading: 'lazy',
})

const { locale, t } = useI18n()
const localePath = useLocalePath()

const displayName = computed(() => {
  return (
    resolveI18nString(props.operator.name, locale.value as 'en' | 'ru' | 'zh') ||
    props.operator.name.en
  )
})

const rarityStars = computed(() => {
  return '★'.repeat(props.operator.rarity)
})

const artUrls = computed(() => {
  return resolveAsset('art', props.operator.id, { thumbnail: true })
})

const primaryArt = computed(() => artUrls.value[0] || '')
const secondaryArt = computed(() => artUrls.value[1] || '')

const artPosition = computed(() => {
  const positions = (assetManifest as { artPositions?: Record<string, string> }).artPositions
  return positions?.[props.operator.id] ?? 'center 15%'
})
</script>

<template>
  <NuxtLink
    :to="localePath(`/operators/${operator.id}`)"
    class="ak-operator-card"
    :class="`ak-operator-card--rarity-${operator.rarity}`"
    :aria-label="`${displayName}, ${operator.rarity} stars, ${t('operators.classes.' + operator.class)}`"
  >
    <div
      class="ak-operator-card__art-box"
      :class="`ak-operator-card__art-box--rarity-${operator.rarity}`"
    >
      <img
        :src="primaryArt"
        :alt="displayName"
        :loading="loading"
        decoding="async"
        width="280"
        height="340"
        class="ak-operator-card__art-img ak-avatar__image"
        :style="{ objectPosition: artPosition }"
        @error="
          (e) => {
            const target = e.target as HTMLImageElement
            if (secondaryArt && target.src !== secondaryArt) {
              target.src = secondaryArt
            }
          }
        "
      />
    </div>

    <div
      class="ak-operator-card__info"
      :class="`ak-operator-card__info--rarity-${operator.rarity}`"
    >
      <div class="ak-operator-card__title-row">
        <b class="ak-operator-card__name" :title="displayName">{{ displayName }}</b>
        <span v-if="operator.displayNumber" class="ak-operator-card__code" aria-hidden="true">
          {{ operator.displayNumber }}
        </span>
      </div>

      <div class="ak-operator-card__meta">
        <span
          class="ak-operator-card__rarity"
          :class="`ak-operator-card__rarity--${operator.rarity}`"
          aria-hidden="true"
        >
          {{ rarityStars }}
        </span>
        <span class="ak-operator-card__class ak-operator-card__class-label">
          {{ t('operators.classes.' + operator.class) }}
        </span>
      </div>
    </div>
  </NuxtLink>
</template>

<style lang="scss" scoped>
.ak-operator-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  background-color: var(--color-bg-deep);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-none);
  overflow: hidden;
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);

  @include focus-ring;

  &:hover {
    transform: translateY(-2px);
    border-color: var(--color-border-bold);
    box-shadow: 0 8px 24px rgb(0 0 0 / 45%);
  }

  &__art-box {
    position: relative;
    height: 340px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at 50% 30%, var(--color-bg-surface), var(--color-bg-deep));

    &--rarity-6 {
      background: radial-gradient(circle at 50% 30%, #542718 0%, #20130f 70%, #120d0b 100%);
    }

    &--rarity-5 {
      background: radial-gradient(circle at 50% 30%, #423218 0%, #1c150e 70%, #120d0b 100%);
    }

    &--rarity-4 {
      background: radial-gradient(circle at 50% 30%, #352347 0%, #1a1322 70%, #120d0b 100%);
    }

    &--rarity-3 {
      background: radial-gradient(circle at 50% 30%, #1f2d45 0%, #111824 70%, #120d0b 100%);
    }

    &--rarity-2 {
      background: radial-gradient(circle at 50% 30%, #1f3825 0%, #111f16 70%, #120d0b 100%);
    }

    &--rarity-1 {
      background: radial-gradient(circle at 50% 30%, #2e2b29 0%, #1a1817 70%, #120d0b 100%);
    }
  }

  &__art-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 15%;
    display: block;
    transition: transform var(--transition-base);
  }

  &:hover &__art-img {
    transform: scale(1.03);
  }

  &__info {
    padding: 14px 16px;
    border-bottom: 3px solid var(--color-border-bold);
    background-color: var(--color-bg-deep);

    &--rarity-6 {
      border-bottom-color: var(--color-rarity-6);
    }

    &--rarity-5 {
      border-bottom-color: var(--color-rarity-5);
    }

    &--rarity-4 {
      border-bottom-color: var(--color-rarity-4);
    }

    &--rarity-3 {
      border-bottom-color: var(--color-rarity-3);
    }

    &--rarity-2 {
      border-bottom-color: var(--color-rarity-2);
    }

    &--rarity-1 {
      border-bottom-color: var(--color-rarity-1);
    }
  }

  &__title-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-xs);
  }

  &__name {
    font-family: var(--font-display);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    letter-spacing: var(--letter-spacing-display);
    line-height: 1.2;

    @include text-truncate;
  }

  &__code {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-muted);
    letter-spacing: var(--letter-spacing-mono);
  }

  &__meta {
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-body);
    font-size: 13px;
    color: var(--color-text-secondary);
  }

  &__rarity {
    font-size: 12px;
    letter-spacing: 1px;

    &--6 {
      color: var(--color-rarity-6);
    }

    &--5 {
      color: var(--color-rarity-5);
    }

    &--4 {
      color: var(--color-rarity-4);
    }

    &--3 {
      color: var(--color-rarity-3);
    }

    &--2 {
      color: var(--color-rarity-2);
    }

    &--1 {
      color: var(--color-rarity-1);
    }
  }

  &__class {
    font-size: 13px;
  }
}
</style>
