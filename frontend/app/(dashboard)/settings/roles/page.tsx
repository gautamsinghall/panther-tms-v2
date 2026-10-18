"use client";
import { toast } from "@/lib/toast";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, Shield, ShieldCheck, Trash2, Edit2, Lock, Search, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { apiClient } from "@/lib/api-client";
import { ALL_NAVIGATION_MODULES, NavGroup } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";

interface PermissionItem {
  module: string;
  feature: string;
  permission: string;
  is_allowed: boolean;
}

interface RoleRecord {
  id: number;
  name: string;
  description?: string | null;
  is_system: boolean;
  created_at: string;
  permissions: PermissionItem[];
}

interface FeatureDef {
  id: string;
  label: string;
}

interface ModuleDef {
  id: string;
  title: string;
  features: FeatureDef[];
}

const ACTIONS = ["view", "create", "edit", "approve"] as const;

function normalizeModuleId(mod: string): string {
  const m = (mod || "").toLowerCase().trim();
  if (m === "transport-reports" || m === "transport_reports") return "transport_reports";
  if (m === "api-center" || m === "api_center") return "api_center";
  return m.replace(/-/g, "_");
}

/**
 * Dynamically builds module & feature definitions from ALL_NAVIGATION_MODULES.
 * Any new menu item or route added to navigation will automatically appear in this matrix.
 */
function buildModuleDefinitionsFromNav(navGroups: NavGroup[]): ModuleDef[] {
  return navGroups
    .filter((g) => g.id !== "home")
    .map((g) => {
      const normModuleId = normalizeModuleId(g.id);
      return {
        id: normModuleId,
        title: g.title,
        features: (g.items || []).map((it) => {
          let featId = (it.feature || "").toLowerCase().trim();
          if (normModuleId === "tracking" && featId === "tracking") {
            featId = "sim_tracking";
          }
          return {
            id: featId,
            label: it.title,
          };
        }),
      };
    });
}

