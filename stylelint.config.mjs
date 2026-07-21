const rawColorFunction = String.raw`/(?:^|[\s,(])(?:rgb|rgba|hsl|hsla)\((?!\s*var\(--)/`;

export default {
  extends: ['@vben/stylelint-config'],
  overrides: [
    {
      files: ['apps/web-antdv-next/src/**/*.{css,less,scss,vue}'],
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
          },
          {
            message:
              'Use a design-token CSS variable instead of a raw rgb/hsl color in "%s: %s".',
          },
        ],
      },
    },
  ],
  root: true,
};
