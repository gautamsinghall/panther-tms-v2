"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Printer,
  Download,
  Pencil,
  Truck,
  ArrowRight,
  Calendar,
  Building2,
  MapPin,
  Package,
  Weight,
  FileText,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export interface JobViewRecord {
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
  consignee_name?: string;
  origin_city?: string;
  destination_city?: string;
  expected_dispatch_date?: string;
  cargo_description?: string;
  estimated_weight_mt?: string | number;
  estimated_packages?: number;
  status: string;
  created_at: string;
}

interface JobOrderViewModalProps {
  isOpen: boolean;
  job: JobViewRecord | null;
  onClose: () => void;
  onEdit: (job: JobViewRecord) => void;
  onBookLR: (jobId: number) => void;
}

export function JobOrderViewModal({
  isOpen,
  job,
  onClose,
  onEdit,
  onBookLR,
}: JobOrderViewModalProps) {
  const [mounted, setMounted] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted || !job) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;

    const htmlDoc = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Trip_Job_Order_${job.job_number}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 24px;
              background: #fff;
            }
            .voucher-card {
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              padding: 32px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 16px;
              margin-bottom: 24px;
            }
            .title {
              font-size: 22px;
              font-weight: 800;
              letter-spacing: -0.5px;
              color: #0f172a;
              margin: 0;
            }
            .job-badge {
              font-family: monospace;
              font-size: 16px;
              font-weight: 700;
              background: #f1f5f9;
              padding: 4px 10px;
              border-radius: 6px;
              border: 1px solid #cbd5e1;
              display: inline-block;
              margin-top: 6px;
            }
            .route-ribbon {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 14px 20px;
              margin-bottom: 24px;
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            .route-hub {
              font-size: 15px;
              font-weight: 700;
              color: #1e293b;
            }
            .grid-2 {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 24px;
            }
            .party-card {
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 16px;
              background: #fafafa;
            }
            .party-label {
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              color: #64748b;
              margin-bottom: 6px;
            }
            .party-name {
              font-size: 15px;
              font-weight: 700;
              color: #0f172a;
              margin-bottom: 4px;
            }
            .cargo-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 16px;
              margin-bottom: 24px;
            }
            .cargo-table th, .cargo-table td {
              border: 1px solid #e2e8f0;
              padding: 10px 14px;
              text-align: left;
              font-size: 13px;
            }
            .cargo-table th {
              background: #f8fafc;
              color: #475569;
              font-weight: 600;
            }
            .footer-sign {
              display: flex;
              justify-content: space-between;
              margin-top: 48px;
              padding-top: 24px;
              border-top: 1px dashed #cbd5e1;
            }
            .sign-box {
              text-align: center;
              width: 220px;
            }
            .sign-line {
              border-top: 1px solid #94a3b8;
              margin-top: 40px;
              padding-top: 4px;
              font-size: 12px;
              color: #64748b;
            }
          </style>
        </head>
        <body>
          <div class="voucher-card">
            ${printContent}
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    const blob = new Blob([htmlDoc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Job_Order_${job.job_number}.html`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  };

  const modalNode = (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:m-0 print:absolute print:inset-0">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in print:hidden"
        onClick={onClose}
      />

      {/* Print Style Injector */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #job-order-printable-document, #job-order-printable-document * {
            visibility: visible;
          }
          #job-order-printable-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 24px;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Modal Dialog Container */}
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:w-full">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Trip Order Voucher
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-xs font-bold text-slate-900">
              {job.job_number}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs font-medium h-8 gap-1.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="text-xs font-medium h-8 gap-1.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Download</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onEdit(job);
              }}
              className="text-xs font-medium h-8 gap-1.5 bg-white border-blue-200 text-blue-700 hover:bg-blue-50 shadow-2xs"
            >
              <Pencil className="w-3.5 h-3.5 text-blue-600" />
              <span>Edit</span>
            </Button>

            {job.status === "OPEN" && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onClose();
                  onBookLR(job.id);
                }}
                className="text-xs font-medium h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Book GR/LR</span>
              </Button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white">
          <div
            id="job-order-printable-document"
            ref={printRef}
            className="space-y-6 max-w-2xl mx-auto"
          >
            {/* Document Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b-2 border-slate-900 pb-5 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-wider">
                    P
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold uppercase tracking-wider text-slate-900 leading-none">
                      Panther Transport
                    </h2>
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                      Trip Order Specification
                    </span>
                  </div>
                </div>
              </div>

              <div className="sm:text-right space-y-1">
                <div className="flex items-center sm:justify-end gap-2">
                  <span className="font-mono text-lg font-extrabold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                    {job.job_number}
                  </span>
                  <StatusBadge status={job.status} />
                </div>
                <div className="text-xs text-slate-500 flex items-center sm:justify-end gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Created: {job.job_date || formatDate(job.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Route Movement Ribbon */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
                      Origin Hub / City
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {job.origin_city || "Origin City"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center px-4">
                  <div className="flex items-center gap-2 text-slate-400">
                    <div className="h-[2px] w-8 sm:w-16 bg-slate-300"></div>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                    <div className="h-[2px] w-8 sm:w-16 bg-slate-300"></div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">
                      Destination Hub / City
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {job.destination_city || "Destination City"}
                    </div>
                  </div>
                </div>
              </div>

              {job.expected_dispatch_date && (
                <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                  <span className="text-slate-500 font-medium">Scheduled Dispatch Date:</span>
                  <span className="font-semibold text-slate-900 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                    {job.expected_dispatch_date}
                  </span>
                </div>
              )}
            </div>

            {/* Parties: Consigner & Consignee */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Consigner */}
              <div className="rounded-xl border border-slate-200 p-4 bg-white shadow-2xs space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    Consigner (Shipper)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID #{job.consigner_id}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {job.consigner_name || `Consigner #${job.consigner_id}`}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Origin Dispatch Station: {job.origin_city || "N/A"}
                  </p>
                </div>
              </div>

              {/* Consignee */}
              <div className="rounded-xl border border-slate-200 p-4 bg-white shadow-2xs space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    Consignee (Receiver)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID #{job.consignee_id}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {job.consignee_name || `Consignee #${job.consignee_id}`}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Destination Delivery Hub: {job.destination_city || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Billing Client Info */}
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Contracting Billing Client
                </span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                  {job.billing_client_name || job.billing_party || "Same as Consigner"}
                </span>
              </div>
              <div className="text-xs text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                Payment / Freight: <span className="font-semibold text-slate-800">To Pay / Billed</span>
              </div>
            </div>

            {/* Cargo & Goods Specification Table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-slate-500" />
                Cargo & Load Specifications
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <span className="text-xs font-medium text-slate-500 block mb-0.5">
                    Commodity / Cargo Description:
                  </span>
                  <div className="text-sm font-medium text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                    {job.cargo_description || "Standard Commercial Cargo / General Goods"}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                      <Weight className="w-3.5 h-3.5 text-slate-400" />
                      Estimated Weight
                    </span>
                    <span className="text-base font-extrabold text-slate-900 font-mono mt-1 block">
                      {job.estimated_weight_mt ? `${parseFloat(String(job.estimated_weight_mt)).toFixed(2)} MT` : "0.00 MT"}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                      <Package className="w-3.5 h-3.5 text-slate-400" />
                      Total Packages
                    </span>
                    <span className="text-base font-extrabold text-slate-900 font-mono mt-1 block">
                      {job.estimated_packages ? `${job.estimated_packages} Cartons / pkgs` : "0 pkgs"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Signatures & Authorization for Physical Printouts */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center">
              <div>
                <div className="h-12 flex items-end justify-center">
                  <span className="text-xs text-slate-400 italic">Digitally Authorized</span>
                </div>
                <div className="border-t border-slate-300 pt-1 text-xs font-semibold text-slate-700">
                  Booking Dispatch Officer
                </div>
              </div>

              <div>
                <div className="h-12 flex items-end justify-center">
                  <span className="text-xs text-slate-400 italic">Signature & Seal</span>
                </div>
                <div className="border-t border-slate-300 pt-1 text-xs font-semibold text-slate-700">
                  Carrier / Driver Acknowledgment
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between no-print">
          <div className="text-xs text-slate-500">
            Status: <span className="font-semibold text-slate-800">{job.status}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Close
            </Button>
            {job.status === "OPEN" && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onClose();
                  onBookLR(job.id);
                }}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              >
                Proceed to Book GR/LR
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
