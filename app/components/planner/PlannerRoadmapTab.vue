<script setup lang="ts">
import AkEmptyState from '~/components/ui/AkEmptyState.vue'

const { t } = useI18n()
</script>

<template>
  <div class="planner-roadmap">
    <div class="planner-roadmap__card">
      <AkEmptyState
        :title="t('planner.roadmapTitle')"
        :description="t('planner.roadmapDescription')"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.planner-roadmap {
  display: flex;
  flex-direction: column;
  min-width: 0;

  &__card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    padding: var(--space-2xl) var(--space-md);
  }
}
</style>
