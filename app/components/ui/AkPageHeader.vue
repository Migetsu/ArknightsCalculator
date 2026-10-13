<script setup lang="ts">
import AkBadge from './AkBadge.vue'

interface Props {
  code?: string
  tagLabel?: string
  title: string
  subtitle?: string
  watermark?: string
  badge?: string
  badgeVariant?: 'cyan' | 'amber' | 'green' | 'red' | 'neutral'
}

withDefaults(defineProps<Props>(), {
  code: undefined,
  tagLabel: undefined,
  subtitle: undefined,
  watermark: undefined,
  badge: undefined,
  badgeVariant: 'cyan',
})
</script>

<template>
  <header class="ak-page-header">
    <div v-if="watermark" class="ak-page-header__watermark" aria-hidden="true">
      {{ watermark }}
    </div>

    <div class="ak-page-header__container">
      <div class="ak-page-header__main">
        <div v-if="code || tagLabel || badge || $slots.badge" class="ak-page-header__meta">
          <span v-if="code || tagLabel" class="ak-page-header__code">
            <template v-if="code">{{ code }}</template>
            <template v-if="code && tagLabel"> // </template>
            <template v-if="tagLabel">{{ tagLabel }}</template>
          </span>

          <AkBadge
            v-if="badge || $slots.badge"
            :variant="badgeVariant"
            size="sm"
            class="ak-page-header__badge"
          >
            <slot name="badge">{{ badge }}</slot>
          </AkBadge>
        </div>

        <h1 class="ak-page-header__title">
          <slot name="title">{{ title }}</slot>
        </h1>

        <p v-if="subtitle || $slots.subtitle" class="ak-page-header__subtitle">
          <slot name="subtitle">{{ subtitle }}</slot>
        </p>
      </div>

      <div v-if="$slots.actions" class="ak-page-header__actions">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.ak-page-header {
  position: relative;
  width: 100%;
  padding-bottom: var(--space-md);
  border-bottom: 1px solid var(--color-border-subtle);
  overflow: hidden;
  box-sizing: border-box;
  min-width: 0;

  &::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 64px;
    height: 2px;
    background-color: var(--color-accent-primary);
  }

  &__watermark {
    display: none;
    position: absolute;
    right: -1rem;
    bottom: -0.75rem;
    font-family: var(--font-display);
    font-size: clamp(3.5rem, 11vw, 7.5rem);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-display);
    text-transform: uppercase;
    color: var(--color-text-primary);
    opacity: 0.03;
    pointer-events: none;
    user-select: none;
    line-height: 0.75;
    white-space: nowrap;
    z-index: var(--z-base);

    @include mq(md) {
      display: block;
    }
  }

  &__container {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-md);
    min-width: 0;

    @include mq(md) {
      flex-direction: row;
      align-items: flex-end;
    }
  }

  &__main {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    max-width: 820px;
    min-width: 0;
  }

  &__meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-xs);
    min-width: 0;
  }

  &__code {
    display: inline-flex;
    align-items: center;
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-caption);
    color: var(--color-text-accent);
    text-transform: uppercase;
  }

  &__badge {
    flex-shrink: 0;
  }

  &__title {
    margin: 0;
    font-family: var(--font-display);
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    line-height: var(--line-height-tight);

    @include mq(md) {
      font-size: var(--font-size-3xl);
    }
  }

  &__subtitle {
    margin: 0;
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    line-height: var(--line-height-relaxed);
  }

  &__actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-xs);
    flex-shrink: 0;
  }
}
</style>
