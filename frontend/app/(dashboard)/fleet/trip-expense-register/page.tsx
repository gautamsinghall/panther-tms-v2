"use client";

import React, { useEffect, useState } from "react";
import { FileSpreadsheet, RefreshCw, Filter, Fuel, CreditCard, Wrench, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";

interface RegisterItem {
  id: number;
  expense_number: string;
  expense_date: string;
  vehicle_number: string;
  vehicle_type: string;
  trip_no?: string;
  driver_name?: string;
  expense_category: string;
  amount: number;
  payment_mode: string;
  receipt_number?: string;
  odometer_km?: number;
  fuel_liters?: number;
  plaza_name?: string;
  status: string;
  remarks?: string;
}

interface RegisterResponse {
  total_records: number;
  total_amount: number;
  fuel_total: number;
  toll_total: number;
  maintenance_total: number;
  driver_allowance_total: number;
  other_total: number;
  category_subtotals: {
    category: string;
    total_amount: number;
    voucher_count: number;
  }[];
  items: RegisterItem[];
}

export default function TripExpenseRegisterPage() {
  const [data, setData] = useState<RegisterResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (vehicleFilter) params.append("vehicle_number", vehicleFilter);
      if (categoryFilter) params.append("category", categoryFilter);
      if (fromDate) params.append("from_date", fromDate);
      if (toDate) params.append("to_date", toDate);

      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await apiClient<RegisterResponse>(`/api/v1/fleet/expense-register${qs}`);
      setData(res);
    } catch (e) {
      console.error("Failed to load trip expense register:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExportCSV = () => {
    if (!data || !data.items.length) return;
    const headers = [
      "Expense #",
      "Date",
      "Vehicle Number",
      "Trip #",
      "Driver",
      "Category",
      "Amount",
      "Payment Mode",
      "Receipt #",
      "Status",
    ];
    const rows = data.items.map((it) => [
      it.expense_number,
      it.expense_date,
      it.vehicle_number,
      it.trip_no || "",
      it.driver_name || "",
      it.expense_category,
      it.amount,
      it.payment_mode,
      it.receipt_number || "",
      it.status,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Trip_Expense_Register_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns: ColumnDef<RegisterItem>[] = [
    {
      key: "expense_number",
      header: "Expense #",
      sortable: true,
      cell: (row) => <span className="font-mono font-semibold text-[#172033]">{row.expense_number}</span>,
    },
    {
      key: "expense_date",
      header: "Date",
      sortable: true,
      cell: (row) => <span>{formatDate(row.expense_date)}</span>,
    },
    {
      key: "vehicle_number",
      header: "Vehicle & Trip",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-semibold text-xs text-[#101828]">{row.vehicle_number}</span>
          {row.trip_no && <div className="font-mono text-[11px] text-[#4F46E5]">{row.trip_no}</div>}
        </div>
      ),
    },
    {
      key: "driver_name",
      header: "Driver",
      cell: (row) => <span>{row.driver_name || "—"}</span>,
    },
    {
      key: "expense_category",
      header: "Category",
      sortable: true,
      cell: (row) => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
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
      cell: (row) => <span className="font-mono font-bold text-[#101828]">{formatCurrency(row.amount)}</span>,
    },
    {
      key: "payment_mode",
      header: "Disbursement Mode",
      cell: (row) => <span className="font-mono text-xs text-[#667085]">{row.payment_mode}</span>,
    },
    {
      key: "receipt_number",
      header: "Receipt # / Plaza",
      cell: (row) => (
        <div className="text-xs text-[#667085]">
          <div>{row.receipt_number || "—"}</div>
          {row.plaza_name && <div className="text-[11px] text-blue-600">{row.plaza_name}</div>}
        </div>
      ),
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
        title="Trip Expense Register"
        description="Derived financial register of all on-road trip vouchers with category subtotals, vehicle-wise filters, and audit export."
        breadcrumbs={[
          { label: "Fleet", href: "/fleet/trip-expense" },
          { label: "Trip Expense Register" },
        ]}
        primaryAction={{
          label: "Export CSV",
          icon: <FileSpreadsheet className="w-4 h-4" />,
          onClick: handleExportCSV,
        }}
        secondaryActions={[
          {
            label: "Refresh",
            icon: <RefreshCw className="w-4 h-4" />,
            variant: "outline",
            onClick: fetchData,
          },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard title="Total Register Outlay" value={formatCurrency(data?.total_amount || 0)} subtext={`${data?.total_records || 0} vouchers`} />
        <KpiCard title="Fuel / Diesel Total" value={formatCurrency(data?.fuel_total || 0)} subtext="Petrocard & cash diesel" />
        <KpiCard title="Tolls & FASTag Total" value={formatCurrency(data?.toll_total || 0)} subtext="Highway plaza debits" />
        <KpiCard title="Workshop Maintenance" value={formatCurrency(data?.maintenance_total || 0)} subtext="En-route & depot PM" />
        <KpiCard title="Driver Allowances" value={formatCurrency(data?.driver_allowance_total || 0)} subtext="Food & halt compensation" />
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-card bg-white border border-[#E4E7EC] flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[160px]">
          <label className="text-[11px] font-semibold text-[#667085] uppercase block mb-1">Vehicle</label>
          <Input
            placeholder="e.g. MH-12-RN-4821"
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
          />
        </div>

        <div className="w-44">
          <label className="text-[11px] font-semibold text-[#667085] uppercase block mb-1">Category</label>
          <select
            className="w-full h-9 rounded-control border border-[#D0D5DD] px-3 text-xs bg-white"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="DIESEL">DIESEL</option>
            <option value="TOLL">TOLL / FASTAG</option>
            <option value="MAINTENANCE">MAINTENANCE</option>
            <option value="DRIVER_ALLOWANCE">DRIVER ALLOWANCE</option>
            <option value="POLICE_RTO">POLICE / RTO</option>
            <option value="LOADING_UNLOADING">LOADING / UNLOADING</option>
            <option value="MISC">MISCELLANEOUS</option>
          </select>
        </div>

        <div className="w-36">
          <label className="text-[11px] font-semibold text-[#667085] uppercase block mb-1">From Date</label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div className="w-36">
          <label className="text-[11px] font-semibold text-[#667085] uppercase block mb-1">To Date</label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        <div className="pt-5">
          <Button onClick={fetchData} size="sm" className="h-9 px-4">
            <Filter className="w-3.5 h-3.5 mr-1" /> Filter
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.items || []}
        isLoading={isLoading}
      />
    </div>
  );
}
