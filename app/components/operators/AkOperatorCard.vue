<script setup lang="ts">
import { computed } from 'vue'
import type { OperatorSummary } from '~/../shared/schemas/operator'
import { resolveI18nString } from '~/../shared/schemas/operator'
import AkAvatar from '~/components/ui/AkAvatar.vue'
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

const operatorRarity = computed<1 | 2 | 3 | 4 | 5 | 6>(() => {
  return props.operator.rarity as 1 | 2 | 3 | 4 | 5 | 6
})
</script>

<template>
  <NuxtLink
    :to="localePath(`/operators/${operator.id}`)"
    class="ak-operator-card"
    :class="`ak-operator-card--rarity-${operator.rarity}`"
    :aria-label="`${displayName}, ${operator.rarity} stars, ${t('operators.classes.' + operator.class)}`"
  >
    <div class="ak-operator-card__inner">
      <div class="ak-operator-card__top">
        <div class="ak-operator-card__avatar">
          <AkAvatar :id="operator.id" :name="displayName" :rarity="operatorRarity" size="md" />
        </div>

        <div class="ak-operator-card__main">
          <div class="ak-operator-card__name-wrapper">
            <span class="ak-operator-card__name" :title="displayName">
              {{ displayName }}
            </span>
            <span v-if="operator.displayNumber" class="ak-operator-card__code" aria-hidden="true">
              {{ operator.displayNumber }}
            </span>
          </div>

          <div class="ak-operator-card__tags">
            <span class="ak-operator-card__class-label">
              {{ t('operators.classes.' + operator.class) }}
            </span>
            <span v-if="operator.subclass" class="ak-operator-card__subclass-label">
              {{ operator.subclass }}
            </span>
          </div>
        </div>
      </div>

      <div class="ak-operator-card__bottom">
        <span
          class="ak-operator-card__rarity"
          :class="`ak-operator-card__rarity--${operator.rarity}`"
          aria-hidden="true"
        >
          {{ rarityStars }}
        </span>

        <AkBadge v-if="isCnOnly" variant="amber" size="sm" class="ak-operator-card__cn-badge">
          CN
        </AkBadge>
      </div>
    </div>

    <!-- Rarity stripe -->
    <div
      class="ak-operator-card__stripe"
      :class="`ak-operator-card__stripe--${operator.rarity}`"
      aria-hidden="true"
    />
  </NuxtLink>
</template>

<style lang="scss" scoped>
.ak-operator-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  text-decoration: none;
  color: inherit;
  transition:
    border-color var(--duration-fast) var(--ease-tactical),
    background-color var(--duration-fast) var(--ease-tactical),
    box-shadow var(--duration-fast) var(--ease-tactical),
    transform var(--duration-fast) var(--ease-tactical);
  overflow: hidden;
  user-select: none;
  min-width: 0;

  &:hover {
    border-color: var(--color-accent-primary);
    background-color: var(--color-bg-surface-raised);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgb(0 0 0 / 40%);
  }

  &:focus-visible {
    outline: none;
    border-color: var(--color-accent-primary);
    box-shadow: var(--shadow-focus);
  }

  &__inner {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    padding: var(--space-sm);
    min-width: 0;
  }

  &__top {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    min-width: 0;
  }

  &__avatar {
    flex-shrink: 0;
  }

  &__main {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
    flex: 1;
  }

  &__name-wrapper {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-xs);
    min-width: 0;
  }

  &__name {
    font-family: var(--font-header);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    line-height: var(--line-height-tight);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  &__code {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-tertiary);
    letter-spacing: var(--letter-spacing-mono);
    flex-shrink: 0;
  }

  &__tags {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__class-label {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    color: var(--color-accent-primary);
    white-space: nowrap;
  }

  &__subclass-label {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-tertiary);
    text-transform: capitalize;
    white-space: nowrap;
  }

  &__bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 0;
    margin-top: 0.125rem;
  }

  &__rarity {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    letter-spacing: 0.1em;
    line-height: 1;

    &--1 {
      color: var(--color-rarity-1);
    }

    &--2 {
      color: var(--color-rarity-2);
    }

    &--3 {
      color: var(--color-rarity-3);
    }

    &--4 {
      color: var(--color-rarity-4);
    }

    &--5 {
      color: var(--color-rarity-5);
    }

    &--6 {
      color: var(--color-rarity-6);
    }
  }

  &__cn-badge {
    margin-left: auto;
  }

  &__stripe {
    height: 3px;
    width: 100%;

    &--1 {
      background-color: var(--color-rarity-1);
    }

    &--2 {
      background-color: var(--color-rarity-2);
    }

    &--3 {
      background-color: var(--color-rarity-3);
    }

    &--4 {
      background-color: var(--color-rarity-4);
    }

    &--5 {
      background-color: var(--color-rarity-5);
    }

    &--6 {
      background-color: var(--color-rarity-6);
    }
  }
}
</style>
