"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, Trash2, Package } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface MethodOfPackingRecord {
  id: number;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
}

export default function PackingMethodPage() {
  const [data, setData] = useState<MethodOfPackingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient<MethodOfPackingRecord[]>("/api/v1/general/packing-methods");
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load packing methods.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<MethodOfPackingRecord>[] = [
    {
      key: "name",
      header: "Packing Method",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5 text-amber-500" />
          {row.name}
        </span>
      ),
    },
    {
      key: "code",
      header: "Code",
      cell: (row) => <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{row.code || "-"}</span>,
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

  const actions: RowAction<MethodOfPackingRecord>[] = [
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: "danger",
      onClick: async (row) => {
        if (!confirm(`Deactivate packing method ${row.name}?`)) return;
        try {
          await apiClient(`/api/v1/general/packing-methods/${row.id}`, { method: "DELETE" });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to deactivate.");
        }
      },
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "pack_info",
      title: "Packing Method Details",
      columns: 2,
      fields: [
        { name: "name", label: "Packing Method Name", placeholder: "e.g. Wooden Pallets", required: true },
        { name: "code", label: "Code", placeholder: "e.g. PALLET" },
        { name: "description", label: "Description / Material", type: "textarea", colSpan: 2 },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      await apiClient("/api/v1/general/packing-methods", { method: "POST", body: JSON.stringify(values) });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create packing method.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Methods of Packing</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage packaging standards for cargo booking.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)} className="gap-1.5 text-xs font-semibold">
          <Plus className="w-3.5 h-3.5" /> Add Packing Method
        </Button>
      </div>
      {errorMessage && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">{errorMessage}</div>}
      <DataTable columns={columns} data={data} isLoading={isLoading} actions={actions} searchPlaceholder="Search packing methods..." />
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-xl border space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold">Create Packing Method</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <Form sections={formSections} onSubmit={handleCreate} onCancel={() => setIsModalOpen(false)} submitLabel="Create Method" isLoading={isSubmitting} />
          </div>
        </div>
      )}
    </div>
  );
}
