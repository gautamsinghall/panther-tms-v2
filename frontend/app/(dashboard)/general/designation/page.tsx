"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface DesignationRecord {
  id: number;
  title: string;
  department?: string;
  description?: string;
  is_active: boolean;
}

export default function DesignationPage() {
  const [data, setData] = useState<DesignationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient<DesignationRecord[]>("/api/v1/general/designations");
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load designations.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<DesignationRecord>[] = [
    {
      key: "title",
      header: "Designation Title",
      sortable: true,
      cell: (row) => <span className="font-semibold text-slate-900 dark:text-slate-100">{row.title}</span>,
    },
    {
      key: "department",
      header: "Department",
      sortable: true,
      cell: (row) => <span className="text-xs text-slate-600">{row.department || "-"}</span>,
    },
    {
      key: "description",
      header: "Description",
      cell: (row) => <span className="text-xs text-slate-500">{row.description || "-"}</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => (row.is_active ? "Active" : "Inactive"),
    },
  ];

  const actions: RowAction<DesignationRecord>[] = [
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: "danger",
      onClick: async (row) => {
        if (!confirm(`Deactivate ${row.title}?`)) return;
        try {
          await apiClient(`/api/v1/general/designations/${row.id}`, { method: "DELETE" });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to deactivate.");
        }
      },
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "des_info",
      title: "Designation Details",
      columns: 2,
      fields: [
        { name: "title", label: "Designation Title", placeholder: "e.g. Senior Logistics Officer", required: true },
        { name: "department", label: "Department", placeholder: "e.g. Operations / Accounts" },
        { name: "description", label: "Description / Responsibilities", type: "textarea", colSpan: 2 },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      await apiClient("/api/v1/general/designations", { method: "POST", body: JSON.stringify(values) });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create designation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Designations</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage job roles and titles across branches.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)} className="gap-1.5 text-xs font-semibold">
          <Plus className="w-3.5 h-3.5" /> Add Designation
        </Button>
      </div>
      {errorMessage && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">{errorMessage}</div>}
      <DataTable columns={columns} data={data} isLoading={isLoading} actions={actions} searchPlaceholder="Search designations..." />
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-xl border space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold">Create Designation</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <Form sections={formSections} onSubmit={handleCreate} onCancel={() => setIsModalOpen(false)} submitLabel="Create Designation" isLoading={isSubmitting} />
          </div>
        </div>
      )}
    </div>
  );
}
