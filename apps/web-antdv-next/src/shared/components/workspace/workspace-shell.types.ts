import type { Component } from 'vue';

export type WorkspaceDomain =
  | 'execution'
  | 'governance'
  | 'research'
  | 'trading';

export interface WorkspaceModule {
  component: Component;
  /** Landing tab to highlight while this contextual module is active. */
  highlight?: string;
  icon: string;
  key: string;
  label: string;
  /** When false, the module is only reachable via object-stage deep links. */
  landing?: boolean;
}
