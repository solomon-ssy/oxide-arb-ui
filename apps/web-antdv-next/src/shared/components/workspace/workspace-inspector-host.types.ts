import type { InjectionKey, Ref } from 'vue';

import type { WorkspaceSurface } from './workspace-inspector-registry';

export interface WorkspaceInspectorHostContext {
  activeId: Readonly<Ref<null | string>>;
  activate: (id: string, close: () => void, surface?: WorkspaceSurface) => void;
  deactivate: (id: string) => void;
  stageOpen: Readonly<Ref<boolean>>;
  stageTarget: Readonly<Ref<HTMLElement | null>>;
}

export const WORKSPACE_INSPECTOR_HOST_KEY: InjectionKey<WorkspaceInspectorHostContext> =
  Symbol('WORKSPACE_INSPECTOR_HOST');
