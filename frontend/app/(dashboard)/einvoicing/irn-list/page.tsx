"use client";

import React, { useState, useEffect } from "react";
import { FileCheck2, Copy, Check, Ban, Eye, ShieldCheck, Plus } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { ColumnDef, RowAction } from "@/types/table";
import { apiClient } from "@/lib/api-client";
import Link from "next/link";

interface EInvoiceRecord {
  id: number;
  voucher_id: number;
  voucher_number?: string;
  party_name?: string;
  net_amount?: string | number;
  irn: string;
  ack_no: string;
  ack_date: string;
  status: string;
  cancel_reason?: string;
  cancel_date?: string;
  signed_invoice?: string;
  signed_qr_code?: string;
  created_at: string;
}

export default function IRNListPage() {
  const [data, setData] = useState<EInvoiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedIrn, setCopiedIrn] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<EInvoiceRecord | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<EInvoiceRecord[]>("/api/v1/einvoicing/irn-list");
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load IRN records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopy = (irn: string) => {
    navigator.clipboard.writeText(irn);
    setCopiedIrn(irn);
    setTimeout(() => setCopiedIrn(null), 2000);
  };

  const columns: ColumnDef<EInvoiceRecord>[] = [
    {
      key: "voucher_number",
      header: "Invoice No / Date",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-semibold text-text-primary block">
            {row.voucher_number || `Voucher #${row.voucher_id}`}
          </span>
          <span className="text-xs text-text-muted mt-0.5 block">
            Ack: {row.ack_date ? row.ack_date.split("T")[0] : "—"}
          </span>
        </div>
      ),
    },
    {
      key: "irn",
      header: "Invoice Reference Number (IRN)",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-xs font-semibold text-primary max-w-[220px] truncate"
            title={row.irn}
          >
            {row.irn.substring(0, 16)}...{row.irn.substring(row.irn.length - 8)}
          </span>
          <button
            onClick={() => handleCopy(row.irn)}
            className="p-1 hover:bg-surface-secondary rounded text-text-muted hover:text-text-primary transition-colors"
            title="Copy full 64-char IRN"
          >
            {copiedIrn === row.irn ? (
              <Check className="w-3.5 h-3.5 text-success" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      ),
    },
    {
      key: "ack_no",
      header: "Ack Details",
      cell: (row) => (
        <div>
          <span className="font-mono text-xs text-text-primary font-medium block">
            #{row.ack_no}
          </span>
          <span className="text-xs text-text-muted mt-0.5 block">
            {row.party_name || "Direct Customer"}
          </span>
        </div>
      ),
    },
    {
      key: "net_amount",
      header: "Invoice Amount",
      align: "right",
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-semibold text-text-primary tabular-nums">
          ₹{Number(row.net_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge
          status={row.status === "GENERATED" ? "ACTIVE IRN" : "CANCELLED"}
          variant={row.status === "GENERATED" ? "success" : "danger"}
        />
      ),
    },
  ];

  const actions: RowAction<EInvoiceRecord>[] = [
    {
      label: "View Payload",
      icon: <Eye className="w-3.5 h-3.5" />,
      variant: "default",
      onClick: (row) => setSelectedRecord(row),
    },
    {
      label: "Cancel IRN",
      icon: <Ban className="w-3.5 h-3.5" />,
      variant: "danger",
      hidden: (row) => row.status === "CANCELLED",
      onClick: (row) => {
        window.location.href = `/einvoicing/cancel-irn?irn=${row.irn}`;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="IRN Generated Register"
        description="Complete audit trail of all electronic invoice IRNs dispatched to the GST portal with signed QR codes and cancellation timestamps."
        breadcrumbs={[
          { label: "Accounts", href: "/accounts" },
          { label: "E-Invoicing", href: "/einvoicing" },
          { label: "IRN Register" },
        ]}
        actions={
          <Link href="/einvoicing/generate-irn">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Generate New IRN
            </Button>
          </Link>
        }
      />

      {errorMessage && (
        <div className="p-4 rounded-xl bg-danger-light border border-danger/20 text-danger text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-danger hover:opacity-80">×</button>
        </div>
      )}

      <div className="bg-surface rounded-xl border border-border shadow-xs p-4">
        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          searchPlaceholder="Search by invoice number or IRN..."
          searchColumn="irn"
          actions={actions}
        />
      </div>

      {/* Payload Drawer */}
      <EntityDrawer
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        title={`E-Invoice Payload: ${selectedRecord?.voucher_number || ""}`}
        description={`Ack No: ${selectedRecord?.ack_no || ""} • ${selectedRecord?.ack_date || ""}`}
        size="lg"
        footer={
          <div className="flex justify-end w-full">
            <Button variant="outline" onClick={() => setSelectedRecord(null)}>
              Close
            </Button>
          </div>
        }
      >
        {selectedRecord && (
          <div className="space-y-4 text-xs">
            <div>
              <span className="font-semibold text-text-primary block mb-1">
                Full 64-Character IRN:
              </span>
              <div className="p-3 rounded-lg bg-surface-secondary font-mono text-xs break-all border border-border text-text-primary select-all">
                {selectedRecord.irn}
              </div>
            </div>

            {selectedRecord.signed_qr_code && (
              <div>
                <span className="font-semibold text-text-primary block mb-1">
                  Signed QR Code Token (NIC Format):
                </span>
                <div className="p-3 rounded-lg bg-surface-secondary font-mono text-[11px] break-all border border-border text-text-secondary">
                  {selectedRecord.signed_qr_code}
                </div>
              </div>
            )}

            {selectedRecord.status === "CANCELLED" && (
              <div className="p-3.5 bg-danger-light border border-danger/20 rounded-xl text-danger">
                <strong>Cancellation Details:</strong> Reason: {selectedRecord.cancel_reason || "N/A"} • Date: {selectedRecord.cancel_date || "N/A"}
              </div>
            )}

            {selectedRecord.signed_invoice && (
              <div>
                <span className="font-semibold text-text-primary block mb-1">
                  Signed Invoice Digital Signature:
                </span>
                <div className="p-3 rounded-lg bg-surface-secondary font-mono text-[11px] break-all border border-border text-text-secondary">
                  {selectedRecord.signed_invoice}
                </div>
              </div>
            )}
          </div>
        )}
      </EntityDrawer>
    </div>
  );
}
