"use client";
import { toast } from "@/lib/toast";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Plus, ArrowRight, Truck, FileText, CheckCircle2, Clock, Layers, Sparkles, FileSpreadsheet, Pencil, Printer, ScanSearch, Check, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { Form } from "@/components/forms/form";
import { StatusBadge } from "@/components/ui/badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useWorkspaceTabs } from "@/lib/workspace-tabs-context";
import { JobExcelImportModal } from "@/components/modals/job-excel-import-modal";
import { JobOrderViewModal } from "@/components/modals/job-order-view-modal";
import { LRViewModal } from "@/components/modals/lr-view-modal";
import { HireChallanViewModal } from "@/components/modals/hire-challan-view-modal";
import { TransportInvoicePrintModal } from "@/components/modals/transport-invoice-print-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface JobRecord {
  id: number;
  job_number: string;
  job_date: string;
  consigner_id: number;
  consignee_id: number;
  origin_location_id?: number;
  destination_location_id?: number;
  billing_client_id?: number;
  billing_party?: string;
  billing_client_name?: string;
  consigner_name?: string;
  consigner_code?: string;
  consignee_name?: string;
  consignee_code?: string;
  origin_city?: string;
  destination_city?: string;
  expected_dispatch_date?: string;
  cargo_description?: string;
  estimated_weight_mt?: string | number;
  estimated_packages?: number;
  status: string;
  special_instructions?: string;
  lr_id?: number;
  lr_number?: string;
  linked_lrs?: string[];
  vehicle_number?: string;
  driver_name?: string;
  challan_id?: number;
  challan_number?: string;
  invoice_id?: number;
  is_invoiced?: boolean;
  invoice_number?: string;
  created_at: string;
}

interface SelectOption {
  id: number;
  name?: string;
  code?: string;
  city_name?: string;
  state?: string;
  pincode?: string;
}

import { getActiveOffice } from "@/lib/auth";

