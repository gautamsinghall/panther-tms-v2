"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Building2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { StatusBadge } from "@/components/ui/badge";
import { Form } from "@/components/forms/form";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface ConsigneeRecord {
  id: number;
  name: string;
  code?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  city?: string;
  state?: string;
  is_active: boolean;
}

export default function ConsigneePage() {
  const [data, setData] = useState<ConsigneeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Drawer State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const res = await apiClient<ConsigneeRecord[]>("/api/v1/general/consignees");
      setData(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load consignees.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (statusFilter === "ACTIVE" && !item.is_active) return false;
      if (statusFilter === "INACTIVE" && item.is_active) return false;
      return true;
    });
  }, [data, statusFilter]);

  const columns: ColumnDef<ConsigneeRecord>[] = [
    {
      key: "name",
      header: "Consignee Name",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-semibold text-[#101828] block">
            {row.name}
          </span>
          {row.code && (
            <span className="font-mono text-[11px] text-[#667085]">
              Code: {row.code}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "contact_person",
      header: "Contact Person",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="text-xs text-[#101828] font-medium block">
            {row.contact_person || "-"}
          </span>
          {row.phone && (
            <span className="text-[11px] text-[#667085]">
              {row.phone}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "city",
      header: "City / State",
      cell: (row) => (
        <span className="text-xs text-[#667085]">
          {row.city || "-"}{row.state ? `, ${row.state}` : ""}
        </span>
      ),
    },
    {
      key: "gstin",
      header: "GSTIN",
      cell: (row) => (
        <span className="font-mono text-xs uppercase bg-[#F8F9FB] border border-[#E4E7EC] px-1.5 py-0.5 rounded-[4px] text-[#344054]">
          {row.gstin || "Unregistered"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => (
        <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} />
      ),
    },
  ];

  const actions: RowAction<ConsigneeRecord>[] = [
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5 text-[#F04438]" />,
      variant: "danger",
      onClick: async (row) => {
        if (!confirm(`Are you sure you want to deactivate ${row.name}?`)) return;
        try {
          await apiClient(`/api/v1/general/consignees/${row.id}`, { method: "DELETE" });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to deactivate consignee.");
        }
      },
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "general_info",
      title: "Consignee Information",
      description: "Primary receiver details and location",
      columns: 2,
      fields: [
        {
          name: "name",
          label: "Consignee Name",
          placeholder: "e.g. Tata Motors Ltd",
          required: true,
        },
        {
          name: "code",
          label: "Consignee Code",
          placeholder: "e.g. TATA-PUN",
        },
        {
          name: "contact_person",
          label: "Contact Person",
          placeholder: "e.g. Ramesh Kumar",
        },
        {
          name: "phone",
          label: "Phone Number",
          placeholder: "+91 9876543210",
        },
        {
          name: "email",
          label: "Email Address",
          type: "email",
          placeholder: "contact@company.com",
        },
        {
          name: "gstin",
          label: "GSTIN",
          placeholder: "27AAACT2727Q1ZW",
        },
        {
          name: "city",
          label: "City",
          placeholder: "e.g. Pune",
        },
        {
          name: "state",
          label: "State",
          placeholder: "e.g. Maharashtra",
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      await apiClient("/api/v1/general/consignees", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create consignee.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header per docs/design.md §4 */}
      <PageHeader
        title="Consignees"
        description="Manage delivery receivers and destination delivery parties."
        breadcrumbs={[
          { label: "General", href: "/general/consignee" },
          { label: "Consignees" },
        ]}
        primaryAction={{
          label: "Add Consignee",
          icon: <Plus className="w-3.5 h-3.5" />,
          onClick: () => setIsDrawerOpen(true),
        }}
      />

      {/* Filter Bar per docs/design.md §4 */}
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by name, city, contact..."
        filters={[
          {
            id: "status",
            label: "All Statuses",
            value: statusFilter,
            options: [
              { label: "All Statuses", value: "ALL" },
              { label: "Active", value: "ACTIVE" },
              { label: "Inactive", value: "INACTIVE" },
            ],
            onChange: setStatusFilter,
          },
        ]}
        onClear={() => {
          setSearchTerm("");
          setStatusFilter("ALL");
        }}
        hasActiveFilters={Boolean(searchTerm || statusFilter !== "ALL")}
      />

      {/* DataTable per docs/design.md §5 */}
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadData}
        actions={actions}
        emptyMessage="No consignees yet"
        emptySubtext="Add your first delivery receiver party to begin booking LRs."
        emptyAction={{
          label: "Add Consignee",
          onClick: () => setIsDrawerOpen(true),
        }}
        searchable={false}
      />

      {/* Create Drawer per docs/design.md §5 & §16 */}
      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Create New Consignee"
        description="Register a new delivery receiver in the master database."
      >
        <Form
          sections={formSections}
          onSubmit={handleCreate}
          onCancel={() => setIsDrawerOpen(false)}
          submitLabel="Create Consignee"
          isLoading={isSubmitting}
        />
      </EntityDrawer>
    </div>
  );
}
