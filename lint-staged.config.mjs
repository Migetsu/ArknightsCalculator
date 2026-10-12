// @ts-check

/**
 * Lint-staged configuration filtering out generated data/ directory.
 * Prevents exceeding command line length limits on Windows.
 */
export default {
  /**
   * @param {string[]} filenames
   * @returns {string[]}
   */
  '*.{js,ts,mjs,cjs,vue}': (filenames) => {
    const valid = filenames.filter((f) => !f.includes('/data/') && !f.includes('\\data\\'))
    return valid.length > 0 ? [`eslint --fix ${valid.map((f) => `"${f}"`).join(' ')}`] : []
  },
  /**
   * @param {string[]} filenames
   * @returns {string[]}
   */
  '*.{scss,css,vue}': (filenames) => {
    const valid = filenames.filter((f) => !f.includes('/data/') && !f.includes('\\data\\'))
    return valid.length > 0 ? [`stylelint --fix ${valid.map((f) => `"${f}"`).join(' ')}`] : []
  },
  /**
   * @param {string[]} filenames
   * @returns {string[]}
   */
  '*.{js,ts,mjs,cjs,vue,scss,css,json,md,html,yml,yaml}': (filenames) => {
    const valid = filenames.filter((f) => !f.includes('/data/') && !f.includes('\\data\\'))
    return valid.length > 0 ? [`prettier --write ${valid.map((f) => `"${f}"`).join(' ')}`] : []
  },
}