export default function JobsPage() {
  const router = useRouter();
  const [data, setData] = useState<JobRecord[]>([]);
  const [billingClients, setBillingClients] = useState<SelectOption[]>([]);
  const [consigners, setConsigners] = useState<SelectOption[]>([]);
  const [consignees, setConsignees] = useState<SelectOption[]>([]);
  const [locations, setLocations] = useState<SelectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockedJobPopup, setLockedJobPopup] = useState<JobRecord | null>(null);

  const searchLocationOptions = useCallback(async (query: string) => {
    const results = await apiClient<Array<{ id: number; city_name: string; state?: string; pincode?: string }>>(
      `/api/v1/general/locations/search?q=${encodeURIComponent(query)}`
    );
    if (Array.isArray(results) && results.length > 0) {
      setLocations((prev) => {
        const existingIds = new Set(prev.map((l) => String(l.id)));
        const newItems = results.filter((r) => !existingIds.has(String(r.id)));
        return newItems.length > 0 ? [...prev, ...newItems] : prev;
      });
    }
    return (results || []).filter((location) => location.city_name).map((location) => ({
      label: [location.city_name, location.state, location.pincode].filter(Boolean).join(", "),
      value: String(location.id),
      keywords: [location.pincode || ""],
    }));
  }, []);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Drawer / Form state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formInitialValues, setFormInitialValues] = useState<Record<string, any>>({});
  const [seriesInfo, setSeriesInfo] = useState<any>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>("");
  const formSetFieldValueRef = useRef<((name: string, value: any) => void) | null>(null);

  const { openMasterTab } = useWorkspaceTabs();

  // Excel Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // View & Edit Modal states
  const [viewingJob, setViewingJob] = useState<JobRecord | null>(null);
  const [editingJob, setEditingJob] = useState<JobRecord | null>(null);
  const [activeOffice, setActiveOfficeState] = useState<any>(() => getActiveOffice());
  const editingJobRef = useRef<JobRecord | null>(null);
  editingJobRef.current = editingJob;

  // Print preview modal states for LR, Challan, Invoice
  const [viewingLr, setViewingLr] = useState<any | null>(null);
  const [viewingChallan, setViewingChallan] = useState<any | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);

  const handleOpenLrPrint = async (lrId?: number, lrNumber?: string) => {
    if (!lrId && !lrNumber) return;
    try {
      if (lrId) {
        const fullLr = await apiClient<any>(`/api/v1/transport/lrs/${lrId}`);
        setViewingLr(fullLr);
      } else if (lrNumber) {
        const results = await apiClient<any[]>(`/api/v1/transport/lrs?search=${encodeURIComponent(lrNumber)}`);
        if (results && results.length > 0) {
          setViewingLr(results[0]);
        } else {
          toast.error(`Could not find LR #${lrNumber}`);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load LR print preview");
    }
  };

  const handleOpenChallanPrint = async (challanId?: number, challanNumber?: string) => {
    if (!challanId && !challanNumber) return;
    try {
      if (challanId) {
        const fullChallan = await apiClient<any>(`/api/v1/transport/hire-challans/${challanId}`);
        setViewingChallan(fullChallan);
      } else {
        toast.error("Hire Challan ID not available for print preview");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load Hire Challan print preview");
    }
  };

  const handleOpenInvoicePrint = async (invoiceId?: number, invoiceNumber?: string, lrId?: number) => {
    if (!invoiceId && !invoiceNumber && !lrId) return;
    try {
      if (invoiceId) {
        const fullInvoice = await apiClient<any>(`/api/v1/accounts/vouchers/${invoiceId}`);
        setViewingInvoice(fullInvoice);
      } else if (invoiceNumber) {
        const results = await apiClient<any>(`/api/v1/accounts/vouchers?search=${encodeURIComponent(invoiceNumber)}`);
        const items = Array.isArray(results) ? results : (results?.items || []);
        if (items.length > 0) {
          setViewingInvoice(items[0]);
        } else {
          toast.error(`Could not find Freight Invoice #${invoiceNumber}`);
        }
      } else if (lrId) {
        const results = await apiClient<any>(`/api/v1/accounts/vouchers?lr_id=${lrId}`);
        const items = Array.isArray(results) ? results : (results?.items || []);
        if (items.length > 0) {
          setViewingInvoice(items[0]);
        } else {
          toast.error("Invoice voucher not found for this LR");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load Freight Invoice print preview");
    }
  };

  const loadData = useCallback(async (targetOffice?: any) => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const office = targetOffice !== undefined ? targetOffice : getActiveOffice();
      setActiveOfficeState(office);
      const officeParam = office?.id ? `?office_id=${office.id}` : "";
      const [jobsRes, billingClientsRes, consignersRes, consigneesRes, locationsRes, seriesRes] = await Promise.all([
        apiClient<JobRecord[]>(`/api/v1/transport/jobs${officeParam}`),
        apiClient<SelectOption[]>("/api/v1/general/billing-clients").catch(() => []),
        apiClient<SelectOption[]>("/api/v1/general/consigners"),
        apiClient<SelectOption[]>("/api/v1/general/consignees"),
        apiClient<{ items: SelectOption[] }>("/api/v1/general/locations?page_size=100"),
        apiClient<any>(`/api/v1/settings/series/check/JOB${officeParam}`).catch(() => null),
      ]);
      setData(Array.isArray(jobsRes) ? jobsRes : []);
      setBillingClients(Array.isArray(billingClientsRes) ? billingClientsRes : []);
      setConsigners(Array.isArray(consignersRes) ? consignersRes : []);
      setConsignees(Array.isArray(consigneesRes) ? consigneesRes : []);
      setLocations(locationsRes.items || []);
      setSeriesInfo(seriesRes);

      // If create drawer is open, auto-refresh form with new office's series and next number
      const initialSeries = seriesRes?.series_options?.[0];
      const initialSeriesId = initialSeries ? String(initialSeries.id) : "default";
      setSelectedSeriesId(initialSeriesId);
      const initialJobNo = initialSeries?.next_number_formatted || seriesRes?.next_number_formatted || "";

      if (!editingJobRef.current) {
        setFormInitialValues((prev) => ({
          ...prev,
          job_series_id: initialSeriesId,
          job_number: initialJobNo,
          issuing_office_id: office?.id,
        }));
        if (formSetFieldValueRef.current) {
          formSetFieldValueRef.current("job_series_id", initialSeriesId);
          formSetFieldValueRef.current("job_number", initialJobNo);
        }
      }
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load jobs.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleOfficeChange = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const newOffice = customEvent.detail || getActiveOffice();
      loadData(newOffice);
    };
    const handleJobsUpdated = () => {
      loadData();
    };
    window.addEventListener("panther_office_changed", handleOfficeChange);
    window.addEventListener("panther_jobs_updated", handleJobsUpdated);
    window.addEventListener("focus", handleJobsUpdated);
    return () => {
      window.removeEventListener("panther_office_changed", handleOfficeChange);
      window.removeEventListener("panther_jobs_updated", handleJobsUpdated);
      window.removeEventListener("focus", handleJobsUpdated);
    };
  }, [loadData]);

  const stats = useMemo(() => {
    const total = data.length;
    const open = data.filter((d) => d.status === "OPEN").length;
    const dispatched = data.filter((d) => d.status === "BOOKED" || d.status === "DISPATCHED").length;
    const delivered = data.filter((d) => d.status === "DELIVERED" || d.status === "CLOSED").length;
    return { total, open, dispatched, delivered };
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const match =
          item.job_number?.toLowerCase().includes(term) ||
          item.billing_party?.toLowerCase().includes(term) ||
          item.billing_client_name?.toLowerCase().includes(term) ||
          item.consigner_name?.toLowerCase().includes(term) ||
          item.consignee_name?.toLowerCase().includes(term) ||
          item.origin_city?.toLowerCase().includes(term) ||
          item.destination_city?.toLowerCase().includes(term) ||
          item.cargo_description?.toLowerCase().includes(term) ||
          item.lr_number?.toLowerCase().includes(term) ||
          item.challan_number?.toLowerCase().includes(term) ||
          item.invoice_number?.toLowerCase().includes(term) ||
          item.vehicle_number?.toLowerCase().includes(term);
        if (!match) return false;
      }
      return true;
    });
  }, [data, statusFilter, searchTerm]);

  const normalizePartyName = (name?: string) => name?.trim().toLowerCase().replace(/[^a-z0-9]/g, "") || "";

  const columns: ColumnDef<JobRecord>[] = [
    {
      key: "job_number",
      header: "Job Number",
      sortable: true,
      minWidth: "125px",
      cell: (row) => (
        <div>
          <button
            type="button"
            onClick={() => setViewingJob(row)}
            className="font-mono font-bold text-slate-900 dark:text-white hover:text-indigo-600 transition-colors text-xs text-left cursor-pointer"
            title="Click to view Trip Order voucher"
          >
            {row.job_number}
          </button>
          <span className="text-[11px] font-mono text-slate-500 block">
            {formatDate(row.job_date)}
          </span>
        </div>
      ),
    },
    {
      key: "billing_party",
      header: "Billing Client",
      sortable: true,
      minWidth: "170px",
      cell: (row) => (
        <div className="max-w-[210px]">
          <span
            className="font-semibold text-slate-900 dark:text-slate-100 block text-xs truncate"
            title={row.billing_client_name || row.billing_party || "-"}
          >
            {row.billing_client_name || row.billing_party || "-"}
          </span>
        </div>
      ),
    },
    {
      key: "parties",
      header: "Consignor → Consignee",
      minWidth: "190px",
      cell: (row) => {
        const client = row.billing_client_name || row.billing_party || "";
        const consigner = row.consigner_name || "";
        const consignee = row.consignee_name || "";

        const normClient = normalizePartyName(client);
        const normConsigner = normalizePartyName(consigner);
        const normConsignee = normalizePartyName(consignee);

        const isSameConsignerConsignee = Boolean(normConsigner && normConsignee && normConsigner === normConsignee);
        const isSameAsClient = Boolean(isSameConsignerConsignee && normClient && normConsigner === normClient);

        if (isSameAsClient) {
          return (
            <div className="text-xs text-slate-500 dark:text-slate-400 italic">
              Same as Billing Client
            </div>
          );
        }

        if (isSameConsignerConsignee) {
          return (
            <div className="max-w-[220px]">
              <span className="font-medium text-slate-900 dark:text-slate-100 block text-xs truncate" title={consigner}>
                {consigner || `Party #${row.consigner_id}`}
              </span>
              <span className="text-[11px] text-slate-400 italic block">
                (Consignor & Consignee same)
              </span>
            </div>
          );
        }

        return (
          <div className="max-w-[220px]">
            <span className="font-medium text-slate-900 dark:text-slate-100 block text-xs truncate" title={consigner}>
              {consigner || `Consignor #${row.consigner_id}`}
            </span>
            <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate" title={consignee}>
              <span className="text-slate-400">To:</span> {consignee || `Consignee #${row.consignee_id}`}
            </span>
          </div>
        );
      },
    },
    {
      key: "route",
      header: "Origin → Destination",
      minWidth: "160px",
      cell: (row) => {
        const origin = row.origin_city?.trim();
        const dest = row.destination_city?.trim();
        const isSameCity = Boolean(origin && dest && origin.toLowerCase() === dest.toLowerCase());

        if (isSameCity) {
          return (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-medium text-slate-900 dark:text-slate-100">{origin}</span>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                Local
              </span>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200 font-medium whitespace-nowrap">
            <span>{origin || "—"}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{dest || "—"}</span>
          </div>
        );
      },
    },
    {
      key: "vehicle_number",
      header: "Vehicle",
      minWidth: "110px",
      cell: (row) => (
        <div>
          <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 block text-xs">
            {row.vehicle_number || "—"}
          </span>
          {row.driver_name && (
            <span className="text-[11px] text-slate-500 block truncate max-w-[120px]" title={row.driver_name}>
              {row.driver_name}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "cargo",
      header: "Est. Weight",
      isNumeric: true,
      minWidth: "105px",
      cell: (row) => {
        const wt = row.estimated_weight_mt ? parseFloat(String(row.estimated_weight_mt)) : 0;
        const pkgs = row.estimated_packages ? Number(row.estimated_packages) : 0;

        return (
          <div>
            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 block text-xs tabular-nums">
              {wt > 0 ? `${wt.toFixed(2)} MT` : "—"}
            </span>
            {pkgs > 0 && (
              <span className="text-[11px] text-slate-500 font-mono block">
                {pkgs} pkgs
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Trip Status",
      align: "center",
      minWidth: "110px",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "linkage",
      header: "Linked Documents",
      minWidth: "165px",
      cell: (row) => {
        const hasLr = Boolean(row.lr_number || row.lr_id || (row.linked_lrs && row.linked_lrs.length > 0));
        const lrDisplay = row.lr_number || (row.linked_lrs && row.linked_lrs[0]);
        const hasChallan = Boolean(row.challan_number || row.challan_id);
        const hasInvoice = Boolean(row.is_invoiced || row.invoice_number);

        return (
          <div className="flex flex-col gap-1 items-start min-w-[145px]">
            {/* Primary Document: LR + 360 trace icon */}
            <div className="flex items-center gap-1.5 w-full">
              {hasLr ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenLrPrint(row.lr_id, row.lr_number);
                  }}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
                  title="Click to open LR print preview"
                >
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-mono">LR #{lrDisplay}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/transport/lr-booking?job_id=${row.id}`);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
                  title="No LR linked. Click to book LR for this trip"
                >
                  <Plus className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>Book LR</span>
                </button>
              )}

              {/* 360 Traceability Shortcut */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/transport/consignment-360?q=${encodeURIComponent(row.job_number)}`);
                }}
                className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded transition-colors ml-auto cursor-pointer"
                title="Open 360° Traceability Lifecycle"
              >
                <ScanSearch className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Downstream Chain: Challan & Invoice */}
            <div className="flex items-center gap-1 w-full flex-wrap">
              {hasChallan && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenChallanPrint(row.challan_id, row.challan_number);
                  }}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors cursor-pointer"
                  title={row.challan_number ? `Click to open Hire Challan #${row.challan_number} print preview` : "Click to open Hire Challan print preview"}
                >
                  <Check className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>{row.challan_number ? `HC #${row.challan_number}` : "Challan"}</span>
                </button>
              )}

              {hasInvoice && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenInvoicePrint(row.invoice_id, row.invoice_number, row.lr_id);
                  }}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors cursor-pointer"
                  title={row.invoice_number ? `Click to open Freight Invoice #${row.invoice_number} print preview` : "Click to open Freight Invoice print preview"}
                >
                  <Check className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>{row.invoice_number ? `Inv #${row.invoice_number}` : "Invoiced"}</span>
                </button>
              )}

              {!hasChallan && !hasInvoice && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  {hasLr ? "Pending dispatch" : "Draft trip"}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
  ];

  const handleEditClick = (row: JobRecord) => {
    if (row.lr_number || row.lr_id || (row.linked_lrs && row.linked_lrs.length > 0)) {
      setLockedJobPopup(row);
      return;
    }
    openEditJobDrawer(row);
  };

  const actions: RowAction<JobRecord>[] = [
    {
      label: "View 360° Traceability",
      icon: <ScanSearch className="w-4 h-4 text-emerald-600" />,
      onClick: (row) => {
        router.push(`/transport/consignment-360?q=${encodeURIComponent(row.job_number)}`);
      },
    },
    {
      label: "Print Preview",
      icon: <Printer className="w-4 h-4 text-slate-600" />,
      onClick: (row) => {
        setViewingJob(row);
      },
    },
    {
      label: "Edit",
      icon: <Pencil className="w-4 h-4 text-blue-600" />,
      onClick: (row) => {
        handleEditClick(row);
      },
      disabled: (row) => row.status === "CLOSED" || row.status === "CANCELLED",
    },
    {
      label: "Book GR/LR",
      icon: <Truck className="w-4 h-4 text-emerald-600" />,
      onClick: (row) => {
        router.push(`/transport/lr-booking?job_id=${row.id}`);
      },
      hidden: (row) => Boolean(row.lr_number),
    },
    {
      label: "View LR",
      icon: <Truck className="w-4 h-4 text-indigo-600" />,
      onClick: (row) => {
        if (row.lr_id) {
          router.push(`/transport/lr-booking?edit=${row.lr_id}`);
        } else if (row.lr_number) {
          router.push(`/transport/lr-booking?search=${encodeURIComponent(row.lr_number)}`);
        }
      },
      hidden: (row) => !row.lr_number,
    },
  ];

  const handleBillingClientCreated = (newClient: { id: number | string; label?: string; name?: string }) => {
    setBillingClients((prev) => [{ id: Number(newClient.id), name: newClient.name || newClient.label }, ...prev]);
    setFormInitialValues((prev) => ({ ...prev, billing_client_id: String(newClient.id) }));
    formSetFieldValueRef.current?.("billing_client_id", String(newClient.id));
  };

  const handleConsignerCreated = (newConsigner: { id: number | string; label?: string; name?: string }) => {
    setConsigners((prev) => [{ id: Number(newConsigner.id), name: newConsigner.name || newConsigner.label }, ...prev]);
    setFormInitialValues((prev) => ({ ...prev, consigner_id: String(newConsigner.id) }));
    formSetFieldValueRef.current?.("consigner_id", String(newConsigner.id));
  };

  const handleConsigneeCreated = (newConsignee: { id: number | string; label?: string; name?: string }) => {
    setConsignees((prev) => [{ id: Number(newConsignee.id), name: newConsignee.name || newConsignee.label }, ...prev]);
    setFormInitialValues((prev) => ({ ...prev, consignee_id: String(newConsignee.id) }));
    formSetFieldValueRef.current?.("consignee_id", String(newConsignee.id));
  };

  const handleLocationCreated = (newLoc: { id: number | string; city_name?: string; label?: string }, field: "origin_location_id" | "destination_location_id") => {
    setLocations((prev) => [{ id: Number(newLoc.id), city_name: newLoc.city_name || newLoc.label }, ...prev]);
    setFormInitialValues((prev) => ({ ...prev, [field]: String(newLoc.id) }));
    formSetFieldValueRef.current?.(field, String(newLoc.id));
  };

  const billingClientOptions = billingClients
    .filter((b: any) => b.is_active !== false || String(b.id) === String(editingJob?.billing_client_id))
    .map((b) => ({
      label: b.name ? `${b.name}${b.code ? ` (${b.code})` : ""}` : `Billing Client #${b.id}`,
      value: String(b.id),
    }));

  const consignerOptions = consigners
    .filter((c: any) => c.is_active !== false || String(c.id) === String(editingJob?.consigner_id))
    .map((c) => ({
      label: c.name || `Consignor #${c.id}`,
      value: String(c.id),
    }));

  const consigneeOptions = consignees
    .filter((c: any) => c.is_active !== false || String(c.id) === String(editingJob?.consignee_id))
    .map((c) => ({
      label: c.name || `Consignee #${c.id}`,
      value: String(c.id),
    }));

  const locationOptions = locations
    .filter((l: any) => l.is_active !== false || String(l.id) === String(editingJob?.origin_location_id) || String(l.id) === String(editingJob?.destination_location_id))
    .map((l) => ({
      label: l.city_name ? [l.city_name, l.state, l.pincode].filter(Boolean).join(", ") : `Location #${l.id}`,
      value: String(l.id),
    }));

  const seriesOptions = useMemo(() => {
    if (seriesInfo?.series_options && seriesInfo.series_options.length > 0) {
      return seriesInfo.series_options.map((s: any) => ({
        value: String(s.id),
        label: s.display_label || `${s.series_name} (${s.next_number_formatted})`,
      }));
    }
    if (seriesInfo?.configured) {
      return [{
        value: "default",
        label: `Default Series (${seriesInfo.next_number_formatted})`,
      }];
    }
    return [{ value: "default", label: "Default Job Sequence" }];
  }, [seriesInfo]);

  const activeSeries = useMemo(() => {
    if (seriesInfo?.series_options && seriesInfo.series_options.length > 0) {
      if (selectedSeriesId && selectedSeriesId !== "default") {
        const found = seriesInfo.series_options.find((s: any) => String(s.id) === String(selectedSeriesId));
        if (found) return found;
      }
      return seriesInfo.series_options[0];
    }
    return seriesInfo;
  }, [seriesInfo, selectedSeriesId]);

  const activeNextNumber = editingJob?.job_number || activeSeries?.next_number_formatted || seriesInfo?.next_number_formatted || "";

  const formSections: FormSectionDef[] = [
    {
      id: "job_order_specification",
      title: "Job Order Specification",
      description: "Auto-allocated Job Number, billing party, scheduled dates, and cargo details",
      columns: 2,
      fields: [
        {
          name: "job_series_id",
          label: "Select Series",
          type: "select",
          options: seriesOptions,
          disabled: Boolean(editingJob) || seriesOptions.length <= 1,
          disabledReason: editingJob
            ? "Cannot modify series of an existing job"
            : seriesOptions.length <= 1
            ? "Only one series configured for this branch"
            : undefined,
          defaultValue: selectedSeriesId || (seriesOptions[0]?.value ?? "default"),
          onChange: (newVal: string) => {
            setSelectedSeriesId(newVal);
            const matched = seriesInfo?.series_options?.find((s: any) => String(s.id) === String(newVal));
            const nextNum = matched?.next_number_formatted || seriesInfo?.next_number_formatted || "";
            if (formSetFieldValueRef.current) {
              formSetFieldValueRef.current("job_number", nextNum);
            }
          },
          colSpan: 1,
        },
        {
          name: "job_number",
          label: "Job Number (Locked)",
          type: "text",
          disabled: true,
          disabledReason: "Sequence number is allocated automatically from the selected series.",
          placeholder: activeNextNumber || "Auto-allocated",
          helperText: `Allocated Sequence: ${activeNextNumber || "Auto-allocated upon creation"}`,
          colSpan: 1,
        },
        {
          name: "billing_client_id",
          label: "Billing Client",
          type: "select",
          required: true,
          options: billingClientOptions,
          placeholder: "Select Billing Client",
          onAddNew: () => openMasterTab({ type: "billing_client", title: "Add Billing Client", onSuccess: handleBillingClientCreated }),
          addNewLabel: "+ Add New Billing Client",
          addNewTitle: "Register new corporate billing client in TMS tab",
          colSpan: 1,
        },
        {
          name: "origin_location_id",
          label: "Origin Location",
          type: "select",
          required: true,
          options: locationOptions,
          onSearch: searchLocationOptions,
          placeholder: "Select Origin Location",
          onAddNew: () => openMasterTab({ type: "location", title: "Add Location", onSuccess: (rec) => handleLocationCreated(rec, "origin_location_id") }),
          addNewLabel: "+ Add New Origin Location",
          addNewTitle: "Create origin city / hub in TMS tab",
        },
        {
          name: "destination_location_id",
          label: "Destination Location",
          type: "select",
          required: true,
          options: locationOptions,
          onSearch: searchLocationOptions,
          placeholder: "Select Destination Location",
          onAddNew: () => openMasterTab({ type: "location", title: "Add Location", onSuccess: (rec) => handleLocationCreated(rec, "destination_location_id") }),
          addNewLabel: "+ Add New Destination Location",
          addNewTitle: "Create destination city / hub in TMS tab",
        },
        {
          name: "job_date",
          label: "Date of Job Creation",
          type: "date",
          required: true,
          defaultValue: new Date().toISOString().split("T")[0],
        },
        {
          name: "expected_dispatch_date",
          label: "Scheduled Dispatch Date",
          type: "date",
          required: false,
          defaultValue: new Date().toISOString().split("T")[0],
        },
        {
          name: "consigner_id",
          label: "Consignor",
          type: "select",
          required: true,
          options: consignerOptions,
          placeholder: "Select Consignor",
          onAddNew: () => openMasterTab({ type: "consigner", title: "Add Consignor", onSuccess: handleConsignerCreated }),
          addNewLabel: "+ Add New Consignor",
          addNewTitle: "Create and register consignor in TMS tab",
        },
        {
          name: "consignee_id",
          label: "Consignee",
          type: "select",
          required: true,
          options: consigneeOptions,
          placeholder: "Select Consignee",
          onAddNew: () => openMasterTab({ type: "consignee", title: "Add Consignee", onSuccess: handleConsigneeCreated }),
          addNewLabel: "+ Add New Consignee",
          addNewTitle: "Create and register consignee in TMS tab",
        },
        {
          name: "cargo_description",
          label: "Cargo Description",
          placeholder: "e.g. Industrial Steel Coils, FMCG, Commercial Cargo",
          colSpan: 2,
        },
        {
          name: "estimated_weight_mt",
          label: "Estimated Weight",
          placeholder: "e.g. 24.50 MT (Optional)",
          type: "number",
          required: false,
        },
        {
          name: "estimated_packages",
          label: "Total Packages",
          placeholder: "e.g. 150 pkgs (Optional)",
          type: "number",
          required: false,
        },
        {
          name: "special_instructions",
          label: "Special Instructions",
          placeholder: "e.g. Handle with care, keep dry, temperature sensitive",
          type: "textarea",
          required: false,
          colSpan: 2,
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const rawSeriesId = values.job_series_id || selectedSeriesId;
      const parsedSeriesId = rawSeriesId && rawSeriesId !== "default" ? parseInt(rawSeriesId, 10) : undefined;
      const selectedBc = billingClients.find((b) => String(b.id) === String(values.billing_client_id));
      const payload = {
        job_series_id: parsedSeriesId,
        job_number: editingJob ? values.job_number : undefined,
        job_date: values.job_date || new Date().toISOString().split("T")[0],
        expected_dispatch_date: values.expected_dispatch_date || undefined,
        billing_client_id: values.billing_client_id ? parseInt(values.billing_client_id, 10) : undefined,
        billing_party: selectedBc?.name || undefined,
        consigner_id: parseInt(values.consigner_id, 10),
        consignee_id: parseInt(values.consignee_id, 10),
        origin_location_id: values.origin_location_id ? parseInt(values.origin_location_id, 10) : undefined,
        destination_location_id: values.destination_location_id ? parseInt(values.destination_location_id, 10) : undefined,
        cargo_description: values.cargo_description || undefined,
        estimated_weight_mt: values.estimated_weight_mt !== undefined && values.estimated_weight_mt !== "" ? parseFloat(values.estimated_weight_mt) : 0,
        estimated_packages: values.estimated_packages !== undefined && values.estimated_packages !== "" ? parseInt(values.estimated_packages, 10) : 0,
        special_instructions: values.special_instructions || undefined,
      };

      if (editingJob) {
        await apiClient(`/api/v1/transport/jobs/${editingJob.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success(`Trip order ${editingJob.job_number} updated successfully.`);
      } else {
        const created = await apiClient<JobRecord>("/api/v1/transport/jobs", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success(`Trip order ${created?.job_number || ""} created successfully.`);
      }
      setIsDrawerOpen(false);
      setEditingJob(null);
      await loadData();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("panther_jobs_updated"));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save trip / job.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateJobDrawer = useCallback(() => {
    setEditingJob(null);
    const currentOffice = getActiveOffice();
    setActiveOfficeState(currentOffice);
    const initialSeries = seriesInfo?.series_options?.[0];
    const initialSeriesId = initialSeries ? String(initialSeries.id) : "default";
    setSelectedSeriesId(initialSeriesId);
    const initialJobNo = initialSeries?.next_number_formatted || seriesInfo?.next_number_formatted || "";
    setFormInitialValues({
      issuing_office_id: currentOffice?.id,
      job_series_id: initialSeriesId,
      job_number: initialJobNo,
      job_date: new Date().toISOString().split("T")[0],
      expected_dispatch_date: new Date().toISOString().split("T")[0],
      billing_client_id: "",
      origin_location_id: "",
      destination_location_id: "",
      consigner_id: "",
      consignee_id: "",
      cargo_description: "",
      estimated_weight_mt: "",
      estimated_packages: "",
      special_instructions: "",
    });
    setIsDrawerOpen(true);
  }, [seriesInfo]);

  // Auto-open create drawer if URL contains ?add=true
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("add") === "true") {
        openCreateJobDrawer();
      }
    }
  }, [openCreateJobDrawer]);

  const openEditJobDrawer = (row: JobRecord) => {
    setEditingJob(row);

    // Pre-populate dropdown master lists if row's references are not in active state lists
    if (row.billing_client_id) {
      const bId = row.billing_client_id;
      setBillingClients((prev) => {
        if (prev.some((b) => String(b.id) === String(bId))) return prev;
        return [{ id: bId, name: row.billing_client_name || row.billing_party || `Client #${bId}` }, ...prev];
      });
    }
    if (row.consigner_id) {
      const cId = row.consigner_id;
      setConsigners((prev) => {
        if (prev.some((c) => String(c.id) === String(cId))) return prev;
        return [{ id: cId, name: row.consigner_name || `Consignor #${cId}`, code: row.consigner_code }, ...prev];
      });
    }
    if (row.consignee_id) {
      const eId = row.consignee_id;
      setConsignees((prev) => {
        if (prev.some((c) => String(c.id) === String(eId))) return prev;
        return [{ id: eId, name: row.consignee_name || `Consignee #${eId}`, code: row.consignee_code }, ...prev];
      });
    }

    setLocations((prev) => {
      const updated = [...prev];
      if (row.origin_location_id && !updated.some((l) => String(l.id) === String(row.origin_location_id))) {
        updated.push({
          id: row.origin_location_id,
          city_name: row.origin_city || `Location #${row.origin_location_id}`,
        });
      }
      if (row.destination_location_id && !updated.some((l) => String(l.id) === String(row.destination_location_id))) {
        updated.push({
          id: row.destination_location_id,
          city_name: row.destination_city || `Location #${row.destination_location_id}`,
        });
      }
      return updated;
    });

    setFormInitialValues({
      job_series_id: "default",
      job_number: row.job_number,
      billing_client_id: row.billing_client_id ? String(row.billing_client_id) : "",
      origin_location_id: row.origin_location_id ? String(row.origin_location_id) : "",
      destination_location_id: row.destination_location_id ? String(row.destination_location_id) : "",
      job_date: row.job_date,
      expected_dispatch_date: row.expected_dispatch_date || "",
      consigner_id: String(row.consigner_id),
      consignee_id: String(row.consignee_id),
      cargo_description: row.cargo_description || "",
      estimated_weight_mt: row.estimated_weight_mt !== undefined && row.estimated_weight_mt !== null ? String(row.estimated_weight_mt) : "",
      estimated_packages: row.estimated_packages !== undefined && row.estimated_packages !== null ? String(row.estimated_packages) : "",
      special_instructions: row.special_instructions || "",
    });
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trips & Job Orders"
        description="Create freight dispatch bookings, monitor corridor routes, and transition to LRs."
        primaryAction={{
          label: "Create Trip Order",
          icon: <Plus className="w-4 h-4" />,
          onClick: openCreateJobDrawer,
        }}
        secondaryActions={[
          {
            label: "Import from Excel",
            icon: <FileSpreadsheet className="w-4 h-4 text-emerald-600" />,
            onClick: () => setIsImportModalOpen(true),
            variant: "outline",
          },
        ]}
      />

      {/* Operational KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Trips Created"
          value={stats.total.toLocaleString()}
          subtext="Active transport bookings"
          icon={<Truck className="w-4 h-4" />}
        />
        <KpiCard
          title="Open Dispatch"
          value={stats.open.toLocaleString()}
          subtext="Awaiting carrier assignment"
          icon={<Clock className="w-4 h-4 text-amber-600" />}
        />
        <KpiCard
          title="Booked / In Transit"
          value={stats.dispatched.toLocaleString()}
          subtext="LR booked & vehicles en route"
          icon={<Layers className="w-4 h-4 text-blue-600" />}
        />
        <KpiCard
          title="Delivered / Closed"
          value={stats.delivered.toLocaleString()}
          subtext="Completed trip consignments"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
        />
      </div>

      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search job number, billing client, consignor, consignee, route..."
        filters={[
          {
            id: "status",
            label: "Filter Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "All Statuses", value: "ALL" },
              { label: "Open", value: "OPEN" },
              { label: "Booked", value: "BOOKED" },
              { label: "Dispatched", value: "DISPATCHED" },
              { label: "Delivered", value: "DELIVERED" },
              { label: "Closed", value: "CLOSED" },
              { label: "Cancelled", value: "CANCELLED" },
            ],
          },
        ]}
        onClear={() => {
          setSearchTerm("");
          setStatusFilter("ALL");
        }}
      />

      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadData}
        actions={actions}
        actionLayout="dropdown"
        searchable={false}
        selectable={false}
        tableId="transport-jobs-table"
        emptyMessage="No jobs found"
        emptySubtext="Create a new transport job order to initiate dispatch and vehicle scheduling."
        emptyAction={{
          label: "Create Trip Order",
          onClick: openCreateJobDrawer,
        }}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingJob(null);
        }}
        title={
          editingJob
            ? `Edit Trip Order: ${editingJob.job_number}`
            : `Create Trip / Job Order${activeOffice?.name ? ` • ${activeOffice.name}` : ""}`
        }
        description={
          editingJob
            ? "Update cargo specifications, contracting parties, or scheduled dispatch timing."
            : "Specify contracting billing client, dispatch route corridor, and cargo requirements."
        }
      >
        <Form
          key={editingJob ? `edit-${editingJob.id}` : `create-${activeOffice?.id ?? "all"}`}
          sections={formSections}
          initialValues={formInitialValues}
          setFieldValueRef={formSetFieldValueRef}
          onSubmit={handleCreate}
          onCancel={() => {
            setIsDrawerOpen(false);
            setEditingJob(null);
          }}
          submitLabel={editingJob ? "Save Changes" : "Create Trip Order"}
          isLoading={isSubmitting}
        />
      </EntityDrawer>

      {/* Mass Excel Import Modal */}
      <JobExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* View Trip Order Voucher Modal with Print/Download */}
      <JobOrderViewModal
        isOpen={viewingJob !== null}
        job={viewingJob}
        onClose={() => setViewingJob(null)}
        onEdit={(job) => {
          setViewingJob(null);
          handleEditClick(job as any);
        }}
        onBookLR={(jobId) => {
          router.push(`/transport/lr-booking?job_id=${jobId}`);
        }}
      />

      {/* Alert popup when job is locked because it is used in an LR */}
      <ConfirmDialog
        isOpen={lockedJobPopup !== null}
        onClose={() => setLockedJobPopup(null)}
        title="Job Order Locked"
        message={`Job number ${lockedJobPopup?.job_number} is used in LR #${lockedJobPopup?.lr_number || (lockedJobPopup?.linked_lrs?.join(", "))} and cannot be edited.`}
        confirmText="View LR"
        cancelText="Close"
        variant="warning"
        onConfirm={() => {
          const lrId = lockedJobPopup?.lr_id;
          const lrNum = lockedJobPopup?.lr_number;
          setLockedJobPopup(null);
          if (lrId) {
            router.push(`/transport/lr-booking?edit=${lrId}`);
          } else if (lrNum) {
            router.push(`/transport/lr-booking?search=${encodeURIComponent(lrNum)}`);
          }
        }}
      />
      {/* View LR Print Preview Modal */}
      {viewingLr && (
        <LRViewModal
          isOpen={!!viewingLr}
          lr={viewingLr}
          onClose={() => setViewingLr(null)}
        />
      )}

      {/* View Hire Challan Print Preview Modal */}
      {viewingChallan && (
        <HireChallanViewModal
          isOpen={!!viewingChallan}
          challan={viewingChallan}
          onClose={() => setViewingChallan(null)}
        />
      )}

      {/* View Transport Invoice Print Preview Modal */}
      {viewingInvoice && (
        <TransportInvoicePrintModal
          isOpen={!!viewingInvoice}
          invoice={viewingInvoice}
          onClose={() => setViewingInvoice(null)}
        />
      )}
    </div>
  );
}
