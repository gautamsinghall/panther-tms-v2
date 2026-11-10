"use client";
import { toast, confirmModal } from "@/lib/toast";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { StatusBadge } from "@/components/ui/badge";
import { Form } from "@/components/forms/form";
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
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DesignationRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const res = await apiClient<DesignationRecord[]>("/api/v1/general/designations");
      setData(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setIsError(true);
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
      cell: (row) => <span className="font-semibold text-[#101828]">{row.title}</span>,
    },
    {
      key: "department",
      header: "Department",
      sortable: true,
      cell: (row) => <span className="text-xs text-[#344054]">{row.department || "-"}</span>,
    },
    {
      key: "description",
      header: "Description",
      cell: (row) => <span className="text-xs text-[#667085]">{row.description || "-"}</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} />,
    },
  ];

  const actions: RowAction<DesignationRecord>[] = [
    {
      label: "Edit",
      icon: <Pencil className="w-3.5 h-3.5 text-slate-600" />,
      onClick: (row) => {
        setEditingRecord(row);
        setIsDrawerOpen(true);
      },
    },
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5 text-[#F04438]" />,
      variant: "danger",
      hidden: (row) => !row.is_active,
      onClick: async (row) => {
        const ok = await confirmModal({
          title: "Deactivate Record",
          description: "Are you sure you want to deactivate this record?",
          confirmText: "Deactivate",
          variant: "danger",
        });
        if (!ok) return;
        // Immediate status change with NO page refresh
        setData((prev) => prev.map((item) => (item.id === row.id ? { ...item, is_active: false } : item)));
        try {
          await apiClient(`/api/v1/general/designations/${row.id}`, {
            method: "PUT",
            body: JSON.stringify({ is_active: false }),
          });
          toast.success("Deactivated successfully.");
          loadData();
        } catch (err: any) {
          // Revert optimistic update
          setData((prev) => prev.map((item) => (item.id === row.id ? { ...item, is_active: true } : item)));
          toast.error(err.message || "Failed to deactivate record.");
        }
      },
    },
    {
      label: "Activate",
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      variant: "default",
      hidden: (row) => !!row.is_active,
      onClick: async (row) => {
        const ok = await confirmModal({
          title: "Activate Record",
          description: "Are you sure you want to activate this record?",
          confirmText: "Activate",
          variant: "primary",
        });
        if (!ok) return;
        // Immediate status change with NO page refresh
        setData((prev) => prev.map((item) => (item.id === row.id ? { ...item, is_active: true } : item)));
        try {
          await apiClient(`/api/v1/general/designations/${row.id}`, {
            method: "PUT",
            body: JSON.stringify({ is_active: true }),
          });
          toast.success("Activated successfully.");
          loadData();
        } catch (err: any) {
          // Revert optimistic update
          setData((prev) => prev.map((item) => (item.id === row.id ? { ...item, is_active: false } : item)));
          toast.error(err.message || "Failed to activate record.");
        }
      },
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "designation_info",
      title: "Designation Details",
      description: "Employee role definition",
      columns: 2,
      fields: [
        {
          name: "title",
          label: "Designation Title",
          placeholder: "e.g. Branch Operations Manager",
          required: true,
          colSpan: 2,
        },
        {
          name: "department",
          label: "Department",
          placeholder: "e.g. Operations / Fleet",
        },
        {
          name: "description",
          label: "Role Scope",
          placeholder: "Key operational responsibilities",
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      await apiClient("/api/v1/general/designations", {
        method: "POST",
        body: JSON.stringify(values),
      });
      toast.success("Designation created successfully.");
      setIsDrawerOpen(false);
      setEditingRecord(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create designation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (values: Record<string, any>) => {
    if (!editingRecord) return;
    setIsSubmitting(true);
    try {
      const updated = await apiClient<any>(`/api/v1/general/designations/${editingRecord.id}`, {
        method: "PUT",
        body: JSON.stringify(values),
      });
      toast.success("Designation updated successfully.");
      setData((prev) => prev.map((item) => (item.id === editingRecord.id ? { ...item, ...values, ...updated } : item)));
      setIsDrawerOpen(false);
      setEditingRecord(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update designation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Designations"
        description="Manage company job positions and operational roles."
        breadcrumbs={[
          { label: "General", href: "/general/designation" },
          { label: "Designations" },
        ]}
        primaryAction={{
          label: "Add Designation",
          icon: <Plus className="w-3.5 h-3.5" />,
          onClick: () => {
            setEditingRecord(null);
            setIsDrawerOpen(true);
          },
        }}
      />

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadData}
        actions={actions}
        searchPlaceholder="Search designations by title or department..."
        emptyMessage="No designations configured"
        emptySubtext="Create designation titles to assign to drivers, managers, and staff."
        emptyAction={{
          label: "Add Designation",
          onClick: () => {
            setEditingRecord(null);
            setIsDrawerOpen(true);
          },
        }}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingRecord(null);
        }}
        title={editingRecord ? "Edit Designation" : "Create New Designation"}
        description={editingRecord ? "Update staff role details." : "Add a staff role in the company hierarchy."}
      >
        <Form
          key={editingRecord ? `edit-${editingRecord.id}` : "new"}
          sections={formSections}
          initialValues={editingRecord || undefined}
          onSubmit={editingRecord ? handleUpdate : handleCreate}
          onCancel={() => {
            setIsDrawerOpen(false);
            setEditingRecord(null);
          }}
          submitLabel={editingRecord ? "Save Changes" : "Create Designation"}
          isLoading={isSubmitting}
        />
      </EntityDrawer>
    </div>
  );
}
