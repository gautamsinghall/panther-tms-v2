"use client";

import React, { useState, useEffect } from "react";
import { Plus, Shield, ShieldCheck, Trash2, Edit2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
      { id: "load_type", label: "Load Types" },
      { id: "billing_client", label: "Billing Clients" },
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
      { id: "truck_hiring_note", label: "Truck Hiring Notes" },
      { id: "eway_bill", label: "Update E-Way" },
      { id: "tracking", label: "Fleet Telemetry & Tracking" },
    ],
  },
  {
    id: "tracking",
    title: "Vehicle Tracking & Telemetry",
    features: [
      { id: "fastag_tracking", label: "FASTag Toll Telemetry" },
      { id: "sim_tracking", label: "SIM / Cellular Consent Tracking" },
      { id: "tracking", label: "Live Vehicle Route & History" },
    ],
  },
  {
    id: "transport_reports",
    title: "Transport Reports",
    features: [
      { id: "lr_register", label: "LR Booking Register" },
      { id: "invoice_register", label: "Invoice Register" },
      { id: "lr_client_wise", label: "LR Client-Wise" },
      { id: "hc_register", label: "Hire Challan Register" },
      { id: "pending_hc", label: "Pending HC Report" },
      { id: "unbilled", label: "Unbilled Reports" },
      { id: "arrival_register", label: "Arrival Report Register" },
      { id: "unused_series", label: "Unused GR/LR Series" },
    ],
  },
  {
    id: "einvoicing",
    title: "E-Invoicing",
    features: [
      { id: "generate_irn", label: "Generate IRN" },
      { id: "irn_list", label: "IRN Generated List" },
      { id: "cancel_irn", label: "Cancel IRN" },
      { id: "taxpayer", label: "Taxpayer Details" },
    ],
  },
  {
    id: "accounts",
    title: "Accounts & Billing",
    features: [
      { id: "transport_invoice", label: "Transport Invoices" },
      { id: "general_invoice", label: "General Invoices" },
      { id: "proforma_invoice", label: "Proforma Invoices" },
      { id: "purchases", label: "Purchase Register" },
      { id: "receipt_voucher", label: "Receipt Vouchers" },
      { id: "payment_voucher", label: "Payment Vouchers" },
      { id: "contra_voucher", label: "Contra Vouchers" },
      { id: "credit_debit_notes", label: "Credit / Debit Notes" },
    ],
  },
  {
    id: "misc",
    title: "Misc (Masters)",
    features: [
      { id: "primary_group", label: "Primary Groups" },
      { id: "group_in_primary", label: "Groups in Primary" },
      { id: "subgroup", label: "Subgroups in Group" },
      { id: "employee_master", label: "Employee Masters" },
      { id: "charge_head", label: "Charge Heads" },
      { id: "tax_category", label: "Tax Categories" },
    ],
  },
  {
    id: "reports",
    title: "Financial Reports",
    features: [
      { id: "daybook", label: "Daybook" },
      { id: "ledger", label: "Ledgers" },
      { id: "trial_balance", label: "Trial Balance" },
      { id: "balance_sheet", label: "Balance Sheet" },
      { id: "profit_loss", label: "Profit & Loss" },
      { id: "sales_register", label: "Sales Register" },
      { id: "purchase_register", label: "Purchase Register" },
      { id: "bank_reconciliation", label: "Bank Reconciliation" },
      { id: "special_report", label: "Special Report" },
    ],
  },
  {
    id: "statements",
    title: "Statements",
    features: [
      { id: "gst_output", label: "GST Output" },
      { id: "gst_input", label: "GST Input" },
      { id: "os_debtor", label: "O/S Debtors" },
      { id: "os_creditor", label: "O/S Creditors" },
      { id: "tds_payable", label: "TDS Payable" },
      { id: "tds_return", label: "TDS Return" },
      { id: "opening_balance", label: "Opening Balance Details" },
    ],
  },
  {
    id: "fleet",
    title: "Fleet Management",
    features: [
      { id: "trip_expense", label: "Trip Expenses" },
      { id: "trip_advance", label: "Trip Advances" },
      { id: "expense_register", label: "Trip Expense Register" },
      { id: "truck_pnl", label: "Truck-Wise P&L" },
      { id: "vehicle_health", label: "Vehicle Health & Maintenance" },
      { id: "documents", label: "Vehicle Compliance Documents" },
      { id: "tyre", label: "Tyre Management" },
      { id: "service", label: "Repair & Service" },
    ],
  },
  {
    id: "company",
    title: "Company Settings",
    features: [
      { id: "company_details", label: "Company Details" },
      { id: "branch", label: "Issuing Offices / Branches" },
      { id: "users", label: "Employee & User Management" },
      { id: "roles", label: "Roles & Permissions Management" },
      { id: "api_center", label: "API Center (E-Way, FASTag, Maps Gateway)" },
    ],
  },
  {
    id: "settings",
    title: "Settings & System Admin",
    features: [
      { id: "series_master", label: "Series Master" },
      { id: "admin_setting", label: "Admin Setting" },
      { id: "activity", label: "User Activity Log" },
    ],
  },
];

