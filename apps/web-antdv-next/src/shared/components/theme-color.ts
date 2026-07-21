const THEME_COLOR_VARIABLES = [
  '--background',
  '--border',
  '--destructive',
  '--foreground',
  '--muted',
  '--muted-foreground',
  '--primary',
  '--success',
  '--visual-1',
  '--visual-2',
  '--visual-3',
  '--visual-4',
  '--visual-5',
  '--visual-6',
  '--warning',
] as const;

export type ThemeColorVariable = (typeof THEME_COLOR_VARIABLES)[number];

/** Resolve a governed HSL design token for renderers that cannot consume CSS variables. */
export function resolveThemeColor(
  cssVariable: ThemeColorVariable,
  alpha?: `${number}%`,
): string {
  if (typeof document === 'undefined') {
    return 'currentColor';
  }
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVariable)
    .trim();
  return value ? `hsl(${value}${alpha ? ` / ${alpha}` : ''})` : 'currentColor';
}

/** Semantic and categorical token accessors for canvas/SVG renderers. */
export const themeColors = {
  get background() {
    return resolveThemeColor('--background');
  },
  get border() {
    return resolveThemeColor('--border');
  },
  get destructive() {
    return resolveThemeColor('--destructive');
  },
  get foreground() {
    return resolveThemeColor('--foreground');
  },
  get muted() {
    return resolveThemeColor('--muted-foreground');
  },
  get primary() {
    return resolveThemeColor('--primary');
  },
  get success() {
    return resolveThemeColor('--success');
  },
  get warning() {
    return resolveThemeColor('--warning');
  },
  get visual() {
    return [
      resolveThemeColor('--visual-1'),
      resolveThemeColor('--visual-2'),
      resolveThemeColor('--visual-3'),
      resolveThemeColor('--visual-4'),
      resolveThemeColor('--visual-5'),
      resolveThemeColor('--visual-6'),
    ] as const;
  },
};
