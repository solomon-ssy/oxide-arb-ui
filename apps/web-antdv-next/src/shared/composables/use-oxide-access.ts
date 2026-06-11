import { useAccess } from '@vben/access';
import { useUserStore } from '@vben/stores';

const SUPER_ADMIN_ROLE = 'super_admin';

/**
 * Oxide RBAC access helpers — wraps vben `useAccess` with Casbin-aligned
 * `super_admin` bypass for permission-code checks.
 */
export function useOxideAccess() {
  const base = useAccess();
  const userStore = useUserStore();

  function hasAccessByCodes(codes: string[]) {
    if (userStore.userRoles.includes(SUPER_ADMIN_ROLE)) {
      return true;
    }
    return base.hasAccessByCodes(codes);
  }

  return {
    ...base,
    hasAccessByCodes,
  };
}
