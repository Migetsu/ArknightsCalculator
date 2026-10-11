<script setup lang="ts">
interface Props {
  name: string
  size?: string
  color?: string
  ariaHidden?: boolean
  ariaLabel?: string
}

withDefaults(defineProps<Props>(), {
  size: '1.25rem',
  color: undefined,
  ariaHidden: true,
  ariaLabel: undefined,
})
</script>

<template>
  <span
    class="ak-icon"
    :aria-hidden="ariaHidden ? 'true' : undefined"
    :aria-label="ariaLabel"
    :role="ariaLabel ? 'img' : undefined"
  >
    <Icon :name="name" :size="size" :style="{ color }" class="ak-icon__inner" />
  </span>
</template>

<style lang="scss" scoped>
.ak-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;

  &__inner {
    display: inline-block;
    vertical-align: middle;
  }
}
</style>
