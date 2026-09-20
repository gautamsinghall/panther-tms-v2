"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Building2 } from "lucide-react";
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
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5 text-[#F04438]" />,
      variant: "danger",
      onClick: async (row) => {
        if (!confirm(`Are you sure you want to deactivate ${row.company_name}?`)) return;
        try {
          await apiClient(`/api/v1/general/group-companies/${row.id}`, { method: "DELETE" });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to deactivate company.");
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
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create group company.");
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
          onClick: () => setIsDrawerOpen(true),
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
          onClick: () => setIsDrawerOpen(true),
        }}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Create Group Company Entity"
        description="Register a legal trading company for invoice series."
      >
        <Form
          sections={formSections}
          onSubmit={handleCreate}
          onCancel={() => setIsDrawerOpen(false)}
          submitLabel="Create Entity"
          isLoading={isSubmitting}
        />
      </EntityDrawer>
    </div>
  );
}
