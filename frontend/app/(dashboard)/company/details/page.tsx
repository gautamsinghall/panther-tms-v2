"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
  Trash2,
  PenTool,
  MapPin,
  Eye,
  ShieldCheck,
  ExternalLink,
  ImageIcon,
  Plus,
  Globe,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { getStoredAuth } from "@/lib/auth";
import { CompanyNavTabs } from "@/components/company/company-nav-tabs";

interface BranchOption {
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

interface CompanySettingData {
  id?: number;
  company_name: string;
  pan?: string | null;
  website?: string | null;
  logo_url?: string | null;
  signature_url?: string | null;
  signing_authority_name?: string | null;
  signing_authority_designation?: string | null;
  issuing_office?: string | null;
  default_issuing_office_id?: number | null;
}

export default function CompanyDetailsPage() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState("");
  const [companyCode, setCompanyCode] = useState("");

  // Global Company-Wide Information (Shared across all offices)
  const [companyName, setCompanyName] = useState("");
  const [legalEntityName, setLegalEntityName] = useState("");
  const [pan, setPan] = useState("");
  const [website, setWebsite] = useState("");

  // Default Issuing Office
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [defaultIssuingOfficeId, setDefaultIssuingOfficeId] = useState<number | "">("");
  const [issuingOfficeLabel, setIssuingOfficeLabel] = useState("");

  // Global Voucher Branding & Signing Authority (Printed on all vouchers)
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [signingAuthorityName, setSigningAuthorityName] = useState("");
  const [signingAuthorityDesignation, setSigningAuthorityDesignation] = useState("");

