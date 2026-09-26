"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  Building2,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Coins,
  RefreshCw,
  Search,
  Check,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { ColumnDef, RowAction } from "@/types/table";
import { apiClient } from "@/lib/api-client";
import { COUNTRY_OPTIONS, DEFAULT_COUNTRY } from "@/lib/countries";

export interface BillingClientRecord {
  id: number;
  name: string;
  code?: string;
  company_name?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  tds_rate?: number;
  credit_period_days?: number;
  credit_limit?: number;
  payment_terms?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const initialFormState = {
  name: "",
  code: "",
  company_name: "",
  contact_person: "",
  phone: "",
  email: "",
  gstin: "",
  pan: "",
  tds_rate: "0.00",
  credit_period_days: "30",
  credit_limit: "0.00",
  payment_terms: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  country: DEFAULT_COUNTRY,
};

export default function BillingClientPage() {
  const [data, setData] = useState<BillingClientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [gstFilter, setGstFilter] = useState("ALL");

  // Drawer / Form state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BillingClientRecord | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Confirmation dialog state
  const [deactivatingRecord, setDeactivatingRecord] = useState<BillingClientRecord | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const res = await apiClient<BillingClientRecord[]>("/api/v1/general/billing-clients");
      setData(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load billing client records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateDrawer = () => {
    setEditingRecord(null);
    setFormData(initialFormState);
    setFormErrors({});
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (record: BillingClientRecord) => {
    setEditingRecord(record);
    setFormData({
      name: record.name || "",
      code: record.code || "",
      company_name: record.company_name || "",
      contact_person: record.contact_person || "",
      phone: record.phone || "",
      email: record.email || "",
      gstin: record.gstin || "",
      pan: record.pan || "",
      tds_rate: record.tds_rate !== undefined && record.tds_rate !== null ? String(record.tds_rate) : "0.00",
      credit_period_days:
        record.credit_period_days !== undefined && record.credit_period_days !== null
          ? String(record.credit_period_days)
          : "30",
      credit_limit:
        record.credit_limit !== undefined && record.credit_limit !== null ? String(record.credit_limit) : "0.00",
      payment_terms: record.payment_terms || "",
      address: record.address || "",
      city: record.city || "",
      state: record.state || "",
      pincode: record.pincode || "",
      country: record.country || DEFAULT_COUNTRY,
    });
    setFormErrors({});
    setIsDrawerOpen(true);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = "Client / Corporate Name is required.";
    }
    if (formData.gstin.trim() && formData.gstin.trim().length !== 15) {
      errors.gstin = "GSTIN must be 15 characters long if provided.";
    }
    if (formData.pan.trim() && formData.pan.trim().length !== 10) {
      errors.pan = "PAN must be 10 characters long if provided.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim() || null,
        company_name: formData.company_name.trim() || null,
        contact_person: formData.contact_person.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        gstin: formData.gstin.trim().toUpperCase() || null,
        pan: formData.pan.trim().toUpperCase() || null,
        tds_rate: formData.tds_rate ? parseFloat(formData.tds_rate) : 0,
        credit_period_days: formData.credit_period_days ? parseInt(formData.credit_period_days, 10) : 30,
        credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : 0,
        payment_terms: formData.payment_terms.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        pincode: formData.pincode.trim() || null,
        country: formData.country.trim() || DEFAULT_COUNTRY,
      };

      if (editingRecord) {
        await apiClient(`/api/v1/general/billing-clients/${editingRecord.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiClient("/api/v1/general/billing-clients", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setIsDrawerOpen(false);
      setEditingRecord(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to save billing client.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingRecord) return;
    setIsDeactivating(true);
    try {
      await apiClient(`/api/v1/general/billing-clients/${deactivatingRecord.id}`, {
        method: "DELETE",
      });
      setDeactivatingRecord(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to deactivate billing client.");
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleToggleActivate = async (record: BillingClientRecord) => {
    try {
      await apiClient(`/api/v1/general/billing-clients/${record.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: !record.is_active }),
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update client status.");
    }
  };

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = data.length;
    const active = data.filter((d) => d.is_active).length;
    const gstCount = data.filter((d) => d.gstin && d.gstin.trim().length > 0).length;
    const totalCreditDays = data.reduce((acc, curr) => acc + (curr.credit_period_days || 0), 0);
    const avgCreditDays = total > 0 ? Math.round(totalCreditDays / total) : 30;

    return {
      total,
      active,
      gstCount,
      avgCreditDays,
    };
  }, [data]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (statusFilter === "ACTIVE" && !item.is_active) return false;
      if (statusFilter === "INACTIVE" && item.is_active) return false;

      if (gstFilter === "REGISTERED" && (!item.gstin || !item.gstin.trim())) return false;
      if (gstFilter === "UNREGISTERED" && item.gstin && item.gstin.trim()) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const match =
          item.name?.toLowerCase().includes(term) ||
          item.code?.toLowerCase().includes(term) ||
          item.company_name?.toLowerCase().includes(term) ||
          item.contact_person?.toLowerCase().includes(term) ||
          item.phone?.toLowerCase().includes(term) ||
          item.email?.toLowerCase().includes(term) ||
          item.gstin?.toLowerCase().includes(term) ||
          item.pan?.toLowerCase().includes(term) ||
          item.city?.toLowerCase().includes(term) ||
          item.state?.toLowerCase().includes(term) ||
          item.address?.toLowerCase().includes(term);
        if (!match) return false;
      }
      return true;
    });
  }, [data, statusFilter, gstFilter, searchTerm]);

  // Format currency in Indian notation
  const formatIndianCurrency = (amount?: number) => {
    if (amount === undefined || amount === null || isNaN(amount)) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const columns: ColumnDef<BillingClientRecord>[] = [
    {
      key: "name",
      header: "Billing Client",
      sortable: true,
      cell: (row) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 text-sm">{row.name}</span>
            {row.code && (
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium bg-slate-100 text-slate-600 rounded border border-slate-200">
                {row.code}
              </span>
            )}
          </div>
          {row.company_name && (
            <p className="text-xs text-slate-500 font-normal truncate max-w-[260px]" title={row.company_name}>
              {row.company_name}
            </p>
          )}
          {row.address && !row.company_name && (
            <p className="text-[11px] text-slate-400 font-normal truncate max-w-[260px]" title={row.address}>
              {row.address}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "contact_person",
      header: "Contact & Comms",
      sortable: true,
      cell: (row) => (
        <div className="space-y-1">
          <span className="font-medium text-slate-800 block text-xs">
            {row.contact_person || "-"}
          </span>
          <div className="flex flex-col gap-0.5 text-[11px] text-slate-500">
            {row.phone && (
              <a
                href={`tel:${row.phone}`}
                className="inline-flex items-center gap-1 hover:text-indigo-600 transition-colors"
              >
                <Phone className="w-3 h-3 text-slate-400" />
                {row.phone}
              </a>
            )}
            {row.email && (
              <a
                href={`mailto:${row.email}`}
                className="inline-flex items-center gap-1 hover:text-indigo-600 transition-colors truncate max-w-[200px]"
                title={row.email}
              >
                <Mail className="w-3 h-3 text-slate-400" />
                {row.email}
              </a>
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
        <div className="space-y-0.5">
          <span className="text-xs text-slate-800 font-medium block">
            {row.city || "-"}{row.state ? `, ${row.state}` : ""}
          </span>
          <span className="text-[11px] text-slate-500 block">
            {[row.pincode, row.country || DEFAULT_COUNTRY].filter(Boolean).join(", ")}
          </span>
        </div>
      ),
    },
    {
      key: "gstin",
      header: "GSTIN & PAN",
      sortable: true,
      cell: (row) => (
        <div className="space-y-1">
          {row.gstin ? (
            <span className="font-mono text-xs uppercase bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 inline-block font-medium">
              {row.gstin}
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 font-normal italic">
              Unregistered (Non-GST)
            </span>
          )}
          <div className="flex items-center gap-2 text-[11px] text-slate-600">
            {row.pan && (
              <span className="font-mono">
                PAN: <strong className="text-slate-800">{row.pan}</strong>
              </span>
            )}
            {row.tds_rate !== undefined && row.tds_rate > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-50 text-amber-700 rounded border border-amber-200 text-[10px] font-medium">
                TDS {row.tds_rate}%
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "credit_limit",
      header: "Credit Terms",
      sortable: true,
      cell: (row) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-900">
              {row.credit_limit ? formatIndianCurrency(row.credit_limit) : "No Limit"}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 block">
            {row.credit_period_days !== undefined ? `${row.credit_period_days} Days Credit` : "30 Days"}
          </span>
          {row.payment_terms && (
            <span className="text-[10px] text-slate-400 block truncate max-w-[180px]" title={row.payment_terms}>
              {row.payment_terms}
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

  const actions: RowAction<BillingClientRecord>[] = [
    {
      label: "Edit Client",
      icon: <Edit3 className="w-3.5 h-3.5" />,
      onClick: (row) => {
        openEditDrawer(row);
      },
    },
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />,
      variant: "danger",
      hidden: (row) => !row.is_active,
      onClick: (row) => {
        setDeactivatingRecord(row);
      },
    },
    {
      label: "Reactivate",
      icon: <Check className="w-3.5 h-3.5 text-emerald-600" />,
      hidden: (row) => row.is_active,
      onClick: (row) => {
        handleToggleActivate(row);
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Billing Clients"
        description="Register and manage corporate bill-to parties, debtor accounts, credit ceilings, and GST compliance profiles."
        breadcrumbs={[
          { label: "General", href: "/general/consigner" },
          { label: "Billing Clients" },
        ]}
        primaryAction={{
          label: "Add Billing Client",
          icon: <Plus className="w-4 h-4" />,
          onClick: openCreateDrawer,
        }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Clients"
          value={metrics.total}
          subtext="Registered corporate clients"
          icon={<Building2 className="w-4 h-4 text-indigo-600" />}
        />
        <KpiCard
          title="Active Accounts"
          value={metrics.active}
          subtext={`${metrics.total > 0 ? Math.round((metrics.active / metrics.total) * 100) : 100}% Operational`}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
        />
        <KpiCard
          title="GST Registered"
          value={metrics.gstCount}
          subtext="Verified GSTIN clients"
          icon={<ShieldCheck className="w-4 h-4 text-blue-600" />}
        />
        <KpiCard
          title="Avg Credit Period"
          value={`${metrics.avgCreditDays} Days`}
          subtext="Standard debtor terms"
          icon={<Clock className="w-4 h-4 text-amber-600" />}
        />
      </div>

      {/* Filter & Search Bar */}
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by client name, code, contact, GSTIN, PAN, city..."
        filters={[
          {
            id: "status",
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "All Statuses", value: "ALL" },
              { label: "Active Only", value: "ACTIVE" },
              { label: "Inactive Only", value: "INACTIVE" },
            ],
          },
          {
            id: "gst",
            label: "GST Compliance",
            value: gstFilter,
            onChange: setGstFilter,
            options: [
              { label: "All Clients", value: "ALL" },
              { label: "GST Registered", value: "REGISTERED" },
              { label: "Unregistered (Non-GST)", value: "UNREGISTERED" },
            ],
          },
        ]}
        onClear={() => {
          setSearchTerm("");
          setStatusFilter("ALL");
          setGstFilter("ALL");
        }}
      />

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        actions={actions}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadData}
        searchable={false}
        emptyMessage="No billing clients yet"
        emptySubtext="Add your first corporate billing client to begin creating jobs, bookings, and freight invoices."
        emptyAction={{
          label: "Add Billing Client",
          onClick: openCreateDrawer,
        }}
      />

      {/* Entity Drawer (Full Form Workspace) */}
      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingRecord(null);
        }}
        title={editingRecord ? `Edit Billing Client: ${editingRecord.name}` : "Create New Billing Client"}
        description="Configure corporate entity profiles, GST/PAN compliance details, credit terms, and billing address."
        width="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto pb-8">
          {/* Section 1: Corporate Profile */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                Corporate & Contact Information
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Primary client identity, trade name, and key contact details for dispatch and billing.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Client / Trade Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tata Steel Ltd or Reliance Retail"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={`w-full px-3.5 py-2 text-sm rounded-xl border ${
                    formErrors.name ? "border-rose-400 focus:ring-rose-500" : "border-slate-200 focus:border-indigo-500"
                  } focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all`}
                />
                {formErrors.name && (
                  <p className="text-[11px] text-rose-500 mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Client Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. CLI-001"
                  value={formData.code}
                  onChange={(e) => handleInputChange("code", e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Legal / Registered Entity Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tata Steel BSL Limited"
                  value={formData.company_name}
                  onChange={(e) => handleInputChange("company_name", e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Primary Contact Person
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Kumar (Logistics Head)"
                  value={formData.contact_person}
                  onChange={(e) => handleInputChange("contact_person", e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Phone / Mobile Number
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email Address for Invoicing & Statements
                </label>
                <input
                  type="email"
                  placeholder="accounts.payable@clientcompany.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Tax & Compliance */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Tax, GST & Regulatory Compliance
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Indian Goods & Services Tax (GSTIN), Permanent Account Number (PAN), and statutory TDS rate.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  GSTIN (15 Digits)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="27AAACT1234F1Z5"
                  value={formData.gstin}
                  onChange={(e) => handleInputChange("gstin", e.target.value.toUpperCase())}
                  className={`w-full px-3.5 py-2 text-sm rounded-xl border ${
                    formErrors.gstin ? "border-rose-400 focus:ring-rose-500" : "border-slate-200 focus:border-indigo-500"
                  } focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-mono uppercase`}
                />
                {formErrors.gstin && (
                  <p className="text-[11px] text-rose-500 mt-1">{formErrors.gstin}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  PAN (10 Digits)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="AAACT1234F"
                  value={formData.pan}
                  onChange={(e) => handleInputChange("pan", e.target.value.toUpperCase())}
                  className={`w-full px-3.5 py-2 text-sm rounded-xl border ${
                    formErrors.pan ? "border-rose-400 focus:ring-rose-500" : "border-slate-200 focus:border-indigo-500"
                  } focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-mono uppercase`}
                />
                {formErrors.pan && (
                  <p className="text-[11px] text-rose-500 mt-1">{formErrors.pan}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  TDS Deduction Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="e.g. 1.00 or 2.00"
                    value={formData.tds_rate}
                    onChange={(e) => handleInputChange("tds_rate", e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all pr-8"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Credit & Commercial Terms */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-600" />
                Credit Terms & Payment Ceiling
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Debtor terms, maximum outstanding credit limit, and contractual billing milestones.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Credit Period (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="30"
                  value={formData.credit_period_days}
                  onChange={(e) => handleInputChange("credit_period_days", e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Default payment duration allowed after invoice generation.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Credit Limit (INR ₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="e.g. 500000"
                  value={formData.credit_limit}
                  onChange={(e) => handleInputChange("credit_limit", e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Maximum permitted unpaid invoice balance across all active jobs.
                </span>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Payment Terms / Billing Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. 30 Days from Physical POD Submission / Payment via RTGS"
                  value={formData.payment_terms}
                  onChange={(e) => handleInputChange("payment_terms", e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Registered Address & Location */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Registered Office & Billing Address
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official postal address to be printed on GST Tax Invoices and E-Way Bills.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Street / Building Address
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Plot No 42, Sector 18, Commercial Belt"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  placeholder="e.g. Maharashtra"
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Pincode / Postal Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. 400001"
                  value={formData.pincode}
                  onChange={(e) => handleInputChange("pincode", e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Country
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => handleInputChange("country", e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all bg-white"
                >
                  {COUNTRY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsDrawerOpen(false);
                setEditingRecord(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {editingRecord ? "Save Client Changes" : "Create Billing Client"}
            </button>
          </div>
        </form>
      </EntityDrawer>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deactivatingRecord}
        onClose={() => setDeactivatingRecord(null)}
        onConfirm={handleConfirmDeactivate}
        title="Deactivate Billing Client"
        entityName={deactivatingRecord?.name}
        consequence="Deactivating this billing client marks their account as inactive. Existing past invoices, jobs, and ledger balances remain fully intact."
        confirmLabel="Deactivate Client"
        isLoading={isDeactivating}
      />
    </div>
  );
}
