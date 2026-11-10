"use client";
import { toast, confirmModal } from "@/lib/toast";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, Building2, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { StatusBadge } from "@/components/ui/badge";
import { Form } from "@/components/forms/form";
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
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<GroupCompanyRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const res = await apiClient<GroupCompanyRecord[]>("/api/v1/general/group-companies");
      setData(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setIsError(true);
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
      header: "Trade Name",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-[#101828] flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-[#4F46E5]" />
          {row.company_name}
        </span>
      ),
    },
    {
      key: "legal_name",
      header: "Legal Registered Name",
      sortable: true,
      cell: (row) => <span className="text-xs text-[#344054]">{row.legal_name || "-"}</span>,
    },
    {
      key: "gstin",
      header: "GSTIN",
      cell: (row) => (
        <span className="font-mono text-xs uppercase bg-[#F8F9FB] border border-[#E4E7EC] px-1.5 py-0.5 rounded-[4px] text-[#344054]">
          {row.gstin || "-"}
        </span>
      ),
    },
    {
      key: "pan",
      header: "PAN",
      cell: (row) => (
        <span className="font-mono text-xs uppercase text-[#667085]">
          {row.pan || "-"}
        </span>
      ),
    },
    {
      key: "cin",
      header: "CIN",
      cell: (row) => (
        <span className="font-mono text-[11px] text-[#667085]">
          {row.cin || "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} />,
    },
  ];

  const actions: RowAction<GroupCompanyRecord>[] = [
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
        setData((prev) => prev.map((item) => (String(item.id) === String(row.id) ? { ...item, is_active: false } : item)));
        try {
          const res = await apiClient(`/api/v1/general/group-companies/${row.id}`, {
            method: "PUT",
            body: JSON.stringify({ is_active: false }),
          });
          toast.success("Deactivated successfully.");
          if (res && typeof res === "object") {
            setData((prev) => prev.map((item) => (String(item.id) === String(row.id) ? { ...item, ...res, is_active: false } : item)));
          }
        } catch (err: any) {
          // Revert optimistic update
          setData((prev) => prev.map((item) => (String(item.id) === String(row.id) ? { ...item, is_active: true } : item)));
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
        setData((prev) => prev.map((item) => (String(item.id) === String(row.id) ? { ...item, is_active: true } : item)));
        try {
          const res = await apiClient(`/api/v1/general/group-companies/${row.id}`, {
            method: "PUT",
            body: JSON.stringify({ is_active: true }),
          });
          toast.success("Activated successfully.");
          if (res && typeof res === "object") {
            setData((prev) => prev.map((item) => (String(item.id) === String(row.id) ? { ...item, ...res, is_active: true } : item)));
          }
        } catch (err: any) {
          // Revert optimistic update
          setData((prev) => prev.map((item) => (String(item.id) === String(row.id) ? { ...item, is_active: false } : item)));
          toast.error(err.message || "Failed to activate record.");
        }
      },
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "company_info",
      title: "Group Company Entity",
      description: "Sister companies and sister business entities",
      columns: 2,
      fields: [
        {
          name: "company_name",
          label: "Operating Trade Name",
          placeholder: "e.g. Panther Logistics South Ltd",
          required: true,
          colSpan: 2,
        },
        {
          name: "legal_name",
          label: "Legal Registered Name",
          placeholder: "e.g. Panther Logistics South Private Limited",
          colSpan: 2,
        },
        {
          name: "gstin",
          label: "GSTIN",
          placeholder: "27AAACT2727Q1ZW",
        },
        {
          name: "pan",
          label: "PAN",
          placeholder: "AAACT2727Q",
        },
        {
          name: "cin",
          label: "Corporate Identity (CIN)",
          placeholder: "U60200MH2026PTC123456",
          colSpan: 2,
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      await apiClient("/api/v1/general/group-companies", {
        method: "POST",
        body: JSON.stringify(values),
      });
      toast.success("Group company created successfully.");
      setIsDrawerOpen(false);
      setEditingRecord(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create group company.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (values: Record<string, any>) => {
    if (!editingRecord) return;
    setIsSubmitting(true);
    try {
      const updated = await apiClient<any>(`/api/v1/general/group-companies/${editingRecord.id}`, {
        method: "PUT",
        body: JSON.stringify(values),
      });
      toast.success("Group company updated successfully.");
      setData((prev) => prev.map((item) => (item.id === editingRecord.id ? { ...item, ...values, ...updated } : item)));
      setIsDrawerOpen(false);
      setEditingRecord(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update group company.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Group Companies"
        description="Manage multi-entity legal business divisions under one subscription."
        breadcrumbs={[
          { label: "General", href: "/general/group-company" },
          { label: "Group Companies" },
        ]}
        primaryAction={{
          label: "Add Company",
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
        searchPlaceholder="Search by trade name, legal name, GSTIN..."
        emptyMessage="No group entities registered"
        emptySubtext="Add multi-company entities to bill from multiple GST accounts."
        emptyAction={{
          label: "Add Company",
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
        title={editingRecord ? "Edit Group Company" : "Create Group Company Entity"}
        description={editingRecord ? "Update legal trading company details." : "Register a legal trading company for invoice series."}
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
          submitLabel={editingRecord ? "Save Changes" : "Create Entity"}
          isLoading={isSubmitting}
        />
      </EntityDrawer>
    </div>
  );
}
