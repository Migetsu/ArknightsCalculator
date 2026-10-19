// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import eslintConfigPrettier from 'eslint-config-prettier'

export default withNuxt(
  {
    ignores: ['.nuxt-agent/**', 'scripts/dev-agent.mjs', 'data/**', 'lint-staged.config.mjs'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.vue'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
    },
  },
  {
    files: ['scripts/patch-vue.mjs'],
    rules: {
      'no-console': 'off',
    },
  },
  eslintConfigPrettier,
)
