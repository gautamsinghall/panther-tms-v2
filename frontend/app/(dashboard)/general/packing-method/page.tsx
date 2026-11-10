"use client";
import { toast, confirmModal } from "@/lib/toast";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, Package, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { StatusBadge } from "@/components/ui/badge";
import { Form } from "@/components/forms/form";
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
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MethodOfPackingRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const res = await apiClient<MethodOfPackingRecord[]>("/api/v1/general/packing-methods");
      setData(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setIsError(true);
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
        <span className="font-semibold text-[#101828] flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5 text-[#4F46E5]" />
          {row.name}
        </span>
      ),
    },
    {
      key: "code",
      header: "Code",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs bg-[#F8F9FB] border border-[#E4E7EC] px-1.5 py-0.5 rounded-[4px] text-[#344054]">
          {row.code || "-"}
        </span>
      ),
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

  const actions: RowAction<MethodOfPackingRecord>[] = [
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
          await apiClient(`/api/v1/general/packing-methods/${row.id}`, {
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
          await apiClient(`/api/v1/general/packing-methods/${row.id}`, {
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
      id: "packing_info",
      title: "Packing Specification",
      description: "Packaging type definition",
      columns: 2,
      fields: [
        {
          name: "name",
          label: "Packing Type",
          placeholder: "e.g. Wooden Pallet / Carton Box",
          required: true,
        },
        {
          name: "code",
          label: "Method Code",
          placeholder: "e.g. PLT / CTN",
        },
        {
          name: "description",
          label: "Description",
          placeholder: "Protection and handling instructions",
          colSpan: 2,
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      await apiClient("/api/v1/general/packing-methods", {
        method: "POST",
        body: JSON.stringify(values),
      });
      toast.success("Packing method created successfully.");
      setIsDrawerOpen(false);
      setEditingRecord(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create packing method.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (values: Record<string, any>) => {
    if (!editingRecord) return;
    setIsSubmitting(true);
    try {
      const updated = await apiClient<any>(`/api/v1/general/packing-methods/${editingRecord.id}`, {
        method: "PUT",
        body: JSON.stringify(values),
      });
      toast.success("Packing method updated successfully.");
      setData((prev) => prev.map((item) => (item.id === editingRecord.id ? { ...item, ...values, ...updated } : item)));
      setIsDrawerOpen(false);
      setEditingRecord(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update packing method.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Methods of Packing"
        description="Configure standard consignment packaging types for handling instructions."
        breadcrumbs={[
          { label: "General", href: "/general/packing-method" },
          { label: "Packing Methods" },
        ]}
        primaryAction={{
          label: "Add Packing Method",
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
        searchPlaceholder="Search packing methods..."
        emptyMessage="No packing methods configured"
        emptySubtext="Add packaging standards such as Pallets, Bags, Crates, or Drums."
        emptyAction={{
          label: "Add Packing Method",
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
        title={editingRecord ? "Edit Packing Method" : "Create Packaging Method"}
        description={editingRecord ? "Update consignment packaging standard details." : "Add a consignment packaging standard."}
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
          submitLabel={editingRecord ? "Save Changes" : "Create Method"}
          isLoading={isSubmitting}
        />
      </EntityDrawer>
    </div>
  );
}
