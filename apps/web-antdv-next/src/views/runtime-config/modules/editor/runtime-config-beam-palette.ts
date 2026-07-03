import type { BorderBeamColor } from 'antdv-next';

export type SectionBeamTone = 'primary' | 'processing' | 'warning';

export const BEAM_PALETTE: Record<SectionBeamTone, BorderBeamColor> = {
  primary: [
    { color: 'hsl(var(--primary))', percent: 0 },
    { color: 'hsl(var(--primary) / 0.55)', percent: 48 },
    { color: 'transparent', percent: 100 },
  ],
  processing: [
    { color: 'hsl(var(--primary))', percent: 0 },
    { color: 'hsl(187 85% 53%)', percent: 42 },
    { color: 'hsl(160 84% 39%)', percent: 68 },
    { color: 'transparent', percent: 100 },
  ],
  warning: [
    { color: 'hsl(var(--warning))', percent: 0 },
    { color: 'hsl(38 92% 50%)', percent: 52 },
    { color: 'transparent', percent: 100 },
  ],
};

export interface SectionBeamInput {
  dirty?: boolean;
  governanceCritical?: boolean;
}

export function resolveSectionBeamTone(
  input: SectionBeamInput,
): SectionBeamTone {
  if (input.governanceCritical) {
    return 'warning';
  }
  if (input.dirty) {
    return 'processing';
  }
  return 'primary';
}

export function resolveSectionBeamColor(
  input: SectionBeamInput,
): BorderBeamColor {
  return BEAM_PALETTE[resolveSectionBeamTone(input)];
}

/** Whether switching away from the current section needs a dirty-draft confirm. */
export function needsDirtySwitchConfirm(
  fromSectionId: string,
  toSectionId: string,
  dirty: boolean,
): boolean {
  if (!fromSectionId || fromSectionId === toSectionId) {
    return false;
  }
  return dirty;
}
