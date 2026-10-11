<script setup lang="ts">
const { t } = useI18n()

const head = useLocaleHead({
  seo: true,
})

useHead(() => ({
  htmlAttrs: {
    lang: head.value.htmlAttrs?.lang,
    dir: head.value.htmlAttrs?.dir,
  },
  link: [...(head.value.link || [])],
  meta: [...(head.value.meta || [])],
}))
</script>

<template>
  <div class="layout-default">
    <header class="layout-default__header">
      <div class="layout-default__brand">
        {{ t('layout.header.title') }}
      </div>
      <nav class="layout-default__nav">
        <LayoutLanguageSwitcher />
      </nav>
    </header>

    <div class="layout-default__main">
      <slot />
    </div>

    <footer class="layout-default__footer">
      <p class="layout-default__disclaimer">
        {{ t('layout.footer.disclaimer') }}
      </p>
    </footer>
  </div>
</template>

<style lang="scss" scoped>
.layout-default {
  min-height: 100vh;
  display: flex;
  flex-direction: column;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    border-bottom: 1px solid #333;
  }

  &__brand {
    font-weight: 700;
    font-size: 1.25rem;
  }

  &__nav {
    display: flex;
    align-items: center;
  }

  &__main {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  &__footer {
    padding: 1rem 2rem;
    border-top: 1px solid #333;
    text-align: center;
  }

  &__disclaimer {
    font-size: 0.75rem;
    color: #777;
    margin: 0;
  }
}
</style>
