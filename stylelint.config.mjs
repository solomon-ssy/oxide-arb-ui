const rawColorFunction = String.raw`/(?:^|[\s,(])(?:rgb|rgba|hsl|hsla)\((?!\s*var\(--)/`;
const rawShadow = String.raw`/^(?!\s*(?:none|var\(--qp-(?:glow|shadow)-[\w-]+\))\s*$).+$/`;
const rawZIndex = String.raw`/^(?!\s*(?:auto|inherit|initial|revert|unset|var\(--qp-layer-[\w-]+\))\s*$).+$/`;

export default {
  extends: ['@vben/stylelint-config'],
  overrides: [
    {
      files: ['apps/web-antdv-next/src/**/*.{css,less,scss,vue}'],
      excludedFiles: ['apps/web-antdv-next/src/styles/tokens.css'],
      rules: {
        'color-no-hex': [
          true,
          {
            message:
              'Use an hsl(var(--semantic-token)) or hsl(var(--visual-token)) design token instead of a hex color.',
          },
        ],
        'declaration-property-value-disallowed-list': [
          {
            '/.*/': [rawColorFunction],
            'box-shadow': [rawShadow],
            'z-index': [rawZIndex],
          },
          {
            message:
              'Use a design-token CSS variable instead of a raw rgb/hsl color in "%s: %s".',
          },
        ],
      },
    },
    {
      files: ['apps/web-antdv-next/src/styles/tokens.css'],
      rules: {
        'declaration-property-value-disallowed-list': [
          {
            'box-shadow': [rawShadow],
            'z-index': [rawZIndex],
          },
          {
            message: 'Use a governed shadow or layer design token in "%s: %s".',
          },
        ],
      },
    },
  ],
  root: true,
};
