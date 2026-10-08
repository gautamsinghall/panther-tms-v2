"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Building2, MapPin, ChevronDown, Check, Globe } from "lucide-react";
import { getStoredAuth, setStoredAuth, getActiveOffice, setActiveOffice, OfficeSummary } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export function OfficeSwitcher() {
  const router = useRouter();
  const [offices, setOffices] = useState<OfficeSummary[]>([]);
  const [activeOffice, setActiveOfficeState] = useState<OfficeSummary | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const syncOffices = async () => {
    const auth = getStoredAuth();
    if (!auth) return;

    const userRole = (auth.user?.role || "").toUpperCase().trim();
    const userIsAdmin = userRole.includes("ADMIN") || userRole === "OWNER";
    setIsAdmin(userIsAdmin);

    let assigned: OfficeSummary[] = auth.assignedOffices || [];

    try {
      setIsLoading(true);
      if (userIsAdmin) {
        // Admin always has universal access across all active issuing offices
        const branches = await apiClient<any[]>("/api/v1/profile/branches");
        if (Array.isArray(branches)) {
          assigned = branches
            .filter((b) => b.is_active !== false)
            .map((b) => ({
              id: b.id,
              code: b.code,
              name: b.name,
              city: b.city,
              state: b.state,
              gstin: b.gstin,
              is_head_office: Boolean(b.is_head_office),
              is_default: Boolean(b.is_head_office),
            }));
        }
      } else {
        // Employee gets authorized office assignments from me context
        const me = await apiClient<any>("/api/v1/auth/me").catch(() => null);
        if (me && Array.isArray(me.assigned_offices)) {
          assigned = me.assigned_offices;
        }
      }
      auth.assignedOffices = assigned;
    } catch (err) {
      console.warn("Could not fetch branches for office switcher", err);
    } finally {
      setIsLoading(false);
    }

    setOffices(assigned);

    const currentActive = getActiveOffice();
    if (currentActive?.id === 0 && userIsAdmin) {
      setActiveOfficeState(currentActive);
    } else if (currentActive && assigned.some((o) => o.id === currentActive.id)) {
      const refreshedActive = assigned.find((o) => o.id === currentActive.id)!;
      if (auth) {
        auth.activeOffice = refreshedActive;
        setStoredAuth(auth);
      }
      setActiveOfficeState(refreshedActive);
    } else if (assigned.length > 0) {
      const defaultOff = assigned.find((o) => o.is_default) || assigned[0];
      setActiveOffice(defaultOff);
      setActiveOfficeState(defaultOff);
    } else {
      auth.activeOffice = null;
      setStoredAuth(auth);
      setActiveOfficeState(null);
    }
  };

  useEffect(() => {
    syncOffices();

    const handleOfficeChange = (e: Event) => {
      const customEvent = e as CustomEvent<OfficeSummary>;
      if (customEvent.detail) {
        setActiveOfficeState(customEvent.detail);
      }
    };

    const handleBranchesUpdated = () => {
      syncOffices();
    };

    window.addEventListener("panther_office_changed", handleOfficeChange);
    window.addEventListener("panther_branches_updated", handleBranchesUpdated);

    return () => {
      window.removeEventListener("panther_office_changed", handleOfficeChange);
      window.removeEventListener("panther_branches_updated", handleBranchesUpdated);
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (office: OfficeSummary | null) => {
    if (office) {
      setActiveOffice(office);
      setActiveOfficeState(office);
    } else if (isAdmin) {
      // Consolidated All Offices view
      const allOfficesSummary: OfficeSummary = {
        id: 0,
        code: "ALL",
        name: "All Issuing Offices (Consolidated)",
        city: "All",
        state: "All",
        is_head_office: false,
      };
      setActiveOffice(allOfficesSummary);
      setActiveOfficeState(allOfficesSummary);
    }
    setIsOpen(false);
    router.refresh();
  };

  if (!activeOffice && offices.length === 0) {
    if (isAdmin) {
      return (
        <button
          type="button"
          onClick={() => router.push("/company/branches?add=true")}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold cursor-pointer shadow-2xs hover:bg-amber-100 transition-colors"
          title="No issuing office has been registered yet. Click to setup your first issuing office."
        >
          <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>No Issuing Office</span>
          <span className="text-[10px] bg-amber-200/80 text-amber-900 px-1 py-0.2 rounded font-bold">
            + Setup
          </span>
        </button>
      );
    }
    return null;
  }

  const isMultiOffice = offices.length > 1 || isAdmin;

  // Single office user (non-admin): Show fixed clear badge
  if (!isMultiOffice && activeOffice) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50/80 border border-emerald-200/80 text-emerald-800 text-xs font-medium shadow-2xs select-none"
        title={`Assigned Office: ${activeOffice.name} (${activeOffice.code})`}
      >
        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span className="font-semibold text-emerald-900">{activeOffice.code}</span>
        <span className="text-emerald-700 truncate max-w-[120px]">{activeOffice.name}</span>
        {activeOffice.is_head_office && (
          <span className="text-[10px] bg-emerald-200/60 text-emerald-800 px-1 py-0.2 rounded font-semibold">
            HQ
          </span>
        )}
      </div>
    );
  }

  // Multi-office or Admin: Interactive Switcher Dropdown
  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-150 shadow-2xs cursor-pointer select-none text-xs",
          isOpen
            ? "bg-indigo-50 border-indigo-300 text-indigo-900 ring-2 ring-indigo-500/20"
            : "bg-white border-slate-200/90 text-slate-800 hover:bg-slate-50 hover:border-slate-300"
        )}
      >
        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
        <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        
        <div className="flex items-center gap-1.5 text-left truncate">
          <span className="text-slate-400 font-normal">Office:</span>
          {activeOffice?.id === 0 ? (
            <span className="font-semibold text-indigo-700 flex items-center gap-1">
              <Globe className="w-3 h-3 inline" /> All Offices
            </span>
          ) : (
            <>
              <span className="font-bold text-slate-900">{activeOffice?.code || "HQ"}</span>
              <span className="font-medium text-slate-600 truncate max-w-[110px] hidden sm:inline">
                {activeOffice?.name || "Corporate Office"}
              </span>
            </>
          )}
        </div>

        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0",
            isOpen && "rotate-180 text-indigo-600"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-72 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 animate-in fade-in-0 zoom-in-95">
          <div className="px-2.5 py-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Active Issuing Office
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              {offices.length} Available
            </span>
          </div>

          <div className="py-1 max-h-64 overflow-y-auto space-y-0.5">
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer",
                  activeOffice?.id === 0
                    ? "bg-indigo-50/90 text-indigo-900 font-semibold"
                    : "text-slate-700 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">All Issuing Offices</div>
                    <div className="text-[11px] text-slate-400">Consolidated cross-office view</div>
                  </div>
                </div>
                {activeOffice?.id === 0 && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
              </button>
            )}

            {offices.map((office) => {
              const isSelected = activeOffice?.id === office.id;
              return (
                <button
                  key={office.id}
                  type="button"
                  onClick={() => handleSelect(office)}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer group",
                    isSelected
                      ? "bg-indigo-50/90 text-indigo-900 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className={cn("w-3.5 h-3.5 shrink-0", isSelected ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{office.code}</span>
                        <span className="text-slate-700 truncate">{office.name}</span>
                        {office.is_head_office && (
                          <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 px-1 py-0.2 rounded shrink-0">
                            HQ
                          </span>
                        )}
                        {office.is_default && !office.is_head_office && (
                          <span className="text-[9px] font-medium bg-slate-100 text-slate-600 px-1 py-0.2 rounded shrink-0">
                            Primary
                          </span>
                        )}
                      </div>
                      {(office.city || office.state) && (
                        <div className="text-[11px] text-slate-400 truncate">
                          {[office.city, office.state].filter(Boolean).join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>

          <div className="pt-1.5 mt-1 border-t border-slate-100 px-2.5 pb-1">
            <span className="text-[10px] text-slate-400">
              Data & transactions are scoped to the selected office.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