  // Status & State
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVoucherPreview, setShowVoucherPreview] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth) {
      setTenantId(auth.tenantId || "");
      setCompanyCode(auth.companyCode || "");
    }

    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const [companyData, branchList] = await Promise.all([
          apiClient<CompanySettingData>("/api/v1/profile/company"),
          apiClient<BranchOption[]>("/api/v1/profile/branches").catch(() => []),
        ]);

        const validBranches = Array.isArray(branchList) ? branchList : [];
        setBranches(validBranches);

        if (companyData) {
          setCompanyName(companyData.company_name || "");
          setLegalEntityName(companyData.company_name || "");
          setPan(companyData.pan || "");
          setWebsite(companyData.website || "");
          setLogoUrl(companyData.logo_url || null);
          setSignatureUrl(companyData.signature_url || null);
          setSigningAuthorityName(companyData.signing_authority_name || "");
          setSigningAuthorityDesignation(companyData.signing_authority_designation || "");
          setIssuingOfficeLabel(companyData.issuing_office || "");

          if (companyData.default_issuing_office_id) {
            setDefaultIssuingOfficeId(companyData.default_issuing_office_id);
          } else if (validBranches.length > 0) {
            const hq = validBranches.find((b) => b.is_head_office) || validBranches[0];
            setDefaultIssuingOfficeId(hq.id);
            setIssuingOfficeLabel(hq.name);
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to load company details.");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Selected office object for voucher preview and metadata
  const selectedBranch = branches.find((b) => b.id === Number(defaultIssuingOfficeId)) || branches[0] || null;

  // Handle changing the default issuing office
  const handleDefaultOfficeChange = (branchIdStr: string) => {
    if (!branchIdStr) {
      setDefaultIssuingOfficeId("");
      return;
    }
    const id = Number(branchIdStr);
    setDefaultIssuingOfficeId(id);
    const chosen = branches.find((b) => b.id === id);
    if (chosen) {
      setIssuingOfficeLabel(chosen.name);
    }
  };

  // Helper to convert and compress image files to lightweight Data URLs
  const processImageFile = (file: File, callback: (dataUrl: string) => void) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, SVG, WebP).");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("Image size exceeds 4MB. Please choose a smaller image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 800;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/png", 0.9);
          callback(compressedDataUrl);
        } else {
          callback(result);
        }
      };
      img.onerror = () => {
        callback(result);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file, (dataUrl) => {
        setLogoUrl(dataUrl);
        setError(null);
      });
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file, (dataUrl) => {
        setSignatureUrl(dataUrl);
        setError(null);
      });
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await apiClient<CompanySettingData>("/api/v1/profile/company", {
        method: "PUT",
        body: JSON.stringify({
          company_name: (legalEntityName || companyName).trim(),
          pan: pan ? pan.toUpperCase().trim() : null,
          website: website ? website.trim() : null,
          logo_url: logoUrl || "",
          signature_url: signatureUrl || "",
          signing_authority_name: signingAuthorityName ? signingAuthorityName.trim() : null,
          signing_authority_designation: signingAuthorityDesignation ? signingAuthorityDesignation.trim() : null,
          default_issuing_office_id: defaultIssuingOfficeId ? Number(defaultIssuingOfficeId) : null,
          issuing_office: issuingOfficeLabel ? issuingOfficeLabel.trim() : null,
        }),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to save company settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <PageHeader
        title="Company Details & Global Branding"
        description="Global corporate profile, brand logo, signing authority, and default issuing office shared across all transport operations."
        breadcrumbs={[
          { label: "Company Settings", href: "/company/details" },
          { label: "Company Details" },
        ]}
      >
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowVoucherPreview(!showVoucherPreview)}
            className="text-xs h-9 gap-1.5 cursor-pointer bg-white"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-600" />
            <span>{showVoucherPreview ? "Hide Voucher Preview" : "Preview on Voucher"}</span>
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isSaving || isLoading}
            onClick={() => handleSave()}
            className="text-xs h-9 gap-1.5 cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>Save Company Details</span>
          </Button>
        </div>
      </PageHeader>

      <CompanyNavTabs />

      {/* Informative Separation Guide Banner */}
      <div className="p-4 bg-sky-50/70 border border-sky-200/80 rounded-xl text-sky-950 flex items-start gap-3 shadow-2xs">
        <div className="p-1 rounded-md bg-sky-100 text-sky-700 shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="text-xs space-y-1">
          <span className="font-semibold text-sky-900 block">
            Clear Separation of Company-Wide vs. Issuing Office Information
          </span>
          <p className="text-sky-700 leading-relaxed">
            <strong>Company Details</strong> holds only global corporate information common to the entire organization (brand name, legal entity name, corporate PAN, website, official logo, and signing authority). Location-specific details (registered office address, state GSTIN, bank accounts, and local phone/email) belong to each individual location and are configured under{" "}
            <Link
              href="/company/branches"
              className="font-semibold text-sky-900 underline hover:text-indigo-700 inline-flex items-center gap-0.5 ml-1"
            >
              Issuing Offices / Branches
              <ExternalLink className="w-3 h-3" />
            </Link>.
          </p>
        </div>
      </div>

      {saved && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-medium flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Company details, official branding, and default issuing office updated successfully!</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-mono">Saved to Tenant DB</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium flex items-center gap-2 shadow-2xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Interactive Live Voucher Preview */}
      {showVoucherPreview && (
        <Card className="p-5 border-2 border-indigo-200 bg-slate-50/80 shadow-md animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-indigo-100 text-indigo-700">
                <FileText className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Live Voucher Header & Signatory Print Simulation
                </h4>
                <p className="text-[11px] text-slate-500">
                  Renders company-wide branding alongside the selected Default Issuing Office location data.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700">
              1-Page A4 Voucher Format
            </span>
          </div>

          <div className="bg-white border-2 border-black p-4 text-black max-w-3xl mx-auto shadow-sm">
            {/* Header Preview */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-black gap-2">
              {/* Logo Preview (Company Wide) */}
              <div className="w-[30%] flex flex-col items-center justify-center shrink-0">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Company Logo Preview"
                    className="max-h-12 max-w-full object-contain mx-auto"
                  />
                ) : (
                  <div className="text-center p-2 border border-dashed border-slate-300 rounded bg-slate-50 w-full">
                    <span className="text-[10px] text-slate-400 font-mono block">No Logo Uploaded</span>
                    <span className="text-[9px] text-slate-500 font-semibold block">Using Panther Default</span>
                  </div>
                )}
              </div>

              {/* Middle Company Details (Global Legal Name + Issuing Office Location) */}
              <div className="w-[42%] text-center px-1">
                <div className="text-sm font-black text-red-600 uppercase tracking-wide leading-tight">
                  {legalEntityName || companyName || "Panther Logistics"}
                </div>
                <div className="text-[10px] font-medium leading-tight mt-0.5 text-slate-800">
                  {selectedBranch?.address || "Address defined by selected Issuing Office / Branch"}
                </div>
                <div className="text-[10px] font-medium leading-tight text-slate-800">
                  {selectedBranch?.city || "Office City"} {selectedBranch?.state || "State"}{" "}
                  {selectedBranch?.pincode ? `- ${selectedBranch.pincode}` : ""}
                </div>
                <div className="text-[10px] font-medium leading-tight text-slate-700">
                  Phone: {selectedBranch?.phone || "—"} | Email: {selectedBranch?.email || "—"}
                </div>
              </div>

              {/* Right: Issuing Office & Tax */}
              <div className="w-[28%] text-right text-[10px] leading-snug space-y-0.5 pr-1">
                <div>
                  <span className="font-normal text-slate-600">Issuing Office: </span>
                  <span className="font-semibold text-black">
                    {selectedBranch?.name || issuingOfficeLabel || "Default Issuing Office"}
                  </span>
                </div>
                <div>
                  <span className="font-normal text-slate-600">GSTIN: </span>
                  <span className="font-semibold font-mono">
                    {selectedBranch?.gstin || "Per Issuing Office"}
                  </span>
                </div>
                <div>
                  <span className="font-normal text-slate-600">PAN: </span>
                  <span className="font-semibold font-mono">{pan || selectedBranch?.pan || "AAAAA0000A"}</span>
                </div>
              </div>
            </div>

            {/* Simulated Body Bar */}
            <div className="py-4 my-2 text-center text-[10px] text-slate-400 bg-slate-50 border border-slate-200 border-dashed rounded">
              [ Consignment Particulars, LR Packages, Freight Charges & Consignor/Consignee Info Prints Here ]
            </div>

            {/* Footer Signatory Preview */}
            <div className="flex items-center justify-between pt-2 border-t border-black text-[10px]">
              <div className="w-1/3 text-left text-[9px] text-slate-500">
                Subject to {selectedBranch?.city || "Local"} Jurisdiction
              </div>
              <div className="w-1/3 text-center font-bold uppercase tracking-wider text-[10px]">
                CONSIGNOR COPY
              </div>
              <div className="w-1/3 text-right">
                {signatureUrl ? (
                  <div className="flex justify-end mb-1">
                    <img
                      src={signatureUrl}
                      alt="Signature Preview"
                      className="h-8 max-w-[110px] object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-6 flex items-center justify-end text-[9px] text-slate-400 italic">
                    [ No Signature Uploaded ]
                  </div>
                )}
                <div className="text-[9px] font-semibold text-slate-700">
                  {signingAuthorityName || "Authorized Signatory"}
                  {signingAuthorityDesignation ? ` (${signingAuthorityDesignation})` : ""}
                </div>
                <div className="text-[10px] font-bold text-black uppercase mt-0.5">
                  {legalEntityName || companyName || "Panther Logistics"}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Top 3 Cards Grid: Logo, Signatory, Default Issuing Office */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Official Brand Logo (Header) */}
        <Card className="p-5 flex flex-col justify-between space-y-4 shadow-2xs border-slate-200">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
                  <ImageIcon className="w-4 h-4" />
                </span>
                <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-900">
                  Official Brand Logo
                </h3>
              </div>
              <span className="text-[10px] font-medium text-slate-500">Company-Wide</span>
            </div>

            <p className="text-xs text-slate-500 mt-2.5">
              Upload the official corporate logo. This prints on the top header of all Trip Order Vouchers, LRs, and Invoices.
            </p>

            <div className="mt-4 flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/70 hover:bg-slate-50 transition-colors">
              {logoUrl ? (
                <div className="space-y-3 w-full text-center">
                  <div className="h-20 w-full flex items-center justify-center bg-white rounded-lg border border-slate-200 p-2 shadow-2xs">
                    <img
                      src={logoUrl}
                      alt="Company Logo"
                      className="max-h-full max-w-full object-contain mx-auto"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                      className="text-xs h-7 gap-1 bg-white cursor-pointer"
                    >
                      <Upload className="w-3 h-3 text-slate-500" />
                      <span>Change</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setLogoUrl(null)}
                      className="text-xs h-7 gap-1 text-rose-600 hover:bg-rose-50 border-rose-200 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3 text-rose-600" />
                      <span>Remove</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="cursor-pointer text-center py-2 group w-full"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-indigo-600 block group-hover:underline">
                    Click to Upload Logo
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    PNG, JPG, SVG or WebP (max 4MB)
                  </span>
                </div>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>High-resolution transparent PNG recommended</span>
          </div>
        </Card>

        {/* Card 2: Signing Authority & Stamp (Footer) */}
        <Card className="p-5 flex flex-col justify-between space-y-4 shadow-2xs border-slate-200">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-amber-50 text-amber-600">
                  <PenTool className="w-4 h-4" />
                </span>
                <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-900">
                  Signing Authority & Stamp
                </h3>
              </div>
              <span className="text-[10px] font-medium text-slate-500">Company-Wide</span>
            </div>

            <p className="text-xs text-slate-500 mt-2.5">
              Upload the corporate digital signature or seal that prints automatically in the signatory box on vouchers.
            </p>

            <div className="mt-4 flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/70 hover:bg-slate-50 transition-colors">
              {signatureUrl ? (
                <div className="space-y-2 w-full text-center">
                  <div className="h-16 w-full flex items-center justify-center bg-white rounded-lg border border-slate-200 p-2 shadow-2xs">
                    <img
                      src={signatureUrl}
                      alt="Digital Signature"
                      className="max-h-full max-w-full object-contain mx-auto"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => signatureInputRef.current?.click()}
                      className="text-xs h-7 gap-1 bg-white cursor-pointer"
                    >
                      <Upload className="w-3 h-3 text-slate-500" />
                      <span>Change</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSignatureUrl(null)}
                      className="text-xs h-7 gap-1 text-rose-600 hover:bg-rose-50 border-rose-200 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3 text-rose-600" />
                      <span>Remove</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => signatureInputRef.current?.click()}
                  className="cursor-pointer text-center py-2 group w-full"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                    <PenTool className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-amber-700 block group-hover:underline">
                    Upload Signature Image
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Transparent PNG recommended
                  </span>
                </div>
              )}
              <input
                ref={signatureInputRef}
                type="file"
                accept="image/*"
                onChange={handleSignatureUpload}
                className="hidden"
              />
            </div>

            <div className="space-y-2.5 mt-3 pt-2">
              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">
                  Authorized Signatory Name
                </label>
                <Input
                  value={signingAuthorityName}
                  onChange={(e) => setSigningAuthorityName(e.target.value)}
                  placeholder="e.g. Parth Sharma"
                  className="text-xs h-8"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">
                  Designation / Role
                </label>
                <Input
                  value={signingAuthorityDesignation}
                  onChange={(e) => setSigningAuthorityDesignation(e.target.value)}
                  placeholder="e.g. Authorized Signatory / Operations Director"
                  className="text-xs h-8"
                />
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>Printed on all vouchers above company name</span>
          </div>
        </Card>

        {/* Card 3: Default Issuing Office (Dropdown or Empty State with Button) */}
        <Card className="p-5 flex flex-col justify-between space-y-4 shadow-2xs border-slate-200">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-emerald-50 text-emerald-600">
                  <MapPin className="w-4 h-4" />
                </span>
                <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-900">
                  Default Issuing Office
                </h3>
              </div>
              <span className="text-[10px] font-medium text-slate-500">Dispatch Hub</span>
            </div>

            <p className="text-xs text-slate-500 mt-2.5">
              Select the primary issuing office / branch whose registered address, GSTIN, and contact details are automatically used when issuing vouchers.
            </p>

            <div className="mt-4 space-y-3">
              {branches.length === 0 ? (
                /* Empty state required by prompt: "No issuing office has been created yet. Add an issuing office to continue." with Add Issuing Office button */
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-3 text-center">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-amber-900 block">
                      No issuing office has been created yet.
                    </span>
                    <span className="text-[11px] text-amber-700 block mt-0.5">
                      Add an issuing office to continue.
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => router.push("/company/branches?add=true")}
                    className="w-full text-xs h-8 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Issuing Office</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-700 block mb-1">
                      Select Default Issuing Office / Branch <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={defaultIssuingOfficeId}
                      onChange={(e) => handleDefaultOfficeChange(e.target.value)}
                      className="w-full text-xs h-9 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code}) {b.is_head_office ? "★ Head Office" : ""} - {b.city || "Hub"}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedBranch && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-800">
                          {selectedBranch.name}
                        </span>
                        {selectedBranch.is_head_office && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 uppercase">
                            Head Office
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        {selectedBranch.address ? `${selectedBranch.address}, ` : ""}
                        {selectedBranch.city || "—"}, {selectedBranch.state || "—"} {selectedBranch.pincode || ""}
                      </div>
                      <div className="text-[11px] font-mono text-slate-700 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                        <span>GSTIN: <strong>{selectedBranch.gstin || "—"}</strong></span>
                        <span>Code: <strong>{selectedBranch.code}</strong></span>
                      </div>
                    </div>
                  )}

                  <div className="pt-1">
                    <Link
                      href="/company/branches"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                    >
                      <span>Manage All Issuing Offices / Branches</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Designated branch address automatically populates on vouchers</span>
          </div>
        </Card>
      </div>

      {/* Global Corporate Details Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Common Corporate Information */}
          <div className="lg:col-span-2">
            <Card className="p-6 space-y-5 shadow-2xs border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  Common Corporate Information (Company-Wide)
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-medium">Tenant ID:</span>
                  <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    {tenantId || "demo123456"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Overall Company Brand / Trade Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      if (!legalEntityName) setLegalEntityName(e.target.value);
                    }}
                    placeholder="e.g. Panther Logistics"
                    className="text-xs font-semibold text-slate-900"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Brand name displayed at the top of software and print templates.
                  </span>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Legal Entity Name (Incorporated Corporate Entity) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    value={legalEntityName}
                    onChange={(e) => setLegalEntityName(e.target.value)}
                    placeholder="e.g. Panther Digital Solutions Private Limited"
                    className="text-xs font-semibold text-slate-900"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Registered corporate name common to the entire company regardless of branch location.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Corporate PAN (Entity-Wide Tax Identifier)
                  </label>
                  <Input
                    value={pan}
                    maxLength={10}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    placeholder="AAAAA0000A"
                    className="font-mono text-xs tracking-wider font-semibold"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Entity-wide 10-character Income Tax PAN.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Corporate Website URL
                  </label>
                  <div className="relative">
                    <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <Input
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://pantherlogistics.com"
                      className="text-xs pl-8"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Main company website or customer tracking portal.
                  </span>
                </div>
              </div>

              {/* Informative note explaining location-specific details */}
              <div className="pt-4 border-t border-slate-200">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <span className="font-semibold text-slate-800">
                      Where are Registered Address, GSTIN, and Bank Details configured?
                    </span>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Because companies with multiple issuing offices or branches maintain independent physical addresses, state-specific GSTINs, and separate operational bank accounts, those fields are configured per location in{" "}
                      <Link
                        href="/company/branches"
                        className="font-semibold text-indigo-600 underline hover:text-indigo-800"
                      >
                        Issuing Offices / Branches
                      </Link>
                      . Each location independently maintains its own address, GSTIN, contact numbers, and bank details.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Multi-Tenant Isolation & Quick Links */}
          <div className="space-y-6">
            <Card className="p-6 space-y-4 shadow-2xs border-slate-200">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-200 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Issuing Offices Summary
              </h4>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Registered Offices:</span>
                  <span className="font-semibold text-slate-900">{branches.length} Location(s)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Default Office:</span>
                  <span className="font-semibold text-indigo-700 truncate max-w-[140px]" title={selectedBranch?.name || "None"}>
                    {selectedBranch?.name || "None Selected"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Head Office Status:</span>
                  <span className="font-semibold text-emerald-700">
                    {branches.some((b) => b.is_head_office) ? "Designated" : "Not Set"}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/company/branches")}
                  className="w-full text-xs h-8 gap-1.5 cursor-pointer bg-slate-50 hover:bg-slate-100"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Register New Issuing Office</span>
                </Button>
              </div>
            </Card>

            <Card className="p-5 space-y-3 shadow-2xs border-slate-200 bg-slate-50/50">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-200">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Multi-Tenant Isolation
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Company Code</span>
                  <span className="font-mono font-bold text-indigo-700">{companyCode || "DEMOLOGISTICS"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Tenant DB</span>
                  <span className="font-mono text-emerald-700 font-medium">
                    panther_tenant_{companyCode ? companyCode.toLowerCase() : "demologistics"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Isolation Policy</span>
                  <span className="font-semibold text-slate-800">Strict Schema Isolation</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Bottom Action Footer */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowVoucherPreview(!showVoucherPreview)}
            className="text-xs h-9 cursor-pointer bg-white"
          >
            {showVoucherPreview ? "Hide Preview" : "Preview Voucher Format"}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSaving || isLoading}
            className="text-xs h-9 px-5 gap-1.5 cursor-pointer shadow-xs"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>Save Company Details</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
