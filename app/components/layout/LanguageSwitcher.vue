<script setup lang="ts">
type SupportedLocale = 'en' | 'ru'

interface LocaleItem {
  code: SupportedLocale
  name: string
}

const { locale, locales, t, setLocale } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const localeList = computed<LocaleItem[]>(() => {
  return (locales.value as Array<{ code: SupportedLocale; name: string }>).map((loc) => ({
    code: loc.code,
    name: loc.name,
  }))
})
</script>

<template>
  <div class="language-switcher" role="group" :aria-label="t('layout.languageSwitcher.ariaLabel')">
    <NuxtLink
      v-for="item in localeList"
      :key="item.code"
      :to="switchLocalePath(item.code)"
      :lang="item.code"
      :hreflang="item.code"
      class="language-switcher__btn"
      :class="{ 'language-switcher__btn--active': item.code === locale }"
      :aria-current="item.code === locale ? 'true' : undefined"
      :aria-label="item.name"
      @click="setLocale(item.code)"
    >
      {{ item.code.toUpperCase() }}
    </NuxtLink>
  </div>
</template>

<style lang="scss" scoped>
.language-switcher {
  display: inline-flex;
  gap: var(--space-2xs);

  &__btn {
    display: inline-block;
    padding: var(--space-2xs) var(--space-xs);
    font-size: var(--font-size-xs);
    font-family: var(--font-mono);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-tight);
    text-decoration: none;
    cursor: pointer;
    background-color: transparent;
    border: 1px solid var(--color-border-base);
    color: var(--color-text-muted);
    border-radius: var(--radius-xs);
    transition:
      color var(--transition-fast),
      background-color var(--transition-fast),
      border-color var(--transition-fast);

    @include focus-ring;

    &:hover {
      color: var(--color-text-primary);
      border-color: var(--color-border-bold);
    }

    &--active {
      color: var(--color-accent-primary);
      background-color: var(--color-accent-primary-subtle);
      border-color: var(--color-accent-primary);
    }
  }
}
</style>
