import type { ConfigResourceKind } from '@vben/types/config-api';

export interface ConfigResourceMeta {
  descriptionKey: string;
  icon: string;
  labelKey: string;
  tone: 'amber' | 'blue' | 'cyan' | 'green' | 'purple' | 'rose';
}

export const CONFIG_RESOURCE_META = {
  recommendation_policy: {
    descriptionKey: 'page.config.resources.recommendationPolicy.description',
    icon: 'lucide:list-filter',
    labelKey: 'page.config.resources.recommendationPolicy.label',
    tone: 'blue',
  },
  execution_risk_policy: {
    descriptionKey: 'page.config.resources.executionRiskPolicy.description',
    icon: 'lucide:shield-check',
    labelKey: 'page.config.resources.executionRiskPolicy.label',
    tone: 'rose',
  },
  model_routing: {
    descriptionKey: 'page.config.resources.modelRouting.description',
    icon: 'lucide:git-branch',
    labelKey: 'page.config.resources.modelRouting.label',
    tone: 'purple',
  },
  report_schedule: {
    descriptionKey: 'page.config.resources.reportSchedule.description',
    icon: 'lucide:calendar-clock',
    labelKey: 'page.config.resources.reportSchedule.label',
    tone: 'cyan',
  },
  operations_policy: {
    descriptionKey: 'page.config.resources.operationsPolicy.description',
    icon: 'lucide:circle-stop',
    labelKey: 'page.config.resources.operationsPolicy.label',
    tone: 'amber',
  },
  execution_automation_policy: {
    descriptionKey:
      'page.config.resources.executionAutomationPolicy.description',
    icon: 'lucide:key-round',
    labelKey: 'page.config.resources.executionAutomationPolicy.label',
    tone: 'green',
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
