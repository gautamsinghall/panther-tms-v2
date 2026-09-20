"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, UserCheck, Trash2 } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const columns: ColumnDef<EmployeeRecord>[] = [
    {
      key: "employee_code",
      header: "Emp Code",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
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
          <span className="font-semibold text-slate-900 dark:text-slate-100 block">
            {row.name}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {row.department || "General"}
          </span>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Phone & Email",
      cell: (row) => (
        <div className="text-xs text-slate-600 dark:text-slate-400">
          <div>{row.phone || "-"}</div>
          <div className="text-slate-400">{row.email || ""}</div>
        </div>
      ),
    },
    {
      key: "bank",
      header: "Bank & PAN",
      cell: (row) => (
        <div className="text-xs text-slate-600 dark:text-slate-400">
          <div>{row.bank_name ? `${row.bank_name} (${row.ifsc_code || ""})` : "-"}</div>
          <div className="font-mono">{row.pan ? `PAN: ${row.pan}` : ""}</div>
        </div>
      ),
    },
    {
      key: "salary",
      header: "Salary (₹)",
      align: "right",
      cell: (row) => (
        <span className="font-mono text-xs font-medium text-slate-900 dark:text-slate-100">
          ₹{Number(row.salary).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => (
        <Badge variant={row.is_active ? "success" : "neutral"}>
          {row.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  const actions: RowAction<EmployeeRecord>[] = [
    {
      label: "Delete",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: "danger",
      onClick: async (row) => {
        if (!confirm(`Delete employee "${row.name}"?`)) return;
        try {
          await apiClient(`/api/v1/misc/employees/${row.id}`, { method: "DELETE" });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to delete employee");
        }
      },
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
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save employee.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            Employee Master
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Accounting and staff directory with salary, bank details, and compliance data.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Employee
        </Button>
      </div>

      {errorMessage && (
        <div className="p-3.5 text-sm bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-300 rounded-lg">
          {errorMessage}
        </div>
      )}

      <DataTable
        data={data}
        columns={columns}
        actions={actions}
        isLoading={isLoading}
        searchable
        searchField="name"
        emptyMessage="No employees registered yet."
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                New Employee
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <Form
                sections={formSections}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                submitLabel="Register Employee"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
