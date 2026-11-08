import { getStoredAuth, getStoredNavigation } from "./auth";

export type PermissionAction = "view" | "create" | "edit" | "delete" | "approve";

export function isAdminRole(role?: string): boolean {
  if (!role) return false;
  return ["COMPANY_ADMIN", "ADMIN", "SUPER_ADMIN", "OWNER"].includes(role.toUpperCase().trim());
}

export function isCompanyAdmin(role?: string): boolean {
  if (role) return isAdminRole(role);
  if (typeof window === "undefined") return false;
  const auth = getStoredAuth();
  return isAdminRole(auth?.user?.role);
}

export function canAccessRoute(href: string): boolean {
  if (typeof window === "undefined") return true;
  const auth = getStoredAuth();
  if (!auth || !auth.user) return true;
  if (isAdminRole(auth.user.role)) return true;

  const nav = getStoredNavigation();
  if (!nav || !Array.isArray(nav)) return false;

  const cleanHref = href.split("?")[0].split("#")[0];
  return nav.some((g: any) => {
    if (g.is_locked) return false;
    return g.items?.some((it: any) => {
      if (it.is_locked || !it.href) return false;
      const itClean = it.href.split("?")[0].split("#")[0];
      return cleanHref === itClean || cleanHref.startsWith(`${itClean}/`);
    });
  });
}

export function canAccessModule(roleOrModule?: string, moduleName?: string): boolean {
  if (typeof window === "undefined") return true;
  const auth = getStoredAuth();
  const effectiveRole = moduleName ? roleOrModule : auth?.user?.role;
  const effectiveModule = moduleName || roleOrModule;

  if (isAdminRole(effectiveRole)) return true;
  if (!effectiveModule) return true;

  const nav = getStoredNavigation();
  if (!nav || !Array.isArray(nav)) return false;

  const modClean = effectiveModule.replace("-", "_").toLowerCase().trim();
  return nav.some((g: any) => {
    if (g.is_locked) return false;
    const gClean = (g.id || "").replace("-", "_").toLowerCase().trim();
    return gClean === modClean;
  });
}
