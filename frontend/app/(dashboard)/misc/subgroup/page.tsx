"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, GitBranch, Trash2 } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface SubgroupRecord {
  id: number;
  group_id: number;
  group_name?: string;
  name: string;
  code: string;
  description?: string;
}

export default function SubgroupPage() {
  const [data, setData] = useState<SubgroupRecord[]>([]);
  const [groups, setGroups] = useState<{ label: string; value: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [subs, grps] = await Promise.all([
        apiClient<SubgroupRecord[]>("/api/v1/misc/subgroups"),
        apiClient<any[]>("/api/v1/misc/groups-in-primary"),
      ]);
      setData(subs);
      setGroups(grps.map((g) => ({ label: `${g.name} (${g.code})`, value: String(g.id) })));
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load subgroups.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<SubgroupRecord>[] = [
    {
      key: "code",
      header: "Code",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
          {row.code}
        </span>
      ),
    },
    {
      key: "name",
      header: "Subgroup Name",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {row.name}
        </span>
      ),
    },
    {
      key: "group",
      header: "Parent Group",
      sortable: true,
      cell: (row) => (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {row.group_name || "-"}
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

  const actions: RowAction<SubgroupRecord>[] = [
    {
      label: "Delete",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: "danger",
      onClick: async (row) => {
        if (!confirm(`Delete subgroup "${row.name}"?`)) return;
        try {
          await apiClient(`/api/v1/misc/subgroups/${row.id}`, { method: "DELETE" });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to delete subgroup");
        }
      },
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      title: "Subgroup Details",
      description: "Specific sub-classification nested inside a Group.",
      fields: [
        {
          name: "group_id",
          label: "Parent Group",
          type: "select",
          required: true,
          options: groups,
        },
        {
          name: "name",
          label: "Subgroup Name",
          type: "text",
          required: true,
          placeholder: "e.g. North Zone Debtors, Branch Diesel Expense",
        },
        {
          name: "code",
          label: "Subgroup Code",
          type: "text",
          required: true,
          placeholder: "e.g. SUB_NORTH_DEBT",
        },
        {
          name: "description",
          label: "Description",
          type: "textarea",
          placeholder: "Optional notes on subgroup...",
        },
      ],
    },
  ];

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient("/api/v1/misc/subgroups", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          group_id: parseInt(values.group_id, 10),
        }),
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save subgroup.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            Subgroups in Group
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Detailed sub-classifications for ledger accounts under respective groups.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Subgroup
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
        emptyMessage="No subgroups configured yet."
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                New Subgroup
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
                submitLabel="Create Subgroup"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
