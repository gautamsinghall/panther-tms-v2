"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, Shield, ShieldCheck, Trash2, Edit2, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";

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

const MODULE_DEFINITIONS: ModuleDef[] = [
  {
    id: "general",
    title: "General Module (Masters)",
    features: [
      { id: "consignee", label: "Consignees" },
      { id: "consigner", label: "Consigners" },
      { id: "location", label: "Locations (Country/State/City/Hub)" },
      { id: "industry", label: "Industries" },
      { id: "designation", label: "Designations" },
      { id: "group_company", label: "Group Companies" },
      { id: "unit", label: "Units of Measurement" },
      { id: "method_of_packing", label: "Methods of Packing" },
    ],
  },
  {
    id: "settings",
    title: "Settings & System Admin",
    features: [
      { id: "users", label: "Employee & User Management" },
      { id: "roles", label: "Roles & Permissions Management" },
    ],
  },
  {
    id: "transport",
    title: "Transport (Operations)",
    features: [
      { id: "jobs", label: "Job Orders" },
      { id: "lr_booking", label: "GR / LR Booking" },
      { id: "hire_challan", label: "Hire Challans" },
      { id: "drivers", label: "Driver Management" },
      { id: "company_vehicles", label: "Company Fleet" },
      { id: "market_vehicles", label: "Market Vehicles" },
      { id: "vehicle_owners", label: "Vehicle Owners" },
      { id: "arrival_reports", label: "Arrival Reports" },
      { id: "pod_records", label: "POD Tracking" },
    ],
  },
  {
    id: "fleet",
    title: "Fleet Management",
    features: [
      { id: "trip_expense", label: "Trip Expenses" },
      { id: "trip_advance", label: "Trip Advances" },
      { id: "vehicle_health", label: "Vehicle Health & Maintenance" },
      { id: "documents", label: "Vehicle Compliance Documents" },
      { id: "truck_pnl", label: "Truck-Wise P&L" },
    ],
  },
  {
    id: "accounts",
    title: "Accounts & Billing",
    features: [
      { id: "transport_invoice", label: "Transport Invoices" },
      { id: "general_invoice", label: "General Invoices" },
      { id: "receipt_voucher", label: "Receipt Vouchers" },
      { id: "payment_voucher", label: "Payment Vouchers" },
    ],
  },
];

