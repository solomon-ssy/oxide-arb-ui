import type { InjectionKey, Ref } from 'vue';

export interface WorkspaceInspectorHostContext {
  activeId: Readonly<Ref<null | string>>;
  activate: (id: string, close: () => void) => void;
  deactivate: (id: string) => void;
}

export const WORKSPACE_INSPECTOR_HOST_KEY: InjectionKey<WorkspaceInspectorHostContext> =
  Symbol('WORKSPACE_INSPECTOR_HOST');
