<script setup lang="ts">
export type GridCols = 1 | 2 | 3 | 4
export type GridGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type GridPreset = 'panels' | 'stats' | 'operators'

interface Props {
  tag?: string
  cols?: GridCols
  colsSm?: GridCols
  colsMd?: GridCols
  colsLg?: GridCols
  colsXl?: GridCols
  gap?: GridGap
  preset?: GridPreset
}

withDefaults(defineProps<Props>(), {
  tag: 'div',
  cols: 1,
  colsSm: undefined,
  colsMd: undefined,
  colsLg: undefined,
  colsXl: undefined,
  gap: 'md',
  preset: undefined,
})
</script>

<template>
  <component
    :is="tag"
    class="ak-grid"
    :class="[
      `ak-grid--cols-${cols}`,
      colsSm ? `ak-grid--cols-sm-${colsSm}` : null,
      colsMd ? `ak-grid--cols-md-${colsMd}` : null,
      colsLg ? `ak-grid--cols-lg-${colsLg}` : null,
      colsXl ? `ak-grid--cols-xl-${colsXl}` : null,
      preset ? `ak-grid--preset-${preset}` : null,
      `ak-grid--gap-${gap}`,
    ]"
  >
    <slot />
  </component>
</template>

<style lang="scss" scoped>
.ak-grid {
  display: grid;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;

  // Gaps
  &--gap-xs {
    gap: var(--space-xs);
  }

  &--gap-sm {
    gap: var(--space-sm);
  }

  &--gap-md {
    gap: var(--space-md);
  }

  &--gap-lg {
    gap: var(--space-lg);
  }

  &--gap-xl {
    gap: var(--space-xl);
  }

  // Base Columns
  &--cols-1 {
    grid-template-columns: minmax(0, 1fr);
  }

  &--cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  &--cols-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  &--cols-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  // sm breakpoint
  @include mq(sm) {
    &--cols-sm-1 {
      grid-template-columns: minmax(0, 1fr);
    }

    &--cols-sm-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    &--cols-sm-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    &--cols-sm-4 {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  // md breakpoint
  @include mq(md) {
    &--cols-md-1 {
      grid-template-columns: minmax(0, 1fr);
    }

    &--cols-md-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    &--cols-md-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    &--cols-md-4 {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  // lg breakpoint
  @include mq(lg) {
    &--cols-lg-1 {
      grid-template-columns: minmax(0, 1fr);
    }

    &--cols-lg-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    &--cols-lg-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    &--cols-lg-4 {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  // xl breakpoint
  @include mq(xl) {
    &--cols-xl-1 {
      grid-template-columns: minmax(0, 1fr);
    }

    &--cols-xl-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    &--cols-xl-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    &--cols-xl-4 {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  // Standard Presets
  &--preset-panels {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-md);

    @include mq(md) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-lg);
    }

    @include mq(xl) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  &--preset-stats {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-sm);

    @include mq(sm) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @include mq(lg) {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  &--preset-operators {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-xs);

    @include mq(sm) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
}
</style>
