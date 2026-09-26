"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { StatusBadge } from "@/components/ui/badge";
import { Form } from "@/components/forms/form";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { QuickCreateVehicleOwnerModal } from "@/components/modals/quick-create-modal";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface HireChallanRecord {
  id: number;
  challan_number: string;
  challan_date: string;
  vehicle_number: string;
  owner_name?: string;
  driver_name?: string;
  driver_phone?: string;
  hire_rate: string | number;
  advance_amount: string | number;
  balance_amount: string | number;
  net_payable_amount: string | number;
  status: string;
}

interface SelectOption {
  id: number;
  name?: string;
  vehicle_number?: string;
}

export default function HireChallansPage() {
  const router = useRouter();
  const [data, setData] = useState<HireChallanRecord[]>([]);
  const [owners, setOwners] = useState<SelectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Drawer State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formInitialValues, setFormInitialValues] = useState<Record<string, any>>({});
  const formSetFieldValueRef = useRef<((name: string, value: any) => void) | null>(null);

  // Quick Create Modal State
  const [quickOwnerOpen, setQuickOwnerOpen] = useState(false);

  // Series Master State
  const [seriesInfo, setSeriesInfo] = useState<{
    configured: boolean;
    prefix?: string;
    suffix?: string;
    next_number_formatted?: string;
    series_mode?: string;
  } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const [challansRes, ownersRes, seriesRes] = await Promise.all([
        apiClient<HireChallanRecord[]>("/api/v1/transport/hire-challans"),
        apiClient<SelectOption[]>("/api/v1/transport/vehicle-owners"),
        apiClient<any>("/api/v1/settings/series/check/HIRE_CHALLAN").catch(() => null),
      ]);
      setData(Array.isArray(challansRes) ? challansRes : []);
      setOwners(Array.isArray(ownersRes) ? ownersRes : []);
      setSeriesInfo(seriesRes);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load hire challans.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      return true;
    });
  }, [data, statusFilter]);

  const columns: ColumnDef<HireChallanRecord>[] = [
    {
      key: "challan_number",
      header: "Challan Number",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-bold text-[#101828] block">
            {row.challan_number}
          </span>
          <span className="block text-[11px] text-[#667085]">
            {formatDate(row.challan_date)}
          </span>
        </div>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle / Driver",
      cell: (row) => (
        <div>
          <span className="font-mono font-bold uppercase text-[#101828] block text-xs">
            {row.vehicle_number}
          </span>
          <span className="block text-[11px] text-[#667085]">
            {row.driver_name || "Unassigned"} {row.driver_phone ? `(${row.driver_phone})` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Vehicle Owner / Broker",
      cell: (row) => (
        <span className="text-xs text-[#344054]">
          {row.owner_name || "Direct Driver"}
        </span>
      ),
    },
    {
      key: "rate",
      header: "Agreed Rate",
      isNumeric: true,
      cell: (row) => formatCurrency(row.hire_rate),
    },
    {
      key: "balance",
      header: "Balance Due",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono font-semibold text-[#B42318]">
          {formatCurrency(row.balance_amount)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Challan Status",
      align: "center",
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const actions: RowAction<HireChallanRecord>[] = [
    {
      label: "Settle Balance",
      disabled: (row) => row.status === "SETTLED" || row.status === "CANCELLED",
      onClick: async (row) => {
        if (!confirm(`Settle final balance for challan ${row.challan_number}?`)) return;
        try {
          await apiClient(`/api/v1/transport/hire-challans/${row.id}/settle`, {
            method: "POST",
            body: JSON.stringify({ settlement_notes: "Settled via banking channel" }),
          });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to settle challan.");
        }
      },
    },
  ];

  const handleOwnerCreated = (newOwner: { id: number; name: string }) => {
    setOwners((prev) => [{ id: newOwner.id, name: newOwner.name }, ...prev]);
    setFormInitialValues((prev) => ({ ...prev, owner_id: String(newOwner.id) }));
    formSetFieldValueRef.current?.("owner_id", String(newOwner.id));
  };

  const ownerOptions = [
    { label: "Direct Driver / Other", value: "" },
    ...owners.map((o) => ({ label: o.name || `Owner ${o.id}`, value: String(o.id) })),
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "challan_info",
      title: "Hire Challan Specification",
      description: "Agreement with vehicle supplier / market truck owner",
      columns: 2,
      fields: [
        {
          name: "challan_number",
          label: "Challan Number (Manual Series)",
          type: "text",
          required: true,
          placeholder: seriesInfo?.next_number_formatted || "HC-2026-0001",
        },
        {
          name: "vehicle_number",
          label: "Truck Registration Number",
          placeholder: "e.g. RJ-14-GH-9876",
          required: true,
        },
        {
          name: "challan_date",
          label: "Challan Date",
          type: "date",
          required: true,
          defaultValue: new Date().toISOString().split("T")[0],
        },
        {
          name: "owner_id",
          label: "Vehicle Owner / Broker",
          type: "select",
          options: ownerOptions,
          onAddNew: () => setQuickOwnerOpen(true),
          addNewLabel: "+ Add New Vehicle Owner",
          addNewTitle: "Quickly create and register vehicle owner / broker",
        },
        {
          name: "driver_name",
          label: "Driver Name",
          placeholder: "e.g. Suresh Yadav",
        },
        {
          name: "driver_phone",
          label: "Driver Mobile",
          placeholder: "9876543210",
        },
        {
          name: "driver_license_number",
          label: "Driver License No",
          placeholder: "DL-1420110012345",
        },
      ],
    },
    {
      id: "financial_terms",
      title: "Commercial & Payment Terms",
      description: "Hire rates, freight advance, and TDS deductions",
      columns: 2,
      fields: [
        {
          name: "hire_rate",
          label: "Total Agreed Lorry Hire (₹)",
          type: "number",
          placeholder: "45000",
          required: true,
        },
        {
          name: "advance_amount",
          label: "Advance Paid to Driver/Owner (₹)",
          type: "number",
          placeholder: "20000",
        },
        {
          name: "tds_rate",
          label: "TDS Percentage (%)",
          type: "number",
          placeholder: "1.0 or 2.0",
        },
        {
          name: "detention_charge",
          label: "Detention / Halting Rate (₹/day)",
          type: "number",
          placeholder: "1500",
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    if (seriesInfo && !seriesInfo.configured) {
      alert("Manual Series for Hire Challan is not configured! Please configure it in Series Master before issuing a challan.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        challan_number: values.challan_number ? String(values.challan_number).trim() : undefined,
        owner_id: values.owner_id ? parseInt(values.owner_id, 10) : null,
        hire_rate: values.hire_rate ? parseFloat(values.hire_rate) : 0,
        advance_amount: values.advance_amount ? parseFloat(values.advance_amount) : 0,
        tds_rate: values.tds_rate ? parseFloat(values.tds_rate) : 0,
        detention_charge: values.detention_charge ? parseFloat(values.detention_charge) : 0,
      };
      await apiClient("/api/v1/transport/hire-challans", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to issue hire challan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hire Challan"
        description="Issue hire challans for market fleet vehicles, track advances, and settle balances."
        breadcrumbs={[
          { label: "Transport", href: "/transport/jobs" },
          { label: "Hire Challans" },
        ]}
        primaryAction={{
          label: "Issue Hire Challan",
          icon: <Plus className="w-3.5 h-3.5" />,
          onClick: () => {
            setFormInitialValues({
              challan_date: new Date().toISOString().split("T")[0],
              challan_number: seriesInfo?.next_number_formatted || "",
            });
            setIsDrawerOpen(true);
          },
        }}
      />

      {seriesInfo && !seriesInfo.configured && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="font-bold">⚠️ Manual Series Required:</span>
            <span>Manual series must be configured in Series Master before Hire Challans can be issued.</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => router.push("/settings/series-master")}
            className="text-xs bg-white text-amber-800 border-amber-300 hover:bg-amber-100 shrink-0"
          >
            Configure HC Series
          </Button>
        </div>
      )}

      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by challan number, vehicle, owner..."
        filters={[
          {
            id: "status",
            label: "All Statuses",
            value: statusFilter,
            options: [
              { label: "All Statuses", value: "ALL" },
              { label: "Draft", value: "DRAFT" },
              { label: "Issued", value: "ISSUED" },
              { label: "In Transit", value: "TRANSIT" },
              { label: "Settled", value: "SETTLED" },
              { label: "Cancelled", value: "CANCELLED" },
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

      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadData}
        actions={actions}
        emptyMessage="No hire challans issued"
        emptySubtext="Issue hire challans to record market vehicle hiring and advance vouchers."
        emptyAction={{
          label: "Issue Hire Challan",
          onClick: () => setIsDrawerOpen(true),
        }}
        searchable={false}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Issue Market Vehicle Hire Challan"
        description="Create an official hire challan contract with vehicle supplier."
      >
        {seriesInfo && !seriesInfo.configured && (
          <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              ⚠️ Mandatory Manual Series Not Configured
            </div>
            <p>
              By TMS operational policy, Hire Challan creation requires a configured Manual Series. You cannot issue a challan until an active series is set up in Settings &gt; Series Master.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => router.push("/settings/series-master")}
              className="text-xs bg-white text-amber-900 border-amber-300 hover:bg-amber-100"
            >
              Go to Series Master
            </Button>
          </div>
        )}
        {seriesInfo && seriesInfo.configured && (
          <div className="mb-4 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 text-xs flex items-center justify-between">
            <div className="font-mono">
              <span className="text-slate-500 font-sans mr-1">Active Series:</span>
              <strong className="text-indigo-700">Prefix [{seriesInfo.prefix}]</strong>
              {seriesInfo.suffix ? <strong className="text-indigo-700"> Postfix [{seriesInfo.suffix}]</strong> : null}
            </div>
            <div className="font-mono text-[11px] text-indigo-700">
              Suggested Next: <span className="font-bold bg-white px-2 py-0.5 rounded border border-indigo-200">{seriesInfo.next_number_formatted}</span>
            </div>
          </div>
        )}
        <Form
          sections={formSections}
          initialValues={formInitialValues}
          setFieldValueRef={formSetFieldValueRef}
          onSubmit={handleCreate}
          onCancel={() => setIsDrawerOpen(false)}
          submitLabel={seriesInfo && !seriesInfo.configured ? "Series Configuration Required" : "Issue Challan"}
          isLoading={isSubmitting}
        />
      </EntityDrawer>

      {/* Quick Creation Modal */}
      <QuickCreateVehicleOwnerModal
        isOpen={quickOwnerOpen}
        onClose={() => setQuickOwnerOpen(false)}
        onSuccess={handleOwnerCreated}
      />
    </div>
  );
}
