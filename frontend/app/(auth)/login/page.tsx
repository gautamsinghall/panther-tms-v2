"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Truck, ShieldCheck, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [subdomain, setSubdomain] = useState("demo");
  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("PantherTMS@2026!");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password, subdomain);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to log in. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = () => {
    setSubdomain("demo");
    setEmail("admin@demo.com");
    setPassword("PantherTMS@2026!");
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-primary)] text-white shadow-md mb-2">
            <Truck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Panther<span className="text-[var(--color-primary)]">TMS</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Multi-Tenant SaaS Transport Management System
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Sign In to Your Workspace
            </h2>
            <p className="text-xs text-slate-500">
              Enter your tenant subdomain and administrator credentials.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Company Subdomain"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
              placeholder="e.g. demo"
              helperText="Resolves to {subdomain}.panthertms.local"
              required
            />

            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@company.com"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full text-sm font-semibold"
              isLoading={isLoading}
            >
              Sign In to Workspace
            </Button>
          </form>

          {/* Seed Quick Fill */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={fillDemo}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-primary)] hover:underline"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Use Phase 0 Seed Demo Credentials
            </button>
            <span className="text-[11px] text-slate-400">
              (demo / admin@demo.com / PantherTMS@2026!)
            </span>
          </div>
        </div>

        {/* Sign up link */}
        <div className="text-center text-xs text-slate-500">
          New to PantherTMS?{" "}
          <Link href="/signup" className="text-[var(--color-primary)] font-semibold hover:underline">
            Choose a plan & create your workspace
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Strict per-tenant database isolation active</span>
        </div>
      </div>
    </div>
  );
}
