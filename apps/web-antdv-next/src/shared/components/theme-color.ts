/**
 * Resolve a shadcn/Tailwind HSL design token (e.g. `--destructive`) to a CSS
 * color string usable by canvas-based renderers (ECharts) that cannot read
 * CSS custom properties directly.
 *
 * Falls back to a neutral gray when running outside a browser (SSR/tests) or
 * when the token is not defined on `:root`.
 */
export function resolveThemeColor(cssVariable: string): string {
  if (typeof document === 'undefined') {
    return '#94a3b8';
  }
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVariable)
    .trim();
  return value ? `hsl(${value})` : '#94a3b8';
}

/** Convenience accessors for the semantic tokens used across chart components. */
export const themeColors = {
  get destructive() {
    return resolveThemeColor('--destructive');
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
};
