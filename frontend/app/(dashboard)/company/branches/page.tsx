"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  MapPin,
  Loader2,
  AlertCircle,
  Building2,
  CheckCircle2,
  Landmark,
  Pencil,
  Trash2,
  FileText,
  Phone,
  Mail,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { apiClient } from "@/lib/api-client";

interface BranchItem {
  id: number;
  code: string;
  name: string;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  pan?: string | null;
  bank_name?: string | null;
  bank_account_no?: string | null;
  bank_ifsc?: string | null;
  bank_branch?: string | null;
  document_notes?: string | null;
  is_head_office: boolean;
  is_active: boolean;
}

export default function IssuingOfficesPage() {
  const searchParams = useSearchParams();
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Drawer modal state for Create / Edit
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields - All Location-Specific Details
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [isHeadOffice, setIsHeadOffice] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => {
    setEditingBranchId(null);
    setCode("");
    setName("");
    setCity("");
    setState("");
    setAddress("");
    setPincode("");
    setPhone("");
    setEmail("");
    setGstin("");
    setPan("");
    setBankName("");
    setBankAccountNo("");
    setBankIfsc("");
    setBankBranch("");
    setIsHeadOffice(false);
    setIsActive(true);
  };

  const openCreateDrawer = () => {
    resetForm();
    setShowDrawer(true);
  };

  const openEditDrawer = (branch: BranchItem) => {
    setEditingBranchId(branch.id);
    setCode(branch.code || "");
    setName(branch.name || "");
    setCity(branch.city || "");
    setState(branch.state || "");
    setAddress(branch.address || "");
    setPincode(branch.pincode || "");
    setPhone(branch.phone || "");
    setEmail(branch.email || "");
    setGstin(branch.gstin || "");
    setPan(branch.pan || "");
    setBankName(branch.bank_name || "");
    setBankAccountNo(branch.bank_account_no || "");
    setBankIfsc(branch.bank_ifsc || "");
    setBankBranch(branch.bank_branch || "");
    setIsHeadOffice(branch.is_head_office || false);
    setIsActive(branch.is_active ?? true);
    setShowDrawer(true);
  };

  const loadBranches = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient<BranchItem[]>("/api/v1/profile/branches");
      setBranches(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Failed to load issuing offices & branches.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  // Handle auto-opening if redirected with ?add=true
  useEffect(() => {
    if (searchParams.get("add") === "true") {
      openCreateDrawer();
    }
  }, [searchParams]);

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        code: code.toUpperCase().trim(),
        branch_code: code.toUpperCase().trim(),
        name: name.trim(),
        branch_name: name.trim(),
        city: city ? city.trim() : "Headquarters",
        state: state ? state.trim() : "Default State",
        address: address ? address.trim() : null,
        pincode: pincode ? pincode.trim() : null,
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        gstin: gstin ? gstin.toUpperCase().trim() : null,
        pan: pan ? pan.toUpperCase().trim() : null,
        bank_name: bankName ? bankName.trim() : null,
        bank_account_no: bankAccountNo ? bankAccountNo.trim() : null,
        bank_account_number: bankAccountNo ? bankAccountNo.trim() : null,
        bank_ifsc: bankIfsc ? bankIfsc.toUpperCase().trim() : null,
        bank_branch: bankBranch ? bankBranch.trim() : null,
        is_head_office: isHeadOffice,
        is_active: isActive,
      };

      if (editingBranchId) {
        await apiClient(`/api/v1/profile/branches/${editingBranchId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setSuccessMessage("Issuing office / branch updated successfully.");
      } else {
        await apiClient("/api/v1/profile/branches", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccessMessage("New issuing office / branch registered successfully.");
      }

      setShowDrawer(false);
      resetForm();
      await loadBranches();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to save issuing office / branch.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBranch = async (branch: BranchItem) => {
    if (branch.is_head_office) {
      alert("Corporate Head Office / Primary Issuing Office cannot be deleted.");
      return;
    }
    if (!confirm(`Are you sure you want to delete issuing office '${branch.name}' (${branch.code})?`)) {
      return;
    }

    try {
      await apiClient(`/api/v1/profile/branches/${branch.id}`, {
        method: "DELETE",
      });
      setSuccessMessage(`Issuing office '${branch.name}' deleted.`);
      await loadBranches();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to delete issuing office.");
    }
  };

  // Filter branches by search query
  const filteredBranches = branches.filter((b) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.code?.toLowerCase().includes(term) ||
      b.name?.toLowerCase().includes(term) ||
      b.city?.toLowerCase().includes(term) ||
      b.state?.toLowerCase().includes(term) ||
      b.gstin?.toLowerCase().includes(term)
    );
  });

  const columns: ColumnDef<BranchItem>[] = [
    {
      key: "code",
      header: "Office Code",
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {row.code}
        </span>
      ),
    },
    {
      key: "name",
      header: "Issuing Office / Branch Name",
      sortable: true,
      cell: (row) => (
        <div className="space-y-1">
          <div className="font-semibold text-slate-900 flex items-center gap-2">
            <span>{row.name}</span>
            {row.is_head_office && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700">
                Corporate Head Office / Primary
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate max-w-[280px]">
              {row.address ? `${row.address}, ` : ""}
              {row.city || "—"}, {row.state || "—"} {row.pincode || ""}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "gstin",
      header: "GSTIN & PAN",
      cell: (row) => (
        <div className="text-xs font-mono space-y-0.5">
          <div className="font-semibold text-slate-800">
            GSTIN: <span className="text-indigo-700">{row.gstin || "—"}</span>
          </div>
          <div className="text-slate-500">
            PAN: {row.pan || "—"}
          </div>
        </div>
      ),
    },
    {
      key: "bank_name",
      header: "Bank Details",
      cell: (row) => (
        <div className="text-xs space-y-0.5">
          {row.bank_account_no ? (
            <>
              <div className="font-medium text-slate-800 flex items-center gap-1">
                <Landmark className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{row.bank_name || "Bank Account"}</span>
              </div>
              <div className="font-mono text-slate-500 text-[11px]">
                A/C: {row.bank_account_no} | IFSC: {row.bank_ifsc || "—"}
              </div>
            </>
          ) : (
            <span className="text-slate-400 italic text-[11px]">No Bank Registered</span>
          )}
        </div>
      ),
    },
    {
      key: "phone",
      header: "Office Contacts",
      cell: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="text-slate-800 font-medium flex items-center gap-1">
            <Phone className="w-3 h-3 text-slate-400" />
            <span>{row.phone || "—"}</span>
          </div>
          <div className="text-slate-500 flex items-center gap-1 text-[11px]">
            <Mail className="w-3 h-3 text-slate-400" />
            <span>{row.email || "—"}</span>
          </div>
        </div>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      cell: (row) => (
        <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} variant="active" />
      ),
    },
    {
      key: "id",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openEditDrawer(row)}
            className="h-7 px-2 text-xs gap-1 bg-white cursor-pointer"
            title="Edit Issuing Office"
          >
            <Pencil className="w-3 h-3 text-indigo-600" />
            <span>Edit</span>
          </Button>
          {!row.is_head_office && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDeleteBranch(row)}
              className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50 border-rose-200 cursor-pointer"
              title="Delete Issuing Office"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Issuing Offices / Branches"
        description="Location-specific operational entities: each office independently maintains its registered address, state GSTIN, contact information, and bank details."
        breadcrumbs={[
          { label: "Company Settings", href: "/company/details" },
          { label: "Issuing Offices / Branches" },
        ]}
        primaryAction={{
          label: "Register Issuing Office / Branch",
          icon: <Plus className="w-4 h-4" />,
          onClick: openCreateDrawer,
        }}
      />

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-medium flex items-center gap-2 shadow-2xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium flex items-center gap-2 shadow-2xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <Input
            placeholder="Search by code, branch name, city, state, or GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing <strong>{filteredBranches.length}</strong> of <strong>{branches.length}</strong> Issuing Office(s)
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <span className="text-xs">Loading issuing offices & branches...</span>
        </div>
      ) : branches.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">No issuing offices registered yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Add your first issuing office or corporate headquarters to begin issuing consignment notes, LR vouchers, and transport orders.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={openCreateDrawer}
            className="text-xs h-9 gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register Issuing Office / Branch</span>
          </Button>
        </div>
      ) : (
        <DataTable columns={columns} data={filteredBranches} />
      )}

      {/* Register / Edit Issuing Office Drawer */}
      <EntityDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title={editingBranchId ? "Edit Issuing Office / Branch" : "Register Issuing Office / Branch"}
        description={
          editingBranchId
            ? "Update location-specific registered address, GSTIN, bank details, and contact numbers for this issuing office."
            : "Add an individual operating branch or issuing office. Each office independently maintains its own address, GSTIN, contacts, and bank details."
        }
      >
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 lg:p-7 shadow-2xs">
          <form onSubmit={handleSaveBranch} className="space-y-6">
            {/* Section 1: Office Identification */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-1.5 border-b border-slate-200 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                Office Identification
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Issuing Office / Branch Code <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. B-GZB-01"
                    value={code}
                    disabled={!!editingBranchId}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="font-mono text-xs font-semibold uppercase"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Unique location code (e.g. B-MUM-01)</span>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Issuing Office / Branch Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. Ghaziabad Hub / Mumbai Central Office"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-xs font-semibold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Full branch name printed on vouchers</span>
                </div>
              </div>
            </div>

            {/* Section 2: Registered Address */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-1.5 border-b border-slate-200 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                Registered Address & Location
              </h4>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Street Address
                </label>
                <Input
                  placeholder="e.g. Plot No. 42, Transport Nagar, Phase-II"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. Ghaziabad"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    State / Province <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. Uttar Pradesh"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    PIN Code
                  </label>
                  <Input
                    maxLength={10}
                    placeholder="e.g. 201001"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Statutory & Taxation (Location Specific) */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-1.5 border-b border-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                Statutory & Tax Details (Location Specific)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Office GSTIN
                  </label>
                  <Input
                    maxLength={15}
                    placeholder="e.g. 09AAAAA0000A1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="font-mono text-xs font-semibold tracking-wider uppercase"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">State-specific GST registration number</span>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Office / Location PAN
                  </label>
                  <Input
                    maxLength={10}
                    placeholder="e.g. AAAAA0000A"
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    className="font-mono text-xs font-semibold tracking-wider uppercase"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Permanent Account Number for this location</span>
                </div>
              </div>
            </div>

            {/* Section 4: Contact Information */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-1.5 border-b border-slate-200 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-indigo-600" />
                Office Contact Details
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Office Phone Number
                  </label>
                  <Input
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Office Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="e.g. ghaziabad.hub@panthertms.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Bank Account Details for Invoicing */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-1.5 border-b border-slate-200 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-emerald-600" />
                Bank Details (For Local Invoicing & Settlement)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Bank Name
                  </label>
                  <Input
                    placeholder="e.g. HDFC Bank / State Bank of India"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Account Number
                  </label>
                  <Input
                    placeholder="e.g. 50200012345678"
                    value={bankAccountNo}
                    onChange={(e) => setBankAccountNo(e.target.value)}
                    className="font-mono text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    IFSC Code
                  </label>
                  <Input
                    maxLength={11}
                    placeholder="e.g. HDFC0001234"
                    value={bankIfsc}
                    onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                    className="font-mono text-xs font-semibold uppercase tracking-wider"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Bank Branch Name
                  </label>
                  <Input
                    placeholder="e.g. Transport Nagar Branch"
                    value={bankBranch}
                    onChange={(e) => setBankBranch(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Section 6: Primary Office Designation Checkbox */}
            <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isHeadOffice}
                  onChange={(e) => setIsHeadOffice(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-indigo-950 block">
                    Set as Corporate Head Office / Primary Issuing Office
                  </span>
                  <span className="text-[11px] text-indigo-700 leading-relaxed block mt-0.5">
                    When checked, this issuing office automatically becomes the Head Office in the Default Issuing Office section across all voucher prints and LR documents.
                  </span>
                </div>
              </label>

              <div className="pt-2 border-t border-indigo-200/50 flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Active for Booking & Consignment Dispatch</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDrawer(false)}
                disabled={submitting}
                className="text-xs h-9 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                className="text-xs h-9 px-5 gap-1.5 cursor-pointer"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>{editingBranchId ? "Save Changes" : "Register Issuing Office"}</span>
              </Button>
            </div>
          </form>
        </div>
      </EntityDrawer>
    </div>
  );
}
