export type PermissionAction = "view" | "create" | "edit" | "delete" | "approve";

export function isCompanyAdmin(role?: string): boolean {
  return role === "COMPANY_ADMIN";
}

export function canAccessModule(role?: string, moduleName?: string): boolean {
  if (role === "COMPANY_ADMIN") return true;
  // Further RBAC checks implemented in Phase 1
  return false;
}
