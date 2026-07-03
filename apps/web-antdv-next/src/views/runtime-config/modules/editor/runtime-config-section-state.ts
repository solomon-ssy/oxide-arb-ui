export const RUNTIME_CONFIG_ACTIVE_SECTION_STORAGE_KEY =
  'runtime-config-editor.active-section';

export function readStoredActiveSectionId(): null | string {
  try {
    return localStorage.getItem(RUNTIME_CONFIG_ACTIVE_SECTION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeStoredActiveSectionId(sectionId: string) {
  try {
    localStorage.setItem(RUNTIME_CONFIG_ACTIVE_SECTION_STORAGE_KEY, sectionId);
  } catch {
    // Quota or privacy mode — non-fatal.
  }
}

export function resolveInitialActiveSectionId(
  sections: { id: string }[],
  preferredIds: Array<null | string | undefined>,
): string {
  if (sections.length === 0) {
    return '';
  }
  for (const id of preferredIds) {
    if (id && sections.some((section) => section.id === id)) {
      return id;
    }
  }
  const firstSection = sections.at(0);
  if (firstSection === undefined) {
    return '';
  }
  return firstSection.id;
}
