import type { InjectionKey } from 'vue';

import type {
  RuntimeConfigSchemaFieldView,
  RuntimeConfigVersionView,
  UiText,
} from '@vben/types';

/** Runtime-config governed modal bridge provided by the app shell. */
export type RuntimeConfigGoverned = <T>(
  execute: (ctx: { actingRole: string; reason: string }) => Promise<T>,
  options: {
    confirmWord?: string;
    danger?: boolean;
    summary?: string;
    title: string;
  },
) => Promise<null | T>;

/** Injection key used by the package-level preferences block. */
export const RuntimeConfigGovernedKey: InjectionKey<RuntimeConfigGoverned> =
  Symbol('oxide-runtime-config-governed');

/** Minimal HTTP surface injected from the app `requestClient` (refresh-aware). */
export interface RuntimeConfigRequestClient {
  get<T>(
    url: string,
    config?: { params?: Record<string, unknown> },
  ): Promise<T>;
  post<T>(
    url: string,
    data?: unknown,
    config?: { headers?: Record<string, string> },
  ): Promise<T>;
}

/** App-shell injection key for the shared oxide API client. */
export const RuntimeConfigRequestClientKey: InjectionKey<RuntimeConfigRequestClient> =
  Symbol('oxide-runtime-config-request-client');

/** Revision signal bumped on WS `config.activated` so preferences reload live config. */
export const RuntimeConfigRevisionKey: InjectionKey<() => null | string> =
  Symbol('oxide-runtime-config-revision');

/** Grouped schema fields rendered as one preferences card. */
export interface RuntimeConfigGroup {
  description: UiText;
  fields: RuntimeConfigSchemaFieldView[];
  key: string;
  label: UiText;
  order: number;
}

/** One dirty field diff. */
export interface RuntimeConfigFieldDiff {
  field: RuntimeConfigSchemaFieldView;
  next: unknown;
  path: string;
  previous: unknown;
}

/** Card apply payload (sparse patch semantics). */
export interface RuntimeConfigApplyPayload {
  diffs: RuntimeConfigFieldDiff[];
  group: RuntimeConfigGroup;
  patch: Record<string, unknown>;
}

/** Create + activate result used by the preferences block. */
export interface RuntimeConfigApplyResult {
  activatedVersionId?: string;
  createdVersion?: RuntimeConfigVersionView;
  partial?: boolean;
}
