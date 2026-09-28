"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
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
  Landmark,
  Eye,
  ShieldCheck,
  ExternalLink,
  ImageIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { getStoredAuth } from "@/lib/auth";

interface CompanySettingData {
  id?: number;
  company_name: string;
  gstin?: string | null;
  pan?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  bank_name?: string | null;
  bank_account_no?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  bank_branch?: string | null;
  logo_url?: string | null;
  signature_url?: string | null;
  signing_authority_name?: string | null;
  signing_authority_designation?: string | null;
  issuing_office?: string | null;
}

export default function CompanyDetailsPage() {
  const [tenantId, setTenantId] = useState("");
  const [companyCode, setCompanyCode] = useState("");

  // Form Fields
  const [companyName, setCompanyName] = useState("");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

  // Bank details
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankBranch, setBankBranch] = useState("");

  // Voucher Printing Options
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [signingAuthorityName, setSigningAuthorityName] = useState("");
  const [signingAuthorityDesignation, setSigningAuthorityDesignation] = useState("");
  const [issuingOffice, setIssuingOffice] = useState("");

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

    async function loadCompany() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiClient<CompanySettingData>("/api/v1/profile/company");
        if (data) {
          setCompanyName(data.company_name || "");
          setGstin(data.gstin || "");
          setPan(data.pan || "");
          setPhone(data.phone || "");
          setEmail(data.email || "");
          setWebsite(data.website || "");
          setAddress(data.address || "");
          setCity(data.city || "");
          setState(data.state || "");
          setPincode(data.pincode || "");
          setBankName(data.bank_name || "");
          setBankAccount(data.bank_account_no || data.bank_account_number || "");
          setBankIfsc(data.bank_ifsc || "");
          setBankBranch(data.bank_branch || "");
          setLogoUrl(data.logo_url || null);
          setSignatureUrl(data.signature_url || null);
          setSigningAuthorityName(data.signing_authority_name || "");
          setSigningAuthorityDesignation(data.signing_authority_designation || "");
          setIssuingOffice(data.issuing_office || "");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load company details.");
      } finally {
        setIsLoading(false);
      }
    }

    loadCompany();
  }, []);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await apiClient<CompanySettingData>("/api/v1/profile/company", {
        method: "PUT",
        body: JSON.stringify({
          company_name: companyName,
          gstin: gstin ? gstin.toUpperCase().trim() : null,
          pan: pan ? pan.toUpperCase().trim() : null,
          phone: phone || null,
          email: email || null,
          website: website || null,
          address: address || null,
          city: city || null,
          state: state || null,
          pincode: pincode || null,
          bank_name: bankName || null,
          bank_account_no: bankAccount || null,
          bank_ifsc: bankIfsc ? bankIfsc.toUpperCase().trim() : null,
          bank_branch: bankBranch || null,
          logo_url: logoUrl || "",
          signature_url: signatureUrl || "",
          signing_authority_name: signingAuthorityName || null,
          signing_authority_designation: signingAuthorityDesignation || null,
          issuing_office: issuingOffice || null,
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
        title="Company Details & Branding"
        description="Configure enterprise profile, upload official brand logo, and set signing authority for all printed transport vouchers & LRs."
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
            onClick={handleSave}
            className="text-xs h-9 gap-1.5 cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>Save All Changes</span>
          </Button>
        </div>
      </PageHeader>

      {saved && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-medium flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Company details, branding logo, and voucher signing authority updated successfully!</span>
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

      {/* Interactive Voucher Print Live Preview */}
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
                  This preview renders exactly how your logo, issuing office, and signature appear on printed Trip Orders and LRs.
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
              {/* Logo Preview */}
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

              {/* Middle Company Details */}
              <div className="w-[42%] text-center px-1">
                <div className="text-sm font-black text-red-600 uppercase tracking-wide leading-tight">
                  {companyName || "Panther Logistics"}
                </div>
                <div className="text-[10px] font-medium leading-tight mt-0.5">
                  {address || "Registered Corporate Office"}
                </div>
                <div className="text-[10px] font-medium leading-tight">
                  {city || "City"} {state || "State"} {pincode || ""}
                </div>
                <div className="text-[10px] font-medium leading-tight">
                  Phone: {phone || "-"} | Email: {email || "-"}
                </div>
              </div>

              {/* Right: Issuing Office & Tax */}
              <div className="w-[28%] text-right text-[10px] leading-snug space-y-0.5 pr-1">
                <div>
                  <span className="font-normal text-slate-600">Issuing Office: </span>
                  <span className="font-semibold text-black">
                    {issuingOffice || `Head Office ${city || "Main Hub"}`}
                  </span>
                </div>
                <div>
                  <span className="font-normal text-slate-600">GST No: </span>
                  <span className="font-semibold font-mono">{gstin || "07AAAAA0000A1Z5"}</span>
                </div>
                <div>
                  <span className="font-normal text-slate-600">PAN No: </span>
                  <span className="font-semibold font-mono">{pan || "AAAAA0000A"}</span>
                </div>
              </div>
            </div>

            {/* Simulated Body Bar */}
            <div className="py-4 my-2 text-center text-[10px] text-slate-400 bg-slate-50 border border-slate-200 border-dashed rounded">
              [ Voucher Items, Freight Particulars, Consignor & Consignee Content Prints Here ]
            </div>

            {/* Footer Signatory Preview */}
            <div className="flex items-center justify-between pt-2 border-t border-black text-[10px]">
              <div className="w-1/3 text-left text-[9px] text-slate-500">
                Subject to {city || "Local"} Jurisdiction
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
                  {companyName || "Panther Logistics"}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Main Grid: Upload Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Official Logo Upload */}
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
              <span className="text-[10px] font-medium text-slate-500">Prints on Header</span>
            </div>

            <p className="text-xs text-slate-500 mt-2.5">
              Upload your company logo. This will print on the top-left of all Trip Order Vouchers, LRs, and Customer Invoices.
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

        {/* Card 2: Signing Authority & Stamp */}
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
              <span className="text-[10px] font-medium text-slate-500">Prints on Footer</span>
            </div>

            <p className="text-xs text-slate-500 mt-2.5">
              Upload the official digital signature or seal that prints automatically in the signatory box on vouchers.
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
                  Signatory Name
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
                  placeholder="e.g. Authorized Signatory / Operations Manager"
                  className="text-xs h-8"
                />
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>Renders above the company signature label</span>
          </div>
        </Card>

        {/* Card 3: Default Issuing Office */}
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
              Specify the default branch office shown on vouchers for consignments issued from your primary hub.
            </p>

            <div className="space-y-3 mt-4">
              <div>
                <label className="text-[11px] font-medium text-slate-700 block mb-1">
                  Issuing Office Label
                </label>
                <Input
                  value={issuingOffice}
                  onChange={(e) => setIssuingOffice(e.target.value)}
                  placeholder="e.g. Head Office Ghaziabad - Main Hub"
                  className="text-xs h-9 font-medium"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Leave blank to auto-use &quot;Head Office [City]&quot;
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-700 block">
                  Multiple Issuing Offices / Branches?
                </span>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Manage individual branches with unique GSTINs, branch codes, and addresses across regions.
                </p>
                <Link
                  href="/company/branches"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors pt-1 cursor-pointer"
                >
                  <span>Manage All Issuing Offices</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Synced automatically across all voucher prints</span>
          </div>
        </Card>
      </div>

      {/* Statutory, Address, and Banking Details */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Statutory & Corporate Registration */}
          <div className="lg:col-span-2">
            <Card className="p-6 space-y-5 shadow-2xs border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  Statutory & Registered Entity Information
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
                    Company Registered Legal Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Panther Digital Solutions Private Limited"
                    className="text-xs font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    GSTIN (Goods and Services Tax No.)
                  </label>
                  <Input
                    value={gstin}
                    maxLength={15}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="07AAAAA0000A1Z5"
                    className="font-mono text-xs tracking-wider font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Company PAN (Income Tax Identifier)
                  </label>
                  <Input
                    value={pan}
                    maxLength={10}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    placeholder="AAAAA0000A"
                    className="font-mono text-xs tracking-wider font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Official Business Phone
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Official Billing / Contact Email
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ops@panthertms.com"
                    className="text-xs"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Company Website URL
                  </label>
                  <Input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://panthertms.com"
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Registered Address */}
              <div className="pt-4 border-t border-slate-200">
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  Registered Office Address
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Street Address
                    </label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Plot No. 42, Transport Nagar, Phase-II"
                      className="text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      City
                    </label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Ghaziabad"
                      className="text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      State / Province
                    </label>
                    <Input
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="Uttar Pradesh"
                      className="text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      PIN Code
                    </label>
                    <Input
                      value={pincode}
                      maxLength={10}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="201001"
                      className="text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Bank Details & Tenant Status */}
          <div className="space-y-6">
            <Card className="p-6 space-y-4 shadow-2xs border-slate-200">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-200 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-600" />
                Bank Details for Invoicing
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Bank Name
                  </label>
                  <Input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="HDFC Bank / ICICI Bank"
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Account Number
                  </label>
                  <Input
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="50200012345678"
                    className="font-mono text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    IFSC Code
                  </label>
                  <Input
                    value={bankIfsc}
                    maxLength={11}
                    onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                    placeholder="HDFC0001234"
                    className="font-mono text-xs font-semibold tracking-wider"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Branch Name
                  </label>
                  <Input
                    value={bankBranch}
                    onChange={(e) => setBankBranch(e.target.value)}
                    placeholder="Transport Nagar Branch"
                    className="text-xs"
                  />
                </div>
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
            <span>Save Company Settings</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
