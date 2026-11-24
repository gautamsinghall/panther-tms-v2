"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Wallet,
  CheckCircle2,
  XCircle,
  Users,
  Search,
  SlidersHorizontal,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { DataTable } from "@/components/tables/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ColumnDef } from "@/types/table";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface EmployeeRecord {
  id: number;
  name: string;
  employee_code: string;
  designation_title?: string | null;
  department?: string | null;
  phone?: string | null;
  email?: string | null;
  pan?: string | null;
  salary: number;
  is_imprest_active: boolean;
  imprest_limit: number;
  imprest_account_id?: number | null;
  imprest_account_name?: string | null;
  imprest_account_code?: string | null;
  current_imprest_balance?: number;
  imprest_balance_type?: string;
  is_active: boolean;
}

export default function EmployeeImprestPage() {
  const [data, setData] = useState<EmployeeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Activation modal state
  const [activatingEmployee, setActivatingEmployee] = useState<EmployeeRecord | null>(null);
  const [floatLimitInput, setFloatLimitInput] = useState<string>("10000");
  const [openingBalanceInput, setOpeningBalanceInput] = useState<string>("0");
  const [isActivating, setIsActivating] = useState(false);

  // Deactivation confirmation state
  const [deactivatingEmployee, setDeactivatingEmployee] = useState<EmployeeRecord | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient<EmployeeRecord[]>("/api/v1/misc/employees");
      setData(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load employee directory");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle open activation modal
  const handleOpenActivate = (emp: EmployeeRecord) => {
    setActivatingEmployee(emp);
    setFloatLimitInput(emp.imprest_limit ? String(emp.imprest_limit) : "10000");
    setOpeningBalanceInput("0");
  };

  // Submit activation
  const handleConfirmActivate = async () => {
    if (!activatingEmployee) return;
    const limit = parseFloat(floatLimitInput || "0");
    const openingBal = parseFloat(openingBalanceInput || "0");
    if (isNaN(limit) || limit < 0) {
      toast.error("Please enter a valid float limit amount.");
      return;
    }

    setIsActivating(true);
    try {
      await apiClient(`/api/v1/misc/employees/${activatingEmployee.id}/activate-imprest`, {
        method: "POST",
        body: JSON.stringify({
          imprest_limit: limit,
          opening_balance: openingBal,
        }),
      });
      toast.success(
        `Imprest activated for ${activatingEmployee.name}. Ledger account created under Staff Imprest.`
      );
      setActivatingEmployee(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to activate employee imprest.");
    } finally {
      setIsActivating(false);
    }
  };

  // Submit deactivation
  const handleConfirmDeactivate = async () => {
    if (!deactivatingEmployee) return;
    setIsDeactivating(true);
    try {
      await apiClient(`/api/v1/misc/employees/${deactivatingEmployee.id}/deactivate-imprest`, {
        method: "POST",
      });
      toast.success(`Imprest float deactivated for ${deactivatingEmployee.name}.`);
      setDeactivatingEmployee(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate employee imprest.");
    } finally {
      setIsDeactivating(false);
    }
  };

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter((emp) => {
      if (statusFilter === "ACTIVE" && !emp.is_imprest_active) return false;
      if (statusFilter === "INACTIVE" && emp.is_imprest_active) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (emp.name || "").toLowerCase().includes(q);
        const matchesCode = (emp.employee_code || "").toLowerCase().includes(q);
        const matchesDept = (emp.department || "").toLowerCase().includes(q);
        const matchesDesig = (emp.designation_title || "").toLowerCase().includes(q);
        const matchesPhone = (emp.phone || "").toLowerCase().includes(q);
        const matchesAccount = (emp.imprest_account_name || "").toLowerCase().includes(q);
        return (
          matchesName ||
          matchesCode ||
          matchesDept ||
          matchesDesig ||
          matchesPhone ||
          matchesAccount
        );
      }
      return true;
    });
  }, [data, statusFilter, searchQuery]);

  const activeCount = data.filter((e) => e.is_imprest_active).length;
  const inactiveCount = data.length - activeCount;
  const totalAllocatedFloat = data.reduce(
    (acc, curr) => (curr.is_imprest_active ? acc + Number(curr.imprest_limit || 0) : acc),
    0
  );
  const totalOutstandingBalance = data.reduce(
    (acc, curr) =>
      curr.is_imprest_active && curr.imprest_balance_type === "DR"
        ? acc + Number(curr.current_imprest_balance || 0)
        : acc,
    0
  );

  const columns: ColumnDef<EmployeeRecord>[] = [
    {
      key: "employee_code",
      header: "Emp Code",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface-secondary text-text-primary border border-border">
          {row.employee_code}
        </span>
      ),
    },
    {
      key: "name",
      header: "Employee & Role",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-semibold text-text-primary block text-sm">{row.name}</span>
          <span className="text-xs text-text-muted mt-0.5 block">
            {row.designation_title || row.department || "General Staff"}
          </span>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      cell: (row) => (
        <div className="text-xs text-text-secondary leading-snug">
          <div className="font-medium text-text-primary">{row.phone || "—"}</div>
          <div className="text-text-muted">{row.email || ""}</div>
        </div>
      ),
    },
    {
      key: "is_imprest_active",
      header: "Imprest Status",
      cell: (row) => (
        <div>
          {row.is_imprest_active ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>ACTIVE IMPREST</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>NOT ACTIVATED</span>
            </span>
          )}
        </div>
      ),
    },
    {
      key: "imprest_account",
      header: "Linked Ledger Account",
      cell: (row) => (
        <div>
          {row.is_imprest_active ? (
            <div className="text-xs">
              <span className="font-semibold text-text-primary block">
                {row.imprest_account_name || `Imprest - ${row.name}`}
              </span>
              <span className="font-mono text-[11px] text-text-muted">
                {row.imprest_account_code || `EMP_IMP_${row.id}`} • Staff Imprest (CA)
              </span>
            </div>
          ) : (
            <span className="text-xs text-text-muted italic">
              Auto-created upon activation
            </span>
          )}
        </div>
      ),
    },
    {
      key: "imprest_limit",
      header: "Operating Float Limit",
      align: "right",
      sortable: true,
      cell: (row) => (
        <div className="text-right">
          {row.is_imprest_active ? (
            <div>
              <span className="font-mono text-xs font-bold text-text-primary tabular-nums">
                ₹{Number(row.imprest_limit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-text-muted block">Approved Limit</span>
            </div>
          ) : (
            <span className="text-xs text-text-muted">—</span>
          )}
        </div>
      ),
    },
    {
      key: "current_imprest_balance",
      header: "Current Imprest Balance",
      align: "right",
      sortable: true,
      cell: (row) => {
        if (!row.is_imprest_active) {
          return <span className="text-xs text-text-muted">—</span>;
        }
        const bal = Number(row.current_imprest_balance || 0);
        const type = row.imprest_balance_type || (bal > 0 ? "DR" : "NIL");
        const isDR = type === "DR" && bal > 0;
        return (
          <div className="text-right">
            <span
              className={cn(
                "font-mono text-xs font-bold tabular-nums",
                isDR
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              ₹{bal.toLocaleString("en-IN", { minimumFractionDigits: 2 })} {type}
            </span>
            <span className="text-[10px] text-text-muted block">
              {isDR ? "Cash in Hand" : "Fully Settled"}
            </span>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Imprest Activation",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.is_imprest_active ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenActivate(row)}
                className="text-xs font-semibold h-7 px-2.5"
                title="Update approved float limit"
              >
                Update Float
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDeactivatingEmployee(row)}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 h-7 px-2"
                title="Deactivate imprest float"
              >
                Deactivate
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => handleOpenActivate(row)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-7 px-3 inline-flex items-center gap-1 shadow-2xs"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Activate Imprest</span>
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Imprest Activation"
        description="Activate and manage operational cash floats, petty cash accounts, and advance limits for company employees."
        breadcrumbs={[
          { label: "Employee Management", href: "/employee-management/employee-master" },
          { label: "Employee Imprest" },
        ]}
        primaryAction={{
          label: "View Employee Master",
          icon: <Users className="w-4 h-4" />,
          onClick: () => {
            window.location.href = "/employee-management/employee-master";
          },
        }}
      />

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-surface-primary shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Total Personnel
            </span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-text-primary">
            {data.length}
          </div>
          <p className="mt-1 text-[11px] text-text-muted">Registered in employee master</p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface-primary shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Active Imprest Holders
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {activeCount}
          </div>
          <p className="mt-1 text-[11px] text-text-muted">
            Float enabled &amp; ledger mapped
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface-primary shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Eligible / Inactive
            </span>
            <XCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-600 dark:text-slate-400">
            {inactiveCount}
          </div>
          <p className="mt-1 text-[11px] text-text-muted">
            Can be activated with 1 click
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface-primary shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Total Authorized Float
            </span>
            <Wallet className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
            ₹{totalAllocatedFloat.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-text-muted pt-1 border-t border-border">
            <span>Float in Hand:</span>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
              ₹{totalOutstandingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })} DR
            </span>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-950 dark:text-blue-200 leading-relaxed">
          <span className="font-bold">Automated Chart of Accounts Integration:</span> When an employee&apos;s imprest is activated, Panther TMS automatically binds a dedicated leaf ledger account under <span className="font-semibold underline">Staff Imprest &amp; Operating Float (Current Assets)</span>. This allows branch managers and dispatch teams to issue operational cash advances, petty cash vouchers, and settle en-route expenses seamlessly.
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-primary p-3 rounded-xl border border-border shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === "ALL"
                ? "bg-primary text-white shadow-2xs"
                : "bg-surface-secondary text-text-secondary hover:text-text-primary hover:bg-surface-tertiary"
            }`}
          >
            All Staff ({data.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("ACTIVE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === "ACTIVE"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-surface-secondary text-text-secondary hover:text-text-primary hover:bg-surface-tertiary"
            }`}
          >
            Active Imprest ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("INACTIVE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === "INACTIVE"
                ? "bg-slate-700 text-white shadow-2xs"
                : "bg-surface-secondary text-text-secondary hover:text-text-primary hover:bg-surface-tertiary"
            }`}
          >
            Not Activated ({inactiveCount})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, code, dept..."
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        data={filteredData}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Filter table rows..."
        searchColumn="name"
        emptyMessage="No employees found"
        emptySubtext="Ensure employees are registered in Employee Master."
      />

      {/* Imprest Activation Modal */}
      {activatingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface-primary border border-border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">
                    {activatingEmployee.is_imprest_active
                      ? "Update Imprest Float Limit"
                      : "Activate Employee Imprest"}
                  </h3>
                  <p className="text-xs text-text-muted">
                    {activatingEmployee.name} ({activatingEmployee.employee_code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivatingEmployee(null)}
                className="text-text-muted hover:text-text-primary text-lg font-bold p-1 rounded cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Approved Operating Float Limit (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-bold">
                    ₹
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="500"
                    value={floatLimitInput}
                    onChange={(e) => setFloatLimitInput(e.target.value)}
                    placeholder="e.g. 15000"
                    className="pl-8 text-sm font-mono font-semibold"
                  />
                </div>
                <p className="text-[11px] text-text-muted mt-1">
                  Maximum operating cash float the employee is authorized to hold at any time.
                </p>
              </div>

              {!activatingEmployee.is_imprest_active && (
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Initial Opening Cash Float (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-bold">
                      ₹
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="500"
                      value={openingBalanceInput}
                      onChange={(e) => setOpeningBalanceInput(e.target.value)}
                      placeholder="0.00"
                      className="pl-8 text-sm font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-text-muted mt-1">
                    Opening debit balance in hand (set to 0 if issuing float via Payment Voucher later).
                  </p>
                </div>
              )}

              <div className="p-3 rounded-lg bg-surface-secondary border border-border space-y-1 text-[11px] text-text-secondary">
                <div className="font-semibold text-text-primary flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Automatic Ledger Account Mapping</span>
                </div>
                <p>
                  Account Name:{" "}
                  <span className="font-mono font-medium text-text-primary">
                    Imprest - {activatingEmployee.name}
                  </span>
                </p>
                <p>
                  Ledger Group:{" "}
                  <span className="font-medium text-text-primary">
                    Staff Imprest &amp; Operating Float (Current Assets)
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActivatingEmployee(null)}
                disabled={isActivating}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmActivate}
                isLoading={isActivating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {activatingEmployee.is_imprest_active
                  ? "Update Float Limit"
                  : "Confirm & Activate Imprest"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Imprest Deactivation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deactivatingEmployee)}
        onClose={() => setDeactivatingEmployee(null)}
        onConfirm={handleConfirmDeactivate}
        title={`Deactivate Imprest for "${deactivatingEmployee?.name || ""}"?`}
        description="This will mark the employee's imprest status as inactive and freeze new operational cash float authorizations. Existing ledger entries and historical transaction records will remain intact."
        confirmText="Deactivate Imprest"
        variant="danger"
        isLoading={isDeactivating}
      />
    </div>
  );
}
