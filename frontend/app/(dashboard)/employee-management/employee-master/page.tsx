"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, Wallet, Users, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { PageHeader } from "@/components/ui/page-header";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface EmployeeRecord {
  id: number;
  name: string;
  employee_code: string;
  designation_id?: number | null;
  designation_title?: string | null;
  department?: string | null;
  phone?: string | null;
  email?: string | null;
  pan?: string | null;
  aadhaar_number?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  blood_group?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  ifsc_code?: string | null;
  date_of_joining?: string | null;
  salary: number;
  is_imprest_active: boolean;
  imprest_limit: number;
  imprest_account_name?: string | null;
  imprest_account_code?: string | null;
  current_imprest_balance?: number;
  imprest_balance_type?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function EmployeeMasterPage() {
  const [data, setData] = useState<EmployeeRecord[]>([]);
  const [designationOptions, setDesignationOptions] = useState<{ value: string; label: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<EmployeeRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [empRes, desigRes] = await Promise.all([
        apiClient<EmployeeRecord[]>("/api/v1/misc/employees"),
        apiClient<any[]>("/api/v1/general/designations").catch(() => []),
      ]);
      setData(empRes);
      if (Array.isArray(desigRes)) {
        setDesignationOptions(
          desigRes.map((d) => ({
            value: String(d.id),
            label: d.title || d.name || `Designation #${d.id}`,
          }))
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load employees.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setEditingEmployee(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (emp: EmployeeRecord) => {
    setEditingEmployee(emp);
    setIsDrawerOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiClient(`/api/v1/misc/employees/${deleteTarget.id}`, { method: "DELETE" });
      toast.success(`Employee ${deleteTarget.name} deleted successfully`);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete employee");
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
      header: "Employee Details",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-semibold text-text-primary block text-sm">{row.name}</span>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-text-muted">
            <span>{row.designation_title || row.department || "General Staff"}</span>
            {row.blood_group && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                {row.blood_group}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact & Location",
      cell: (row) => (
        <div className="text-xs text-text-secondary leading-snug">
          <div className="font-medium text-text-primary">{row.phone || "—"}</div>
          <div className="text-text-muted">{row.email || ""}</div>
          {(row.city || row.state) && (
            <div className="text-[11px] text-text-muted mt-0.5">
              {[row.city, row.state].filter(Boolean).join(", ")}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "compliance",
      header: "Identity & Banking",
      cell: (row) => (
        <div className="text-xs text-text-secondary leading-snug">
          {row.pan && <div className="font-mono font-medium text-text-primary">PAN: {row.pan}</div>}
          {row.aadhaar_number && (
            <div className="font-mono text-[11px] text-text-muted">Aadhaar: {row.aadhaar_number}</div>
          )}
          {row.bank_name ? (
            <div className="text-[11px] text-text-muted mt-0.5">
              {row.bank_name} {row.ifsc_code ? `(${row.ifsc_code})` : ""}
            </div>
          ) : (
            <div className="text-[11px] text-text-muted italic">No bank attached</div>
          )}
        </div>
      ),
    },
    {
      key: "salary",
      header: "Salary (₹)",
      align: "right",
      sortable: true,
      cell: (row) => (
        <div className="text-right">
          <span className="font-mono text-xs font-semibold text-text-primary tabular-nums">
            ₹{Number(row.salary || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-text-muted block">per month</span>
        </div>
      ),
    },
    {
      key: "imprest",
      header: "Imprest Status",
      cell: (row) => (
        <div>
          {row.is_imprest_active ? (
            <div className="flex flex-col gap-0.5 items-start">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Active Float</span>
              </span>
              <span className="text-[11px] font-mono text-text-secondary">
                Limit: ₹{Number(row.imprest_limit || 0).toLocaleString("en-IN")}
              </span>
              <span className={cn(
                "text-[11px] font-mono font-bold",
                Number(row.current_imprest_balance || 0) > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              )}>
                Bal: ₹{Number(row.current_imprest_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })} {row.imprest_balance_type || "NIL"}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5 items-start">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                <XCircle className="w-3 h-3 text-slate-400 shrink-0" />
                <span>Inactive</span>
              </span>
              <Link
                href="/employee-management/employee-imprest"
                className="text-[10px] text-primary hover:underline font-medium"
              >
                Activate Imprest →
              </Link>
            </div>
          )}
        </div>
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
      label: "Edit Employee",
      icon: <Edit2 className="w-3.5 h-3.5" />,
      onClick: (row) => handleOpenEdit(row),
    },
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
      description: "Employee core identity, role, and operational department.",
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
          placeholder: "e.g. Operations, Accounts, Dispatch, Fleet",
        },
        {
          name: "designation_id",
          label: "Designation",
          type: "select",
          options: designationOptions,
          placeholder: "Select Designation",
        },
        {
          name: "date_of_joining",
          label: "Date of Joining",
          type: "date",
        },
        {
          name: "blood_group",
          label: "Blood Group",
          type: "select",
          options: [
            { value: "A+", label: "A+" },
            { value: "A-", label: "A-" },
            { value: "B+", label: "B+" },
            { value: "B-", label: "B-" },
            { value: "O+", label: "O+" },
            { value: "O-", label: "O-" },
            { value: "AB+", label: "AB+" },
            { value: "AB-", label: "AB-" },
          ],
          placeholder: "Select Blood Group",
        },
        {
          name: "is_active",
          label: "Active Employee Status",
          type: "checkbox",
        },
      ],
    },
    {
      title: "Contact & Residential Address",
      description: "Direct contact and emergency residential address.",
      fields: [
        {
          name: "phone",
          label: "Mobile Number",
          type: "text",
          placeholder: "10-digit primary mobile",
        },
        {
          name: "email",
          label: "Email Address",
          type: "email",
          placeholder: "employee@domain.com",
        },
        {
          name: "address",
          label: "Residential Address",
          type: "textarea",
          placeholder: "Street address, flat / house number",
        },
        {
          name: "city",
          label: "City",
          type: "text",
          placeholder: "e.g. Gurugram, Delhi, Jaipur",
        },
        {
          name: "state",
          label: "State",
          type: "text",
          placeholder: "e.g. Haryana, Rajasthan",
        },
        {
          name: "pincode",
          label: "Pincode",
          type: "text",
          placeholder: "e.g. 122001",
        },
        {
          name: "emergency_contact_name",
          label: "Emergency Contact Person",
          type: "text",
          placeholder: "Next of kin / guardian name",
        },
        {
          name: "emergency_contact_phone",
          label: "Emergency Contact Phone",
          type: "text",
          placeholder: "Emergency contact number",
        },
      ],
    },
    {
      title: "Statutory & Banking Details",
      description: "Government compliance numbers and payroll disbursement details.",
      fields: [
        {
          name: "pan",
          label: "PAN Card Number",
          type: "pan",
          placeholder: "e.g. ABCDE1234F",
        },
        {
          name: "aadhaar_number",
          label: "Aadhaar Card Number",
          type: "text",
          placeholder: "12-digit Aadhaar number",
        },
        {
          name: "bank_name",
          label: "Bank Name",
          type: "text",
          placeholder: "e.g. HDFC Bank, SBI, ICICI Bank",
        },
        {
          name: "bank_account_number",
          label: "Bank Account Number",
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
          placeholder: "e.g. 45000",
        },
      ],
    },
  ];

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const payload = {
        ...values,
        designation_id: values.designation_id ? parseInt(values.designation_id) : null,
        salary: parseFloat(values.salary || "0"),
        is_active: values.is_active !== undefined ? Boolean(values.is_active) : true,
      };

      if (editingEmployee) {
        await apiClient(`/api/v1/misc/employees/${editingEmployee.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success(`Employee ${payload.name} updated successfully`);
      } else {
        await apiClient("/api/v1/misc/employees", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success(`Employee ${payload.name} created successfully`);
      }

      setIsDrawerOpen(false);
      setEditingEmployee(null);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save employee.");
      toast.error(err.message || "Failed to save employee.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const initialValues = editingEmployee
    ? {
        ...editingEmployee,
        designation_id: editingEmployee.designation_id ? String(editingEmployee.designation_id) : "",
        salary: String(editingEmployee.salary || "0"),
        is_active: editingEmployee.is_active,
      }
    : {
        is_active: true,
        salary: "0",
      };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Master"
        description="Comprehensive staff directory with complete personal, contact, statutory, payroll, and banking records."
        breadcrumbs={[
          { label: "Employee Management", href: "/employee-management/employee-master" },
          { label: "Employee Master" },
        ]}
        primaryAction={{
          label: "Add Employee",
          icon: <Plus className="w-4 h-4" />,
          onClick: handleOpenCreate,
        }}
      />

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-surface-primary shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Total Staff</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-text-primary">{data.length}</div>
          <p className="mt-1 text-[11px] text-text-muted">Registered in company directory</p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface-primary shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Active Staff</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {data.filter((e) => e.is_active).length}
          </div>
          <p className="mt-1 text-[11px] text-text-muted">Currently active employees</p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface-primary shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Imprest Accounts</span>
            <Wallet className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
            {data.filter((e) => e.is_imprest_active).length}
          </div>
          <p className="mt-1 text-[11px] text-text-muted">Float-activated personnel</p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface-primary shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Total Monthly Payroll</span>
            <span className="text-xs font-mono font-bold text-text-muted">₹</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-text-primary">
            ₹
            {data
              .reduce((acc, curr) => acc + Number(curr.salary || 0), 0)
              .toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <p className="mt-1 text-[11px] text-text-muted">Gross base payroll liability</p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-danger-light border border-danger/20 text-danger text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-danger hover:opacity-80">
            ×
          </button>
        </div>
      )}

      <DataTable
        data={data}
        columns={columns}
        actions={actions}
        isLoading={isLoading}
        searchPlaceholder="Search by name, employee code, phone, PAN..."
        searchColumn="name"
        emptyMessage="No employees registered"
        emptySubtext="Add staff profiles with complete personal, payroll, and banking information."
        emptyAction={{ label: "Add Employee", onClick: handleOpenCreate }}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingEmployee(null);
        }}
        title={editingEmployee ? `Edit Employee: ${editingEmployee.name}` : "New Employee Registration"}
        description={
          editingEmployee
            ? "Update personal, address, statutory, and payroll information."
            : "Register complete staff profile with personal, contact, statutory, payroll, and banking details."
        }
        size="lg"
      >
        <Form
          key={editingEmployee ? `edit-${editingEmployee.id}` : "new-employee"}
          sections={formSections}
          initialValues={initialValues}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel={editingEmployee ? "Update Employee" : "Register Employee"}
          onCancel={() => {
            setIsDrawerOpen(false);
            setEditingEmployee(null);
          }}
        />
      </EntityDrawer>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete Employee "${deleteTarget?.name || ""}"`}
        description="Are you sure you want to delete this employee record? Historical ledger accounts and vouchers will remain preserved."
        confirmText="Delete Employee"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
