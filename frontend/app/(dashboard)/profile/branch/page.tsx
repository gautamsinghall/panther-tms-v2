"use client";

import React, { useState, useEffect } from "react";
import { Plus, MapPin, Loader2, AlertCircle, Building2 } from "lucide-react";
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

export default function BranchesPage() {
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
      setError(err.message || "Failed to load branch records.");
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
      alert(err.message || "Failed to create branch.");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnDef<BranchItem>[] = [
    {
      key: "branch_code",
      header: "Branch Code",
      sortable: true,
      cell: (row) => <span className="font-mono font-semibold text-[#172033]">{row.branch_code}</span>,
    },
    {
      key: "branch_name",
      header: "Branch Name & Role",
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-medium text-[#172033] flex items-center gap-1.5">
            {row.branch_name}
            {row.is_head_office && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#C9A227]/15 text-[#C9A227]">
                HQ
              </span>
            )}
          </div>
          <div className="text-xs text-[#667085] flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />
            {row.city || "—"}, {row.state || "—"}
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Contact Details",
      cell: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="text-[#172033]">{row.phone || "—"}</div>
          <div className="text-[#667085]">{row.email || "—"}</div>
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
    <div className="space-y-6">
      <PageHeader
        title="Branch Operating Locations"
        description="Physical transshipment facilities, administrative booking offices, and logistics hubs."
        breadcrumbs={[
          { label: "Profile", href: "/profile/account" },
          { label: "Branches" },
        ]}
        primaryAction={{
          label: "Add Operating Branch",
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
          <span className="text-xs">Loading branch network...</span>
        </div>
      ) : (
        <DataTable columns={columns} data={branches} />
      )}

      {/* Add Branch Drawer */}
      <EntityDrawer
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Operating Branch"
        description="Register primary dispatch terminal, regional transshipment hub, or corporate head office."
      >
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 lg:p-7 shadow-2xs">
          <form onSubmit={handleCreateBranch} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Branch Code"
                placeholder="B-HYD-01"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
              <Input
                label="Branch Name"
                placeholder="Hyderabad Hub"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="City"
                placeholder="Hyderabad"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <Input
                label="State"
                placeholder="Telangana"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>

            <Input
              label="Street Address / Facility"
              placeholder="Plot 18, Transport Nagar, Autonagar"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Phone"
                placeholder="+91 40 1234 5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                label="Branch Email"
                placeholder="hyderabad@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_head_office"
                checked={isHeadOffice}
                onChange={(e) => setIsHeadOffice(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="is_head_office" className="text-xs text-slate-700 select-none">
                Set as Head Office / Principal Place of Business
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={submitting}>
                {submitting ? "Saving..." : "Create Branch"}
              </Button>
            </div>
          </form>
        </div>
      </EntityDrawer>
    </div>
  );
}
