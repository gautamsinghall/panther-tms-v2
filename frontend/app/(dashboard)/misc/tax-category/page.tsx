"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, Percent, Trash2 } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface TaxCategoryRecord {
  id: number;
  name: string;
  code: string;
  igst_rate: number;
  cgst_rate: number;
  sgst_rate: number;
  is_rcm: boolean;
  is_active: boolean;
}

export default function TaxCategoryPage() {
  const [data, setData] = useState<TaxCategoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<TaxCategoryRecord[]>("/api/v1/misc/tax-categories");
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load tax categories.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<TaxCategoryRecord>[] = [
    {
      key: "code",
      header: "Tax Code",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
          {row.code}
        </span>
      ),
    },
    {
      key: "name",
      header: "Category Name",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {row.name}
        </span>
      ),
    },
    {
      key: "rates",
      header: "Rates (IGST / CGST / SGST)",
      cell: (row) => (
        <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
          {Number(row.igst_rate).toFixed(1)}% (CGST: {Number(row.cgst_rate).toFixed(1)}%, SGST: {Number(row.sgst_rate).toFixed(1)}%)
        </span>
      ),
    },
    {
      key: "is_rcm",
      header: "Reverse Charge (RCM)",
      align: "center",
      cell: (row) => (
        <Badge variant={row.is_rcm ? "warning" : "neutral"}>
          {row.is_rcm ? "RCM Yes (GTA)" : "Normal"}
        </Badge>
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

  const actions: RowAction<TaxCategoryRecord>[] = [
    {
      label: "Delete",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: "danger",
      onClick: async (row) => {
        if (!confirm(`Delete tax category "${row.name}"?`)) return;
        try {
          await apiClient(`/api/v1/misc/tax-categories/${row.id}`, { method: "DELETE" });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to delete tax category");
        }
      },
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      title: "Tax Rate Configuration",
      description: "Define Goods and Services Tax (GST) slabs and Reverse Charge Mechanism flags.",
      fields: [
        {
          name: "name",
          label: "Category Name",
          type: "text",
          required: true,
          placeholder: "e.g. GST 12%, GST 5% GTA RCM",
        },
        {
          name: "code",
          label: "Code",
          type: "text",
          required: true,
          placeholder: "e.g. GST_12",
        },
        {
          name: "igst_rate",
          label: "IGST Rate (%)",
          type: "number",
          required: true,
          placeholder: "12.00",
        },
        {
          name: "cgst_rate",
          label: "CGST Rate (%)",
          type: "number",
          required: true,
          placeholder: "6.00",
        },
        {
          name: "sgst_rate",
          label: "SGST Rate (%)",
          type: "number",
          required: true,
          placeholder: "6.00",
        },
        {
          name: "is_rcm",
          label: "Reverse Charge Mechanism (GTA RCM)?",
          type: "checkbox",
        },
      ],
    },
  ];

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient("/api/v1/misc/tax-categories", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          igst_rate: parseFloat(values.igst_rate || "0"),
          cgst_rate: parseFloat(values.cgst_rate || "0"),
          sgst_rate: parseFloat(values.sgst_rate || "0"),
          is_rcm: Boolean(values.is_rcm),
        }),
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save tax category.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Percent className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            Tax Categories
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Indian GST tax categories and RCM rules applied across invoices and purchases.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Tax Category
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
        emptyMessage="No tax categories configured yet."
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                New Tax Category
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
                submitLabel="Create Category"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
