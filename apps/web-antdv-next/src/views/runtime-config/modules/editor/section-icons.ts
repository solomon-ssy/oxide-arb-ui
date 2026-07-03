import type { SchemaSection } from '@vben/types';

/** Fallback when a section omits `icon` in the schema tree. */
export const DEFAULT_SECTION_ICON = 'lucide:settings';

/** Resolve the Iconify icon id for a layout section (menu-compatible). */
export function resolveSectionIcon(
  section: Pick<SchemaSection, 'icon' | 'id'>,
): string {
  return section.icon ?? DEFAULT_SECTION_ICON;
}
