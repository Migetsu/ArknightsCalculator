export default defineI18nConfig(() => ({
  legacy: false,
  missingWarn: true,
  fallbackWarn: true,
  missing: (_locale, key) => {
    console.error(`[i18n missing] Missing translation key: "${key}"`)
  },
}))
