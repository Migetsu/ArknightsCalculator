// @ts-check
/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard-scss'],
  rules: {
    'selector-class-pattern': [
      '^[a-z0-9]+(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$',
      {
        message:
          'Expected class selector to follow BEM convention in kebab-case (block, block__element, block--modifier, block__element--modifier)',
      },
    ],
    'selector-max-id': 0,
    'selector-max-type': 0,
  },
  overrides: [
    {
      files: ['**/*.vue'],
      customSyntax: 'postcss-html',
    },
    {
      files: ['**/*reset*.scss', '**/_reset.scss'],
      rules: {
        'selector-max-type': null,
      },
    },
  ],
}
