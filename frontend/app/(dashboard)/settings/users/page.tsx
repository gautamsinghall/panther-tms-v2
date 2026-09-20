"use client";

import React, { useState, useEffect } from "react";
import { Plus, Shield, UserPlus, Trash2 } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EntityDrawer } from "@/components/ui/entity-drawer";
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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
          <div className="font-semibold text-text-primary">
            {row.full_name}
          </div>
          <div className="text-xs text-text-muted font-mono">
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
          <Badge variant="neutral" className="font-medium text-xs">
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
        <span className="text-xs text-text-muted">
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
      title: "Employee Credentials",
      description: "Basic identity and authentication credentials",
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

      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage company employees, operators, and their access privileges."
        breadcrumbs={[
          { label: "Settings" },
          { label: "User Management" },
        ]}
        actions={
          <Button
            onClick={() => setIsDrawerOpen(true)}
            className="gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add Employee
          </Button>
        }
      />

      {errorMessage && (
        <div className="p-4 rounded-xl bg-danger-light border border-danger/20 text-danger text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-danger hover:opacity-80">×</button>
        </div>
      )}

      <div className="bg-surface rounded-xl border border-border shadow-xs p-4">
        <DataTable
          columns={columns}
          data={users}
          isLoading={isLoading}
          actions={actions}
          searchPlaceholder="Search by name, email, or role..."
          searchColumn="full_name"
        />
      </div>

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Add New Employee"
        description="Create user profile and configure role-based access permissions."
        size="md"
      >
        <Form
          sections={formSections}
          onSubmit={handleCreateUser}
          submitLabel="Create Employee"
          isSubmitting={isSubmitting}
        />
      </EntityDrawer>
    </div>
  );
}
