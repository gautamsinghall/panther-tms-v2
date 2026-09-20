"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, Trash2, Scale } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface UnitRecord {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
}

export default function UnitPage() {
  const [data, setData] = useState<UnitRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient<UnitRecord[]>("/api/v1/general/units");
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load units.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<UnitRecord>[] = [
    {
      key: "name",
      header: "Unit Name",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <Scale className="w-3.5 h-3.5 text-blue-500" />
          {row.name}
        </span>
      ),
    },
    {
      key: "code",
      header: "Symbol / Code",
      sortable: true,
      cell: (row) => <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold">{row.code}</span>,
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

  const actions: RowAction<UnitRecord>[] = [
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: "danger",
      onClick: async (row) => {
        if (!confirm(`Deactivate unit ${row.name}?`)) return;
        try {
          await apiClient(`/api/v1/general/units/${row.id}`, { method: "DELETE" });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to deactivate.");
        }
      },
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "unit_info",
      title: "Unit of Measurement",
      columns: 2,
      fields: [
        { name: "name", label: "Unit Full Name", placeholder: "e.g. Metric Tonne", required: true },
        { name: "code", label: "Code / Symbol", placeholder: "e.g. MT", required: true },
        { name: "description", label: "Description", type: "textarea", colSpan: 2 },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      await apiClient("/api/v1/general/units", { method: "POST", body: JSON.stringify(values) });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create unit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Units of Measurement</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage weight, volume, and cargo billing units.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)} className="gap-1.5 text-xs font-semibold">
          <Plus className="w-3.5 h-3.5" /> Add Unit
        </Button>
      </div>
      {errorMessage && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">{errorMessage}</div>}
      <DataTable columns={columns} data={data} isLoading={isLoading} actions={actions} searchPlaceholder="Search units..." />
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-xl border space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold">Create Unit</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <Form sections={formSections} onSubmit={handleCreate} onCancel={() => setIsModalOpen(false)} submitLabel="Create Unit" isLoading={isSubmitting} />
          </div>
        </div>
      )}
    </div>
  );
}
