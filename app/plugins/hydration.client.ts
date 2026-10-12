export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', () => {
    if (import.meta.client && typeof document !== 'undefined') {
      document.documentElement.dataset.hydrated = 'true'
    }
  })
})
