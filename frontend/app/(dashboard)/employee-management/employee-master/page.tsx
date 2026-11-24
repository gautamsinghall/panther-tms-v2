"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  Users,
  CheckCircle2,
  Wallet,
  Building2,
  Phone,
  Mail,
  MapPin,
  XCircle,
  CreditCard,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { Form } from "@/components/forms/form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/badge";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export interface EmployeeRecord {
  id: number;
  name: string;
  employee_code?: string | null;
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

const defaultInitialValues = {
  name: "",
  department: "",
  designation_id: "",
  date_of_joining: "",
  blood_group: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  pan: "",
  aadhaar_number: "",
  salary: "0",
  bank_name: "",
  bank_account_number: "",
  ifsc_code: "",
  is_active: true,
};

export default function EmployeeMasterPage() {
  const [data, setData] = useState<EmployeeRecord[]>([]);
  const [designationOptions, setDesignationOptions] = useState<{ value: string; label: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [imprestFilter, setImprestFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");

  // Drawer & Form state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      toast.error(err.message || "Failed to load employee directory");
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
      toast.success(`Employee "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete employee");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const payload: Record<string, any> = {
        name: values.name?.trim(),
        department: values.department?.trim() || null,
        designation_id: values.designation_id ? parseInt(values.designation_id, 10) : null,
        date_of_joining: values.date_of_joining || null,
        blood_group: values.blood_group || null,
        phone: values.phone?.trim() || null,
        email: values.email?.trim() || null,
        address: values.address?.trim() || null,
        city: values.city?.trim() || null,
        state: values.state?.trim() || null,
        pincode: values.pincode?.trim() || null,
        emergency_contact_name: values.emergency_contact_name?.trim() || null,
        emergency_contact_phone: values.emergency_contact_phone?.trim() || null,
        pan: values.pan?.trim() ? values.pan.trim().toUpperCase() : null,
        aadhaar_number: values.aadhaar_number?.trim() || null,
        salary: values.salary ? parseFloat(values.salary) : 0,
        bank_name: values.bank_name?.trim() || null,
        bank_account_number: values.bank_account_number?.trim() || null,
        ifsc_code: values.ifsc_code?.trim() ? values.ifsc_code.trim().toUpperCase() : null,
        is_active: values.is_active !== undefined ? Boolean(values.is_active) : true,
      };

      if (editingEmployee) {
        await apiClient(`/api/v1/misc/employees/${editingEmployee.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success(`Employee "${payload.name}" updated successfully.`);
      } else {
        await apiClient("/api/v1/misc/employees", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success(`Employee "${payload.name}" registered successfully.`);
      }

      setIsDrawerOpen(false);
      setEditingEmployee(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save employee profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form Section Definitions (No employee_code field)
  const formSections: FormSectionDef[] = [
    {
      id: "personal_details",
      title: "Personal & Employment Details",
      description: "Employee core identity, role designation, department, and active status.",
      columns: 2,
      fields: [
        {
          name: "name",
          label: "Full Name",
          type: "text",
          required: true,
          placeholder: "e.g. Anand Kumar",
          colSpan: 1,
        },
        {
          name: "department",
          label: "Department",
          type: "text",
          placeholder: "e.g. Operations, Accounts, Dispatch, Fleet",
          colSpan: 1,
        },
        {
          name: "designation_id",
          label: "Designation",
          type: "select",
          options: designationOptions,
          placeholder: "Select Designation",
          colSpan: 1,
        },
        {
          name: "date_of_joining",
          label: "Date of Joining",
          type: "date",
          colSpan: 1,
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
          colSpan: 1,
        },
        {
          name: "is_active",
          label: "Active Personnel Status",
          type: "checkbox",
          colSpan: 1,
        },
      ],
    },
    {
      id: "contact_address",
      title: "Contact & Address Details",
      description: "Phone numbers, email address, residential location, and emergency contacts.",
      columns: 2,
      fields: [
        {
          name: "phone",
          label: "Primary Phone Number",
          type: "text",
          placeholder: "9876543210",
          colSpan: 1,
        },
        {
          name: "email",
          label: "Official Email Address",
          type: "email",
          placeholder: "anand.kumar@panther.com",
          colSpan: 1,
        },
        {
          name: "address",
          label: "Residential Address",
          type: "textarea",
          placeholder: "Flat / House No., Street, Landmark",
          colSpan: 2,
        },
        {
          name: "city",
          label: "City",
          type: "text",
          placeholder: "e.g. Mumbai, New Delhi",
          colSpan: 1,
        },
        {
          name: "state",
          label: "State",
          type: "text",
          placeholder: "e.g. Maharashtra, Delhi",
          colSpan: 1,
        },
        {
          name: "pincode",
          label: "PIN Code",
          type: "text",
          placeholder: "400001",
          colSpan: 1,
        },
        {
          name: "emergency_contact_name",
          label: "Emergency Contact Name",
          type: "text",
          placeholder: "Spouse / Parent Name",
          colSpan: 1,
        },
        {
          name: "emergency_contact_phone",
          label: "Emergency Contact Phone",
          type: "text",
          placeholder: "9876500000",
          colSpan: 1,
        },
      ],
    },
    {
      id: "identity_statutory",
      title: "Identity & Compliance",
      description: "Statutory identification proofs (PAN and Aadhaar).",
      columns: 2,
      fields: [
        {
          name: "pan",
          label: "PAN Number",
          type: "pan",
          placeholder: "ABCDE1234F",
          colSpan: 1,
        },
        {
          name: "aadhaar_number",
          label: "Aadhaar Number",
          type: "text",
          placeholder: "12-digit Aadhaar number",
          colSpan: 1,
        },
      ],
    },
    {
      id: "payroll_banking",
      title: "Compensation & Banking Details",
      description: "Gross salary commitment and bank account for payroll/float settlements.",
      columns: 2,
      fields: [
        {
          name: "salary",
          label: "Monthly Salary (₹)",
          type: "number",
          placeholder: "0.00",
          colSpan: 1,
        },
        {
          name: "bank_name",
          label: "Bank Name",
          type: "text",
          placeholder: "e.g. HDFC Bank, SBI",
          colSpan: 1,
        },
        {
          name: "bank_account_number",
          label: "Account Number",
          type: "text",
          placeholder: "e.g. 50100234567890",
          colSpan: 1,
        },
        {
          name: "ifsc_code",
          label: "IFSC Code",
          type: "text",
          placeholder: "e.g. HDFC0001234",
          colSpan: 1,
        },
      ],
    },
  ];

  // Distinct department list for filter dropdown
  const departments = useMemo(() => {
    const set = new Set<string>();
    data.forEach((e) => {
      if (e.department?.trim()) set.add(e.department.trim());
    });
    return Array.from(set).sort();
  }, [data]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter((emp) => {
      if (statusFilter === "ACTIVE" && !emp.is_active) return false;
      if (statusFilter === "INACTIVE" && emp.is_active) return false;

      if (imprestFilter === "ACTIVE" && !emp.is_imprest_active) return false;
      if (imprestFilter === "INACTIVE" && emp.is_imprest_active) return false;

      if (departmentFilter !== "ALL" && emp.department !== departmentFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = (emp.name || "").toLowerCase().includes(q);
        const matchesDept = (emp.department || "").toLowerCase().includes(q);
        const matchesDesig = (emp.designation_title || "").toLowerCase().includes(q);
        const matchesPhone = (emp.phone || "").toLowerCase().includes(q);
        const matchesPan = (emp.pan || "").toLowerCase().includes(q);
        const matchesCity = (emp.city || "").toLowerCase().includes(q);
        const matchesBank = (emp.bank_name || "").toLowerCase().includes(q);
        return (
          matchesName ||
          matchesDept ||
          matchesDesig ||
          matchesPhone ||
          matchesPan ||
          matchesCity ||
          matchesBank
        );
      }
      return true;
    });
  }, [data, statusFilter, imprestFilter, departmentFilter, searchTerm]);

  // Metrics for KPI cards
  const metrics = useMemo(() => {
    const total = data.length;
    const active = data.filter((e) => e.is_active).length;
    const imprestCount = data.filter((e) => e.is_imprest_active).length;
    const totalSalary = data.reduce((acc, curr) => acc + Number(curr.salary || 0), 0);
    return { total, active, imprestCount, totalSalary };
  }, [data]);

  // Initial values for Drawer form
  const initialValues = useMemo(() => {
    if (!editingEmployee) return defaultInitialValues;
    return {
      name: editingEmployee.name || "",
      department: editingEmployee.department || "",
      designation_id: editingEmployee.designation_id ? String(editingEmployee.designation_id) : "",
      date_of_joining: editingEmployee.date_of_joining || "",
      blood_group: editingEmployee.blood_group || "",
      phone: editingEmployee.phone || "",
      email: editingEmployee.email || "",
      address: editingEmployee.address || "",
      city: editingEmployee.city || "",
      state: editingEmployee.state || "",
      pincode: editingEmployee.pincode || "",
      emergency_contact_name: editingEmployee.emergency_contact_name || "",
      emergency_contact_phone: editingEmployee.emergency_contact_phone || "",
      pan: editingEmployee.pan || "",
      aadhaar_number: editingEmployee.aadhaar_number || "",
      salary: editingEmployee.salary ? String(editingEmployee.salary) : "0",
      bank_name: editingEmployee.bank_name || "",
      bank_account_number: editingEmployee.bank_account_number || "",
      ifsc_code: editingEmployee.ifsc_code || "",
      is_active: editingEmployee.is_active !== undefined ? editingEmployee.is_active : true,
    };
  }, [editingEmployee]);

  // Columns definition (No employee_code column)
  const columns: ColumnDef<EmployeeRecord>[] = [
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
          <div className="flex items-center gap-1 font-medium text-text-primary">
            <Phone className="w-3 h-3 text-text-muted shrink-0" />
            <span>{row.phone || "—"}</span>
          </div>
          {row.email && (
            <div className="flex items-center gap-1 text-text-muted mt-0.5">
              <Mail className="w-3 h-3 text-text-muted shrink-0" />
              <span>{row.email}</span>
            </div>
          )}
          {(row.city || row.state) && (
            <div className="flex items-center gap-1 text-[11px] text-text-muted mt-0.5">
              <MapPin className="w-3 h-3 text-text-muted shrink-0" />
              <span>{[row.city, row.state].filter(Boolean).join(", ")}</span>
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
          {row.pan && (
            <div className="font-mono font-medium text-text-primary">
              PAN: <span className="text-text-secondary">{row.pan}</span>
            </div>
          )}
          {row.aadhaar_number && (
            <div className="font-mono text-[11px] text-text-muted">
              Aadhaar: {row.aadhaar_number}
            </div>
          )}
          {row.bank_name ? (
            <div className="text-[11px] text-text-muted mt-0.5 flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-text-muted shrink-0" />
              <span>
                {row.bank_name} {row.bank_account_number ? `(••••${row.bank_account_number.slice(-4)})` : ""}
              </span>
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
      header: "Imprest Float",
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
              <span
                className={cn(
                  "text-[11px] font-mono font-bold",
                  Number(row.current_imprest_balance || 0) > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
                )}
              >
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

  // Actions
  const actions: RowAction<EmployeeRecord>[] = [
    {
      label: "Edit Employee",
      icon: <Edit3 className="w-3.5 h-3.5" />,
      onClick: (row) => handleOpenEdit(row),
    },
    {
      label: "Delete",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: "danger",
      onClick: (row) => setDeleteTarget(row),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Employee Master"
        description="Employee profiles, operational roles, statutory compliance, payroll commitments, and imprest float statuses."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Employee Management", href: "/employee-management/employee-master" },
          { label: "Employee Master" },
        ]}
        primaryAction={{
          label: "Add Employee",
          icon: <Plus className="w-4 h-4" />,
          onClick: handleOpenCreate,
        }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Employees"
          value={metrics.total}
          subtext="Registered personnel profiles"
          icon={<Users className="w-4 h-4 text-indigo-600" />}
        />
        <KpiCard
          title="Active Personnel"
          value={metrics.active}
          subtext="Operational workforce"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
        />
        <KpiCard
          title="Operating Float Holders"
          value={metrics.imprestCount}
          subtext="Imprest float authorized staff"
          icon={<Wallet className="w-4 h-4 text-purple-600" />}
        />
        <KpiCard
          title="Total Monthly Payroll"
          value={`₹${metrics.totalSalary.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          subtext="Gross monthly salary liability"
          icon={<CreditCard className="w-4 h-4 text-amber-600" />}
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search employees by name, department, phone, PAN, bank..."
        filters={[
          {
            id: "status",
            label: "Status",
            options: [
              { label: "All Statuses", value: "ALL" },
              { label: "Active Only", value: "ACTIVE" },
              { label: "Inactive Only", value: "INACTIVE" },
            ],
            value: statusFilter,
            onChange: setStatusFilter,
          },
          {
            id: "imprest",
            label: "Imprest Float",
            options: [
              { label: "All Profiles", value: "ALL" },
              { label: "Active Float", value: "ACTIVE" },
              { label: "Inactive Float", value: "INACTIVE" },
            ],
            value: imprestFilter,
            onChange: setImprestFilter,
          },
          ...(departments.length > 0
            ? [
                {
                  id: "dept",
                  label: "Department",
                  options: [
                    { label: "All Departments", value: "ALL" },
                    ...departments.map((d) => ({ label: d, value: d })),
                  ],
                  value: departmentFilter,
                  onChange: setDepartmentFilter,
                },
              ]
            : []),
        ]}
        onClear={() => {
          setSearchTerm("");
          setStatusFilter("ALL");
          setImprestFilter("ALL");
          setDepartmentFilter("ALL");
        }}
      />

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-danger-light border border-danger/20 text-danger text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-danger hover:opacity-80 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        data={filteredData}
        columns={columns}
        actions={actions}
        isLoading={isLoading}
        onRetry={loadData}
        emptyMessage="No employees registered yet"
        emptySubtext="Add staff profiles with personal, statutory, payroll, and banking details."
        emptyAction={{ label: "Add Employee", onClick: handleOpenCreate }}
      />

      {/* Create / Edit Entity Drawer */}
      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingEmployee(null);
        }}
        title={editingEmployee ? `Edit Employee: ${editingEmployee.name}` : "New Employee Registration"}
        description={
          editingEmployee
            ? "Update personal, contact, statutory compliance, and payroll information."
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete Employee "${deleteTarget?.name || ""}"`}
        description="Are you sure you want to delete this employee record? Historical ledger accounts and vouchers will remain safely preserved in the ledger."
        confirmText="Delete Employee"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
