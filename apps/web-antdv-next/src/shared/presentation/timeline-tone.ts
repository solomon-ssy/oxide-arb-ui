import type { EnumName, EnumValue } from '@vben/types';

import type { EnumTone } from './enum-presentation';

import { enumPresentation } from './enum-presentation';

export function timelineDotColor(tone: EnumTone): string {
  switch (tone) {
    case 'danger': {
      return 'red';
    }
    case 'paused': {
      return 'hsl(var(--qp-status-paused))';
    }
    case 'queued': {
      return 'hsl(var(--qp-status-queued))';
    }
    case 'running': {
      return 'hsl(var(--qp-status-running))';
    }
    case 'success': {
      return 'green';
    }
    case 'warning': {
      return 'hsl(var(--qp-status-warning))';
    }
    default: {
      return 'gray';
    }
  }
}

export function enumTimelineColor(
  name: EnumName,
  value: null | string | undefined,
): string {
  if (!value) {
    return 'gray';
  }
  return timelineDotColor(
    enumPresentation(name, value as EnumValue<typeof name>).tone,
  );
}
