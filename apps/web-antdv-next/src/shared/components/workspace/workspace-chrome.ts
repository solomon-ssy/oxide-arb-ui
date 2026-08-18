import type { InjectionKey, Ref } from 'vue';

import { inject, provide } from 'vue';

export const WORKSPACE_CHROME_ACTIONS_HOST: InjectionKey<
  Ref<HTMLElement | null>
> = Symbol('WORKSPACE_CHROME_ACTIONS_HOST');

export function provideWorkspaceChromeActions(host: Ref<HTMLElement | null>) {
  provide(WORKSPACE_CHROME_ACTIONS_HOST, host);
}

export function useWorkspaceChromeActions() {
  return inject(WORKSPACE_CHROME_ACTIONS_HOST, undefined);
}