function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
  className,
  title,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  className?: string;
  title?: string;
  ariaLabel?: string;
}) {
  const ref = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className={className}
      title={title}
      aria-label={ariaLabel}
    />
  );
}

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [moduleDefinitions, setModuleDefinitions] = useState<ModuleDef[]>(() =>
    buildModuleDefinitionsFromNav(ALL_NAVIGATION_MODULES)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<RoleRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Selected permission map: key = `${module}:${feature}:${permission}` -> boolean
  const [permMap, setPermMap] = useState<Record<string, boolean>>({});

  const loadRolesAndSchema = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [rolesRes, schemaRes] = await Promise.allSettled([
        apiClient<RoleRecord[]>("/api/v1/settings/roles"),
        apiClient<ModuleDef[]>("/api/v1/settings/roles/permissions-schema"),
      ]);

      if (rolesRes.status === "fulfilled") {
        setRoles(rolesRes.value);
      } else {
        setErrorMessage(rolesRes.reason?.message || "Failed to load roles.");
      }

      if (schemaRes.status === "fulfilled" && Array.isArray(schemaRes.value) && schemaRes.value.length > 0) {
        setModuleDefinitions(schemaRes.value);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRolesAndSchema();
  }, []);

  const openCreateDrawer = () => {
    setEditingRoleId(null);
    setRoleName("");
    setRoleDescription("");
    setSearchQuery("");
    setPermMap({});
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (role: RoleRecord) => {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleDescription(role.description || "");
    setSearchQuery("");

    const mapping: Record<string, boolean> = {};
    if (role.permissions) {
      role.permissions.forEach((p) => {
        if (p.permission === "delete") return; // Delete option is removed
        const normModule = normalizeModuleId(p.module);
        let normFeature = (p.feature || "").toLowerCase().trim();

        // Harmonize legacy aliases cleanly so all options accurately reflect in the matrix
        if (normModule === "settings" && (normFeature === "users" || normFeature === "roles")) {
          mapping[`company:${normFeature}:${p.permission}`] = p.is_allowed;
        } else if (normModule === "profile" && normFeature === "branch") {
          mapping[`company:branch:${p.permission}`] = p.is_allowed;
        } else if ((normModule === "profile" || normModule === "company") && (normFeature === "company" || normFeature === "company_details")) {
          mapping[`company:company_details:${p.permission}`] = p.is_allowed;
        } else if ((normModule === "api_center" || normModule === "api-center" || normModule === "company") && (normFeature === "eway_bill" || normFeature === "eway_bill_api" || normFeature === "ewb")) {
          mapping[`api_center:eway_bill_api:${p.permission}`] = p.is_allowed;
        } else if ((normModule === "api_center" || normModule === "api-center" || normModule === "company") && (normFeature === "fastag_tracking_api" || normFeature === "fastag_tracking" || normFeature === "fastag")) {
          mapping[`api_center:fastag_tracking_api:${p.permission}`] = p.is_allowed;
        } else if ((normModule === "api_center" || normModule === "api-center" || normModule === "company") && (normFeature === "sim_tracking_api" || normFeature === "sim_tracking" || normFeature === "sim")) {
          mapping[`api_center:sim_tracking_api:${p.permission}`] = p.is_allowed;
        } else if (normModule === "transport" && normFeature === "tracking") {
          mapping[`tracking:sim_tracking:${p.permission}`] = p.is_allowed;
        } else if (normModule === "tracking" && normFeature === "tracking") {
          mapping[`tracking:sim_tracking:${p.permission}`] = p.is_allowed;
        } else if (normModule === "tracking" && normFeature === "fastag") {
          mapping[`tracking:fastag_tracking:${p.permission}`] = p.is_allowed;
        } else {
          mapping[`${normModule}:${normFeature}:${p.permission}`] = p.is_allowed;
        }
      });
    }
    setPermMap(mapping);
    setIsDrawerOpen(true);
  };

  const togglePermission = (module: string, feature: string, action: string) => {
    const key = `${module}:${feature}:${action}`;
    setPermMap((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // If setting create/edit/delete/approve to true, automatically enable view
      if (action !== "view" && next[key]) {
        next[`${module}:${feature}:view`] = true;
      }
      // If setting view to false, automatically disable all actions for this feature
      if (action === "view" && !next[key]) {
        ACTIONS.forEach((act) => {
          next[`${module}:${feature}:${act}`] = false;
        });
      }
      return next;
    });
  };

  const setRowAll = (module: string, feature: string, allow: boolean) => {
    setPermMap((prev) => {
      const next = { ...prev };
      ACTIONS.forEach((act) => {
        next[`${module}:${feature}:${act}`] = allow;
      });
      return next;
    });
  };

  const setModuleAll = (module: ModuleDef, allow: boolean) => {
    setPermMap((prev) => {
      const next = { ...prev };
      module.features.forEach((feat) => {
        ACTIONS.forEach((act) => {
          next[`${module.id}:${feat.id}:${act}`] = allow;
        });
      });
      return next;
    });
  };

  const setAllModules = (allow: boolean) => {
    setPermMap((prev) => {
      const next = { ...prev };
      moduleDefinitions.forEach((mod) => {
        mod.features.forEach((feat) => {
          ACTIONS.forEach((act) => {
            next[`${mod.id}:${feat.id}:${act}`] = allow;
          });
        });
      });
      return next;
    });
  };

  const setModuleColumn = (module: ModuleDef, action: string, allow: boolean) => {
    setPermMap((prev) => {
      const next = { ...prev };
      module.features.forEach((feat) => {
        next[`${module.id}:${feat.id}:${action}`] = allow;
        // If enabling create/edit/delete/approve, automatically enable view
        if (action !== "view" && allow) {
          next[`${module.id}:${feat.id}:view`] = true;
        }
        // If disabling view, automatically disable all other actions for this feature
        if (action === "view" && !allow) {
          ACTIONS.forEach((act) => {
            next[`${module.id}:${feat.id}:${act}`] = false;
          });
        }
      });
      return next;
    });
  };

  const setAllModulesColumn = (action: string, allow: boolean) => {
    setPermMap((prev) => {
      const next = { ...prev };
      moduleDefinitions.forEach((mod) => {
        mod.features.forEach((feat) => {
          next[`${mod.id}:${feat.id}:${action}`] = allow;
          if (action !== "view" && allow) {
            next[`${mod.id}:${feat.id}:view`] = true;
          }
          if (action === "view" && !allow) {
            ACTIONS.forEach((act) => {
              next[`${mod.id}:${feat.id}:${act}`] = false;
            });
          }
        });
      });
      return next;
    });
  };

  const toggleGlobalColumn = (action: string) => {
    const isAllGranted =
      moduleDefinitions.length > 0 &&
      moduleDefinitions.every((mod) =>
        mod.features.every((feat) => !!permMap[`${mod.id}:${feat.id}:${action}`])
      );
    setAllModulesColumn(action, !isAllGranted);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      toast.warning("Role name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const permissionsMap = new Map<string, PermissionItem>();

      Object.entries(permMap).forEach(([key, isAllowed]) => {
        if (!isAllowed) return; // Crucial: unchecked options are omitted so they are deleted cleanly

        const [module, feature, permission] = key.split(":");
        if (!module || !feature || !permission || permission === "delete") return;

        // Canonical permission
        permissionsMap.set(`${module}:${feature}:${permission}`, {
          module,
          feature,
          permission,
          is_allowed: true,
        });

        // Dual save aliases so existing backend routes & tests work seamlessly
        if (module === "company" && (feature === "users" || feature === "roles")) {
          permissionsMap.set(`settings:${feature}:${permission}`, {
            module: "settings",
            feature,
            permission,
            is_allowed: true,
          });
        }
        if (module === "company" && feature === "branch") {
          permissionsMap.set(`profile:branch:${permission}`, {
            module: "profile",
            feature: "branch",
            permission,
            is_allowed: true,
          });
        }
        if (module === "company" && feature === "company_details") {
          permissionsMap.set(`profile:company:${permission}`, {
            module: "profile",
            feature: "company",
            permission,
            is_allowed: true,
          });
        }
        if (module === "tracking" && feature === "sim_tracking") {
          permissionsMap.set(`tracking:tracking:${permission}`, {
            module: "tracking",
            feature: "tracking",
            permission,
            is_allowed: true,
          });
          permissionsMap.set(`transport:tracking:${permission}`, {
            module: "transport",
            feature: "tracking",
            permission,
            is_allowed: true,
          });
        }
        if (module === "tracking" && feature === "fastag_tracking") {
          permissionsMap.set(`tracking:fastag:${permission}`, {
            module: "tracking",
            feature: "fastag",
            permission,
            is_allowed: true,
          });
          permissionsMap.set(`transport:fastag_tracking:${permission}`, {
            module: "transport",
            feature: "fastag_tracking",
            permission,
            is_allowed: true,
          });
        }
        if (module === "transport_reports") {
          permissionsMap.set(`transport-reports:${feature}:${permission}`, {
            module: "transport-reports",
            feature,
            permission,
            is_allowed: true,
          });
        }
        if (module === "api_center") {
          permissionsMap.set(`api-center:${feature}:${permission}`, {
            module: "api-center",
            feature,
            permission,
            is_allowed: true,
          });
          if (feature === "eway_bill_api") {
            permissionsMap.set(`api_center:eway_bill:${permission}`, {
              module: "api_center",
              feature: "eway_bill",
              permission,
              is_allowed: true,
            });
          }
        }
      });

      const permissions = Array.from(permissionsMap.values());

      if (editingRoleId) {
        await apiClient(`/api/v1/settings/roles/${editingRoleId}`, {
          method: "PUT",
          body: JSON.stringify({
            name: roleName.trim(),
            description: roleDescription.trim(),
            permissions,
          }),
        });
      } else {
        await apiClient("/api/v1/settings/roles", {
          method: "POST",
          body: JSON.stringify({
            name: roleName.trim(),
            description: roleDescription.trim(),
            permissions,
          }),
        });
      }

      setIsDrawerOpen(false);
      await loadRolesAndSchema();
    } catch (err: any) {
      toast.error(err.message || "Failed to save role.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return moduleDefinitions;
    const q = searchQuery.toLowerCase().trim();
    return moduleDefinitions
      .map((mod) => {
        const modMatches = mod.title.toLowerCase().includes(q);
        const matchedFeatures = mod.features.filter(
          (f) => modMatches || f.label.toLowerCase().includes(q) || f.id.toLowerCase().includes(q)
        );
        if (matchedFeatures.length > 0) {
          return { ...mod, features: matchedFeatures };
        }
        return null;
      })
      .filter(Boolean) as ModuleDef[];
  }, [moduleDefinitions, searchQuery]);

  const activeGrantedCount = useMemo(() => {
    return Object.values(permMap).filter(Boolean).length;
  }, [permMap]);

  const handleDeleteRole = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.is_system) {
      toast.error("System roles cannot be deleted.");
      return;
    }

    setIsDeleting(true);
    try {
      await apiClient(`/api/v1/settings/roles/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await loadRolesAndSchema();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete role.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions Matrix"
        description="Configure custom roles with view, create, edit, delete, and approve permissions."
        breadcrumbs={[
          { label: "Company Settings" },
          { label: "Roles & Permissions" },
        ]}
        actions={
          <Button onClick={openCreateDrawer} className="gap-2">
            <Plus className="w-4 h-4" />
            Create New Role
          </Button>
        }
      />

      {errorMessage && (
        <div className="p-4 rounded-xl bg-danger-light border border-danger/20 text-danger text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-danger hover:opacity-80">×</button>
        </div>
      )}

      {/* Role Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-sm text-text-muted">Loading roles...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {roles.map((role) => {
            const allowedCount = (role.permissions || []).filter((p) => p.is_allowed).length;
            return (
              <div
                key={role.id}
                className="bg-surface border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-primary transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center font-bold">
                        <Shield className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-text-primary text-sm">
                        {role.name}
                      </h3>
                    </div>
                    {role.is_system ? (
                      <Badge variant="neutral" className="text-xs font-mono">
                        <Lock className="w-2.5 h-2.5 mr-1 inline" /> System
                      </Badge>
                    ) : (
                      <Badge variant="primary" className="text-xs">
                        Custom
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-text-secondary mt-3 line-clamp-2">
                    {role.description || "No description provided."}
                  </p>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-text-secondary">
                    <span>Active Permissions:</span>
                    <span className="font-semibold text-text-primary font-mono tabular-nums">
                      {allowedCount} granted
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-border flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDrawer(role)}
                    className="text-xs gap-1 py-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit Permissions
                  </Button>
                  {!role.is_system && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteTarget(role)}
                      className="text-xs text-danger hover:text-danger-dark hover:bg-danger-light border-danger/30 py-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Role Editor Drawer */}
      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingRoleId ? "Edit Role & Permissions" : "Create Custom Role"}
        description="Configure role identity and granular permission matrix across modules."
        width="full"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              onClick={handleSaveRole}
            >
              {editingRoleId ? "Save Changes" : "Create Role"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveRole} className="space-y-6">
          {/* Role Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface p-4 rounded-xl border border-border">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Role Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Master Data Clerk"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-surface border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Description
              </label>
              <input
                type="text"
                placeholder="e.g. Can view and edit consignees and locations"
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-surface border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Permission Matrix Header & Search */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-border">
              <div>
                <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <span>Granular Feature Permissions</span>
                  <Badge variant="primary" className="text-xs">
                    {activeGrantedCount} active
                  </Badge>
                </h4>
                <p className="text-xs text-text-secondary mt-0.5">
                  Configure view, create, edit, and approve permissions per feature or select whole columns with one click.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAllModules(true)}
                  className="text-xs h-8"
                >
                  Grant All Modules
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAllModules(false)}
                  className="text-xs h-8 text-text-muted hover:text-danger"
                >
                  Revoke All
                </Button>
              </div>
            </div>

            {/* Quick Column Bulk Actions Bar */}
            <div className="bg-canvas/80 border border-border rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-text-primary text-xs">Global Column Quick-Select:</span>
                <span className="text-text-muted text-[11px] hidden sm:inline">
                  Click to toggle an entire permission column across all modules:
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {ACTIONS.map((action) => {
                  const isAllGranted =
                    moduleDefinitions.length > 0 &&
                    moduleDefinitions.every((mod) =>
                      mod.features.every((feat) => !!permMap[`${mod.id}:${feat.id}:${action}`])
                    );
                  return (
                    <button
                      key={action}
                      type="button"
                      onClick={() => toggleGlobalColumn(action)}
                      className={cn(
                        "px-2.5 py-1 text-xs rounded-lg font-medium transition-all border select-none",
                        isAllGranted
                          ? "bg-primary text-white border-primary shadow-xs font-semibold"
                          : "bg-surface text-text-primary border-border hover:border-primary/50 hover:bg-canvas"
                      )}
                      title={`Toggle all ${action} permissions across all modules`}
                    >
                      {isAllGranted ? "✓ " : ""}All {action.charAt(0).toUpperCase() + action.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search modules or features (e.g. consignee, tracking, invoice, users)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-sm border rounded-lg bg-surface border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            {filteredModules.length === 0 ? (
              <div className="p-8 text-center bg-surface border border-border rounded-xl text-text-muted text-sm">
                No modules or features match &quot;{searchQuery}&quot;.
              </div>
            ) : (
              filteredModules.map((mod) => (
                <div
                  key={mod.id}
                  className="border border-border rounded-xl overflow-hidden bg-surface shadow-xs"
                >
                  <div className="overflow-x-auto">
                    <div className="min-w-[660px]">
                      {/* Module Header Row - Perfectly Aligned Grid */}
                      <div className="bg-canvas px-4 py-2.5 border-b border-border grid grid-cols-[1fr_88px_88px_88px_88px_140px] items-center gap-2">
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className="font-bold text-xs text-text-primary uppercase tracking-wider truncate">
                            {mod.title}
                          </span>
                          <span className="text-[10px] bg-surface text-text-muted px-1.5 py-0.5 rounded-full border border-border shrink-0">
                            {mod.features.length}
                          </span>
                        </div>

                        {ACTIONS.map((action) => {
                          const allChecked =
                            mod.features.length > 0 &&
                            mod.features.every(
                              (feat) => !!permMap[`${mod.id}:${feat.id}:${action}`]
                            );
                          const someChecked =
                            !allChecked &&
                            mod.features.some(
                              (feat) => !!permMap[`${mod.id}:${feat.id}:${action}`]
                            );

                          return (
                            <label
                              key={action}
                              className="flex items-center gap-1.5 text-xs font-semibold text-text-primary cursor-pointer select-none hover:text-primary transition-colors py-1 px-1 rounded hover:bg-surface border border-transparent hover:border-border"
                              title={`Click to ${allChecked ? "revoke" : "grant"} all ${action.toUpperCase()} in ${mod.title}`}
                            >
                              <IndeterminateCheckbox
                                checked={allChecked}
                                indeterminate={someChecked}
                                onChange={() => setModuleColumn(mod, action, !allChecked)}
                                className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer shrink-0"
                                ariaLabel={`Select all ${action} in ${mod.title}`}
                              />
                              <span className="capitalize">{action}</span>
                            </label>
                          );
                        })}

                        <div className="flex items-center justify-end gap-1.5 text-xs text-right pr-1">
                          <button
                            type="button"
                            onClick={() => setModuleAll(mod, true)}
                            className="text-primary hover:underline font-medium text-[11px]"
                          >
                            Grant All
                          </button>
                          <span className="text-border">|</span>
                          <button
                            type="button"
                            onClick={() => setModuleAll(mod, false)}
                            className="text-text-muted hover:underline text-[11px]"
                          >
                            Revoke All
                          </button>
                        </div>
                      </div>

                      {/* Feature Rows - Exactly Same Grid Track Alignment */}
                      <div className="divide-y divide-border">
                        {mod.features.map((feat) => (
                          <div
                            key={feat.id}
                            className="px-4 py-3 grid grid-cols-[1fr_88px_88px_88px_88px_140px] items-center gap-2 hover:bg-canvas/50 transition-colors"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="text-xs font-semibold text-text-primary block truncate">
                                {feat.label}
                              </span>
                              <span className="block text-[11px] font-mono text-text-muted truncate">
                                {mod.id}:{feat.id}
                              </span>
                            </div>

                            {ACTIONS.map((action) => {
                              const checked = !!permMap[`${mod.id}:${feat.id}:${action}`];
                              return (
                                <label
                                  key={action}
                                  className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer select-none hover:text-text-primary py-1 px-1 rounded hover:bg-canvas transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                      togglePermission(mod.id, feat.id, action)
                                    }
                                    className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer shrink-0"
                                  />
                                  <span className="capitalize">{action}</span>
                                </label>
                              );
                            })}

                            <div className="text-right pr-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const allChecked = ACTIONS.every(
                                    (act) => permMap[`${mod.id}:${feat.id}:${act}`]
                                  );
                                  setRowAll(mod.id, feat.id, !allChecked);
                                }}
                                className="text-[11px] text-text-muted hover:text-primary transition-colors"
                              >
                                Toggle Row
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </form>
      </EntityDrawer>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteRole}
        title={`Delete Role "${deleteTarget?.name || ""}"`}
        description="Are you sure you want to delete this role? Any employees assigned to this role will lose their granted permissions."
        confirmText="Delete Role"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
