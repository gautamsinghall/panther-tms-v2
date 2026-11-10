"use client";
import { toast, confirmModal } from "@/lib/toast";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Trash2, Building2, CheckCircle2, Pencil } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { StatusBadge } from "@/components/ui/badge";
import { Form } from "@/components/forms/form";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { DEFAULT_COUNTRY } from "@/lib/countries";
import { apiClient } from "@/lib/api-client";

interface VehicleOwnerRecord {
  id: number;
  name: string;
  phone: string;
  email?: string;
  pan?: string;
  city?: string;
  state?: string;
  bank_name?: string;
  bank_account_no?: string;
  bank_ifsc?: string;
  is_active: boolean;
}

export default function VehicleOwnersPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<VehicleOwnerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<VehicleOwnerRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (searchParams.get("action") === "add") {
      setEditingRecord(null);
      setIsDrawerOpen(true);
    }
  }, [searchParams]);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const res = await apiClient<VehicleOwnerRecord[]>("/api/v1/transport/vehicle-owners");
      setData(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load vehicle owners.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<VehicleOwnerRecord>[] = [
    {
      key: "name",
      header: "Owner / Transporter Name",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-semibold text-[#101828] block">
            {row.name}
          </span>
          {row.pan && (
            <span className="font-mono text-[11px] text-[#667085]">
              PAN: {row.pan}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "phone",
      header: "Contact Details",
      cell: (row) => (
        <div>
          <span className="text-xs text-[#101828] font-medium block">
            {row.phone}
          </span>
          {row.email && (
            <span className="text-[11px] text-[#667085]">
              {row.email}
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
      key: "bank",
      header: "Banking Settlement",
      cell: (row) => (
        <div className="text-[11px] text-[#667085]">
          <div>{row.bank_name || "No Bank Added"}</div>
          {row.bank_ifsc && <span className="font-mono text-[10px]">{row.bank_ifsc}</span>}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} />,
    },
  ];

  const actions: RowAction<VehicleOwnerRecord>[] = [
    {
      label: "Edit",
      icon: <Pencil className="w-3.5 h-3.5" />,
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
          await apiClient(`/api/v1/transport/vehicle-owners/${row.id}`, {
            method: "PUT",
            body: JSON.stringify({ is_active: false }),
          });
          toast.success("Deactivated successfully.");
          loadData();
        } catch (err: any) {
          // Revert optimistic update
          setData((prev) => prev.map((item) => (item.id === row.id ? { ...item, is_active: true } : item)));
          toast.error(err.message || "Failed to deactivate vehicle owner.");
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
          await apiClient(`/api/v1/transport/vehicle-owners/${row.id}`, {
            method: "PUT",
            body: JSON.stringify({ is_active: true }),
          });
          toast.success("Activated successfully.");
          loadData();
        } catch (err: any) {
          // Revert optimistic update
          setData((prev) => prev.map((item) => (item.id === row.id ? { ...item, is_active: false } : item)));
          toast.error(err.message || "Failed to activate vehicle owner.");
        }
      },
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "owner_info",
      title: "Vehicle Owner Profile",
      description: "Truck owner and broker vendor master",
      columns: 2,
      fields: [
        {
          name: "name",
          label: "Owner / Transporter Name",
          placeholder: "e.g. Sharma Freight Logistics",
          required: true,
          colSpan: 2,
        },
        {
          name: "phone",
          label: "Mobile Number",
          placeholder: "9876543210",
          required: true,
        },
        {
          name: "email",
          label: "Email Address",
          type: "email",
          placeholder: "finance@sharmafreight.com",
        },
        {
          name: "pan",
          label: "PAN Number",
          placeholder: "ABCDE1234F",
        },
        {
          name: "pincode",
          label: "Pincode",
          type: "pincode",
          placeholder: "e.g. 302001",
        },
        {
          name: "city",
          label: "City",
          placeholder: "Jaipur",
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
    {
      id: "banking_info",
      title: "Bank Settlement Details",
      description: "NEFT/RTGS bank credentials for balance settlements",
      columns: 2,
      fields: [
        {
          name: "bank_name",
          label: "Bank Name",
          placeholder: "State Bank of India",
        },
        {
          name: "bank_account_no",
          label: "Account Number",
          placeholder: "302910293019",
        },
        {
          name: "bank_ifsc",
          label: "IFSC Code",
          placeholder: "SBIN0001234",
        },
      ],
    },
  ];

  const handleSubmit = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const { pincode, country, ...payload } = values;
      if (editingRecord) {
        const updated = await apiClient<VehicleOwnerRecord>(`/api/v1/transport/vehicle-owners/${editingRecord.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setData((prev) => prev.map((item) => (item.id === editingRecord.id ? { ...item, ...updated } : item)));
        toast.success("Vehicle owner updated successfully.");
      } else {
        await apiClient("/api/v1/transport/vehicle-owners", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Vehicle owner created successfully.");
        loadData();
      }
      setIsDrawerOpen(false);
      setEditingRecord(null);
    } catch (err: any) {
      toast.error(err.message || (editingRecord ? "Failed to update vehicle owner." : "Failed to add vehicle owner."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicle Owners"
        description="Manage market truck owners, freight brokers, and supplier banking records."
        breadcrumbs={[
          { label: "Transport", href: "/transport/jobs" },
          { label: "Vehicle Owners" },
        ]}
        primaryAction={{
          label: "Add Vehicle Owner",
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
        searchPlaceholder="Search owners by name, phone, PAN..."
        emptyMessage="No vehicle owners registered"
        emptySubtext="Add truck suppliers to issue hire challans and manage freight payables."
        emptyAction={{
          label: "Add Vehicle Owner",
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
        title={editingRecord ? "Edit Vehicle Owner" : "Add Vehicle Owner"}
        description={editingRecord ? "Update truck supplier details and banking records." : "Register a truck supplier for hire challan settlements."}
        width="xl"
      >
        <Form
          sections={formSections}
          initialValues={editingRecord || undefined}
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsDrawerOpen(false);
            setEditingRecord(null);
          }}
          submitLabel={editingRecord ? "Save Changes" : "Add Owner"}
          isLoading={isSubmitting}
        />
      </EntityDrawer>
    </div>
  );
}
