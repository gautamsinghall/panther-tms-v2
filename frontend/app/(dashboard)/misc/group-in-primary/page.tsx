"use client";

import React, { useState, useEffect } from "react";
import { Plus, FolderTree, Trash2 } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<GroupInPrimaryRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiClient(`/api/v1/misc/groups-in-primary/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete group");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: ColumnDef<GroupInPrimaryRecord>[] = [
    {
      key: "code",
      header: "Code",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-primary-light text-primary">
          {row.code}
        </span>
      ),
    },
    {
      key: "name",
      header: "Group Name",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-text-primary">
          {row.name}
        </span>
      ),
    },
    {
      key: "primary",
      header: "Primary Group",
      sortable: true,
      cell: (row) => (
        <span className="text-xs font-medium text-text-secondary">
          {row.primary_group_name || "—"}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (row) => (
        <span className="text-xs text-text-secondary">
          {row.description || "—"}
        </span>
      ),
    },
  ];

  const actions: RowAction<GroupInPrimaryRecord>[] = [
    {
      label: "Delete",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: "danger",
      onClick: (row) => setDeleteTarget(row),
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
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save group.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Groups in Primary"
        description="Major sub-categories nested under Primary Groups for financial classification."
        breadcrumbs={[
          { label: "Masters", href: "/misc/primary-group" },
          { label: "Groups in Primary" },
        ]}
        actions={
          <Button onClick={() => setIsDrawerOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Group
          </Button>
        }
      />

      {errorMessage && (
        <div className="p-4 rounded-xl bg-danger-light border border-danger/20 text-danger text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-danger hover:opacity-80">×</button>
        </div>
      )}

      <div className="bg-surface rounded-xl border border-border shadow-xs p-4">
        <DataTable
          data={data}
          columns={columns}
          actions={actions}
          isLoading={isLoading}
          searchPlaceholder="Search groups in primary..."
          searchColumn="name"
        />
      </div>

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="New Group in Primary"
        description="Nest sub-account category under primary accounting group"
        size="md"
      >
        <Form
          sections={formSections}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Create Group"
        />
      </EntityDrawer>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete Group "${deleteTarget?.name || ""}"`}
        description="Are you sure you want to delete this group? Sub-groups and ledger accounts mapped to this group will be affected."
        confirmText="Delete Group"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
