"use client";

import React, { useEffect, useState } from "react";
import { User, Mail, Shield, Key, Clock, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { getStoredAuth, setStoredAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";

interface UserProfileData {
  id: number;
  email: string;
  full_name: string;
  role: string;
  phone?: string | null;
  designation?: string | null;
  is_active: boolean;
  created_at: string;
}

export default function UserAccountPage() {
  const [authData, setAuthData] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth) setAuthData(auth);

    async function loadProfile() {
      setIsLoading(true);
      try {
        const data = await apiClient<UserProfileData>("/api/v1/profile/account");
        if (data) {
          setProfile(data);
          setFullName(data.full_name || "");
          setEmail(data.email || "");
          setPhone(data.phone || "");
          setDesignation(data.designation || "");
        }
      } catch (err: any) {
        // Fallback to authData
        if (auth) {
          setFullName(auth.user?.full_name || "Workspace Admin");
          setEmail(auth.user?.email || "");
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const updated = await apiClient<UserProfileData>("/api/v1/profile/account", {
        method: "PUT",
        body: JSON.stringify({
          full_name: fullName,
          phone: phone || null,
          designation: designation || null,
        }),
      });

      setProfile(updated);
      setSaved(true);

      // Update stored auth
      const currentAuth = getStoredAuth();
      if (currentAuth) {
        currentAuth.user.full_name = fullName;
        setStoredAuth(currentAuth);
      }

      setTimeout(() => setSaved(false), 3500);
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
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
            <StatusBadge status={profile?.role || "ADMIN"} variant="default" />
            <StatusBadge status={profile?.is_active !== false ? "ACTIVE" : "INACTIVE"} variant="active" />
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
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Profile details updated successfully.
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-control text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="py-8 flex justify-center items-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                Loading profile details...
              </div>
            ) : (
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
                    value={email}
                    disabled
                  />
                  <Input
                    label="Phone Number"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <Input
                    label="Designation / Title"
                    placeholder="Operations Director"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button variant="primary" type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
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
