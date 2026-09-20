"use client";

import React, { useEffect, useState } from "react";
import { User, Mail, Shield, Key, Clock, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { getStoredAuth } from "@/lib/auth";

export default function UserAccountPage() {
  const [authData, setAuthData] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [designation, setDesignation] = useState("Operations Director");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth) {
      setAuthData(auth);
      setFullName(auth.user?.full_name || "Company Admin");
      setEmail(auth.user?.email || "admin@demo.com");
    } else {
      setFullName("Company Admin");
      setEmail("admin@demo.com");
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Account Settings"
        description="Manage your profile information, credentials, and individual session preferences."
        breadcrumbs={[
          { label: "Profile", href: "/profile/account" },
          { label: "User Account" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-[#172033] text-white flex items-center justify-center text-2xl font-bold border-4 border-[#C9A227]/20 shadow-md">
            {fullName ? fullName[0].toUpperCase() : "A"}
          </div>
          <div>
            <h3 className="font-semibold text-base text-[#172033]">{fullName}</h3>
            <p className="text-xs text-[#667085]">{email}</p>
          </div>
          <div className="flex gap-2">
            <StatusBadge status="ADMIN" variant="default" />
            <StatusBadge status="ACTIVE" variant="active" />
          </div>

          <div className="w-full pt-4 border-t border-[#E4E7EC] text-left text-xs space-y-2.5">
            <div className="flex justify-between text-[#667085]">
              <span>Tenant Context</span>
              <span className="font-medium text-[#172033]">{authData?.tenantName || "Demo Logistics Pvt Ltd"}</span>
            </div>
            <div className="flex justify-between text-[#667085]">
              <span>Subdomain</span>
              <span className="font-mono text-[#C9A227] font-semibold">{authData?.subdomain || "demo"}</span>
            </div>
            <div className="flex justify-between text-[#667085]">
              <span>Session Type</span>
              <span className="font-medium text-[#172033]">JWT Bearer (1h exp)</span>
            </div>
          </div>
        </Card>

        {/* Profile Details Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h4 className="text-sm font-semibold text-[#172033] mb-4 pb-2 border-b border-[#E4E7EC] flex items-center gap-2">
              <User className="w-4 h-4 text-[#C9A227]" />
              Personal & Contact Information
            </h4>

            {saved && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-control text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Profile details updated successfully.
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  label="Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Input
                  label="Designation / Role Title"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button variant="primary" type="submit">
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>

          {/* Security & Access Overview */}
          <Card className="p-6">
            <h4 className="text-sm font-semibold text-[#172033] mb-4 pb-2 border-b border-[#E4E7EC] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#16A34A]" />
              Role & Permissions Scope
            </h4>
            <div className="space-y-3 text-xs text-[#667085]">
              <p>
                You are currently logged in with <strong className="text-[#172033]">COMPANY_ADMIN</strong> privileges. This grant permits full read/write access across all system modules, tenant DB configuration, role assignments, and financial ledgers.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                {["Transport Ops", "Billing & Invoices", "Fleet Maintenance", "Tax & E-Invoicing"].map((scope) => (
                  <div key={scope} className="px-2.5 py-1.5 rounded-control bg-[#F7F8FA] border border-[#E4E7EC] text-center font-medium text-[#172033]">
                    {scope}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
