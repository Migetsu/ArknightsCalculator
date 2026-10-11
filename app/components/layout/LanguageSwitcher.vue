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
  gap: 0.25rem;

  &__btn {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.25;
    text-decoration: none;
    cursor: pointer;
    background: transparent;
    border: 1px solid #444;
    color: #888;
    border-radius: 4px;
    transition: all 0.2s ease;

    &:hover {
      color: #fff;
      border-color: #888;
    }

    &--active {
      color: #fff;
      background: #333;
      border-color: #666;
    }
  }
}
</style>
