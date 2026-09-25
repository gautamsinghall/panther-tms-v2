"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Radio,
  Server,
  CheckCircle2,
  Cpu,
} from "lucide-react";
import { login, getStoredAuth } from "@/lib/auth";
import { LineHoverLink } from "@/components/ui/line-hover-link";
import { Link000 } from "@/components/ui/skiper-ui/skiper40";
import { PerspectiveGrid } from "@/components/ui/perspective-grid";

export default function LoginPage() {
  const router = useRouter();
  const [subdomain, setSubdomain] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isDemoExpanded, setIsDemoExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [rootDomainSuffix, setRootDomainSuffix] = useState(".panthertms.com");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const auth = getStoredAuth();
      if (auth && auth.accessToken) {
        router.replace("/");
        return;
      }
      setIsCheckingAuth(false);

      const host = window.location.hostname;
      if (host.includes("panthertms.com")) {
        setRootDomainSuffix(".panthertms.com");
      } else if (host === "localhost" || host === "127.0.0.1") {
        setRootDomainSuffix(".panthertms.local");
      } else {
        const parts = host.split(".");
        if (parts.length > 2) {
          setRootDomainSuffix(`.${parts.slice(-2).join(".")}`);
        } else {
          setRootDomainSuffix(`.${host}`);
        }
      }
    }
  }, [router]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-slate-500 font-mono">Checking session...</span>
        </div>
      </div>
    );
  }

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

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="min-h-screen lg:h-screen w-full flex flex-col bg-[#F8FAFC] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 relative lg:overflow-hidden">
      {/* Perspective Grid Background Layer from Vengeance UI */}
      <div className="fixed inset-0 pointer-events-none opacity-30 z-0">
        <PerspectiveGrid gridSize={32} showOverlay fadeRadius={70} />
      </div>

      {/* Ambient ambient glow accents */}
      <div className="fixed -top-40 -left-40 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* ========================================================================= */}
      {/* TOP HEADER BAR: Standardized enterprise header across Login and Signup     */}
      {/* ========================================================================= */}
      <header className="w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-6 sm:px-10 h-16 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <img
              src="/panther-logo.png"
              alt="Panther Digital Solutions"
              className="h-9 w-auto object-contain drop-shadow-xs group-hover:opacity-90 transition-opacity"
            />
            <div className="h-5 w-px bg-slate-200" />
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-500 font-mono">
              v2.0 Enterprise
            </span>
          </Link>
          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs text-slate-500 font-medium">
            <span>Enterprise Logistics Operating System</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="hidden sm:inline text-slate-500">New to PantherTMS?</span>
          <Link000
            href="/signup"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/90 hover:bg-indigo-100/90 border border-indigo-200/70 transition-all shadow-2xs"
          >
            <span>Create workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link000>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN BODY: Split view on desktop, full height without scrolling           */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative z-10 overflow-y-auto lg:overflow-hidden">
        {/* LEFT COLUMN: Logistics Telemetry & Operating System Platform              */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col justify-center gap-6 xl:gap-8 p-8 xl:p-12 border-r border-slate-200/80 bg-gradient-to-br from-slate-50/90 via-white/80 to-indigo-50/30 overflow-y-auto">
          <div className="shrink-0 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50/90 border border-indigo-100 text-indigo-700 text-xs font-semibold shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600" />
              </span>
              <span>Next-Gen Autonomous Freight Core</span>
            </div>

            <h1 className="text-3xl xl:text-4xl font-bold tracking-tight text-slate-900 leading-[1.2] pb-0.5">
              The operating system for modern logistics.
            </h1>
            <p className="text-sm xl:text-base text-slate-600 leading-relaxed max-w-lg">
              Manage dispatch, tracking, billing and compliance from one intelligent logistics workspace built for real-world enterprise freight operations.
            </p>
          </div>

          {/* Telemetry Visualization: Real-time Corridor & Fleet Telemetry Card */}
          <div className="max-w-xl w-full">
            <div className="rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-6 shadow-[0_4px_20px_rgba(15,23,42,0.04)] space-y-5">
              {/* Telemetry Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                    Live Dispatch Telemetry
                  </span>
                </div>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  Corridor Velocity: 99.4%
                </span>
              </div>

              {/* Freight Corridor Milestone Nodes */}
              <div className="space-y-4">
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-indigo-600 before:via-blue-500 before:to-emerald-500">
                  {/* Node 1: Origin */}
                  <div className="relative flex items-center justify-between group">
                    <span className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                        <span>BOM-01 Gateway Hub</span>
                        <span className="text-[11px] font-mono text-slate-400">Navi Mumbai</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                        Consignments Loaded • Fastag Auto-Checked
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-indigo-600 font-mono">Dispatched</span>
                  </div>

                  {/* Node 2: Transit Hub */}
                  <div className="relative flex items-center justify-between group">
                    <span className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                        <span>NAG-04 Consolidation Terminal</span>
                        <span className="text-[11px] font-mono text-slate-400">Nagpur</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                        Cross-dock Transshipment in progress
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-blue-600 font-mono">In-Transit</span>
                  </div>

                  {/* Node 3: Destination */}
                  <div className="relative flex items-center justify-between group">
                    <span className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-white border-2 border-emerald-500 flex items-center justify-center shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                        <span>DEL-02 Regional Fulfillment</span>
                        <span className="text-[11px] font-mono text-slate-400">Delhi NCR</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                        Automated E-way Reconciliation Ready
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600 font-mono">ETA 4h 15m</span>
                  </div>
                </div>
              </div>

              {/* Micro Telemetry Metrics Footer */}
              <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-slate-100 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-100">
                  <div className="text-sm font-bold font-mono text-slate-900">1,420+</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-tight">Active Fleet</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-100">
                  <div className="text-sm font-bold font-mono text-slate-900">100%</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-tight">GST Compliance</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-100">
                  <div className="text-sm font-bold font-mono text-slate-900">&lt; 15ms</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-tight">Sync Latency</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Authentication Form Card                                    */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-8 relative z-10 overflow-y-auto">
          <div className="w-full max-w-[440px] sm:max-w-[460px] space-y-4">
            {/* Authentication Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-7 sm:p-9 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all space-y-6">
              {/* Header */}
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600 font-mono">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Workspace Access</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Sign in to your workspace
                </h2>
                <p className="text-sm text-slate-500 leading-normal">
                  Enter your workspace subdomain and credentials to continue.
                </p>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs animate-in fade-in-0 duration-200">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span className="leading-relaxed font-medium">{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Company Subdomain (Domain-Aware Input) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 tracking-tight">
                    Company subdomain
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-2xs focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all overflow-hidden group">
                    <input
                      type="text"
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="workspace"
                      autoComplete="organization"
                      required
                      className="flex-1 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none"
                    />
                    <div className="px-3 py-2.5 bg-slate-50 border-l border-slate-100 text-xs font-mono text-slate-500 select-none whitespace-nowrap">
                      {rootDomainSuffix}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <span>Resolved host:</span>
                    <span className="font-mono text-indigo-700 font-semibold truncate">
                      {subdomain || "your-workspace"}{rootDomainSuffix}
                    </span>
                  </p>
                </div>

                {/* 2. Work Email */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 tracking-tight">
                    Work email
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      autoComplete="email"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 bg-white shadow-2xs focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* 3. Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 tracking-tight">
                      Password
                    </label>
                    <span className="text-[11px] text-slate-400 select-none">
                      Security compliant
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      className="w-full pl-10 pr-10 py-2.5 text-sm font-mono placeholder:font-sans text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 bg-white shadow-2xs focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 p-1 rounded-md text-slate-400 hover:text-slate-700 transition-colors focus:outline-none cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 4. Primary Button with interactive transition */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm shadow-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authenticating Workspace...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign in to Workspace</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {/* 5. Demo Workspace Helper Drawer */}
              <div className="pt-5 border-t border-slate-100 space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/70 hover:border-slate-300 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-slate-900">
                          Try the demo workspace
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          Pre-configured sandbox for evaluation.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={fillDemo}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-white hover:bg-indigo-50/80 border border-indigo-200 rounded-lg shadow-2xs transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
                      >
                        Use demo credentials
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDemoExpanded(!isDemoExpanded)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
                        title={isDemoExpanded ? "Collapse credentials details" : "Expand credentials details"}
                        aria-label={isDemoExpanded ? "Collapse credentials details" : "Expand credentials details"}
                      >
                        {isDemoExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Credentials Details */}
                  {isDemoExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-2 text-xs font-mono animate-in fade-in-0 slide-in-from-top-1 duration-150">
                      {/* Subdomain */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/70">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-[10px] font-sans font-semibold text-slate-400 uppercase w-16 shrink-0">
                            Workspace
                          </span>
                          <span className="text-slate-800 font-medium truncate">
                            demo{rootDomainSuffix}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard("demo", "subdomain")}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors shrink-0 ml-1 cursor-pointer"
                          title="Copy subdomain"
                        >
                          {copiedField === "subdomain" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Email */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/70">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-[10px] font-sans font-semibold text-slate-400 uppercase w-16 shrink-0">
                            Email
                          </span>
                          <span className="text-slate-800 font-medium truncate">
                            admin@demo.com
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard("admin@demo.com", "email")}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors shrink-0 ml-1 cursor-pointer"
                          title="Copy email"
                        >
                          {copiedField === "email" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Password */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/70">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-[10px] font-sans font-semibold text-slate-400 uppercase w-16 shrink-0">
                            Password
                          </span>
                          <span className="text-slate-800 font-medium truncate">
                            PantherTMS@2026!
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard("PantherTMS@2026!", "password")}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors shrink-0 ml-1 cursor-pointer"
                          title="Copy password"
                        >
                          {copiedField === "password" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sign Up Link powered by Vengeance UI LineHoverLink */}
            <div className="text-center text-xs text-slate-500 py-1">
              <span>New to PantherTMS? </span>
              <LineHoverLink
                variant="slide"
                href="/signup"
                className="text-indigo-600 font-semibold inline-flex items-center gap-1"
              >
                <span>Choose a plan & create your workspace</span>
                <span aria-hidden="true">&rarr;</span>
              </LineHoverLink>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ENTERPRISE TRUST FOOTER: Standardized across Signin and Signup            */}
      {/* ========================================================================= */}
      <footer className="w-full border-t border-slate-200/70 bg-white/70 backdrop-blur-xs py-2.5 px-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[11px] text-slate-500 z-20 shrink-0">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Tenant-isolated architecture</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>256-bit SSL encrypted</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Multi-tier RBAC security</span>
        </span>
      </footer>
    </div>
  );
}
