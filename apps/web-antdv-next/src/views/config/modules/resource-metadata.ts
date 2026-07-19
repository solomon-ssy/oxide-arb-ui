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
  operational_control: {
    descriptionKey: 'page.config.resources.operationalControl.description',
    icon: 'lucide:circle-stop',
    labelKey: 'page.config.resources.operationalControl.label',
    tone: 'amber',
  },
  execution_authorization: {
    descriptionKey: 'page.config.resources.executionAuthorization.description',
    icon: 'lucide:key-round',
    labelKey: 'page.config.resources.executionAuthorization.label',
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
