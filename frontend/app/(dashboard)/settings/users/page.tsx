"use client";

import React, { useState, useEffect } from "react";
import { Plus, Shield, UserPlus, Edit2, Building2, MapPin, Check, Star, AlertCircle } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { ColumnDef, RowAction } from "@/types/table";
import { apiClient } from "@/lib/api-client";
import { getStoredAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface AssignedOfficeInfo {
  office_id: number;
  office_code: string;
  office_name: string;
  city?: string;
  is_default: boolean;
}

interface UserRecord {
  id: number;
  email: string;
  full_name: string;
  role: string;
  role_id?: number | null;
  role_name?: string | null;
  is_active: boolean;
  assigned_offices?: AssignedOfficeInfo[];
  created_at: string;
}

interface RoleOption {
  id: number;
  name: string;
  description?: string;
}

interface BranchOption {
  id: number;
  code: string;
  name: string;
  city?: string;
  state?: string;
  is_head_office?: boolean;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form / Drawer State
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [formFullName, setFormFullName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRoleSelection, setFormRoleSelection] = useState("admin");
  const [selectedOfficeIds, setSelectedOfficeIds] = useState<number[]>([]);
  const [defaultOfficeId, setDefaultOfficeId] = useState<number | null>(null);

  const currentAuth = getStoredAuth();

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [usersData, rolesData, branchesData] = await Promise.all([
        apiClient<UserRecord[]>("/api/v1/settings/users"),
        apiClient<RoleOption[]>("/api/v1/settings/roles"),
        apiClient<BranchOption[]>("/api/v1/profile/branches"),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      setBranches(branchesData);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load users, roles, or issuing offices.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateDrawer = () => {
    setEditingUser(null);
    setFormFullName("");
    setFormEmail("");
    setFormPassword("");
    setFormRoleSelection(roles.length > 0 ? String(roles[0].id) : "admin");
    const hq = branches.find((b) => b.is_head_office) || branches[0];
    if (hq) {
      setSelectedOfficeIds([hq.id]);
      setDefaultOfficeId(hq.id);
    } else {
      setSelectedOfficeIds([]);
      setDefaultOfficeId(null);
    }
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (user: UserRecord) => {
    setEditingUser(user);
    setFormFullName(user.full_name);
    setFormEmail(user.email);
    setFormPassword(""); // Leave blank if not updating
    setFormRoleSelection(user.role === "COMPANY_ADMIN" ? "admin" : (user.role_id ? String(user.role_id) : "admin"));
    
    const assigned = user.assigned_offices || [];
    const assignedIds = assigned.map((a) => a.office_id);
    setSelectedOfficeIds(assignedIds);
    const def = assigned.find((a) => a.is_default);
    setDefaultOfficeId(def ? def.office_id : (assignedIds[0] || null));
    setIsDrawerOpen(true);
  };

  const toggleOfficeSelection = (officeId: number) => {
    setSelectedOfficeIds((prev) => {
      const exists = prev.includes(officeId);
      let updated: number[];
      if (exists) {
        updated = prev.filter((id) => id !== officeId);
        if (defaultOfficeId === officeId) {
          setDefaultOfficeId(updated.length > 0 ? updated[0] : null);
        }
      } else {
        updated = [...prev, officeId];
        if (defaultOfficeId === null) {
          setDefaultOfficeId(officeId);
        }
      }
      return updated;
    });
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName.trim()) {
      alert("Please enter employee's full name.");
      return;
    }
    if (!editingUser && !formEmail.trim()) {
      alert("Please enter a valid email address.");
      return;
    }
    if (!editingUser && !formPassword.trim()) {
      alert("Please provide an initial password for the employee.");
      return;
    }

    setIsSubmitting(true);
    try {
      const isCompanyAdmin = formRoleSelection === "admin";
      const payload: any = {
        full_name: formFullName.trim(),
        role: isCompanyAdmin ? "COMPANY_ADMIN" : "EMPLOYEE",
        role_id: isCompanyAdmin ? null : parseInt(formRoleSelection, 10),
        assigned_office_ids: selectedOfficeIds,
        default_office_id: defaultOfficeId,
      };

      if (!editingUser) {
        payload.email = formEmail.trim();
        payload.password = formPassword.trim();
        await apiClient("/api/v1/settings/users", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        if (formPassword.trim()) {
          payload.password = formPassword.trim();
        }
        await apiClient(`/api/v1/settings/users/${editingUser.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }

      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to save user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<UserRecord>[] = [
    {
      key: "full_name",
      header: "Employee / User",
      sortable: true,
      cell: (row) => {
        const isDemoAdmin = row.email.toLowerCase() === "admin@demo.com";
        const isSelf = currentAuth?.user?.id === row.id;

        return (
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-text-primary">
                {row.full_name}
              </span>
              {isDemoAdmin && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Demo Admin
                </span>
              )}
              {isSelf && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  You
                </span>
              )}
            </div>
            <div className="text-xs text-text-muted font-mono">
              {row.email}
            </div>
          </div>
        );
      },
    },
    {
      key: "role",
      header: "Assigned Role",
      sortable: true,
      cell: (row) => {
        if (row.role === "COMPANY_ADMIN") {
          return (
            <Badge variant="primary" className="font-semibold text-xs">
              <Shield className="w-3 h-3 mr-1 inline" /> Company Admin
            </Badge>
          );
        }
        return (
          <Badge variant="neutral" className="font-medium text-xs">
            {row.role_name || "Employee"}
          </Badge>
        );
      },
    },
    {
      key: "offices",
      header: "Authorized Issuing Offices",
      cell: (row) => {
        if (row.role === "COMPANY_ADMIN") {
          return (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                <Building2 className="w-3 h-3 text-indigo-600 inline" /> Universal (All Offices)
              </span>
            </div>
          );
        }

        const offices = row.assigned_offices || [];
        if (offices.length === 0) {
          return <span className="text-xs text-text-muted italic">No offices assigned</span>;
        }

        return (
          <div className="flex flex-wrap gap-1.5 items-center">
            {offices.map((off) => (
              <span
                key={off.office_id}
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border",
                  off.is_default
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold"
                    : "bg-slate-50 text-slate-700 border-slate-200 font-medium"
                )}
                title={`${off.office_name}${off.is_default ? " (Primary Default Office)" : ""}`}
              >
                <MapPin className="w-2.5 h-2.5 shrink-0" />
                <span>{off.office_code}</span>
                {off.is_default && (
                  <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500 inline" />
                )}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => (
        <Badge variant={row.is_active ? "success" : "neutral"} className="text-xs">
          {row.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "created_at",
      header: "Created On",
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-text-muted">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const actions: RowAction<UserRecord>[] = [
    {
      label: "Edit User & Offices",
      icon: <Edit2 className="w-3.5 h-3.5 text-indigo-600" />,
      onClick: (row) => openEditDrawer(row),
    },
    {
      label: "Toggle Status",
      hidden: (row) => row.email.toLowerCase() === "admin@demo.com" || row.id === currentAuth?.user?.id,
      onClick: async (row) => {
        if (row.email.toLowerCase() === "admin@demo.com") {
          alert("The demo administrator account cannot be deactivated.");
          return;
        }
        if (currentAuth?.user?.id && row.id === currentAuth.user.id) {
          alert("You cannot deactivate your own account.");
          return;
        }
        try {
          await apiClient(`/api/v1/settings/users/${row.id}`, {
            method: "PUT",
            body: JSON.stringify({ is_active: !row.is_active }),
          });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to update user status.");
        }
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User & Staff Management"
        description="Manage company employees, their role permissions, and assigned issuing offices."
        breadcrumbs={[
          { label: "Settings" },
          { label: "User Management" },
        ]}
        primaryAction={{
          label: "Add Employee",
          icon: <UserPlus className="w-4 h-4" />,
          onClick: openCreateDrawer,
        }}
      />

      {errorMessage && (
        <div className="p-4 rounded-xl bg-danger-light border border-danger/20 text-danger text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-danger hover:opacity-80">×</button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        actions={actions}
        searchPlaceholder="Search by name, email, or role..."
        searchColumn="full_name"
        emptyMessage="No employees registered"
        emptySubtext="Add an employee to configure staff access and office assignments."
        emptyAction={{ label: "Add Employee", onClick: openCreateDrawer }}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingUser ? `Edit ${editingUser.full_name}` : "Add New Employee"}
        description="Configure employee identity, role permissions, and issuing office assignments."
        size="md"
      >
        <form onSubmit={handleSaveUser} className="space-y-6 pb-6">
          {/* Identity & Role Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5">
              1. Identity & Credentials
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formFullName}
                onChange={(e) => setFormFullName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                disabled={Boolean(editingUser)}
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="ramesh@company.com"
                className={cn(
                  "w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500",
                  editingUser && "bg-slate-50 text-slate-500 cursor-not-allowed"
                )}
              />
              {editingUser && (
                <span className="text-[11px] text-slate-400 mt-1 block">Email address cannot be changed after creation.</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {editingUser ? "Change Password (Leave blank to keep current)" : "Initial Password"} {!editingUser && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="password"
                required={!editingUser}
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder={editingUser ? "•••••••• (optional)" : "At least 8 characters"}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Role & Permissions <span className="text-rose-500">*</span>
              </label>
              <select
                value={formRoleSelection}
                onChange={(e) => setFormRoleSelection(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
              >
                <option value="admin">Company Admin (Full Universal Access)</option>
                {roles.map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    {r.name} {r.description ? `— ${r.description}` : ""}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Determines which modules, buttons, and permissions the user has.
              </span>
            </div>
          </div>

          {/* Issuing Office Assignment Section */}
          <div className="space-y-4 pt-2">
            <div className="border-b border-slate-100 pb-1.5 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                2. Issuing Office Scoping
              </h4>
              <span className="text-[11px] text-slate-400">
                {selectedOfficeIds.length} of {branches.length} Selected
              </span>
            </div>

            {formRoleSelection === "admin" && (
              <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-200/70 text-indigo-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Company Admin Access:</span> Company Administrators have universal access across all issuing offices. You can still select their preferred default office below for transaction numbering.
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                Check the issuing offices this user is authorized to manage and book vouchers for:
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {branches.map((b) => {
                  const isChecked = selectedOfficeIds.includes(b.id);
                  const isDefault = defaultOfficeId === b.id;

                  return (
                    <div
                      key={b.id}
                      className={cn(
                        "p-3 rounded-xl border transition-all flex items-center justify-between gap-3",
                        isChecked
                          ? "bg-slate-50/80 border-indigo-200 ring-1 ring-indigo-500/10"
                          : "bg-white border-slate-200 hover:border-slate-300 opacity-75"
                      )}
                    >
                      <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleOfficeSelection(b.id)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{b.code}</span>
                            <span className="text-xs text-slate-700 truncate">{b.name}</span>
                            {b.is_head_office && (
                              <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1 py-0.2 rounded">
                                HQ
                              </span>
                            )}
                          </div>
                          {(b.city || b.state) && (
                            <span className="text-[11px] text-slate-400">
                              {[b.city, b.state].filter(Boolean).join(", ")}
                            </span>
                          )}
                        </div>
                      </label>

                      {isChecked && (
                        <button
                          type="button"
                          onClick={() => setDefaultOfficeId(b.id)}
                          className={cn(
                            "flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border font-medium transition-all shrink-0 cursor-pointer",
                            isDefault
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold"
                              : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                          )}
                          title="Set as user's primary/default office"
                        >
                          <Star className={cn("w-3 h-3", isDefault ? "text-amber-500 fill-amber-500" : "text-slate-400")} />
                          {isDefault ? "Default Office" : "Make Default"}
                        </button>
                      )}
                    </div>
                  );
                })}

                {branches.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                    No branches configured. Please add issuing offices under Company &gt; Branches.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDrawerOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : editingUser ? "Update Employee" : "Create Employee"}
            </Button>
          </div>
        </form>
      </EntityDrawer>
    </div>
  );
}
