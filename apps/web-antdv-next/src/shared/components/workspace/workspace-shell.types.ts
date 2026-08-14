import type { Component } from 'vue';

export interface WorkspaceModule {
  component: Component;
  icon: string;
  key: string;
  label: string;
}
