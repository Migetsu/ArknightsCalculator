<script setup lang="ts">
import { computed } from 'vue'
import { resolveI18nString, type ContentLocale } from '~/../shared/schemas/operator'
import AkItemIcon from '~/components/ui/AkItemIcon.vue'
import AkStepper from '~/components/ui/AkStepper.vue'
import AkTranslationBadge from '~/components/ui/AkTranslationBadge.vue'

export interface DepotItemEntry {
  id: string
  name: {
    en: string
    zh: string
    ru?: string
    source: 'manual' | 'official' | 'wiki' | 'community' | 'machine' | 'zh'
    stale?: boolean
    isMachineTranslation?: boolean
  }
  rarity: number
  type: string
  sortId: number
  iconId?: string
}

interface Props {
  item: DepotItemEntry
  count: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:count', value: number): void
}>()

const { locale } = useI18n()

const localizedName = computed(() => {
  return (
    resolveI18nString(props.item.name, locale.value as ContentLocale) ||
    props.item.name.en ||
    props.item.name.zh ||
    props.item.id
  )
})

const hasUnofficialTranslation = computed(() => {
  return (
    props.item.name.source === 'machine' ||
    props.item.name.source === 'community' ||
    props.item.name.stale === true
  )
})

const tierRarity = computed<1 | 2 | 3 | 4 | 5>(() => {
  const r = props.item.rarity
  if (r >= 1 && r <= 5) return r as 1 | 2 | 3 | 4 | 5
  return 1
})

function handleCountChange(val: number): void {
  emit('update:count', val)
}
</script>

<template>
  <div class="ak-depot-card" :data-item-id="item.id">
    <div class="ak-depot-card__icon-wrap">
      <AkItemIcon
        :item-id="item.id"
        :icon-id="item.iconId"
        :name="localizedName"
        :tier="tierRarity"
        :size="56"
      />
    </div>

    <div class="ak-depot-card__name-wrap" :title="localizedName">
      <span class="ak-depot-card__name">{{ localizedName }}</span>
      <AkTranslationBadge
        v-if="hasUnofficialTranslation"
        :source="item.name.source"
        :stale="item.name.stale"
      />
    </div>

    <div class="ak-depot-card__stepper">
      <AkStepper
        :model-value="count"
        :min="0"
        :max="999999"
        :aria-label="localizedName"
        @update:model-value="handleCountChange"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ak-depot-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: var(--space-2xs, 8px);
  padding: var(--space-xs, 12px) var(--space-2xs, 8px);
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-none);
  box-sizing: border-box;
  min-width: 0;
  transition: border-color var(--transition-fast);

  &:hover {
    border-color: var(--color-border-bold);
  }

  &__icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__name-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3xs, 4px);
    width: 100%;
    min-width: 0;
    text-align: center;
  }

  &__name {
    font-family: var(--font-body);
    font-size: var(--font-size-xs, 12px);
    line-height: 1.25;
    color: var(--color-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: inline-block;
    max-width: 100%;
  }

  &__stepper {
    display: flex;
    justify-content: center;
    width: 100%;
    margin-top: auto;
  }
}
</style>