const ACTIONS = ["view", "create", "edit", "delete", "approve"] as const;

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected permission map: key = `${module}:${feature}:${permission}` -> boolean
  const [permMap, setPermMap] = useState<Record<string, boolean>>({});

  const loadRoles = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<RoleRecord[]>("/api/v1/settings/roles");
      setRoles(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load roles.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const openCreateModal = () => {
    setEditingRoleId(null);
    setRoleName("");
    setRoleDescription("");
    setPermMap({});
    setIsModalOpen(true);
  };

  const openEditModal = (role: RoleRecord) => {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleDescription(role.description || "");

    const mapping: Record<string, boolean> = {};
    if (role.permissions) {
      role.permissions.forEach((p) => {
        if (p.is_allowed) {
          mapping[`${p.module}:${p.feature}:${p.permission}`] = true;
        }
      });
    }
    setPermMap(mapping);
    setIsModalOpen(true);
  };

  const togglePermission = (module: string, feature: string, action: string) => {
    const key = `${module}:${feature}:${action}`;
    setPermMap((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // If setting create/edit/delete/approve to true, automatically enable view
      if (action !== "view" && next[key]) {
        next[`${module}:${feature}:view`] = true;
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

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      alert("Role name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const permissions: PermissionItem[] = [];
      Object.entries(permMap).forEach(([key, isAllowed]) => {
        if (isAllowed) {
          const [module, feature, permission] = key.split(":");
          permissions.push({
            module,
            feature,
            permission,
            is_allowed: true,
          });
        }
      });

      if (editingRoleId) {
        await apiClient(`/api/v1/settings/roles/${editingRoleId}`, {
          method: "PUT",
          body: JSON.stringify({
            name: roleName,
            description: roleDescription,
            permissions,
          }),
        });
      } else {
        await apiClient("/api/v1/settings/roles", {
          method: "POST",
          body: JSON.stringify({
            name: roleName,
            description: roleDescription,
            permissions,
          }),
        });
      }

      setIsModalOpen(false);
      loadRoles();
    } catch (err: any) {
      alert(err.message || "Failed to save role.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async (role: RoleRecord) => {
    if (role.is_system) {
      alert("System roles cannot be deleted.");
      return;
    }
    if (!confirm(`Are you sure you want to delete role "${role.name}"?`)) return;

    try {
      await apiClient(`/api/v1/settings/roles/${role.id}`, { method: "DELETE" });
      loadRoles();
    } catch (err: any) {
      alert(err.message || "Failed to delete role.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Roles & Permissions Matrix
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure custom roles with view, create, edit, delete, and approve permissions.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={openCreateModal}
          className="gap-1.5 text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          Create New Role
        </Button>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
          {errorMessage}
        </div>
      )}

      {/* Role Cards Grid */}
      {isLoading ? (
        <div className="p-8 text-center text-sm text-slate-400">Loading roles...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {roles.map((role) => {
            const allowedCount = (role.permissions || []).filter((p) => p.is_allowed).length;
            return (
              <div
                key={role.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                        <Shield className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">
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

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 line-clamp-2">
                    {role.description || "No description provided."}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                    <span>Active Permissions:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                      {allowedCount} granted
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(role)}
                    className="text-xs gap-1 py-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit Permissions
                  </Button>
                  {!role.is_system && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteRole(role)}
                      className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 py-1"
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

      {/* Role Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingRoleId ? "Edit Role & Permissions" : "Create Custom Role"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveRole} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Role Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Role Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Master Data Clerk"
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Can view and edit consignees and locations"
                      value={roleDescription}
                      onChange={(e) => setRoleDescription(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Permission Matrix */}
                <div className="space-y-6">
                  <div className="border-b pb-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Granular Feature Permissions
                    </h4>
                    <p className="text-xs text-slate-500">
                      Configure view, create, edit, delete, and approve permissions per feature.
                    </p>
                  </div>

                  {MODULE_DEFINITIONS.map((mod) => (
                    <div
                      key={mod.id}
                      className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
                    >
                      <div className="bg-slate-100/70 dark:bg-slate-800/60 px-4 py-2.5 flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                          {mod.title}
                        </span>
                        <div className="flex items-center gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setModuleAll(mod, true)}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                          >
                            Grant All
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => setModuleAll(mod, false)}
                            className="text-slate-500 hover:underline"
                          >
                            Revoke All
                          </button>
                        </div>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {mod.features.map((feat) => (
                          <div
                            key={feat.id}
                            className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                          >
                            <div className="sm:w-1/3">
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                {feat.label}
                              </span>
                              <span className="block text-[11px] font-mono text-slate-400">
                                {mod.id}:{feat.id}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                              {ACTIONS.map((action) => {
                                const checked =
                                  !!permMap[`${mod.id}:${feat.id}:${action}`];
                                return (
                                  <label
                                    key={action}
                                    className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() =>
                                        togglePermission(mod.id, feat.id, action)
                                      }
                                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                    />
                                    <span className="capitalize">{action}</span>
                                  </label>
                                );
                              })}

                              <button
                                type="button"
                                onClick={() => {
                                  const allChecked = ACTIONS.every(
                                    (act) => permMap[`${mod.id}:${feat.id}:${act}`]
                                  );
                                  setRowAll(mod.id, feat.id, !allChecked);
                                }}
                                className="text-[11px] text-slate-400 hover:text-indigo-600 ml-2"
                              >
                                Toggle Row
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmitting}
                >
                  {editingRoleId ? "Save Changes" : "Create Role"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
