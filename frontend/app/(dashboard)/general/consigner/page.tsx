"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Edit3, Building2, Phone, Mail } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Form } from "@/components/forms/form";
import { StatusBadge } from "@/components/ui/badge";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

export interface ConsignerRecord {
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
  created_at?: string;
}

export default function ConsignerPage() {
  const [data, setData] = useState<ConsignerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Drawer / Form state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation dialog state
  const [deactivatingRecord, setDeactivatingRecord] = useState<ConsignerRecord | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const res = await apiClient<ConsignerRecord[]>("/api/v1/general/consigners");
      setData(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load customer records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (statusFilter === "ACTIVE" && !item.is_active) return false;
      if (statusFilter === "INACTIVE" && item.is_active) return false;
      return true;
    });
  }, [data, statusFilter]);

  const columns: ColumnDef<ConsignerRecord>[] = [
    {
      key: "name",
      header: "Customer / Consigner",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-semibold text-[#172033] block">
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
      header: "Contact Details",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-medium text-[#172033] block text-xs">
            {row.contact_person || "-"}
          </span>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#667085]">
            {row.phone && (
              <span className="inline-flex items-center gap-0.5">
                <Phone className="w-2.5 h-2.5 text-[#98A2B3]" />
                {row.phone}
              </span>
            )}
            {row.email && (
              <span className="inline-flex items-center gap-0.5">
                <Mail className="w-2.5 h-2.5 text-[#98A2B3]" />
                {row.email}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "city",
      header: "Location",
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-[#667085]">
          {row.city || "-"}{row.state ? `, ${row.state}` : ""}
        </span>
      ),
    },
    {
      key: "gstin",
      header: "GSTIN",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs uppercase bg-[#F2F4F7] text-[#172033] px-2 py-0.5 rounded border border-[#E4E7EC]">
          {row.gstin || "Unregistered"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => (
        <StatusBadge
          status={row.is_active ? "Active" : "Inactive"}
          variant={row.is_active ? "active" : "inactive"}
        />
      ),
    },
  ];

  const actions: RowAction<ConsignerRecord>[] = [
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: "danger",
      hidden: (row) => !row.is_active,
      onClick: (row) => {
        setDeactivatingRecord(row);
      },
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "general_info",
      title: "Commercial & Contact Information",
      description: "Primary client profile and GST compliance details",
      columns: 2,
      fields: [
        {
          name: "name",
          label: "Customer / Consigner Name",
          placeholder: "e.g. Jindal Steel & Power Ltd",
          required: true,
          colSpan: 2,
        },
        {
          name: "code",
          label: "Customer Code",
          placeholder: "e.g. JSPL-RAI",
        },
        {
          name: "gstin",
          label: "GSTIN Identification",
          placeholder: "22AAACJ1234F1Z1",
        },
        {
          name: "contact_person",
          label: "Primary Contact Person",
          placeholder: "e.g. Alok Sharma",
        },
        {
          name: "phone",
          label: "Phone / Mobile",
          placeholder: "+91 98765 43210",
        },
        {
          name: "email",
          label: "Official Email Address",
          type: "email",
          placeholder: "logistics@company.com",
          colSpan: 2,
        },
        {
          name: "city",
          label: "City / Hub",
          placeholder: "e.g. Raigarh",
        },
        {
          name: "state",
          label: "State / UT",
          placeholder: "e.g. Chhattisgarh",
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      await apiClient("/api/v1/general/consigners", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create customer record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingRecord) return;
    setIsDeactivating(true);
    try {
      await apiClient(`/api/v1/general/consigners/${deactivatingRecord.id}`, {
        method: "DELETE",
      });
      setDeactivatingRecord(null);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to deactivate customer.");
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Standardized PageHeader per docs/design.md §10 */}
      <PageHeader
        title="Customers & Consigners"
        description="Manage corporate shipper accounts, commercial billing details, GSTIN compliance, and dispatch profiles."
        primaryAction={{
          label: "Add Customer",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => setIsDrawerOpen(true),
        }}
      />

      {/* Filter & Search Bar per docs/design.md §14 */}
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search customer, city, GSTIN, contact..."
        filters={[
          {
            id: "status",
            label: "Filter Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "All Statuses", value: "ALL" },
              { label: "Active Only", value: "ACTIVE" },
              { label: "Inactive Only", value: "INACTIVE" },
            ],
          },
        ]}
        onClear={() => {
          setSearchTerm("");
          setStatusFilter("ALL");
        }}
      />

      {/* Standardized DataTable per docs/design.md §12 */}
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadData}
        actions={actions}
        searchable={false} // FilterBar handles search seamlessly
        emptyMessage="No customers found"
        emptySubtext="Add your first customer to begin creating jobs, bookings, and freight invoices."
        emptyAction={{
          label: "+ Add Customer",
          onClick: () => setIsDrawerOpen(true),
        }}
      />

      {/* Slide-over EntityDrawer per docs/design.md §16 */}
      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Register New Customer"
        description="Enter corporate credentials and billing GSTIN for freight operations."
        width="xl"
      >
        <Form
          sections={formSections}
          onSubmit={handleCreate}
          onCancel={() => setIsDrawerOpen(false)}
          submitLabel="Create Customer"
          isLoading={isSubmitting}
        />
      </EntityDrawer>

      {/* Explicit ConfirmDialog per docs/design.md §24 */}
      <ConfirmDialog
        isOpen={!!deactivatingRecord}
        onClose={() => setDeactivatingRecord(null)}
        onConfirm={handleConfirmDeactivate}
        title="Deactivate Customer Account"
        entityName={deactivatingRecord?.name}
        consequence="Deactivating this customer will mark their status as inactive. Existing past jobs, LRs, and invoices remain intact for audit history."
        confirmLabel="Deactivate Customer"
        isLoading={isDeactivating}
      />
    </div>
  );
}
