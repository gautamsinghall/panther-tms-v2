"use client";
import { toast, confirmModal } from "@/lib/toast";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Pencil, Building2, Phone, Mail, CheckCircle2 } from "lucide-react";
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
import { COUNTRY_OPTIONS, DEFAULT_COUNTRY } from "@/lib/countries";

export interface ConsignerRecord {
  id: number;
  name: string;
  code?: string;
  contact_person?: string;
  phone?: string;
  address?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
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
  const [editingRecord, setEditingRecord] = useState<ConsignerRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const res = await apiClient<ConsignerRecord[]>("/api/v1/general/consigners");
      setData(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load consigner records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (typeof window !== "undefined" && window.location.search.includes("add=true")) {
      setIsDrawerOpen(true);
    }
    const handleOfficeChange = () => {
      loadData();
    };
    window.addEventListener("panther_office_changed", handleOfficeChange);
    return () => window.removeEventListener("panther_office_changed", handleOfficeChange);
  }, []);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (statusFilter === "ACTIVE" && !item.is_active) return false;
      if (statusFilter === "INACTIVE" && item.is_active) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const match =
          item.name?.toLowerCase().includes(term) ||
          item.contact_person?.toLowerCase().includes(term) ||
          item.phone?.toLowerCase().includes(term) ||
          item.address?.toLowerCase().includes(term) ||
          item.email?.toLowerCase().includes(term) ||
          item.gstin?.toLowerCase().includes(term) ||
          item.pan?.toLowerCase().includes(term) ||
          item.city?.toLowerCase().includes(term) ||
          item.state?.toLowerCase().includes(term) ||
          item.pincode?.toLowerCase().includes(term) ||
          item.country?.toLowerCase().includes(term);
        if (!match) return false;
      }
      return true;
    });
  }, [data, statusFilter, searchTerm]);

  const columns: ColumnDef<ConsignerRecord>[] = [
    {
      key: "name",
      header: "Consigner Name",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-semibold text-[#172033] block">
            {row.name}
          </span>
          {row.address && (
            <span className="text-[11px] text-[#667085] block truncate max-w-[240px]" title={row.address}>
              {row.address}
            </span>
          )}
          {row.code && !row.address && (
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
        <div>
          <span className="text-xs text-[#172033] font-medium block">
            {row.city || "-"}{row.state ? `, ${row.state}` : ""}
          </span>
          {(row.pincode || row.country) && (
            <span className="text-[11px] text-[#667085]">
              {[row.pincode, row.country || "India"].filter(Boolean).join(", ")}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "gstin",
      header: "GSTIN / PAN",
      sortable: true,
      cell: (row) => (
        <div className="space-y-0.5">
          <span className="font-mono text-xs uppercase bg-[#F2F4F7] text-[#172033] px-1.5 py-0.5 rounded border border-[#E4E7EC] inline-block">
            {row.gstin || "Unregistered"}
          </span>
          {row.pan && (
            <span className="font-mono text-[11px] text-[#667085] block">
              PAN: {row.pan}
            </span>
          )}
        </div>
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
          await apiClient(`/api/v1/general/consigners/${row.id}`, {
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
          await apiClient(`/api/v1/general/consigners/${row.id}`, {
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
      id: "general_info",
      title: "Consigner Information",
      description: "Primary shipper profile, location, and GST compliance details",
      columns: 2,
      fields: [
        {
          name: "name",
          label: "Consigner Name",
          placeholder: "e.g. Jindal Steel & Power Ltd",
          required: true,
          colSpan: 2,
        },
        {
          name: "contact_person",
          label: "Contact Person (optional)",
          placeholder: "e.g. Alok Sharma",
        },
        {
          name: "phone",
          label: "Phone Number",
          placeholder: "+91 9876543210",
        },
        {
          name: "address",
          label: "Address",
          placeholder: "e.g. Industrial Area, Phase II",
          type: "textarea",
          colSpan: 2,
        },
        {
          name: "email",
          label: "Email Address",
          type: "email",
          placeholder: "logistics@company.com",
          colSpan: 2,
        },
        {
          name: "gstin",
          label: "GSTIN",
          placeholder: "22AAACJ1234F1Z1",
        },
        {
          name: "pan",
          label: "PAN",
          placeholder: "e.g. AACJ1234F",
        },
        {
          name: "pincode",
          label: "Pincode",
          type: "pincode",
          placeholder: "e.g. 496001",
        },
        {
          name: "city",
          label: "City",
          placeholder: "e.g. Raigarh",
        },
        {
          name: "state",
          label: "State / UT",
          type: "state",
          placeholder: "Select State / UT",
        },
        {
          name: "country",
          label: "Country",
          type: "country",
          defaultValue: DEFAULT_COUNTRY,
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const created = await apiClient<any>("/api/v1/general/consigners", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          country: values.country || "India",
        }),
      });
      if (typeof window !== "undefined" && created) {
        localStorage.setItem("panther_party_created", JSON.stringify({ type: "consigner", id: created.id, name: created.name }));
        window.dispatchEvent(new Event("panther_consigner_created"));
      }
      toast.success("Consigner created successfully.");
      setIsDrawerOpen(false);
      setEditingRecord(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create consigner record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (values: Record<string, any>) => {
    if (!editingRecord) return;
    setIsSubmitting(true);
    try {
      const updated = await apiClient<any>(`/api/v1/general/consigners/${editingRecord.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...values,
          country: values.country || "India",
        }),
      });
      toast.success("Consigner updated successfully.");
      setData((prev) => prev.map((item) => (item.id === editingRecord.id ? { ...item, ...values, ...updated } : item)));
      setIsDrawerOpen(false);
      setEditingRecord(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update consigner record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Standardized PageHeader per docs/design.md §10 */}
      <PageHeader
        title="Consigners"
        description="Manage corporate dispatching shippers, billing profiles, and GST compliance."
        breadcrumbs={[
          { label: "General", href: "/general/consigner" },
          { label: "Consigners" },
        ]}
        primaryAction={{
          label: "Add Consigner",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => {
            setEditingRecord(null);
            setIsDrawerOpen(true);
          },
        }}
      />

      {/* Filter & Search Bar per docs/design.md §14 */}
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by name, city, contact, GSTIN, PAN..."
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
        emptyMessage="No consigners yet"
        emptySubtext="Add your first dispatching shipper party to begin creating jobs, bookings, and freight invoices."
        emptyAction={{
          label: "Add Consigner",
          onClick: () => {
            setEditingRecord(null);
            setIsDrawerOpen(true);
          },
        }}
      />

      {/* Slide-over EntityDrawer per docs/design.md §16 */}
      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingRecord(null);
        }}
        title={editingRecord ? "Edit Consigner" : "Create New Consigner"}
        description={editingRecord ? "Update consignor information and billing profile." : "Register a new dispatching party and commercial billing shipper."}
        width="xl"
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
          submitLabel={editingRecord ? "Save Changes" : "Create Consigner"}
          isLoading={isSubmitting}
        />
      </EntityDrawer>
    </div>
  );
}
