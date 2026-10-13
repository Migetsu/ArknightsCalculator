<script setup lang="ts">
import { computed } from 'vue'
import type { OperatorSummary } from '~/../shared/schemas/operator'
import { resolveI18nString } from '~/../shared/schemas/operator'
import { resolveAsset } from '~/../shared/utils/resolveAsset'
import AkBadge from '~/components/ui/AkBadge.vue'

interface Props {
  operator: OperatorSummary
}

const props = defineProps<Props>()

const { locale, t } = useI18n()
const localePath = useLocalePath()

const displayName = computed(() => {
  return (
    resolveI18nString(props.operator.name, locale.value as 'en' | 'ru' | 'zh') ||
    props.operator.name.en
  )
})

const isCnOnly = computed(() => {
  return props.operator.servers.length === 1 && props.operator.servers[0] === 'cn'
})

const rarityStars = computed(() => {
  return '★'.repeat(props.operator.rarity)
})

const portraitUrls = computed(() => {
  return resolveAsset('portrait', props.operator.id)
})

const avatarFallbackUrls = computed(() => {
  return resolveAsset('avatar', props.operator.id)
})

const primaryPortrait = computed(() => portraitUrls.value[0] || avatarFallbackUrls.value[0] || '')
const secondaryPortrait = computed(() => portraitUrls.value[1] || avatarFallbackUrls.value[1] || '')
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
        :src="primaryPortrait"
        :alt="displayName"
        loading="lazy"
        decoding="async"
        class="ak-operator-card__art-img ak-avatar__image"
        @error="
          (e) => {
            const target = e.target as HTMLImageElement
            if (secondaryPortrait && target.src !== secondaryPortrait) {
              target.src = secondaryPortrait
            }
          }
        "
      />
      <AkBadge v-if="isCnOnly" variant="amber" size="sm" class="ak-operator-card__cn-badge">
        CN
      </AkBadge>
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
    height: 250px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(180deg, var(--color-bg-surface), var(--color-bg-deep));

    &--rarity-6 {
      background: linear-gradient(180deg, #3a1d14 0%, #17110f 100%);
    }

    &--rarity-5 {
      background: linear-gradient(180deg, #2d2418 0%, #17110f 100%);
    }

    &--rarity-4 {
      background: linear-gradient(180deg, #25202e 0%, #17110f 100%);
    }

    &--rarity-3 {
      background: linear-gradient(180deg, #1b222d 0%, #17110f 100%);
    }

    &--rarity-2 {
      background: linear-gradient(180deg, #18261e 0%, #17110f 100%);
    }

    &--rarity-1 {
      background: linear-gradient(180deg, #22201f 0%, #17110f 100%);
    }
  }

  &__art-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
    display: block;
    transition: transform var(--transition-base);
  }

  &:hover &__art-img {
    transform: scale(1.03);
  }

  &__cn-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 1;
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
