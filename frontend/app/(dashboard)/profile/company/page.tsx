"use client";

import React, { useState, useEffect } from "react";
import { Building2, FileText, CheckCircle2, ShieldCheck, Loader2, AlertCircle, Landmark } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
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
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  bank_branch?: string | null;
}

export default function CompanyProfilePage() {
  const [subdomain, setSubdomain] = useState("demo");
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

  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth) setSubdomain(auth.subdomain);

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
          setBankAccount(data.bank_account_number || "");
          setBankIfsc(data.bank_ifsc || "");
          setBankBranch(data.bank_branch || "");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load company profile.");
      } finally {
        setIsLoading(false);
      }
    }

    loadCompany();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await apiClient<CompanySettingData>("/api/v1/profile/company", {
        method: "PUT",
        body: JSON.stringify({
          company_name: companyName,
          gstin: gstin || null,
          pan: pan || null,
          phone: phone || null,
          email: email || null,
          website: website || null,
          address: address || null,
          city: city || null,
          state: state || null,
          pincode: pincode || null,
          bank_name: bankName || null,
          bank_account_number: bankAccount || null,
          bank_ifsc: bankIfsc || null,
          bank_branch: bankBranch || null,
        }),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err: any) {
      setError(err.message || "Failed to save company settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Settings"
        description="Configure your enterprise details, tax identifiers (GSTIN/PAN), and registered transport business profile."
        breadcrumbs={[
          { label: "Profile", href: "/profile/company" },
          { label: "Company Settings" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E4E7EC]">
            <div className="w-12 h-12 rounded-lg bg-[#C9A227]/10 flex items-center justify-center text-[#C9A227]">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#172033]">{companyName || "PantherTMS Enterprise"}</h3>
              <p className="text-xs text-[#667085]">Subdomain: {subdomain}.panthertms.in</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-[#F2F4F7]">
              <span className="text-[#667085]">Tenant Database</span>
              <span className="font-mono text-emerald-600 font-semibold">panther_tenant_{subdomain}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#F2F4F7]">
              <span className="text-[#667085]">Database Isolation</span>
              <span className="font-semibold text-[#172033]">Strict Schema Isolation</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#F2F4F7]">
              <span className="text-[#667085]">E-Invoicing Gateway</span>
              <StatusBadge status="READY" variant="active" />
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#667085]">Tenant Status</span>
              <StatusBadge status="ACTIVE" variant="completed" />
            </div>
          </div>
        </Card>

        <div className="lg:col-span-2">
          <Card className="p-6 space-y-6">
            <h4 className="text-sm font-semibold text-[#172033] pb-2 border-b border-[#E4E7EC] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#C9A227]" />
              Statutory & Registered Entity Information
            </h4>

            {saved && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-control text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Company details updated successfully.
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-control text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="py-8 flex justify-center items-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                Loading company settings...
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Registered Legal Entity Name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                  <Input
                    label="GSTIN (15 Digits)"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="27AABCP1234F1Z5"
                  />
                  <Input
                    label="Permanent Account Number (PAN)"
                    value={pan}
                    onChange={(e) => setPan(e.target.value)}
                    placeholder="AABCP1234F"
                  />
                  <Input
                    label="Official Contact Phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 22 2345 6789"
                  />
                  <Input
                    label="Billing / Communication Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="billing@company.com"
                  />
                  <Input
                    label="Company Website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://company.com"
                  />
                </div>

                <div className="pt-4 border-t border-[#E4E7EC]">
                  <h5 className="text-xs font-semibold text-[#172033] mb-3">Registered Office Address</h5>
                  <div className="space-y-4">
                    <Input
                      label="Street Address / Facility"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Plot 42, Transport Nagar"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input
                        label="City"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Navi Mumbai"
                      />
                      <Input
                        label="State"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="Maharashtra"
                      />
                      <Input
                        label="Postal PIN Code"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        placeholder="400703"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E4E7EC]">
                  <h5 className="text-xs font-semibold text-[#172033] mb-3 flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-indigo-600" />
                    Default Freight Collection Bank Account
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Bank Name"
                      placeholder="HDFC Bank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                    />
                    <Input
                      label="Account Number"
                      placeholder="50200012345678"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                    />
                    <Input
                      label="IFSC Code"
                      placeholder="HDFC0001234"
                      value={bankIfsc}
                      onChange={(e) => setBankIfsc(e.target.value)}
                    />
                    <Input
                      label="Branch Name"
                      placeholder="Fort Branch, Mumbai"
                      value={bankBranch}
                      onChange={(e) => setBankBranch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E4E7EC] flex justify-end">
                  <Button variant="primary" type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Company Profile"}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
