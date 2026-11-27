"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  PackageCheck,
  AlertTriangle,
  Clock,
  Printer,
  Trash2,
  Eye,
  RefreshCw,
  Search,
  Truck,
  FileText,
  DollarSign,
  TrendingDown,
  TrendingUp,
  MapPin,
  Calendar,
  Building,
  User,
  Hash,
  Scale,
  Package,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { ColumnDef } from "@/types/table";
import { apiClient } from "@/lib/api-client";
import { formatDate, formatCurrency, cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

// ------------------------------------------------------------------------------
// Types
// ------------------------------------------------------------------------------

export interface ArrivalReportRecord {
  id: number;
  report_number: string;
  series_id?: number | null;
  arrival_date: string;
  delivered_date: string;
  lr_id: number;
  hire_challan_id?: number | null;
  job_id?: number | null;
  issuing_office_id?: number | null;

  customer_name?: string | null;
  from_location?: string | null;
  to_location?: string | null;
  lr_date?: string | null;
  transit_days: number;
  eta?: string | null;
  booked_packages: number;
  booked_weight: number | string;
  issued_by?: string | null;
  vehicle_number?: string | null;

  delivered_packages: number;
  delivered_weight: number | string;
  shortage_packages: number;
  shortage_weight: number | string;
  damage_packages: number;
  damage_remarks?: string | null;

  deduction_shortage: number | string;
  deduction_others: number | string;
  deduction_damage: number | string;
  deduction_delay: number | string;
  total_deductions: number | string;

  payable_detention: number | string;
  payable_mis_others: number | string;
  payable_labour: number | string;
  payable_border_expense: number | string;
  total_additional_payable: number | string;
  net_amount: number | string;

  condition_remarks?: string | null;
  destination_hub?: string | null;
  receiver_name?: string | null;
  status: string;
  lr_number?: string | null;
  challan_number?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface LinkedHireChallan {
  id: number;
  challan_number: string;
  vehicle_number: string;
  driver_name?: string | null;
  driver_phone?: string | null;
  issued_by: string;
  challan_date?: string | null;
}

export interface ArrivalLROption {
  id: number;
  lr_number: string;
  lr_date?: string | null;
  customer_name: string;
  from_location: string;
  to_location: string;
  transit_days: number;
  eta: string;
  package_count: number;
  weight: number;
  hcs: LinkedHireChallan[];
}

export interface SeriesCheckInfo {
  configured: boolean;
  document_type: string;
  display_name: string;
  series_mode: string;
  next_number_formatted: string;
  series_id?: number;
  series_options?: Array<{
    id: number;
    series_name: string;
    prefix: string;
    next_number_formatted?: string;
    display_label?: string;
  }>;
}

export default function ArrivalReportsPage() {
  const [data, setData] = useState<ArrivalReportRecord[]>([]);
  const [lrOptions, setLrOptions] = useState<ArrivalLROption[]>([]);
  const [seriesInfo, setSeriesInfo] = useState<SeriesCheckInfo | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ArrivalReportRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [formArrivalNo, setFormArrivalNo] = useState<string>("");
  const [selectedSeriesId, setSelectedSeriesId] = useState<number | undefined>(undefined);

  const [selectedLrId, setSelectedLrId] = useState<string>("");
  const [selectedHcId, setSelectedHcId] = useState<string>("");

  const [formDeliveredDate, setFormDeliveredDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // Delivery details
  const [deliveredPkg, setDeliveredPkg] = useState<string>("0");
  const [deliveredWt, setDeliveredWt] = useState<string>("0.000");
  const [shortagePkg, setShortagePkg] = useState<string>("0");
  const [shortageWt, setShortageWt] = useState<string>("0.000");
  const [damagePkg, setDamagePkg] = useState<string>("0");
  const [damageRemarks, setDamageRemarks] = useState<string>("");

  // Deductions
  const [dedShortage, setDedShortage] = useState<string>("0");
  const [dedOthers, setDedOthers] = useState<string>("0");
  const [dedDamage, setDedDamage] = useState<string>("0");
  const [dedDelay, setDedDelay] = useState<string>("0");

  // Additional payable
  const [payDetention, setPayDetention] = useState<string>("0");
  const [payMisOthers, setPayMisOthers] = useState<string>("0");
  const [payLabour, setPayLabour] = useState<string>("0");
  const [payBorderExpense, setPayBorderExpense] = useState<string>("0");

  // General remarks
  const [conditionRemarks, setConditionRemarks] = useState<string>("");

  // ----------------------------------------------------------------------------
  // Data Loaders
  // ----------------------------------------------------------------------------

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const [reportsRes, lrOptsRes, seriesRes] = await Promise.all([
        apiClient<ArrivalReportRecord[]>("/api/v1/transport/arrival-reports"),
        apiClient<ArrivalLROption[]>("/api/v1/transport/arrival-reports/lr-options"),
        apiClient<SeriesCheckInfo>("/api/v1/transport/arrival-reports/next-number").catch(() => null),
      ]);
      setData(Array.isArray(reportsRes) ? reportsRes : []);
      setLrOptions(Array.isArray(lrOptsRes) ? lrOptsRes : []);
      if (seriesRes) {
        setSeriesInfo(seriesRes);
        if (seriesRes.next_number_formatted) {
          setFormArrivalNo(seriesRes.next_number_formatted);
        }
        if (seriesRes.series_id) {
          setSelectedSeriesId(seriesRes.series_id);
        }
      }
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load arrival reports.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ----------------------------------------------------------------------------
  // Selected LR & HC Derived Computations
  // ----------------------------------------------------------------------------

  const currentLR = useMemo(() => {
    if (!selectedLrId) return null;
    return lrOptions.find((l) => String(l.id) === String(selectedLrId)) || null;
  }, [selectedLrId, lrOptions]);

  const availableHCs = useMemo(() => {
    if (!currentLR) return [];
    return currentLR.hcs || [];
  }, [currentLR]);

  const currentHC = useMemo(() => {
    if (!selectedHcId || !availableHCs.length) return null;
    return availableHCs.find((h) => String(h.id) === String(selectedHcId)) || null;
  }, [selectedHcId, availableHCs]);

  // When LR is selected:
  // 1. Autofill default delivered pkg and weight
  // 2. Filter HC dropdown to only tagged HCs
  // 3. Auto-select if only 1 HC tagged
  const handleLrChange = (lrId: string) => {
    setSelectedLrId(lrId);
    const lr = lrOptions.find((l) => String(l.id) === String(lrId));
    if (lr) {
      setDeliveredPkg(String(lr.package_count || 0));
      setDeliveredWt(String(lr.weight || 0));
      setShortagePkg("0");
      setShortageWt("0");

      if (lr.hcs && lr.hcs.length === 1) {
        setSelectedHcId(String(lr.hcs[0].id));
      } else {
        setSelectedHcId("");
      }
    } else {
      setSelectedHcId("");
      setDeliveredPkg("0");
      setDeliveredWt("0");
    }
  };

  // Re-calculate shortages when delivered values change
  const handleDeliveredPkgChange = (val: string) => {
    setDeliveredPkg(val);
    if (currentLR) {
      const booked = currentLR.package_count || 0;
      const delivered = parseInt(val, 10) || 0;
      const diff = Math.max(0, booked - delivered);
      setShortagePkg(String(diff));
    }
  };

  const handleDeliveredWtChange = (val: string) => {
    setDeliveredWt(val);
    if (currentLR) {
      const booked = currentLR.weight || 0;
      const delivered = parseFloat(val) || 0;
      const diff = Math.max(0, parseFloat((booked - delivered).toFixed(3)));
      setShortageWt(String(diff));
    }
  };

  // Financial Sums
  const totalDeductionsCalc = useMemo(() => {
    const s = parseFloat(dedShortage) || 0;
    const o = parseFloat(dedOthers) || 0;
    const d = parseFloat(dedDamage) || 0;
    const del = parseFloat(dedDelay) || 0;
    return s + o + d + del;
  }, [dedShortage, dedOthers, dedDamage, dedDelay]);

  const totalAdditionalPayableCalc = useMemo(() => {
    const det = parseFloat(payDetention) || 0;
    const mis = parseFloat(payMisOthers) || 0;
    const lab = parseFloat(payLabour) || 0;
    const bor = parseFloat(payBorderExpense) || 0;
    return det + mis + lab + bor;
  }, [payDetention, payMisOthers, payLabour, payBorderExpense]);

  const netBalanceCalc = useMemo(() => {
    return totalAdditionalPayableCalc - totalDeductionsCalc;
  }, [totalAdditionalPayableCalc, totalDeductionsCalc]);

  // Reset form when drawer opens/closes
  const resetForm = () => {
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormDeliveredDate(new Date().toISOString().split("T")[0]);
    setSelectedLrId("");
    setSelectedHcId("");
    setDeliveredPkg("0");
    setDeliveredWt("0.000");
    setShortagePkg("0");
    setShortageWt("0.000");
    setDamagePkg("0");
    setDamageRemarks("");
    setDedShortage("0");
    setDedOthers("0");
    setDedDamage("0");
    setDedDelay("0");
    setPayDetention("0");
    setPayMisOthers("0");
    setPayLabour("0");
    setPayBorderExpense("0");
    setConditionRemarks("");

    if (seriesInfo?.next_number_formatted) {
      setFormArrivalNo(seriesInfo.next_number_formatted);
    }
  };

  const handleOpenCreate = async () => {
    resetForm();
    setIsDrawerOpen(true);
    // Refresh series number
    try {
      const s = await apiClient<SeriesCheckInfo>("/api/v1/transport/arrival-reports/next-number");
      if (s) {
        setSeriesInfo(s);
        if (s.next_number_formatted) {
          setFormArrivalNo(s.next_number_formatted);
        }
        if (s.series_id) {
          setSelectedSeriesId(s.series_id);
        }
      }
    } catch {
      // fallback
    }
  };

  // ----------------------------------------------------------------------------
  // Submit Handler
  // ----------------------------------------------------------------------------

  const handleSaveArrivalReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLrId) {
      toast.error("Please select a Consignment (LR) first.");
      return;
    }
    if (!formDate) {
      toast.error("Arrival Date is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        arrival_date: formDate,
        delivered_date: formDeliveredDate || formDate,
        report_number: formArrivalNo ? formArrivalNo.trim() : undefined,
        series_id: selectedSeriesId,
        lr_id: parseInt(selectedLrId, 10),
        hire_challan_id: selectedHcId ? parseInt(selectedHcId, 10) : undefined,

        // Auto-filled snapshot from selected LR & HC
        customer_name: currentLR?.customer_name,
        from_location: currentLR?.from_location,
        to_location: currentLR?.to_location,
        lr_date: currentLR?.lr_date,
        transit_days: currentLR?.transit_days || 0,
        eta: currentLR?.eta,
        booked_packages: currentLR?.package_count || 0,
        booked_weight: currentLR?.weight || 0,
        issued_by: currentHC?.issued_by || "Operations Executive",
        vehicle_number: currentHC?.vehicle_number || currentLR?.hcs?.[0]?.vehicle_number || "",

        // Delivery details
        delivered_packages: parseInt(deliveredPkg, 10) || 0,
        delivered_weight: parseFloat(deliveredWt) || 0,
        shortage_packages: parseInt(shortagePkg, 10) || 0,
        shortage_weight: parseFloat(shortageWt) || 0,
        damage_packages: parseInt(damagePkg, 10) || 0,
        damage_remarks: damageRemarks || undefined,

        // Deductions
        deduction_shortage: parseFloat(dedShortage) || 0,
        deduction_others: parseFloat(dedOthers) || 0,
        deduction_damage: parseFloat(dedDamage) || 0,
        deduction_delay: parseFloat(dedDelay) || 0,

        // Additional Payable
        payable_detention: parseFloat(payDetention) || 0,
        payable_mis_others: parseFloat(payMisOthers) || 0,
        payable_labour: parseFloat(payLabour) || 0,
        payable_border_expense: parseFloat(payBorderExpense) || 0,

        condition_remarks: conditionRemarks || undefined,
      };

      await apiClient("/api/v1/transport/arrival-reports", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success("Arrival Report recorded successfully.");
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to record arrival report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, repNo: string) => {
    if (!confirm(`Are you sure you want to delete Arrival Report ${repNo}?`)) {
      return;
    }
    try {
      await apiClient(`/api/v1/transport/arrival-reports/${id}`, {
        method: "DELETE",
      });
      toast.success(`Arrival Report ${repNo} deleted.`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete arrival report.");
    }
  };

  // ----------------------------------------------------------------------------
  // Filtered Table Data & KPIs
  // ----------------------------------------------------------------------------

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase().trim();
    return data.filter((r) => {
      return (
        r.report_number.toLowerCase().includes(q) ||
        (r.lr_number && r.lr_number.toLowerCase().includes(q)) ||
        (r.challan_number && r.challan_number.toLowerCase().includes(q)) ||
        (r.customer_name && r.customer_name.toLowerCase().includes(q)) ||
        (r.vehicle_number && r.vehicle_number.toLowerCase().includes(q)) ||
        (r.from_location && r.from_location.toLowerCase().includes(q)) ||
        (r.to_location && r.to_location.toLowerCase().includes(q)) ||
        (r.issued_by && r.issued_by.toLowerCase().includes(q))
      );
    });
  }, [data, searchQuery]);

  const kpis = useMemo(() => {
    const totalReports = data.length;
    let totalDeliveredPkgs = 0;
    let totalShortagePkgs = 0;
    let totalDamagePkgs = 0;
    let totalDeductions = 0;
    let totalPayables = 0;

    data.forEach((r) => {
      totalDeliveredPkgs += r.delivered_packages || 0;
      totalShortagePkgs += r.shortage_packages || 0;
      totalDamagePkgs += r.damage_packages || 0;
      totalDeductions += parseFloat(String(r.total_deductions || 0));
      totalPayables += parseFloat(String(r.total_additional_payable || 0));
    });

    return {
      totalReports,
      totalDeliveredPkgs,
      totalExceptions: totalShortagePkgs + totalDamagePkgs,
      totalDeductions,
      totalPayables,
    };
  }, [data]);

  // ----------------------------------------------------------------------------
  // Table Columns
  // ----------------------------------------------------------------------------

  const columns: ColumnDef<ArrivalReportRecord>[] = [
    {
      key: "report_number",
      header: "Arrival No & Date",
      sortable: true,
      cell: (row) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-gray-900 dark:text-gray-100 text-sm">
              {row.report_number}
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Auto Series
            </span>
          </div>
          <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-gray-400" />
            {formatDate(row.arrival_date)}
          </span>
        </div>
      ),
    },
    {
      key: "lr_number",
      header: "Consignment (LR)",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 block">
            {row.lr_number || `LR #${row.lr_id}`}
          </span>
          {row.lr_date && (
            <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
              Dated: {formatDate(row.lr_date)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "hc_vehicle",
      header: "Hire Challan & Vehicle",
      cell: (row) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-semibold text-gray-800 dark:text-gray-200">
              {row.challan_number || (row.hire_challan_id ? `HC #${row.hire_challan_id}` : "Direct")}
            </span>
          </div>
          {row.vehicle_number ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[11px] font-mono font-bold text-gray-700 dark:text-gray-300 mt-0.5">
              <Truck className="w-2.5 h-2.5 text-gray-500" />
              {row.vehicle_number}
            </span>
          ) : (
            <span className="text-[11px] text-gray-400 italic">No Vehicle</span>
          )}
        </div>
      ),
    },
    {
      key: "route_customer",
      header: "Customer & Route",
      cell: (row) => (
        <div className="max-w-[200px]">
          <span className="text-xs font-medium text-gray-900 dark:text-gray-100 block truncate" title={row.customer_name || ""}>
            {row.customer_name || "—"}
          </span>
          {(row.from_location || row.to_location) && (
            <span className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-2.5 h-2.5 text-gray-400 shrink-0" />
              <span className="truncate">{row.from_location || "Origin"} → {row.to_location || "Dest"}</span>
            </span>
          )}
        </div>
      ),
    },
    {
      key: "packages",
      header: "Delivered / Booked",
      isNumeric: true,
      cell: (row) => (
        <div className="font-mono text-xs text-right">
          <div className="font-bold text-emerald-600 dark:text-emerald-400">
            {row.delivered_packages} Pkgs
            <span className="text-[10px] text-gray-400 font-normal ml-1">
              / {row.booked_packages || row.delivered_packages}
            </span>
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            {parseFloat(String(row.delivered_weight || 0)).toFixed(3)} MT
          </div>
        </div>
      ),
    },
    {
      key: "exceptions",
      header: "Shortage / Damage",
      align: "center",
      cell: (row) => {
        const hasShort = (row.shortage_packages || 0) > 0;
        const hasDmg = (row.damage_packages || 0) > 0;
        if (!hasShort && !hasDmg) {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              100% Intact
            </span>
          );
        }
        return (
          <div className="flex flex-col gap-1 items-center">
            {hasShort && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-2.5 h-2.5" />
                {row.shortage_packages} Short
              </span>
            )}
            {hasDmg && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                <AlertTriangle className="w-2.5 h-2.5" />
                {row.damage_packages} Damaged
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "financials",
      header: "Deduction / Addition",
      isNumeric: true,
      cell: (row) => {
        const ded = parseFloat(String(row.total_deductions || 0));
        const pay = parseFloat(String(row.total_additional_payable || 0));
        return (
          <div className="font-mono text-xs text-right">
            {pay > 0 && (
              <div className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-end gap-1">
                <TrendingUp className="w-3 h-3" />
                +{formatCurrency(pay)}
              </div>
            )}
            {ded > 0 && (
              <div className="text-rose-600 dark:text-rose-400 font-semibold flex items-center justify-end gap-1">
                <TrendingDown className="w-3 h-3" />
                -{formatCurrency(ded)}
              </div>
            )}
            {pay === 0 && ded === 0 && (
              <span className="text-gray-400 text-[11px]">₹0.00</span>
            )}
          </div>
        );
      },
    },
    {
      key: "issued_by",
      header: "Issued By",
      cell: (row) => (
        <div className="text-xs">
          <span className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1">
            <User className="w-3 h-3 text-gray-400" />
            {row.issued_by || "Operations"}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setSelectedReport(row)}
            className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded transition-colors"
            title="View Arrival Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedReport(row);
              setTimeout(() => window.print(), 300);
            }}
            className="p-1 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded transition-colors"
            title="Print Arrival Slip"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row.id, row.report_number)}
            className="p-1 text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded transition-colors"
            title="Delete Arrival Report"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Destination Arrival Reports"
        description="Inspect destination vehicle arrivals, record physical unloading counts, log shortages/damages, and compute transit deductions & extra payables."
        breadcrumbs={[
          { label: "Transport", href: "/transport/jobs" },
          { label: "Arrival Reports" },
        ]}
        primaryAction={{
          label: "File Arrival Report",
          icon: <Plus className="w-4 h-4" />,
          onClick: handleOpenCreate,
        }}
      />

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard
          title="Total Arrivals"
          value={kpis.totalReports}
          icon={<PackageCheck className="w-4 h-4 text-indigo-600" />}
          subtext="Documented Hub Unloadings"
        />
        <KpiCard
          title="Delivered Cargo"
          value={`${kpis.totalDeliveredPkgs} Pkgs`}
          icon={<Package className="w-4 h-4 text-emerald-600" />}
          subtext="Physical Count Received"
        />
        <KpiCard
          title="Cargo Exceptions"
          value={kpis.totalExceptions}
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
          subtext="Shortages & Damages Logged"
        />
        <KpiCard
          title="Total Deductions"
          value={formatCurrency(kpis.totalDeductions)}
          icon={<TrendingDown className="w-4 h-4 text-rose-600" />}
          subtext="Damage / Shortage / Delay"
        />
        <KpiCard
          title="Additional Payable"
          value={formatCurrency(kpis.totalPayables)}
          icon={<TrendingUp className="w-4 h-4 text-teal-600" />}
          subtext="Detention, Labour & MIS"
        />
      </div>

      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search Arrival No, LR, Hire Challan, Customer, Vehicle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            className="text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Data Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadData}
        searchPlaceholder="Filter arrival records..."
        emptyMessage="No arrival reports filed yet"
        emptySubtext="Record cargo arrival at destination hub to track unloading counts, transit shortages, damages, and detention deductions."
        emptyAction={{
          label: "File Arrival Report",
          onClick: handleOpenCreate,
        }}
      />

      {/* ========================================================================= */}
      {/* Create Arrival Report Form Drawer */}
      {/* ========================================================================= */}
      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="File Cargo Arrival Report"
        description="Inspect destination unloading, record tally, and document cargo exceptions."
        width="xl"
      >
        <form onSubmit={handleSaveArrivalReport} className="space-y-6 pb-20">
          {/* Card 1: Header / Document Series Info */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  1. Document & Series Information
                </h3>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Automatic Series Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Arrival Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Arrival No <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formArrivalNo}
                    onChange={(e) => setFormArrivalNo(e.target.value)}
                    placeholder="e.g. AR-2026-0001 (Auto-generated)"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 font-mono font-bold text-indigo-700 dark:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                    Auto Sequential
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Consignment Selection & Tagged HC Dropdown */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  2. Select Consignment & Tagged Hire Challan
                </h3>
              </div>
              <span className="text-xs text-gray-400">
                HC strictly filtered by selected LR
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* LR Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Select Consignment (LR) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedLrId}
                  onChange={(e) => handleLrChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                >
                  <option value="">-- Choose Consignment (LR/GR) --</option>
                  {lrOptions.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.lr_number} • {l.customer_name || "Client"} • {l.from_location} → {l.to_location} ({l.package_count} pkgs)
                    </option>
                  ))}
                </select>
              </div>

              {/* Tagged HC Dropdown (Only shows HCs tagged with that LR) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Tagged Hire Challan (HC)
                </label>
                <select
                  value={selectedHcId}
                  disabled={!selectedLrId || availableHCs.length === 0}
                  onChange={(e) => setSelectedHcId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-800/50"
                >
                  {!selectedLrId ? (
                    <option value="">Please select LR first</option>
                  ) : availableHCs.length === 0 ? (
                    <option value="">No Hire Challans tagged to this LR (Direct/Company vehicle)</option>
                  ) : (
                    <>
                      <option value="">-- Choose Tagged Hire Challan --</option>
                      {availableHCs.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.challan_number} • Truck: {h.vehicle_number} • Issued By: {h.issued_by}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Auto-filled Snapshot Overview Grid Card */}
            {currentLR && (
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3 mt-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                  Auto-filled from Selected Consignment & Hire Challan:
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400">Customer</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {currentLR.customer_name || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400">Route (From → To)</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {currentLR.from_location || "Origin"} → {currentLR.to_location || "Dest"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400">LR Date</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {currentLR.lr_date ? formatDate(currentLR.lr_date) : "—"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400">Transit Days / ETA</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {currentLR.transit_days} Days {currentLR.eta ? `(ETA: ${currentLR.eta})` : ""}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400">Booked Package Count</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                      {currentLR.package_count} Pkgs
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400">Booked Weight</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                      {currentLR.weight} MT
                    </span>
                  </div>

                  {/* Issued By - Autofilled by full name of HC creator */}
                  <div>
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400">Issued By (HC Creator)</span>
                    <span className="font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {currentHC?.issued_by || currentLR.hcs?.[0]?.issued_by || "Operations Executive"}
                    </span>
                  </div>

                  {/* Vehicle No - Auto fetched from selected HC, non-editable */}
                  <div>
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400">Vehicle No (Non-editable)</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 font-mono font-bold text-gray-900 dark:text-gray-100 text-xs">
                      <Truck className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                      {currentHC?.vehicle_number || currentLR.hcs?.[0]?.vehicle_number || "Direct"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Delivered Date */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                3. Delivered Date
              </h3>
            </div>

            <div className="max-w-xs">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Actual Delivered Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formDeliveredDate}
                onChange={(e) => setFormDeliveredDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Card 4: Delivery Details (Tally & Condition) */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  4. Delivery Details (Physical Cargo Inspection)
                </h3>
              </div>
              <span className="text-xs text-gray-400">
                Delivered Pkg, Delivered Wt, Shortage Pkg, Shortage Wt, Damage
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Delivered Pkg <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={deliveredPkg}
                  onChange={(e) => handleDeliveredPkgChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono font-bold text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Delivered Wt (MT) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  required
                  value={deliveredWt}
                  onChange={(e) => handleDeliveredWtChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono font-bold text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Shortage Pkg (Auto-calc)
                </label>
                <input
                  type="number"
                  min="0"
                  value={shortagePkg}
                  onChange={(e) => setShortagePkg(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 text-xs rounded-lg border font-mono font-bold focus:outline-none",
                    parseInt(shortagePkg, 10) > 0
                      ? "border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  )}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Shortage Wt (MT)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={shortageWt}
                  onChange={(e) => setShortageWt(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 text-xs rounded-lg border font-mono font-bold focus:outline-none",
                    parseFloat(shortageWt) > 0
                      ? "border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Damaged Pkg Count
                </label>
                <input
                  type="number"
                  min="0"
                  value={damagePkg}
                  onChange={(e) => setDamagePkg(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 text-xs rounded-lg border font-mono font-bold focus:outline-none",
                    parseInt(damagePkg, 10) > 0
                      ? "border-rose-300 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  )}
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Damage Particulars / Seal Inspection Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Moisture damage on 1 box, seal intact upon arrival"
                  value={damageRemarks}
                  onChange={(e) => setDamageRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Card 5: Deduction Section */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  5. Deductions (Debit to Transporter / Vehicle Hire)
                </h3>
              </div>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs">
                Total Deductions: {formatCurrency(totalDeductionsCalc)}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Shortage (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={dedShortage}
                  onChange={(e) => setDedShortage(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Damage (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={dedDamage}
                  onChange={(e) => setDedDamage(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Delay in Transit (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={dedDelay}
                  onChange={(e) => setDedDelay(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Others (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={dedOthers}
                  onChange={(e) => setDedOthers(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Card 6: Additional Payable For */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  6. Additional Payable For (Unloading Expenses)
                </h3>
              </div>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                Total Additional: {formatCurrency(totalAdditionalPayableCalc)}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Detention (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={payDetention}
                  onChange={(e) => setPayDetention(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  MIS / Others (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={payMisOthers}
                  onChange={(e) => setPayMisOthers(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Labour at Unloading (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={payLabour}
                  onChange={(e) => setPayLabour(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Border Expense (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={payBorderExpense}
                  onChange={(e) => setPayBorderExpense(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Card 7: Overall Remarks & Net Balance Strip */}
          <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-5 border border-gray-200 dark:border-gray-700 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                General Unloading & Gate Remarks
              </label>
              <textarea
                rows={2}
                placeholder="Unloading supervisor notes, warehouse bay, vehicle detention log..."
                value={conditionRemarks}
                onChange={(e) => setConditionRemarks(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-200 dark:border-gray-700 font-mono">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                <span>Additions: <strong className="text-emerald-600">+{formatCurrency(totalAdditionalPayableCalc)}</strong></span>
                <span className="mx-2">•</span>
                <span>Deductions: <strong className="text-rose-600">-{formatCurrency(totalDeductionsCalc)}</strong></span>
              </div>

              <div className="text-sm font-bold">
                Net Impact on Transporter Settlement:{" "}
                <span className={netBalanceCalc >= 0 ? "text-emerald-600" : "text-rose-600"}>
                  {netBalanceCalc >= 0 ? "+" : ""}{formatCurrency(netBalanceCalc)}
                </span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDrawerOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-6"
            >
              Record Arrival Report
            </Button>
          </div>
        </form>
      </EntityDrawer>

      {/* ========================================================================= */}
      {/* View Detail Modal / Printable Arrival Slip */}
      {/* ========================================================================= */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-6 my-8">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 font-mono">
                    {selectedReport.report_number}
                  </h2>
                  <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                    {selectedReport.status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Destination Arrival & Cargo Unloading Inspection Slip
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Slip
                </Button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Consignment & Transport Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-xs">
              <div>
                <span className="text-gray-400 block text-[11px]">Arrival Date</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatDate(selectedReport.arrival_date)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Delivered Date</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatDate(selectedReport.delivered_date)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">LR / GR Number</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedReport.lr_number || `LR #${selectedReport.lr_id}`}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Hire Challan (HC)</span>
                <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                  {selectedReport.challan_number || (selectedReport.hire_challan_id ? `HC #${selectedReport.hire_challan_id}` : "Direct")}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Vehicle Number</span>
                <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                  {selectedReport.vehicle_number || "—"}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Issued By (HC Creator)</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {selectedReport.issued_by || "Operations"}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Billing Client</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100 truncate block">
                  {selectedReport.customer_name || "—"}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Route</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100 truncate block">
                  {selectedReport.from_location} → {selectedReport.to_location}
                </span>
              </div>
            </div>

            {/* Delivery Tally Comparison */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left font-mono">
                <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="py-2 px-3">Cargo Metric</th>
                    <th className="py-2 px-3 text-right">Booked Quantity</th>
                    <th className="py-2 px-3 text-right">Delivered Quantity</th>
                    <th className="py-2 px-3 text-right">Shortage</th>
                    <th className="py-2 px-3 text-right">Damaged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Package Units</td>
                    <td className="py-2.5 px-3 text-right">{selectedReport.booked_packages || 0} Pkgs</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{selectedReport.delivered_packages} Pkgs</td>
                    <td className="py-2.5 px-3 text-right text-amber-600 font-bold">{selectedReport.shortage_packages || 0}</td>
                    <td className="py-2.5 px-3 text-right text-rose-600 font-bold">{selectedReport.damage_packages || 0}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Weight (MT)</td>
                    <td className="py-2.5 px-3 text-right">{parseFloat(String(selectedReport.booked_weight || 0)).toFixed(3)} MT</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{parseFloat(String(selectedReport.delivered_weight || 0)).toFixed(3)} MT</td>
                    <td className="py-2.5 px-3 text-right text-amber-600 font-bold">{parseFloat(String(selectedReport.shortage_weight || 0)).toFixed(3)} MT</td>
                    <td className="py-2.5 px-3 text-right text-gray-400">—</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Financial Details: Deductions & Additions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              {/* Deductions breakdown */}
              <div className="border border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between font-bold text-rose-700 dark:text-rose-300 pb-2 border-b border-rose-200 dark:border-rose-900">
                  <span>Deductions Applied</span>
                  <span>{formatCurrency(parseFloat(String(selectedReport.total_deductions || 0)))}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Shortage Deduction:</span>
                  <span>{formatCurrency(parseFloat(String(selectedReport.deduction_shortage || 0)))}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Damage Deduction:</span>
                  <span>{formatCurrency(parseFloat(String(selectedReport.deduction_damage || 0)))}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Delay in Transit:</span>
                  <span>{formatCurrency(parseFloat(String(selectedReport.deduction_delay || 0)))}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Other Deductions:</span>
                  <span>{formatCurrency(parseFloat(String(selectedReport.deduction_others || 0)))}</span>
                </div>
              </div>

              {/* Additional Payable breakdown */}
              <div className="border border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between font-bold text-emerald-700 dark:text-emerald-300 pb-2 border-b border-emerald-200 dark:border-emerald-900">
                  <span>Additional Payable For</span>
                  <span>{formatCurrency(parseFloat(String(selectedReport.total_additional_payable || 0)))}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Detention:</span>
                  <span>{formatCurrency(parseFloat(String(selectedReport.payable_detention || 0)))}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Labour at Unloading:</span>
                  <span>{formatCurrency(parseFloat(String(selectedReport.payable_labour || 0)))}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Border Expense:</span>
                  <span>{formatCurrency(parseFloat(String(selectedReport.payable_border_expense || 0)))}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>MIS / Others:</span>
                  <span>{formatCurrency(parseFloat(String(selectedReport.payable_mis_others || 0)))}</span>
                </div>
              </div>
            </div>

            {/* Condition Notes */}
            {selectedReport.condition_remarks && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs">
                <span className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Condition / Gate Remarks:
                </span>
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedReport.condition_remarks}
                </p>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-800">
              <Button variant="outline" onClick={() => setSelectedReport(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