const ACTIONS = ["view", "create", "edit", "delete", "approve"] as const;

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<RoleRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const openCreateDrawer = () => {
    setEditingRoleId(null);
    setRoleName("");
    setRoleDescription("");
    setPermMap({});
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (role: RoleRecord) => {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleDescription(role.description || "");

    const mapping: Record<string, boolean> = {};
    if (role.permissions) {
      role.permissions.forEach((p) => {
        if (p.is_allowed) {
          mapping[`${p.module}:${p.feature}:${p.permission}`] = true;
          // Synchronize between company and settings for users & roles so either one displays checked
          if (p.module === "settings" && (p.feature === "users" || p.feature === "roles")) {
            mapping[`company:${p.feature}:${p.permission}`] = true;
          }
          if (p.module === "company" && (p.feature === "users" || p.feature === "roles")) {
            mapping[`settings:${p.feature}:${p.permission}`] = true;
          }
          if (p.module === "transport" && p.feature === "tracking") {
            mapping[`tracking:fastag_tracking:${p.permission}`] = true;
            mapping[`tracking:sim_tracking:${p.permission}`] = true;
            mapping[`tracking:tracking:${p.permission}`] = true;
          }
          if (p.module === "tracking") {
            mapping[`transport:tracking:${p.permission}`] = true;
          }
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
          // If permission is under company for users/roles, also add settings entry for backward compatibility
          if (module === "company" && (feature === "users" || feature === "roles")) {
            permissions.push({
              module: "settings",
              feature,
              permission,
              is_allowed: true,
            });
          }
          // If permission is under tracking, also add transport tracking for backward compatibility
          if (module === "tracking") {
            permissions.push({
              module: "transport",
              feature: "tracking",
              permission,
              is_allowed: true,
            });
          }
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

      setIsDrawerOpen(false);
      loadRoles();
    } catch (err: any) {
      alert(err.message || "Failed to save role.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.is_system) {
      alert("System roles cannot be deleted.");
      return;
    }

    setIsDeleting(true);
    try {
      await apiClient(`/api/v1/settings/roles/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      loadRoles();
    } catch (err: any) {
      alert(err.message || "Failed to delete role.");
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

          {/* Permission Matrix */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-text-primary">
                Granular Feature Permissions
              </h4>
              <p className="text-xs text-text-secondary">
                Configure view, create, edit, delete, and approve permissions per feature.
              </p>
            </div>

            {MODULE_DEFINITIONS.map((mod) => (
              <div
                key={mod.id}
                className="border border-border rounded-xl overflow-hidden bg-surface"
              >
                <div className="bg-canvas px-4 py-2.5 flex items-center justify-between border-b border-border">
                  <span className="font-bold text-xs text-text-primary uppercase tracking-wider">
                    {mod.title}
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setModuleAll(mod, true)}
                      className="text-primary hover:underline font-medium"
                    >
                      Grant All
                    </button>
                    <span className="text-border">|</span>
                    <button
                      type="button"
                      onClick={() => setModuleAll(mod, false)}
                      className="text-text-muted hover:underline"
                    >
                      Revoke All
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-border">
                  {mod.features.map((feat) => (
                    <div
                      key={feat.id}
                      className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-canvas/50 transition-colors"
                    >
                      <div className="sm:w-1/3">
                        <span className="text-xs font-semibold text-text-primary">
                          {feat.label}
                        </span>
                        <span className="block text-[11px] font-mono text-text-muted">
                          {mod.id}:{feat.id}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                        {ACTIONS.map((action) => {
                          const checked = !!permMap[`${mod.id}:${feat.id}:${action}`];
                          return (
                            <label
                              key={action}
                              className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer select-none"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  togglePermission(mod.id, feat.id, action)
                                }
                                className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
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
                          className="text-[11px] text-text-muted hover:text-primary ml-2"
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
