import type { UiText } from '@vben/types';

/** Resolve embedded schema UI text for the active SPA locale. */
export function resolveUiText(
  text: UiText | undefined,
  locale: string,
): string {
  const locales = text?.locales;
  if (!locales) {
    return '';
  }
  return (
    locales[locale] ??
    locales['en-US'] ??
    locales['zh-CN'] ??
    Object.values(locales)[0] ??
    ''
  );
}

/** Split help text into non-empty lines for tooltip rendering. */
export function resolveUiTextLines(
  text: UiText | undefined,
  locale: string,
): string[] {
  return resolveUiText(text, locale)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}
