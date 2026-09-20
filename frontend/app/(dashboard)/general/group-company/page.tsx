"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, Trash2, Building } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface GroupCompanyRecord {
  id: number;
  company_name: string;
  legal_name?: string;
  cin?: string;
  gstin?: string;
  pan?: string;
  is_active: boolean;
}

export default function GroupCompanyPage() {
  const [data, setData] = useState<GroupCompanyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient<GroupCompanyRecord[]>("/api/v1/general/group-companies");
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load group companies.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<GroupCompanyRecord>[] = [
    {
      key: "company_name",
      header: "Company Trade Name",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <Building className="w-3.5 h-3.5 text-indigo-500" />
          {row.company_name}
        </span>
      ),
    },
    {
      key: "legal_name",
      header: "Legal Registered Name",
      sortable: true,
      cell: (row) => <span className="text-xs text-slate-600">{row.legal_name || "-"}</span>,
    },
    {
      key: "gstin",
      header: "GSTIN",
      cell: (row) => (
        <span className="font-mono text-xs uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
          {row.gstin || "-"}
        </span>
      ),
    },
    {
      key: "cin",
      header: "CIN",
      cell: (row) => <span className="font-mono text-xs text-slate-500">{row.cin || "-"}</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => (row.is_active ? "Active" : "Inactive"),
    },
  ];

  const actions: RowAction<GroupCompanyRecord>[] = [
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: "danger",
      onClick: async (row) => {
        if (!confirm(`Deactivate ${row.company_name}?`)) return;
        try {
          await apiClient(`/api/v1/general/group-companies/${row.id}`, { method: "DELETE" });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to deactivate.");
        }
      },
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "group_info",
      title: "Group Company Entity",
      description: "Entity sharing this TMS account subscription",
      columns: 2,
      fields: [
        { name: "company_name", label: "Trade Name", placeholder: "e.g. Panther Fleet Lines", required: true },
        { name: "legal_name", label: "Legal Entity Name", placeholder: "e.g. Panther Fleet Lines Pvt Ltd" },
        { name: "gstin", label: "GSTIN", placeholder: "27AAACP1234F1Z9" },
        { name: "pan", label: "PAN", placeholder: "AAACP1234F" },
        { name: "cin", label: "Corporate Identification Number (CIN)", placeholder: "U60200MH2020PTC123456" },
        { name: "registered_address", label: "Registered Office Address", type: "textarea", colSpan: 2 },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      await apiClient("/api/v1/general/group-companies", { method: "POST", body: JSON.stringify(values) });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create group company.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Group Companies</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage sister logistics firms under your subscription.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)} className="gap-1.5 text-xs font-semibold">
          <Plus className="w-3.5 h-3.5" /> Add Group Company
        </Button>
      </div>
      {errorMessage && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">{errorMessage}</div>}
      <DataTable columns={columns} data={data} isLoading={isLoading} actions={actions} searchPlaceholder="Search group companies..." />
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-xl border space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold">Create Group Company</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <Form sections={formSections} onSubmit={handleCreate} onCancel={() => setIsModalOpen(false)} submitLabel="Create Group Company" isLoading={isSubmitting} />
          </div>
        </div>
      )}
    </div>
  );
}
