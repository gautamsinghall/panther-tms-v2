"use client";

import React, { useState } from "react";
import { Building2, FileText, CheckCircle2, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";

export default function CompanyProfilePage() {
  const [companyName, setCompanyName] = useState("Demo Logistics Pvt Ltd");
  const [gstin, setGstin] = useState("27AABCP1234F1Z5");
  const [pan, setPan] = useState("AABCP1234F");
  const [phone, setPhone] = useState("+91 22 2345 6789");
  const [email, setEmail] = useState("billing@demo.com");
  const [address, setAddress] = useState("Plot 42, Transport Nagar, Vashi");
  const [city, setCity] = useState("Navi Mumbai");
  const [state, setState] = useState("Maharashtra");
  const [pincode, setPincode] = useState("400703");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
              <h3 className="font-semibold text-sm text-[#172033]">{companyName}</h3>
              <p className="text-xs text-[#667085]">Subdomain: demo.panthertms.local</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-[#F2F4F7]">
              <span className="text-[#667085]">Subscription Plan</span>
              <span className="font-semibold text-[#172033]">Pro Fleet (Tier 2)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#F2F4F7]">
              <span className="text-[#667085]">Database Isolation</span>
              <span className="font-mono text-emerald-600 font-semibold">panther_tenant_demo</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#F2F4F7]">
              <span className="text-[#667085]">E-Invoicing Gateway</span>
              <StatusBadge status="ACTIVE" variant="active" />
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#667085]">Tenant Status</span>
              <StatusBadge status="VERIFIED" variant="completed" />
            </div>
          </div>
        </Card>

        <div className="lg:col-span-2">
          <Card className="p-6">
            <h4 className="text-sm font-semibold text-[#172033] mb-4 pb-2 border-b border-[#E4E7EC] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#C9A227]" />
              Statutory & Registered Address Information
            </h4>

            {saved && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-control text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Company details updated successfully.
              </div>
            )}

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
                  required
                />
                <Input
                  label="Permanent Account Number (PAN)"
                  value={pan}
                  onChange={(e) => setPan(e.target.value)}
                  required
                />
                <Input
                  label="Corporate Contact Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Input
                  label="Official Invoicing Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  label="Pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                />
                <Input
                  label="State (GST State Code 27)"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
                <Input
                  label="City / Hub"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
                <div className="md:col-span-2">
                  <Input
                    label="Registered Office Address Line"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button variant="primary" type="submit">
                  Save Company Settings
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
