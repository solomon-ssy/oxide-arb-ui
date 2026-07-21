/** Unified neutral surface tokens for dashboard section panels. */
export const DASHBOARD_SURFACE = {
  border: 'border-border',
  extraLink: 'text-primary hover:opacity-80',
  footerText: 'text-muted-foreground',
  iconBg: 'bg-muted',
  iconText: 'text-muted-foreground',
  linkTile: 'hover:bg-accent bg-transparent',
  linkTileBorder: 'border-border',
  rowHover: 'hover:bg-accent',
  titleText: 'text-foreground',
  valueText: 'text-foreground',
} as const;

/** Subtle per-card KPI accents — tinted background + colored typography only. */
export type KpiAccent = 'amber' | 'emerald' | 'sky' | 'violet';

export interface KpiAccentStyle {
  bg: string;
  border: string;
  footerText: string;
  gradient: string;
  iconBg: string;
  iconText: string;
  titleText: string;
  valueText: string;
}

export const KPI_ACCENT: Record<KpiAccent, KpiAccentStyle> = {
  amber: {
    bg: 'bg-visual-5/[0.04]',
    border: 'border-visual-5/35',
    footerText: 'text-visual-5',
    gradient: 'from-visual-5/[0.07] to-transparent',
    iconBg: 'bg-visual-5/12',
    iconText: 'text-visual-5',
    titleText: 'text-visual-5',
    valueText: 'text-visual-5',
  },
  emerald: {
    bg: 'bg-visual-6/[0.04]',
    border: 'border-visual-6/35',
    footerText: 'text-visual-6',
    gradient: 'from-visual-6/[0.07] to-transparent',
    iconBg: 'bg-visual-6/12',
    iconText: 'text-visual-6',
    titleText: 'text-visual-6',
    valueText: 'text-visual-6',
  },
  sky: {
    bg: 'bg-visual-1/[0.04]',
    border: 'border-visual-1/35',
    footerText: 'text-visual-1',
    gradient: 'from-visual-1/[0.07] to-transparent',
    iconBg: 'bg-visual-1/12',
    iconText: 'text-visual-1',
    titleText: 'text-visual-1',
    valueText: 'text-visual-1',
  },
  violet: {
    bg: 'bg-visual-3/[0.04]',
    border: 'border-visual-3/35',
    footerText: 'text-visual-3',
    gradient: 'from-visual-3/[0.07] to-transparent',
    iconBg: 'bg-visual-3/12',
    iconText: 'text-visual-3',
    titleText: 'text-visual-3',
    valueText: 'text-visual-3',
  },
};

/** Header / panel title tone — typography and icon tint only, neutral background. */
export type PanelTone = 'amber' | 'cyan' | 'indigo' | 'sky' | 'teal' | 'violet';

export interface PanelToneStyle {
  iconBg: string;
  iconText: string;
  titleText: string;
}

export const PANEL_TONE: Record<PanelTone, PanelToneStyle> = {
  amber: {
    iconBg: 'bg-visual-5/10',
    iconText: 'text-visual-5',
    titleText: 'text-visual-5',
  },
  cyan: {
    iconBg: 'bg-visual-4/10',
    iconText: 'text-visual-4',
    titleText: 'text-visual-4',
  },
  indigo: {
    iconBg: 'bg-visual-1/10',
    iconText: 'text-visual-1',
    titleText: 'text-visual-1',
  },
  sky: {
    iconBg: 'bg-visual-2/10',
    iconText: 'text-visual-2',
    titleText: 'text-visual-2',
  },
  teal: {
    iconBg: 'bg-visual-6/10',
    iconText: 'text-visual-6',
    titleText: 'text-visual-6',
  },
  violet: {
    iconBg: 'bg-visual-3/10',
    iconText: 'text-visual-3',
    titleText: 'text-visual-3',
  },
};

export function kpiAccentStyle(accent: KpiAccent) {
  return KPI_ACCENT[accent];
}

export function panelToneStyle(tone: PanelTone) {
  return PANEL_TONE[tone];
}

/** @deprecated Use {@link DASHBOARD_SURFACE} directly. */
export function dashboardAccentStyle() {
  return DASHBOARD_SURFACE;
}
