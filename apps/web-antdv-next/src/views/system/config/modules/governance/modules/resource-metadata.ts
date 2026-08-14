import type { ConfigResourceKind } from '@vben/types/config-api';

export interface ConfigResourceMeta {
  descriptionKey: string;
  icon: string;
  labelKey: string;
  tone: 'sky' | 'violet';
}

export const CONFIG_RESOURCE_META = {
  recommendation_policy: {
    descriptionKey: 'page.config.resources.recommendationPolicy.description',
    icon: 'lucide:list-filter',
    labelKey: 'page.config.resources.recommendationPolicy.label',
    tone: 'sky',
  },
  execution_risk_policy: {
    descriptionKey: 'page.config.resources.executionRiskPolicy.description',
    icon: 'lucide:shield-check',
    labelKey: 'page.config.resources.executionRiskPolicy.label',
    tone: 'violet',
  },
  model_routing: {
    descriptionKey: 'page.config.resources.modelRouting.description',
    icon: 'lucide:git-branch',
    labelKey: 'page.config.resources.modelRouting.label',
    tone: 'violet',
  },
  report_schedule: {
    descriptionKey: 'page.config.resources.reportSchedule.description',
    icon: 'lucide:calendar-clock',
    labelKey: 'page.config.resources.reportSchedule.label',
    tone: 'sky',
  },
  operations_policy: {
    descriptionKey: 'page.config.resources.operationsPolicy.description',
    icon: 'lucide:circle-stop',
    labelKey: 'page.config.resources.operationsPolicy.label',
    tone: 'violet',
  },
  execution_automation_policy: {
    descriptionKey:
      'page.config.resources.executionAutomationPolicy.description',
    icon: 'lucide:key-round',
    labelKey: 'page.config.resources.executionAutomationPolicy.label',
    tone: 'sky',
  },
} as const satisfies Record<ConfigResourceKind, ConfigResourceMeta>;

export const CONFIG_RESOURCE_KINDS = Object.keys(
  CONFIG_RESOURCE_META,
) as ConfigResourceKind[];

export function isConfigResourceKind(
  value: unknown,
): value is ConfigResourceKind {
  return (
    typeof value === 'string' && Object.hasOwn(CONFIG_RESOURCE_META, value)
  );
}
