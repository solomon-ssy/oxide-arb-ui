import type { Component } from 'vue';

export type WorkspaceDomain =
  | 'execution'
  | 'governance'
  | 'research'
  | 'trading';

export interface WorkspaceModule {
  component: Component;
  icon: string;
  key: string;
  label: string;
}
