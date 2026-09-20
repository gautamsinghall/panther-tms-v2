"use client";

import React, { useState, useEffect } from "react";
import { Plus, UserCheck, Trash2 } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface EmployeeRecord {
  id: number;
  name: string;
  employee_code: string;
  department?: string;
  phone?: string;
  email?: string;
  pan?: string;
  bank_name?: string;
  bank_account_number?: string;
  ifsc_code?: string;
  salary: number;
  is_active: boolean;
}

export default function EmployeeMasterPage() {
  const [data, setData] = useState<EmployeeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<EmployeeRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<EmployeeRecord[]>("/api/v1/misc/employees");
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load employees.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiClient(`/api/v1/misc/employees/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete employee");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: ColumnDef<EmployeeRecord>[] = [
    {
      key: "employee_code",
      header: "Emp Code",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface-secondary text-text-primary border border-border">
          {row.employee_code}
        </span>
      ),
    },
    {
      key: "name",
      header: "Employee Name",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-semibold text-text-primary block">
            {row.name}
          </span>
          <span className="text-xs text-text-muted mt-0.5 block">
            {row.department || "General"}
          </span>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Phone & Email",
      cell: (row) => (
        <div className="text-xs text-text-secondary">
          <div>{row.phone || "—"}</div>
          <div className="text-text-muted">{row.email || ""}</div>
        </div>
      ),
    },
    {
      key: "bank",
      header: "Bank & PAN",
      cell: (row) => (
        <div className="text-xs text-text-secondary">
          <div>{row.bank_name ? `${row.bank_name} (${row.ifsc_code || ""})` : "—"}</div>
          <div className="font-mono text-text-muted">{row.pan ? `PAN: ${row.pan}` : ""}</div>
        </div>
      ),
    },
    {
      key: "salary",
      header: "Salary (₹)",
      align: "right",
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-text-primary tabular-nums">
          ₹{Number(row.salary).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      cell: (row) => (
        <StatusBadge
          status={row.is_active ? "ACTIVE" : "INACTIVE"}
          variant={row.is_active ? "success" : "neutral"}
        />
      ),
    },
  ];

  const actions: RowAction<EmployeeRecord>[] = [
    {
      label: "Delete",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: "danger",
      onClick: (row) => setDeleteTarget(row),
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      title: "Personal Information",
      description: "Basic identity and contact details.",
      fields: [
        {
          name: "name",
          label: "Full Name",
          type: "text",
          required: true,
          placeholder: "e.g. Anand Kumar",
        },
        {
          name: "employee_code",
          label: "Employee Code",
          type: "text",
          required: true,
          placeholder: "e.g. EMP-0012",
        },
        {
          name: "department",
          label: "Department",
          type: "text",
          placeholder: "e.g. Operations, Accounts, Dispatch",
        },
        {
          name: "phone",
          label: "Phone Number",
          type: "text",
          placeholder: "10-digit mobile",
        },
        {
          name: "email",
          label: "Email Address",
          type: "email",
          placeholder: "employee@demo.com",
        },
      ],
    },
    {
      title: "Bank & Compensation",
      description: "Payroll bank details and monthly compensation.",
      fields: [
        {
          name: "pan",
          label: "PAN",
          type: "text",
          placeholder: "10-character alphanumeric",
        },
        {
          name: "bank_name",
          label: "Bank Name",
          type: "text",
          placeholder: "e.g. HDFC Bank, SBI",
        },
        {
          name: "bank_account_number",
          label: "Account Number",
          type: "text",
          placeholder: "Account number",
        },
        {
          name: "ifsc_code",
          label: "IFSC Code",
          type: "text",
          placeholder: "e.g. HDFC0001234",
        },
        {
          name: "salary",
          label: "Monthly Salary (₹)",
          type: "number",
          placeholder: "e.g. 40000",
        },
      ],
    },
  ];

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient("/api/v1/misc/employees", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          salary: parseFloat(values.salary || "0"),
        }),
      });
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save employee.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Master"
        description="Accounting and staff directory with salary, bank details, and compliance data."
        breadcrumbs={[
          { label: "Masters", href: "/misc/primary-group" },
          { label: "Employee Master" },
        ]}
        actions={
          <Button onClick={() => setIsDrawerOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
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
          data={data}
          columns={columns}
          actions={actions}
          isLoading={isLoading}
          searchPlaceholder="Search employees..."
          searchColumn="name"
        />
      </div>

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="New Employee"
        description="Register staff profile with payroll and banking information"
        size="lg"
      >
        <Form
          sections={formSections}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Register Employee"
        />
      </EntityDrawer>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete Employee "${deleteTarget?.name || ""}"`}
        description="Are you sure you want to delete this employee record? Historical transactions will remain preserved."
        confirmText="Delete Employee"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
