export const DEFAULT_INSPECTOR_WIDTH_PX = 520;

const NUMERIC_WIDTH = /^\d+(?:\.\d+)?$/;
const CSS_LENGTH = /^\d+(?:\.\d+)?(?:px|rem|em|%|vw|dvw)$/;

/**
 * Inspector `width` is a CSS length. Vue attribute `width="640"` is a
 * unitless string; putting that into `min(var(--w), calc(100% - …))`
 * invalidates the whole `width` rule and the abspos panel shrink-wraps
 * to a sliver.
 */
export function resolveInspectorPanelWidth(
  width: number | string | undefined,
  storedPx = DEFAULT_INSPECTOR_WIDTH_PX,
): string {
  if (typeof width === 'number' && Number.isFinite(width) && width > 0) {
    return `${width}px`;
  }
  if (typeof width === 'string') {
    const trimmed = width.trim();
    if (NUMERIC_WIDTH.test(trimmed)) {
      return `${trimmed}px`;
    }
    if (CSS_LENGTH.test(trimmed)) {
      return trimmed;
    }
  }
  if (Number.isFinite(storedPx) && storedPx > 0) {
    return `${storedPx}px`;
  }
  return `${DEFAULT_INSPECTOR_WIDTH_PX}px`;
}
