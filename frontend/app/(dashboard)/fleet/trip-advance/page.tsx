"use client";

import React, { useEffect, useState } from "react";
import { Plus, CheckCircle, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";

interface TripAdvance {
  id: number;
  advance_number: string;
  lr_id?: number;
  vehicle_number: string;
  driver_name?: string;
  advance_amount: number;
  settled_amount: number;
  balance_due: number;
  payment_mode: string;
  advance_date: string;
  settlement_date?: string;
  status: string;
  remarks?: string;
}

export default function TripAdvancePage() {
  const [data, setData] = useState<TripAdvance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [settleItem, setSettleItem] = useState<TripAdvance | null>(null);

  const [formData, setFormData] = useState({
    vehicle_number: "",
    driver_name: "",
    advance_amount: "",
    payment_mode: "BANK_TRANSFER",
    advance_date: new Date().toISOString().split("T")[0],
    remarks: "",
  });

  const [settleAmount, setSettleAmount] = useState("");
  const [settleNotes, setSettleNotes] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient<TripAdvance[]>("/api/v1/fleet/trip-advances");
      setData(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error("Failed to load trip advances:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient("/api/v1/fleet/trip-advances", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          advance_amount: parseFloat(formData.advance_amount) || 0,
        }),
      });
      setIsAddOpen(false);
      setFormData({
        vehicle_number: "",
        driver_name: "",
        advance_amount: "",
        payment_mode: "BANK_TRANSFER",
        advance_date: new Date().toISOString().split("T")[0],
        remarks: "",
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to disburse trip advance.");
    }
  };

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleItem) return;
    try {
      await apiClient(`/api/v1/fleet/trip-advances/${settleItem.id}/settle`, {
        method: "POST",
        body: JSON.stringify({
          settled_amount: parseFloat(settleAmount) || 0,
          remarks: settleNotes,
        }),
      });
      setSettleItem(null);
      setSettleAmount("");
      setSettleNotes("");
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to settle trip advance.");
    }
  };

  // KPIs
  const totalDisbursed = data.reduce((sum, d) => sum + Number(d.advance_amount || 0), 0);
  const totalSettled = data.reduce((sum, d) => sum + Number(d.settled_amount || 0), 0);
  const totalOutstanding = data.reduce((sum, d) => sum + Number(d.balance_due || 0), 0);

  const columns: ColumnDef<TripAdvance>[] = [
    {
      key: "advance_number",
      header: "Advance #",
      sortable: true,
      cell: (row) => <span className="font-mono font-semibold text-[#172033]">{row.advance_number}</span>,
    },
    {
      key: "vehicle_number",
      header: "Vehicle & Driver",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono text-xs font-semibold text-[#101828]">{row.vehicle_number}</span>
          <div className="text-xs text-[#667085]">{row.driver_name || "Unassigned"}</div>
        </div>
      ),
    },
    {
      key: "advance_amount",
      header: "Advance (₹)",
      align: "right",
      isNumeric: true,
      sortable: true,
      cell: (row) => <span className="font-mono font-semibold text-[#172033]">{formatCurrency(row.advance_amount)}</span>,
    },
    {
      key: "settled_amount",
      header: "Settled (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => <span className="font-mono text-emerald-600 font-medium">{formatCurrency(row.settled_amount)}</span>,
    },
    {
      key: "balance_due",
      header: "Balance Due (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className={`font-mono font-semibold ${row.balance_due > 0 ? "text-amber-600" : "text-[#667085]"}`}>
          {formatCurrency(row.balance_due)}
        </span>
      ),
    },
    {
      key: "payment_mode",
      header: "Disbursement",
      cell: (row) => <span className="text-xs font-mono text-[#667085]">{row.payment_mode}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge
          status={row.status}
          variant={row.status === "SETTLED" ? "completed" : row.status === "OPEN" ? "pending" : "in_progress"}
        />
      ),
    },
    {
      key: "actions",
      header: "Action",
      cell: (row) => (
        row.status !== "SETTLED" ? (
          <Button
            size="sm"
            variant="outline"
            className="text-xs font-semibold h-7 px-2"
            onClick={() => {
              setSettleItem(row);
              setSettleAmount(String(row.balance_due));
            }}
          >
            Settle
          </Button>
        ) : (
          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Settled
          </span>
        )
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Driver Trip Advance"
        description="Issue advances to drivers for fuel, en-route meals, and vehicle permits, and reconcile against settled trip bills."
        breadcrumbs={[
          { label: "Fleet", href: "/fleet/trip-expense" },
          { label: "Trip Advance" },
        ]}
        primaryAction={{
          label: "Issue New Advance",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => setIsAddOpen(true),
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="Total Advances Disbursed" value={formatCurrency(totalDisbursed)} subtext={`${data.length} total advances`} />
        <KpiCard title="Reconciled & Settled" value={formatCurrency(totalSettled)} subtext="Recovered from trip vouchers" />
        <KpiCard title="Outstanding Balances" value={formatCurrency(totalOutstanding)} subtext="Pending driver settlement" />
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
      />

      {/* Issue Advance Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-card border border-[#E4E7EC] w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-5 border-b border-[#E4E7EC] flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#101828]">Issue Driver Advance</h2>
              <button onClick={() => setIsAddOpen(false)} className="text-[#667085] hover:text-[#101828]">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
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
              <div>
                <label className="text-xs font-semibold text-[#344054]">Advance Amount (₹) *</label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.advance_amount}
                  onChange={(e) => setFormData({ ...formData, advance_amount: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#344054]">Payment Mode</label>
                <select
                  className="w-full h-9 rounded-control border border-[#D0D5DD] px-3 text-xs bg-white"
                  value={formData.payment_mode}
                  onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                >
                  <option value="BANK_TRANSFER">BANK TRANSFER</option>
                  <option value="CASH">CASH</option>
                  <option value="UPI">UPI</option>
                  <option value="PETROCARD">PETROCARD</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#344054]">Disbursement Date</label>
                <Input
                  type="date"
                  value={formData.advance_date}
                  onChange={(e) => setFormData({ ...formData, advance_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#344054]">Remarks</label>
                <Input
                  placeholder="Trip route, purpose, or instructions"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E4E7EC]">
                <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Issue Advance</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Advance Modal */}
      {settleItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-card border border-[#E4E7EC] w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-5 border-b border-[#E4E7EC] flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#101828]">
                Settle Advance #{settleItem.advance_number}
              </h2>
              <button onClick={() => setSettleItem(null)} className="text-[#667085] hover:text-[#101828]">✕</button>
            </div>
            <form onSubmit={handleSettle} className="p-5 space-y-4">
              <div className="p-3 rounded-control bg-[#F8F9FB] border border-[#E4E7EC] text-xs space-y-1">
                <div><strong>Vehicle:</strong> {settleItem.vehicle_number} ({settleItem.driver_name})</div>
                <div><strong>Original Advance:</strong> {formatCurrency(settleItem.advance_amount)}</div>
                <div><strong>Already Settled:</strong> {formatCurrency(settleItem.settled_amount)}</div>
                <div><strong>Current Balance Due:</strong> {formatCurrency(settleItem.balance_due)}</div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#344054]">Settlement Amount (₹) *</label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#344054]">Audit Notes / Voucher References</label>
                <Input
                  placeholder="e.g. Reconciled against diesel bills & toll receipts"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E4E7EC]">
                <Button variant="outline" type="button" onClick={() => setSettleItem(null)}>
                  Cancel
                </Button>
                <Button type="submit">Confirm Settlement</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
