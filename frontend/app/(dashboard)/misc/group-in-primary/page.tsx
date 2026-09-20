"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, FolderTree, Trash2 } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface GroupInPrimaryRecord {
  id: number;
  primary_group_id: number;
  primary_group_name?: string;
  name: string;
  code: string;
  description?: string;
}

export default function GroupInPrimaryPage() {
  const [data, setData] = useState<GroupInPrimaryRecord[]>([]);
  const [primaryGroups, setPrimaryGroups] = useState<{ label: string; value: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [groups, pgs] = await Promise.all([
        apiClient<GroupInPrimaryRecord[]>("/api/v1/misc/groups-in-primary"),
        apiClient<any[]>("/api/v1/misc/primary-groups"),
      ]);
      setData(groups);
      setPrimaryGroups(pgs.map((p) => ({ label: `${p.name} (${p.code})`, value: String(p.id) })));
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load groups in primary.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<GroupInPrimaryRecord>[] = [
    {
      key: "code",
      header: "Code",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {row.code}
        </span>
      ),
    },
    {
      key: "name",
      header: "Group Name",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {row.name}
        </span>
      ),
    },
    {
      key: "primary",
      header: "Primary Group",
      sortable: true,
      cell: (row) => (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {row.primary_group_name || "-"}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {row.description || "-"}
        </span>
      ),
    },
  ];

  const actions: RowAction<GroupInPrimaryRecord>[] = [
    {
      label: "Delete",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: "danger",
      onClick: async (row) => {
        if (!confirm(`Delete group "${row.name}"?`)) return;
        try {
          await apiClient(`/api/v1/misc/groups-in-primary/${row.id}`, { method: "DELETE" });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to delete group");
        }
      },
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      title: "Group Details",
      description: "Subdivision of primary accounting categories (e.g. Current Assets, Direct Expenses).",
      fields: [
        {
          name: "primary_group_id",
          label: "Primary Group",
          type: "select",
          required: true,
          options: primaryGroups,
        },
        {
          name: "name",
          label: "Group Name",
          type: "text",
          required: true,
          placeholder: "e.g. Sundry Debtors, Direct Freight Expenses",
        },
        {
          name: "code",
          label: "Group Code",
          type: "text",
          required: true,
          placeholder: "e.g. DEBTORS",
        },
        {
          name: "description",
          label: "Description",
          type: "textarea",
          placeholder: "Optional notes on group categorization...",
        },
      ],
    },
  ];

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient("/api/v1/misc/groups-in-primary", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          primary_group_id: parseInt(values.primary_group_id, 10),
        }),
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save group.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            Groups in Primary
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Major sub-categories nested under Primary Groups for financial classification.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Group
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
        emptyMessage="No groups configured yet."
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                New Group in Primary
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
                submitLabel="Create Group"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
