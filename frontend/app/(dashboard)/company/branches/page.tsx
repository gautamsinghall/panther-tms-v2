"use client";

import React, { useState, useEffect } from "react";
import { Plus, MapPin, Loader2, AlertCircle, Building2, CheckCircle2, ShieldCheck } from "lucide-react";
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
  branch_code: string;
  branch_name: string;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  is_head_office: boolean;
  is_active: boolean;
}

export default function IssuingOfficesPage() {
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal create state
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isHeadOffice, setIsHeadOffice] = useState(false);

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

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient("/api/v1/profile/branches", {
        method: "POST",
        body: JSON.stringify({
          branch_code: code.toUpperCase(),
          branch_name: name,
          city: city || null,
          state: state || null,
          address: address || null,
          phone: phone || null,
          email: email || null,
          is_head_office: isHeadOffice,
          is_active: true,
        }),
      });

      setShowAddModal(false);
      setCode("");
      setName("");
      setCity("");
      setState("");
      setAddress("");
      setPhone("");
      setEmail("");
      setIsHeadOffice(false);
      await loadBranches();
    } catch (err: any) {
      alert(err.message || "Failed to create issuing office / branch.");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnDef<BranchItem>[] = [
    {
      key: "branch_code",
      header: "Office Code",
      sortable: true,
      cell: (row) => <span className="font-mono font-semibold text-slate-900">{row.branch_code}</span>,
    },
    {
      key: "branch_name",
      header: "Office / Branch Name & Type",
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-semibold text-slate-900 flex items-center gap-2">
            <span>{row.branch_name}</span>
            {row.is_head_office && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700">
                Primary Issuing Office (HQ)
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{row.address ? `${row.address}, ` : ""}{row.city || "—"}, {row.state || "—"}</span>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Contact Details",
      cell: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="text-slate-800 font-medium">{row.phone || "—"}</div>
          <div className="text-slate-500">{row.email || "—"}</div>
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
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Issuing Offices & Branches"
        description="Physical booking branches, transshipment hubs, and issuing offices printed on vouchers and LRs."
        breadcrumbs={[
          { label: "Company Settings", href: "/company/details" },
          { label: "Issuing Offices / Branches" },
        ]}
        primaryAction={{
          label: "Add Issuing Office",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => setShowAddModal(true),
        }}
      />

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <span className="text-xs">Loading issuing offices & branches...</span>
        </div>
      ) : (
        <DataTable columns={columns} data={branches} />
      )}

      {/* Add Branch Drawer */}
      <EntityDrawer
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register Issuing Office / Branch"
        description="Add a new physical consignment issuing office, regional booking center, or primary hub."
      >
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 lg:p-7 shadow-2xs">
          <form onSubmit={handleCreateBranch} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Office / Branch Code"
                placeholder="B-GZB-01"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
              />
              <Input
                label="Office Name"
                placeholder="Ghaziabad Booking Hub"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="City"
                placeholder="Ghaziabad"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <Input
                label="State"
                placeholder="Uttar Pradesh"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>

            <Input
              label="Full Office Address"
              placeholder="Plot 10, GT Road Industrial Corridor"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Phone"
                placeholder="+91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                label="Email"
                type="email"
                placeholder="ghaziabad.hub@panthertms.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isHeadOffice}
                  onChange={(e) => setIsHeadOffice(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Set as Corporate Head Office / Primary Issuing Office</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModal(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? "Saving..." : "Create Issuing Office"}
              </Button>
            </div>
          </form>
        </div>
      </EntityDrawer>
    </div>
  );
}
