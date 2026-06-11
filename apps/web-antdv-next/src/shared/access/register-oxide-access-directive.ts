/**
 * Oxide RBAC `v-access` directive — same as vben default but `super_admin`
 * bypasses permission-code checks (aligned with Casbin matcher bypass).
 */
import type { App, Directive, DirectiveBinding } from 'vue';

import { useOxideAccess } from '#/shared/composables/use-oxide-access';

function isAccessible(
  el: Element,
  binding: DirectiveBinding<string | string[]>,
) {
  const { accessMode, hasAccessByCodes, hasAccessByRoles } = useOxideAccess();

  const value = binding.value;

  if (!value) return;
  const authMethod =
    accessMode.value === 'frontend' && binding.arg === 'role'
      ? hasAccessByRoles
      : hasAccessByCodes;

  const values = Array.isArray(value) ? value : [value];

  if (!authMethod(values)) {
    el?.remove();
  }
}

const mounted = (el: Element, binding: DirectiveBinding<string | string[]>) => {
  isAccessible(el, binding);
};

const authDirective: Directive = {
  mounted,
};

export function registerOxideAccessDirective(app: App) {
  app.directive('access', authDirective);
}
