import type { BorderBeamGradient } from 'antdv-next';

export type BorderBeamPalette =
  | 'brand'
  | 'execution'
  | 'governance'
  | 'research'
  | 'trading';

export type BorderBeamEmphasis = 'featured' | 'hover';

export const BORDER_BEAM_STOPS = {
  brand: [
    { color: 'hsl(var(--qp-accent-sky))', percent: 0 },
    { color: 'hsl(var(--qp-accent-violet))', percent: 42 },
    { color: 'hsl(var(--qp-accent-pink))', percent: 72 },
    { color: 'hsl(var(--qp-accent-orange))', percent: 100 },
  ],
  execution: [
    { color: 'hsl(var(--qp-accent-violet))', percent: 0 },
    { color: 'hsl(var(--qp-accent-pink))', percent: 58 },
    { color: 'hsl(var(--qp-accent-orange))', percent: 100 },
  ],
  governance: [
    { color: 'hsl(var(--qp-accent-sky))', percent: 0 },
    { color: 'hsl(var(--qp-accent-violet))', percent: 100 },
  ],
  research: [
    { color: 'hsl(var(--qp-accent-violet))', percent: 0 },
    { color: 'hsl(var(--qp-accent-pink))', percent: 100 },
  ],
  trading: [
    { color: 'hsl(var(--qp-accent-sky))', percent: 0 },
    { color: 'hsl(var(--qp-accent-violet))', percent: 64 },
    { color: 'hsl(var(--qp-accent-pink))', percent: 100 },
  ],
} as const satisfies Record<BorderBeamPalette, BorderBeamGradient>;

export const BORDER_BEAM_PRESETS = {
  featured: { duration: 12, size: 160 },
  hover: { duration: 6, size: 56 },
} as const satisfies Record<
  BorderBeamEmphasis,
  { duration: number; size: number }
>;
