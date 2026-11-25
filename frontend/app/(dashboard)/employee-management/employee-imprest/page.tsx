"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Wallet,
  CheckCircle2,
  XCircle,
  Users,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  Settings2,
  ExternalLink,
  Phone,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ColumnDef, RowAction } from "@/types/table";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export interface EmployeeRecord {
  id: number;
  name: string;
  employee_code?: string | null;
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [balanceFilter, setBalanceFilter] = useState<"ALL" | "CASH_IN_HAND" | "SETTLED">("ALL");

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
    setErrorMessage(null);
    try {
      const res = await apiClient<EmployeeRecord[]>("/api/v1/misc/employees");
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load employee directory");
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

  // Submit activation / limit update
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
        `Imprest operating float updated for ${activatingEmployee.name}. Ledger mapped under Staff Imprest.`
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

  // Filtered dataset (No employee_code matching required)
  const filteredData = useMemo(() => {
    return data.filter((emp) => {
      if (statusFilter === "ACTIVE" && !emp.is_imprest_active) return false;
      if (statusFilter === "INACTIVE" && emp.is_imprest_active) return false;

      const bal = Number(emp.current_imprest_balance || 0);
      const isDR = emp.imprest_balance_type === "DR" && bal > 0;
      if (balanceFilter === "CASH_IN_HAND" && (!emp.is_imprest_active || !isDR)) return false;
      if (balanceFilter === "SETTLED" && (!emp.is_imprest_active || isDR)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (emp.name || "").toLowerCase().includes(q);
        const matchesDept = (emp.department || "").toLowerCase().includes(q);
        const matchesDesig = (emp.designation_title || "").toLowerCase().includes(q);
        const matchesPhone = (emp.phone || "").toLowerCase().includes(q);
        const matchesAccount = (emp.imprest_account_name || "").toLowerCase().includes(q);
        const matchesAccCode = (emp.imprest_account_code || "").toLowerCase().includes(q);
        return (
          matchesName ||
          matchesDept ||
          matchesDesig ||
          matchesPhone ||
          matchesAccount ||
          matchesAccCode
        );
      }
      return true;
    });
  }, [data, statusFilter, balanceFilter, searchQuery]);

  // KPI Metrics
  const activeCount = data.filter((e) => e.is_imprest_active).length;
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

  // Table Columns (No employee_code column)
  const columns: ColumnDef<EmployeeRecord>[] = [
    {
      key: "name",
      header: "Staff Member & Role",
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
          <div className="flex items-center gap-1 font-medium text-text-primary">
            <Phone className="w-3 h-3 text-text-muted shrink-0" />
            <span>{row.phone || "—"}</span>
          </div>
          {row.email && (
            <div className="flex items-center gap-1 text-text-muted mt-0.5">
              <Mail className="w-3 h-3 text-text-muted shrink-0" />
              <span>{row.email}</span>
            </div>
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
                {row.imprest_account_code || `EMP_IMP_${String(row.id).padStart(4, "0")}`} • Staff Imprest (CA)
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
              <span className="text-[10px] text-text-muted block">Authorized Limit</span>
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
      key: "is_imprest_active",
      header: "Imprest Status",
      cell: (row) => (
        <StatusBadge
          status={row.is_imprest_active ? "ACTIVE" : "INACTIVE"}
          variant={row.is_imprest_active ? "active" : "inactive"}
        />
      ),
    },
    {
      key: "actions",
      header: "Float Actions",
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
              <Link
                href={`/accounts/master-ledger?category=STAFF_IMPREST&selectedId=${row.id}`}
                className="text-xs text-text-secondary hover:text-text-primary px-2 py-1 rounded hover:bg-surface-secondary border border-border inline-flex items-center gap-1 h-7"
                title="View full ledger statement"
              >
                <span>Ledger</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
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
      {/* Page Header */}
      <PageHeader
        title="Employee Imprest"
        description="Activate operational cash floats, petty cash accounts, and advance limits for staff with automatic ledger binding."
        breadcrumbs={[
          { label: "Home", href: "/" },
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Total Personnel"
          value={data.length}
          subtext="Registered staff members"
          icon={<Users className="w-4 h-4 text-indigo-600" />}
        />
        <KpiCard
          title="Active Imprest Holders"
          value={activeCount}
          subtext="Operating float authorized"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
        />
        <KpiCard
          title="Total Authorized Float"
          value={`₹${totalAllocatedFloat.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          subtext="Approved cash advance limit"
          icon={<Wallet className="w-4 h-4 text-purple-600" />}
        />
        <KpiCard
          title="Active Float in Hand"
          value={`₹${totalOutstandingBalance.toLocaleString("en-IN", { maximumFractionDigits: 0 })} DR`}
          subtext="En-route float with staff"
          icon={<Clock className="w-4 h-4 text-amber-600" />}
        />
      </div>

      {/* Automated Ledger Integration Banner */}
      <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-950 dark:text-blue-200 leading-relaxed">
          <span className="font-bold">Automated Chart of Accounts Integration:</span> When an employee&apos;s imprest is activated, Panther TMS automatically binds a dedicated leaf ledger account under{" "}
          <span className="font-semibold underline">Staff Imprest &amp; Operating Float (Current Assets)</span>. All activated imprest accounts immediately appear in Payment Vouchers under Direct Expenses for seamless cash issuance and expense settlements.
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search staff by name, department, phone, ledger account..."
        filters={[
          {
            id: "status",
            label: "Imprest Status",
            options: [
              { label: "All Staff", value: "ALL" },
              { label: "Active Imprest", value: "ACTIVE" },
              { label: "Not Activated", value: "INACTIVE" },
            ],
            value: statusFilter,
            onChange: (val) => setStatusFilter(val as any),
          },
          {
            id: "balance",
            label: "Balance Status",
            options: [
              { label: "All Balances", value: "ALL" },
              { label: "Cash in Hand (DR)", value: "CASH_IN_HAND" },
              { label: "Fully Settled", value: "SETTLED" },
            ],
            value: balanceFilter,
            onChange: (val) => setBalanceFilter(val as any),
          },
        ]}
        onClear={() => {
          setSearchQuery("");
          setStatusFilter("ALL");
          setBalanceFilter("ALL");
        }}
      />

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-danger-light border border-danger/20 text-danger text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-danger hover:opacity-80 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        data={filteredData}
        columns={columns}
        isLoading={isLoading}
        onRetry={loadData}
        emptyMessage="No employees found"
        emptySubtext="Ensure staff profiles are registered in Employee Master first."
      />

      {/* Imprest Activation & Limit Configuration Modal */}
      {activatingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-surface-primary border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Wallet className="w-4 h-4" />
                <span>
                  {activatingEmployee.is_imprest_active
                    ? "Update Operating Float Limit"
                    : "Activate Staff Operating Imprest"}
                </span>
              </div>
              <h3 className="text-base font-bold text-text-primary mt-1">
                {activatingEmployee.name}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                {activatingEmployee.designation_title || activatingEmployee.department || "General Staff"}
              </p>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 rounded-lg bg-surface-secondary border border-border text-xs text-text-secondary leading-relaxed">
                Ledger account{" "}
                <span className="font-semibold text-text-primary">
                  Imprest - {activatingEmployee.name}
                </span>{" "}
                will be automatically linked under{" "}
                <span className="font-semibold text-text-primary">
                  Assets &gt; Current Assets &gt; Staff Imprest &amp; Operating Float
                </span>
                .
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Operating Float Limit (₹)*
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-text-muted">
                    ₹
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={floatLimitInput}
                    onChange={(e) => setFloatLimitInput(e.target.value)}
                    className="pl-7 text-xs font-mono font-semibold"
                    placeholder="10000"
                  />
                </div>
                <p className="text-[11px] text-text-muted mt-1">
                  Maximum permitted advance cash float held by employee for operational logistics/petty cash.
                </p>
              </div>

              {!activatingEmployee.is_imprest_active && (
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Initial Float Advance / Opening Balance (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-text-muted">
                      ₹
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="500"
                      value={openingBalanceInput}
                      onChange={(e) => setOpeningBalanceInput(e.target.value)}
                      className="pl-7 text-xs font-mono"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-[11px] text-text-muted mt-1">
                    Initial cash float already with employee (optional, defaults to ₹0.00).
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-surface-secondary border-t border-border flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActivatingEmployee(null)}
                disabled={isActivating}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmActivate}
                disabled={isActivating}
                className="bg-primary text-white text-xs font-semibold px-4"
              >
                {isActivating
                  ? "Saving..."
                  : activatingEmployee.is_imprest_active
                  ? "Update Float Limit"
                  : "Activate & Create Ledger"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deactivatingEmployee)}
        onClose={() => setDeactivatingEmployee(null)}
        onConfirm={handleConfirmDeactivate}
        title={`Deactivate Imprest for "${deactivatingEmployee?.name || ""}"`}
        description="Are you sure you want to deactivate this employee's imprest float? The linked ledger account and previous vouchers will be retained for auditing, but the employee will not be available for new direct expense floats."
        confirmText="Deactivate Imprest"
        variant="danger"
        isLoading={isDeactivating}
      />
    </div>
  );
}
