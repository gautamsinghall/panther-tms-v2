"use client";

import React, { useState } from "react";
import { Lock, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation password do not match.");
      return;
    }

    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => setSuccess(false), 4000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Change Password"
        description="Update your credentials and maintain strict account security."
        breadcrumbs={[
          { label: "Profile", href: "/profile/account" },
          { label: "Change Password" },
        ]}
      />

      <div className="max-w-xl">
        <Card className="p-6 space-y-4">
          <h4 className="text-sm font-semibold text-[#172033] pb-2 border-b border-[#E4E7EC] flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#C9A227]" />
            Authentication Credentials
          </h4>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-control text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-control text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Password updated successfully.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
              required
            />

            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type new password"
              required
            />

            <div className="p-3 bg-[#F7F8FA] rounded-control border border-[#E4E7EC] text-xs text-[#667085] space-y-1">
              <div className="font-semibold text-[#172033]">Password Policy:</div>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Minimum 8 characters in length</li>
                <li>Include at least one uppercase letter and one special symbol</li>
                <li>Cannot match previously used tenant passwords</li>
              </ul>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="primary" type="submit">
                Update Password
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
