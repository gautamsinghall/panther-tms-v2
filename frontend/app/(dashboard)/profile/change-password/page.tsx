"use client";

import React, { useState } from "react";
import { Lock, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation password do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient("/api/v1/profile/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to update password. Please verify your current password.");
    } finally {
      setSubmitting(false);
    }
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
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-control text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Password successfully updated. Please use your new password next time you sign in.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              placeholder="••••••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />

            <Input
              label="New Password (min 8 characters)"
              type="password"
              placeholder="••••••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <div className="p-3 bg-[#F8F9FB] rounded-control text-xs text-[#667085] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              Password must include uppercase, lowercase, numbers, and special symbols for maximum security.
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
