"use client";

import React, { useState, useEffect } from "react";
import { FileCheck2, Copy, Check, QrCode, Ban, Eye, X, ShieldCheck } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 block">
            {row.voucher_number || `Voucher #${row.voucher_id}`}
          </span>
          <span className="text-[11px] text-slate-400">
            Ack: {row.ack_date ? row.ack_date.split("T")[0] : "-"}
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
            className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-300 max-w-[220px] truncate"
            title={row.irn}
          >
            {row.irn.substring(0, 16)}...{row.irn.substring(row.irn.length - 8)}
          </span>
          <button
            onClick={() => handleCopy(row.irn)}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600"
            title="Copy full 64-char IRN"
          >
            {copiedIrn === row.irn ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
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
          <span className="font-mono text-xs text-slate-800 dark:text-slate-200 block">
            #{row.ack_no}
          </span>
          <span className="text-[10px] text-slate-400">
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
        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
          ₹{Number(row.net_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => (
        row.status === "GENERATED" ? (
          <Badge variant="success" className="gap-1">
            <ShieldCheck className="w-3 h-3" />
            Active IRN
          </Badge>
        ) : (
          <Badge variant="danger">
            Cancelled
          </Badge>
        )
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <FileCheck2 className="w-6 h-6 text-[var(--color-primary)]" />
            IRN Generated Register
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete audit trail of all electronic invoice IRNs dispatched to the GST portal with signed QR codes and cancellation timestamps.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/einvoicing/generate-irn">
            <Button className="gap-2">
              Generate New IRN
            </Button>
          </Link>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {errorMessage}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          searchPlaceholder="Search by invoice number or IRN..."
          searchColumn="irn"
          actions={actions}
        />
      </div>

      {/* Payload Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  E-Invoice Payload & QR: {selectedRecord.voucher_number}
                </h3>
                <p className="text-xs text-slate-400">Ack No: {selectedRecord.ack_no}</p>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Full 64-Character IRN:
                </span>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 font-mono text-xs break-all border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 select-all">
                  {selectedRecord.irn}
                </div>
              </div>

              {selectedRecord.signed_qr_code && (
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Signed QR Code Token (NIC Format):
                  </span>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 font-mono text-[11px] break-all border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                    {selectedRecord.signed_qr_code}
                  </div>
                </div>
              )}

              {selectedRecord.status === "CANCELLED" && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">
                  <strong>Cancellation Details:</strong> Reason: {selectedRecord.cancel_reason} | Date: {selectedRecord.cancel_date}
                </div>
              )}

              {selectedRecord.signed_invoice && (
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Signed Invoice Digital Signature:
                  </span>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 font-mono text-[11px] break-all border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                    {selectedRecord.signed_invoice}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end p-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" onClick={() => setSelectedRecord(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
