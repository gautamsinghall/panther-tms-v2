"use client";

import React, { useEffect, useState } from "react";
import { Plus, Fuel, CreditCard, FileSpreadsheet, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";

interface TripExpense {
  id: number;
  expense_number: string;
  lr_id?: number;
  job_id?: number;
  vehicle_number: string;
  driver_name?: string;
  expense_category: string;
  amount: number;
  payment_mode: string;
  expense_date: string;
  receipt_number?: string;
  odometer_km?: number;
  fuel_liters?: number;
  plaza_name?: string;
  status: string;
  remarks?: string;
}

export default function TripExpensePage() {
  const [data, setData] = useState<TripExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "FASTAG" | "PENDING">("ALL");
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New expense form state
  const [formData, setFormData] = useState({
    vehicle_number: "",
    expense_category: "DIESEL",
    amount: "",
    payment_mode: "PETROCARD",
    expense_date: new Date().toISOString().split("T")[0],
    driver_name: "",
    receipt_number: "",
    odometer_km: "",
    fuel_liters: "",
    plaza_name: "",
    remarks: "",
  });

  const fetchData = async (filter = activeFilter) => {
    setIsLoading(true);
    try {
      let query = "";
      if (filter === "FASTAG") query = "?is_fastag=true";
      else if (filter === "PENDING") query = "?is_pending=true";

      const res = await apiClient<TripExpense[]>(`/api/v1/fleet/trip-expenses${query}`);
      setData(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error("Failed to load trip expenses:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(activeFilter);
  }, [activeFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient("/api/v1/fleet/trip-expenses", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount) || 0,
          odometer_km: formData.odometer_km ? parseInt(formData.odometer_km) : null,
          fuel_liters: formData.fuel_liters ? parseFloat(formData.fuel_liters) : null,
        }),
      });
      setIsAddOpen(false);
      setFormData({
        vehicle_number: "",
        expense_category: "DIESEL",
        amount: "",
        payment_mode: "PETROCARD",
        expense_date: new Date().toISOString().split("T")[0],
        driver_name: "",
        receipt_number: "",
        odometer_km: "",
        fuel_liters: "",
        plaza_name: "",
        remarks: "",
      });
      fetchData(activeFilter);
    } catch (err: any) {
      alert(err.message || "Failed to create trip expense voucher.");
    }
  };

  // KPIs
  const totalAmount = data.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const dieselAmount = data
    .filter((d) => d.expense_category === "DIESEL")
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const tollAmount = data
    .filter((d) => d.expense_category === "TOLL" || d.payment_mode === "FASTAG")
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const pendingCount = data.filter((d) => d.status === "PENDING").length;

  const columns: ColumnDef<TripExpense>[] = [
    {
      key: "expense_number",
      header: "Expense #",
      sortable: true,
      cell: (row) => <span className="font-mono font-semibold text-[#172033]">{row.expense_number}</span>,
    },
    {
      key: "vehicle_number",
      header: "Vehicle & Driver",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-semibold text-xs text-[#101828]">{row.vehicle_number}</span>
          <div className="text-xs text-[#667085]">{row.driver_name || "Unassigned"}</div>
        </div>
      ),
    },
    {
      key: "expense_category",
      header: "Expense Category",
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-[#F2F4F7] text-[#172033]">
          {row.expense_category === "DIESEL" && <Fuel className="w-3 h-3 text-amber-600" />}
          {row.expense_category === "TOLL" && <CreditCard className="w-3 h-3 text-blue-600" />}
          {row.expense_category}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount (₹)",
      align: "right",
      isNumeric: true,
      sortable: true,
      cell: (row) => <span className="font-mono font-semibold text-[#172033]">{formatCurrency(row.amount)}</span>,
    },
    {
      key: "payment_mode",
      header: "Disbursement",
      cell: (row) => <span className="text-xs text-[#667085] font-mono">{row.payment_mode}</span>,
    },
    {
      key: "expense_date",
      header: "Expense Date",
      sortable: true,
      cell: (row) => <span>{formatDate(row.expense_date)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge
          status={row.status}
          variant={row.status === "APPROVED" ? "completed" : row.status === "PENDING" ? "pending" : "danger"}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trip Expense Management"
        description="Record, audit, and reconcile on-road expenses including diesel, FASTag tolls, driver allowances, and repair vouchers."
        breadcrumbs={[
          { label: "Fleet", href: "/fleet/trip-expense" },
          { label: "Trip Expense" },
        ]}
        primaryAction={{
          label: "Add Expense Voucher",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => setIsAddOpen(true),
        }}
        secondaryActions={[
          {
            label: "Refresh",
            icon: <RefreshCw className="w-4 h-4" />,
            variant: "outline",
            onClick: () => fetchData(activeFilter),
          },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Operating Expenses" value={formatCurrency(totalAmount)} subtext={`${data.length} total vouchers`} />
        <KpiCard title="Fuel / Diesel Cost" value={formatCurrency(dieselAmount)} subtext="High-speed diesel fill-ups" />
        <KpiCard title="FASTag & Tolls" value={formatCurrency(tollAmount)} subtext="Highway toll plazas" />
        <KpiCard title="Pending Approvals" value={`${pendingCount} Vouchers`} subtext="Awaiting manager review" />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E4E7EC] pb-2">
        <button
          onClick={() => setActiveFilter("ALL")}
          className={`px-3 py-1.5 rounded-control text-xs font-semibold transition-colors ${
            activeFilter === "ALL" ? "bg-[#4F46E5] text-white" : "text-[#667085] hover:bg-[#F1F3F6]"
          }`}
        >
          All Expenses ({data.length})
        </button>
        <button
          onClick={() => setActiveFilter("FASTAG")}
          className={`px-3 py-1.5 rounded-control text-xs font-semibold transition-colors ${
            activeFilter === "FASTAG" ? "bg-[#4F46E5] text-white" : "text-[#667085] hover:bg-[#F1F3F6]"
          }`}
        >
          FASTag Tolls
        </button>
        <button
          onClick={() => setActiveFilter("PENDING")}
          className={`px-3 py-1.5 rounded-control text-xs font-semibold transition-colors ${
            activeFilter === "PENDING" ? "bg-[#4F46E5] text-white" : "text-[#667085] hover:bg-[#F1F3F6]"
          }`}
        >
          Pending Audit
        </button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
      />

      {/* Add Expense Drawer */}
      <EntityDrawer
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="New Trip Expense Voucher"
        description="Record driver cash, diesel, FASTag tolls, or maintenance voucher."
      >
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 lg:p-7 shadow-2xs">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#344054]">Vehicle Number *</label>
                <Input
                  required
                  placeholder="e.g. MH-12-RN-4821"
                  value={formData.vehicle_number}
                  onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#344054]">Driver Name</label>
                <Input
                  placeholder="e.g. Ramesh Pawar"
                  value={formData.driver_name}
                  onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#344054]">Category *</label>
                <SearchableSelect
                  size="sm"
                  value={formData.expense_category}
                  onChange={(val) => setFormData({ ...formData, expense_category: String(val) })}
                  options={[
                    { value: "DIESEL", label: "DIESEL" },
                    { value: "TOLL", label: "TOLL / FASTAG" },
                    { value: "MAINTENANCE", label: "MAINTENANCE" },
                    { value: "DRIVER_ALLOWANCE", label: "DRIVER ALLOWANCE" },
                    { value: "POLICE_RTO", label: "POLICE / RTO" },
                    { value: "LOADING_UNLOADING", label: "LOADING / UNLOADING" },
                    { value: "MISC", label: "MISCELLANEOUS" },
                  ]}
                  placeholder="Select category..."
                  searchPlaceholder="Search category..."
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#344054]">Amount (₹) *</label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#344054]">Payment Mode</label>
                <SearchableSelect
                  size="sm"
                  value={formData.payment_mode}
                  onChange={(val) => setFormData({ ...formData, payment_mode: String(val) })}
                  options={[
                    { value: "PETROCARD", label: "PETROCARD" },
                    { value: "FASTAG", label: "FASTAG" },
                    { value: "CASH", label: "DRIVER CASH" },
                    { value: "BANK", label: "COMPANY BANK" },
                    { value: "UPI", label: "UPI" },
                  ]}
                  placeholder="Select payment mode..."
                  searchPlaceholder="Search payment mode..."
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#344054]">Expense Date</label>
                <Input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#344054]">Receipt / Bill #</label>
                <Input
                  placeholder="e.g. BPCL-9920"
                  value={formData.receipt_number}
                  onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#344054]">Odometer (KM)</label>
                <Input
                  type="number"
                  placeholder="e.g. 124500"
                  value={formData.odometer_km}
                  onChange={(e) => setFormData({ ...formData, odometer_km: e.target.value })}
                />
              </div>
            </div>

            {formData.expense_category === "DIESEL" && (
              <div>
                <label className="text-xs font-semibold text-[#344054]">Fuel Liters</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 160.00"
                  value={formData.fuel_liters}
                  onChange={(e) => setFormData({ ...formData, fuel_liters: e.target.value })}
                />
              </div>
            )}

            {formData.expense_category === "TOLL" && (
              <div>
                <label className="text-xs font-semibold text-[#344054]">Toll Plaza Name</label>
                <Input
                  placeholder="e.g. Khalapur Toll Plaza"
                  value={formData.plaza_name}
                  onChange={(e) => setFormData({ ...formData, plaza_name: e.target.value })}
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-[#344054]">Remarks</label>
              <Input
                placeholder="Notes on trip route, station, or justification"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E4E7EC]">
              <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Voucher</Button>
            </div>
          </form>
        </div>
      </EntityDrawer>
    </div>
  );
}
