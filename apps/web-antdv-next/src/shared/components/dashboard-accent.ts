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
    bg: 'bg-amber-500/[0.04] dark:bg-amber-500/[0.08]',
    border: 'border-amber-200/60 dark:border-amber-900/40',
    footerText: 'text-amber-700/75 dark:text-amber-300/75',
    gradient: 'from-amber-500/[0.07] to-transparent',
    iconBg: 'bg-amber-500/12',
    iconText: 'text-amber-600 dark:text-amber-400',
    titleText: 'text-amber-900/90 dark:text-amber-100/90',
    valueText: 'text-amber-700 dark:text-amber-300',
  },
  emerald: {
    bg: 'bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08]',
    border: 'border-emerald-200/60 dark:border-emerald-900/40',
    footerText: 'text-emerald-700/75 dark:text-emerald-300/75',
    gradient: 'from-emerald-500/[0.07] to-transparent',
    iconBg: 'bg-emerald-500/12',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    titleText: 'text-emerald-900/90 dark:text-emerald-100/90',
    valueText: 'text-emerald-700 dark:text-emerald-300',
  },
  sky: {
    bg: 'bg-sky-500/[0.04] dark:bg-sky-500/[0.08]',
    border: 'border-sky-200/60 dark:border-sky-900/40',
    footerText: 'text-sky-700/75 dark:text-sky-300/75',
    gradient: 'from-sky-500/[0.07] to-transparent',
    iconBg: 'bg-sky-500/12',
    iconText: 'text-sky-600 dark:text-sky-400',
    titleText: 'text-sky-900/90 dark:text-sky-100/90',
    valueText: 'text-sky-700 dark:text-sky-300',
  },
  violet: {
    bg: 'bg-violet-500/[0.04] dark:bg-violet-500/[0.08]',
    border: 'border-violet-200/60 dark:border-violet-900/40',
    footerText: 'text-violet-700/75 dark:text-violet-300/75',
    gradient: 'from-violet-500/[0.07] to-transparent',
    iconBg: 'bg-violet-500/12',
    iconText: 'text-violet-600 dark:text-violet-400',
    titleText: 'text-violet-900/90 dark:text-violet-100/90',
    valueText: 'text-violet-700 dark:text-violet-300',
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
    iconBg: 'bg-amber-500/10',
    iconText: 'text-amber-600 dark:text-amber-400',
    titleText: 'text-amber-900 dark:text-amber-100',
  },
  cyan: {
    iconBg: 'bg-cyan-500/10',
    iconText: 'text-cyan-600 dark:text-cyan-400',
    titleText: 'text-cyan-900 dark:text-cyan-100',
  },
  indigo: {
    iconBg: 'bg-indigo-500/10',
    iconText: 'text-indigo-600 dark:text-indigo-400',
    titleText: 'text-indigo-900 dark:text-indigo-100',
  },
  sky: {
    iconBg: 'bg-sky-500/10',
    iconText: 'text-sky-600 dark:text-sky-400',
    titleText: 'text-sky-900 dark:text-sky-100',
  },
  teal: {
    iconBg: 'bg-teal-500/10',
    iconText: 'text-teal-600 dark:text-teal-400',
    titleText: 'text-teal-900 dark:text-teal-100',
  },
  violet: {
    iconBg: 'bg-violet-500/10',
    iconText: 'text-violet-600 dark:text-violet-400',
    titleText: 'text-violet-900 dark:text-violet-100',
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
