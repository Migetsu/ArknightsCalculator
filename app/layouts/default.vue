<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AkHeader from '~/components/ui/AkHeader.vue'
import AkInstallApp from '~/components/ui/AkInstallApp.vue'

const { t } = useI18n()
const route = useRoute()

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

const isTransparentHeader = computed(() => {
  const p = route.path
  return p.includes('/operators/') && !p.endsWith('/operators')
})
</script>

<template>
  <div
    class="layout-default"
    :class="{ 'layout-default--transparent-header': isTransparentHeader }"
  >
    <AkHeader />

    <main class="layout-default__main">
      <slot />
    </main>

    <footer class="layout-default__footer">
      <div class="layout-default__footer-content">
        <p class="layout-default__disclaimer">
          {{ t('layout.footer.disclaimer') }}
        </p>
        <p class="layout-default__attribution">
          {{ t('layout.footer.attribution') }}
        </p>
        <AkInstallApp />
      </div>
    </footer>
  </div>
</template>

<style lang="scss" scoped>
.layout-default {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: radial-gradient(ellipse at 80% 0, var(--color-bg-glow) 0, var(--color-bg-base) 55%);
  background-color: var(--color-bg-base);
  color: var(--color-text-primary);
  font-family: var(--font-body);

  &--transparent-header {
    .ak-header {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      background-color: transparent;
      border-bottom-color: transparent;
    }
  }

  &__main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__footer {
    padding: var(--space-md) var(--space-xl);
    background-color: var(--color-bg-base);
    border-top: 1px solid var(--color-border-subtle);
  }

  &__footer-content {
    max-width: 1400px;
    margin: 0 auto;
    text-align: center;
  }

  &__disclaimer {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    line-height: var(--line-height-relaxed);
    margin: 0;
  }

  &__attribution {
    font-size: var(--font-size-2xs);
    color: var(--color-text-muted);
    line-height: var(--line-height-relaxed);
    margin: var(--space-3xs) 0 0;
  }
}
</style>
