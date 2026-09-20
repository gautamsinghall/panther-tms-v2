"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, UserPlus, Shield, UserCheck, UserX, Trash2 } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface UserRecord {
  id: number;
  email: string;
  full_name: string;
  role: string;
  role_id?: number | null;
  role_name?: string | null;
  is_active: boolean;
  created_at: string;
}

interface RoleOption {
  id: number;
  name: string;
  description?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [usersData, rolesData] = await Promise.all([
        apiClient<UserRecord[]>("/api/v1/settings/users"),
        apiClient<RoleOption[]>("/api/v1/settings/roles"),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load users or roles.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<UserRecord>[] = [
    {
      key: "full_name",
      header: "Employee / User",
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">
            {row.full_name}
          </div>
          <div className="text-xs text-slate-500 font-mono">
            {row.email}
          </div>
        </div>
      ),
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
          <Badge variant="secondary" className="font-medium text-xs">
            {row.role_name || "Employee (Default)"}
          </Badge>
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
        <span className="text-xs text-slate-500">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const actions: RowAction<UserRecord>[] = [
    {
      label: "Toggle Status",
      onClick: async (row) => {
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

  const roleSelectOptions = [
    { label: "Company Admin (Full System Access)", value: "admin" },
    ...roles.map((r) => ({
      label: `${r.name}${r.description ? ` (${r.description})` : ""}`,
      value: String(r.id),
    })),
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "user_info",
      title: "Employee Credentials",
      description: "Basic identity and authentication credentials",
      columns: 2,
      fields: [
        {
          name: "full_name",
          label: "Full Name",
          placeholder: "e.g. Ramesh Kumar",
          required: true,
        },
        {
          name: "email",
          label: "Email Address",
          type: "email",
          placeholder: "ramesh@company.com",
          required: true,
        },
        {
          name: "password",
          label: "Temporary Password",
          type: "password",
          placeholder: "At least 8 characters",
          required: true,
        },
        {
          name: "role_selection",
          label: "Role & Permissions",
          type: "select",
          required: true,
          options: roleSelectOptions,
          helperText: "Determines which modules and actions this employee can access.",
        },
      ],
    },
  ];

  const handleCreateUser = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const isCompanyAdmin = values.role_selection === "admin";
      const payload = {
        email: values.email,
        full_name: values.full_name,
        password: values.password,
        role: isCompanyAdmin ? "COMPANY_ADMIN" : "EMPLOYEE",
        role_id: isCompanyAdmin ? null : parseInt(values.role_selection, 10),
      };

      await apiClient("/api/v1/settings/users", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            User Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage company employees, operators, and their access privileges.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="gap-1.5 text-xs font-semibold"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Add Employee
        </Button>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
          {errorMessage}
        </div>
      )}

      {/* User Directory Table */}
      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        actions={actions}
        searchPlaceholder="Search by name, email, or role..."
      />

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Add New Employee
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <Form
              sections={formSections}
              onSubmit={handleCreateUser}
              onCancel={() => setIsModalOpen(false)}
              submitLabel="Create Employee"
              isLoading={isSubmitting}
            />
          </div>
        </div>
      )}
    </div>
  );
}
