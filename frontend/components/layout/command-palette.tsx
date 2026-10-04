"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Truck,
  FileText,
  Receipt,
  Users,
  Building2,
  MapPin,
  Clock,
  ArrowRight,
  Shield,
  FileSpreadsheet,
  Settings,
  CreditCard,
  CheckCircle2,
  Percent,
  Layers,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface CommandItem {
  id: string;
  title: string;
  description: string;
  category: "Transport" | "Accounts" | "Masters" | "Reports" | "Settings" | "LR Record";
  href: string;
  icon: React.ReactNode;
  keywords?: string[];
}

const COMMAND_ITEMS: CommandItem[] = [
  // Transport Operations
  {
    id: "lr-booking",
    title: "Book Lorry Receipt (LR / GR)",
    description: "Issue new consignment note, assign vehicle and driver",
    category: "Transport",
    href: "/transport/lr-booking",
    icon: <Truck className="w-4 h-4 text-[#4F46E5]" />,
    keywords: ["lr", "gr", "bilty", "consignment", "booking", "vehicle"],
  },
  {
    id: "jobs",
    title: "Job Orders & Dispatch",
    description: "Create cargo movement orders and customer dispatch plans",
    category: "Transport",
    href: "/transport/jobs",
    icon: <FileText className="w-4 h-4 text-[#4F46E5]" />,
    keywords: ["job", "order", "dispatch", "trip"],
  },
  {
    id: "hire-challan",
    title: "Hire Challans (Lorry Hire)",
    description: "Contract market trucks, calculate hire rates and advances",
    category: "Transport",
    href: "/transport/hire-challan",
    icon: <Truck className="w-4 h-4 text-[#4F46E5]" />,
    keywords: ["hc", "hire", "challan", "lorry", "market"],
  },
  {
    id: "eway-bill",
    title: "E-Way Bills Management",
    description: "Update Part-B vehicle numbers and monitor validity",
    category: "Transport",
    href: "/transport/eway-bill",
    icon: <FileText className="w-4 h-4 text-[#4F46E5]" />,
    keywords: ["eway", "bill", "part-b", "compliance"],
  },
  {
    id: "tracking",
    title: "Live FASTag & GPS Tracking",
    description: "Track fleet toll pings and live vehicle locations",
    category: "Transport",
    href: "/transport/tracking",
    icon: <Clock className="w-4 h-4 text-[#4F46E5]" />,
    keywords: ["fastag", "gps", "tracking", "toll", "location"],
  },
  {
    id: "company-vehicles",
    title: "Company Fleet Master",
    description: "Owned trucks, registration plates, RC, and fitness",
    category: "Transport",
    href: "/transport/company-vehicles",
    icon: <Truck className="w-4 h-4 text-[#4F46E5]" />,
    keywords: ["fleet", "company", "vehicle", "truck"],
  },
  {
    id: "drivers",
    title: "Driver Management",
    description: "Commercial driver profiles, licenses, and KYC",
    category: "Transport",
    href: "/transport/drivers",
    icon: <Users className="w-4 h-4 text-[#4F46E5]" />,
    keywords: ["driver", "license", "phone", "kyc"],
  },

  // Accounts & Billing
  {
    id: "transport-invoice",
    title: "Transport Invoices",
    description: "Generate customer GST freight billings from delivered LRs",
    category: "Accounts",
    href: "/accounts/transport-invoice",
    icon: <Receipt className="w-4 h-4 text-[#027A48]" />,
    keywords: ["invoice", "freight", "billing", "gst", "ti"],
  },
  {
    id: "receipt-voucher",
    title: "Receipt Vouchers",
    description: "Record payments collected from client consigners",
    category: "Accounts",
    href: "/accounts/receipt-voucher",
    icon: <Receipt className="w-4 h-4 text-[#027A48]" />,
    keywords: ["receipt", "collection", "payment", "bank", "cash"],
  },
  {
    id: "payment-voucher",
    title: "Payment Vouchers (ATH / BTH)",
    description: "Disburse driver advances and lorry owner balances",
    category: "Accounts",
    href: "/accounts/payment-voucher",
    icon: <CreditCard className="w-4 h-4 text-[#027A48]" />,
    keywords: ["payment", "ath", "bth", "advance", "diesel", "settlement"],
  },
  {
    id: "contra-voucher",
    title: "Contra Transfer Vouchers",
    description: "Internal bank-to-bank and cash-to-bank transfers",
    category: "Accounts",
    href: "/accounts/contra-voucher",
    icon: <CreditCard className="w-4 h-4 text-[#027A48]" />,
    keywords: ["contra", "transfer", "bank", "cash"],
  },
  {
    id: "purchases",
    title: "Purchase Register",
    description: "Log vendor supplier invoices and operational expenses",
    category: "Accounts",
    href: "/accounts/purchases",
    icon: <Receipt className="w-4 h-4 text-[#027A48]" />,
    keywords: ["purchase", "bill", "vendor", "supplier"],
  },

  // General & Masters
  {
    id: "consigner",
    title: "Consigners (Shipper Clients)",
    description: "Commercial clients, contracted rates, and billing GSTIN",
    category: "Masters",
    href: "/general/consigner",
    icon: <Building2 className="w-4 h-4 text-[#B54708]" />,
    keywords: ["consigner", "client", "customer", "shipper"],
  },
  {
    id: "consignee",
    title: "Consignees (Receivers)",
    description: "Delivery destinations and receiver entity directory",
    category: "Masters",
    href: "/general/consignee",
    icon: <Building2 className="w-4 h-4 text-[#B54708]" />,
    keywords: ["consignee", "receiver", "destination"],
  },
  {
    id: "location",
    title: "Locations & Hubs",
    description: "Geographic corridors, hubs, and terminal facilities",
    category: "Masters",
    href: "/general/location",
    icon: <MapPin className="w-4 h-4 text-[#B54708]" />,
    keywords: ["location", "city", "hub", "origin", "destination", "state"],
  },
  {
    id: "load-type",
    title: "Load Types Master",
    description: "Carriage load types: FTL, LTL, Part Load, Parcel, ODC, Containerized",
    category: "Masters",
    href: "/general/load-type",
    icon: <Layers className="w-4 h-4 text-[#B54708]" />,
    keywords: ["load", "load type", "ftl", "ltl", "part load", "odc", "carriage"],
  },
  {
    id: "tax-category",
    title: "GST Tax Categories",
    description: "Indian GST slabs and Reverse Charge Mechanism (GTA RCM)",
    category: "Masters",
    href: "/misc/tax-category",
    icon: <Percent className="w-4 h-4 text-[#B54708]" />,
    keywords: ["tax", "gst", "rcm", "slab", "rate"],
  },

  // Reports
  {
    id: "trial-balance",
    title: "Trial Balance Report",
    description: "Ledger debit and credit mathematical integrity verification",
    category: "Reports",
    href: "/reports/trial-balance",
    icon: <FileSpreadsheet className="w-4 h-4 text-[#175CD3]" />,
    keywords: ["trial", "balance", "debit", "credit", "ledger"],
  },
  {
    id: "daybook",
    title: "Daily Daybook Ledger",
    description: "Chronological transaction postings across all vouchers",
    category: "Reports",
    href: "/reports/daybook",
    icon: <FileSpreadsheet className="w-4 h-4 text-[#175CD3]" />,
    keywords: ["daybook", "daily", "journal", "entries"],
  },
  {
    id: "ledger",
    title: "General Account Ledger",
    description: "Detailed statement of account with running balances",
    category: "Reports",
    href: "/reports/ledger",
    icon: <FileSpreadsheet className="w-4 h-4 text-[#175CD3]" />,
    keywords: ["ledger", "statement", "account", "balance"],
  },

  // Settings & Security
  {
    id: "users",
    title: "User Management",
    description: "Employee logins, operator access, and account credentials",
    category: "Settings",
    href: "/settings/users",
    icon: <Users className="w-4 h-4 text-[#667085]" />,
    keywords: ["user", "employee", "login", "password", "staff"],
  },
  {
    id: "roles",
    title: "Roles & Permissions Matrix",
    description: "Granular access rights across operations and accounts",
    category: "Settings",
    href: "/settings/roles",
    icon: <Shield className="w-4 h-4 text-[#667085]" />,
    keywords: ["role", "permission", "security", "rbac", "access"],
  },
  {
    id: "activity",
    title: "Audit Trail & Activity Log",
    description: "Immutable chronological security log of system actions",
    category: "Settings",
    href: "/settings/activity",
    icon: <Clock className="w-4 h-4 text-[#667085]" />,
    keywords: ["audit", "log", "activity", "security", "history"],
  },
];

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export type SearchStatus = "idle" | "debouncing" | "loading" | "success" | "error";

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [recordItems, setRecordItems] = useState<CommandItem[]>([]);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const requestSeqRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setRecordItems([]);
      setSearchStatus("idle");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!isOpen || trimmed.length < 2) {
      setRecordItems([]);
      setSearchStatus("idle");
      return;
    }

    // Set status to debouncing immediately so empty state doesn't flash
    setSearchStatus("debouncing");

    const controller = new AbortController();
    const currentSeq = ++requestSeqRef.current;

    const timer = window.setTimeout(async () => {
      // Check if sequence is still active before network call
      if (currentSeq !== requestSeqRef.current) return;
      setSearchStatus("loading");

      try {
        const results = await apiClient<any[]>(
          `/api/v1/transport/lrs-search?q=${encodeURIComponent(trimmed)}&limit=8`,
          { signal: controller.signal }
        );

        // Stale response guard
        if (currentSeq !== requestSeqRef.current) return;

        setRecordItems(
          results.map((lr) => ({
            id: `lr-record-${lr.id}`,
            title: lr.lr_number,
            description: [
              lr.consigner_name && lr.consignee_name
                ? `${lr.consigner_name} to ${lr.consignee_name}`
                : lr.consigner_name || lr.consignee_name,
              lr.vehicle_number,
              String(lr.status || "").replace(/_/g, " "),
            ]
              .filter(Boolean)
              .join(" • "),
            category: "LR Record" as const,
            href: `/transport/lr-booking?search=${encodeURIComponent(lr.lr_number)}`,
            icon: <FileText className="w-4 h-4 text-blue-600" />,
            keywords: [lr.lr_number, lr.vehicle_number, lr.consigner_name, lr.consignee_name].filter(Boolean),
          }))
        );
        setSearchStatus("success");
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          if (currentSeq === requestSeqRef.current) {
            setRecordItems([]);
            setSearchStatus("error");
          }
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, query]);

  // Filter items matching query across title, description, category, and keywords
  const filteredItems = COMMAND_ITEMS.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.keywords && item.keywords.some((k) => k.includes(q)))
    );
  });

  const allResults = query.trim().length >= 2 ? [...recordItems, ...filteredItems] : filteredItems;

  const handleSelect = (item: CommandItem) => {
    onClose();
    router.push(item.href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (allResults.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allResults.length) % (allResults.length || 1));
    } else if (e.key === "Enter" && allResults[selectedIndex]) {
      e.preventDefault();
      handleSelect(allResults[selectedIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#101828]/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Spotlight Dialog */}
      <div className="flex min-h-full items-start justify-center p-4 pt-16 sm:pt-24 text-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="command-palette-title"
          className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl border border-slate-200 transition-all animate-in zoom-in-95 duration-150 flex flex-col max-h-[75vh] z-10"
          onKeyDown={handleKeyDown}
        >
          {/* Top Search Input Bar */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E4E7EC] bg-white">
            <style dangerouslySetInnerHTML={{ __html: `
              #command-palette-search-input,
              #command-palette-search-input:focus,
              #command-palette-search-input:focus-visible,
              #command-palette-search-input:active {
                outline: none !important;
                outline-width: 0px !important;
                outline-style: none !important;
                outline-color: transparent !important;
                border: none !important;
                border-width: 0px !important;
                border-style: none !important;
                box-shadow: none !important;
                -webkit-box-shadow: none !important;
                -webkit-appearance: none !important;
                appearance: none !important;
              }
            `}} />
            <Search className="w-5 h-5 text-[#667085] shrink-0" />
            <input
              id="command-palette-search-input"
              aria-label="Search modules and records"
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search LR records or modules…"
              className="flex-1 bg-transparent text-sm text-[#101828] placeholder-[#98A2B3] border-none outline-none ring-0 shadow-none focus:border-none focus:outline-none focus:ring-0 focus:shadow-none"
              style={{
                outline: "none",
                boxShadow: "none",
                border: "none",
                WebkitAppearance: "none",
              }}
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="p-1 text-[#98A2B3] hover:text-[#101828] rounded"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#F8F9FA] border border-[#D0D5DD] rounded text-[#667085]">
                ESC
              </kbd>
            )}
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-2 divide-y divide-[#F2F4F7]">
            <span id="command-palette-title" className="sr-only">Global search</span>
            {(searchStatus === "debouncing" || searchStatus === "loading") && allResults.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500 bg-slate-50 rounded-lg mb-1" role="status">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                <span>Searching LR records for “{query}”…</span>
              </div>
            )}
            {(searchStatus === "debouncing" || searchStatus === "loading") && allResults.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#667085] flex flex-col items-center justify-center gap-2" role="status">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                <span>Searching records and modules for “{query}”…</span>
              </div>
            ) : allResults.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#667085]">
                <Search className="w-8 h-8 text-[#D0D5DD] mx-auto mb-2" />
                {searchStatus === "error"
                  ? "Record search could not be loaded. Module results are still available."
                  : `No modules or LR records match “${query}”.`}
              </div>
            ) : (
              allResults.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-control text-left transition-colors cursor-pointer group",
                      isSelected ? "bg-[#EEF2FF] text-[#101828]" : "hover:bg-[#F8F9FB] text-[#344054]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "p-2 rounded-control border shrink-0 transition-colors",
                          isSelected
                            ? "bg-white border-[#C7D2FE] shadow-xs"
                            : "bg-[#F8F9FB] border-[#E4E7EC]"
                        )}
                      >
                        {item.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#101828]">
                            {item.title}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.2 rounded font-medium",
                              isSelected
                                ? "bg-[#C7D2FE] text-[#3730A3]"
                                : "bg-[#F2F4F7] text-[#667085]"
                            )}
                          >
                            {item.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#667085] mt-0.5 line-clamp-1">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <ArrowRight
                      className={cn(
                        "w-4 h-4 shrink-0 transition-transform",
                        isSelected ? "text-[#4F46E5] translate-x-1" : "text-[#D0D5DD] opacity-0 group-hover:opacity-100"
                      )}
                    />
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Shortcuts */}
          <div className="px-4 py-2.5 border-t border-[#E4E7EC] bg-[#F8F9FB] flex items-center justify-between text-xs text-[#667085]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-[#D0D5DD] rounded text-xs font-mono">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white border border-[#D0D5DD] rounded text-xs font-mono">↓</kbd>
                <span>navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-0.5 bg-white border border-[#D0D5DD] rounded text-xs font-mono">↵</kbd>
                <span>open</span>
              </span>
            </div>
            <span className="text-xs text-[#98A2B3]">PantherTMS Quick Navigation</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
