export default defineNuxtPlugin((nuxtApp) => {
  const markHydrated = () => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-hydrated', 'true')
    }
  }

  nuxtApp.hook('app:suspense:resolve', markHydrated)
  nuxtApp.hook('page:finish', markHydrated)
})
