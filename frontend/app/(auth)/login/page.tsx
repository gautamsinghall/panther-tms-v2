"use client";

import React, { useState, useEffect } from "react";
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
  Zap,
  Truck,
  MapPin,
  FileText,
  Building2,
  HelpCircle,
  Layers,
  Info,
} from "lucide-react";
import { login, getStoredAuth } from "@/lib/auth";

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
  const [forgotPasswordMsg, setForgotPasswordMsg] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const auth = getStoredAuth();
      if (auth && auth.accessToken) {
        router.replace("/");
        return;
      }
      setIsCheckingAuth(false);

      // Extract query params if redirected from signup or direct link
      const searchParams = new URLSearchParams(window.location.search);
      const subParam = searchParams.get("subdomain");
      const emailParam = searchParams.get("email");
      if (subParam) setSubdomain(subParam);
      if (emailParam) setEmail(emailParam);

      const host = window.location.hostname;
      if (!subParam && host.includes(".")) {
        const parts = host.split(".");
        if (parts.length > 2 && parts[0] !== "www" && parts[0] !== "api") {
          setSubdomain(parts[0]);
        }
      }

      if (host.includes("panthertms.com")) {
        setRootDomainSuffix(".panthertms.com");
      } else if (host.includes("panthertms.in")) {
        setRootDomainSuffix(".panthertms.in");
      } else if (host.includes("localhost") || host.includes("127.0.0.1")) {
        setRootDomainSuffix(".panthertms.com");
      } else {
        const parts = host.split(".");
        if (parts.length > 2) {
          setRootDomainSuffix(`.${parts.slice(-2).join(".")}`);
        } else {
          setRootDomainSuffix(".panthertms.com");
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
    setSubdomain("bharat");
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
    <div className="min-h-screen xl:h-screen w-full flex flex-col justify-between bg-[#F8FAFC] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 relative overflow-x-hidden xl:overflow-hidden">
      {/* Ambient background soft glow accents */}
      <div className="fixed -top-32 -left-32 w-[550px] h-[550px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/4 left-1/3 w-[450px] h-[450px] bg-blue-400/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-32 -right-32 w-[550px] h-[550px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* ========================================================================= */}
      {/* TOP HEADER BAR                                                            */}
      {/* ========================================================================= */}
      <header className="w-full bg-transparent px-6 sm:px-10 lg:px-14 h-16 sm:h-20 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <img
              src="/panther-logo.png"
              alt="Panther Digital Solutions"
              className="h-8 sm:h-9 w-auto object-contain drop-shadow-xs group-hover:opacity-90 transition-opacity"
            />
            <div className="flex items-center gap-1.5 ml-1">
              <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                Panther<span className="text-indigo-600">TMS</span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100/90 ml-1">
                v2.0
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs text-slate-500 font-medium">
            <span>Enterprise Logistics Operating System</span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 text-xs">
          <span className="hidden sm:inline text-slate-500 font-medium">New to PantherTMS?</span>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-200/70 transition-all shadow-2xs active:scale-[0.98]"
          >
            <span>Create workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN BODY: Split view on desktop (~65% Left Hero / ~35% Right Card)       */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 py-2 xl:py-3">
        {/* ======================================================================= */}
        {/* LEFT COLUMN: Logistics Brand, Features, Truck Scene & Telemetry (~65%) */}
        {/* ======================================================================= */}
        <section className="lg:w-[62%] xl:w-[64%] flex flex-col justify-between relative pr-0 lg:pr-8 xl:pr-12 pt-2 sm:pt-4 pb-8 lg:pb-4 overflow-hidden">
          {/* Subtle logistics background truck image blended seamlessly */}
          <div className="hidden lg:block absolute right-[-2%] bottom-0 top-[16%] w-[68%] pointer-events-none select-none z-0">
            <div
              className="w-full h-full relative"
              style={{
                maskImage:
                  "radial-gradient(ellipse 85% 75% at 70% 50%, black 35%, transparent 88%)",
                WebkitMaskImage:
                  "radial-gradient(ellipse 85% 75% at 70% 50%, black 35%, transparent 88%)",
              }}
            >
              <img
                src="/logistics-truck-bg.jpg"
                alt="PantherTMS Logistics Fleet"
                className="w-full h-full object-cover object-left opacity-95"
              />
              {/* Soft gradient overlays to harmonize with light theme */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#F8FAFC] via-[#F8FAFC]/30 to-transparent w-2/5" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#F8FAFC] via-transparent to-transparent h-1/4 bottom-0 top-auto" />
            </div>
          </div>

          {/* Top Brand Content */}
          <div className="relative z-10 space-y-4 max-w-2xl">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50/80 border border-indigo-200/60 text-indigo-700 text-xs font-semibold shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              <span>Next-Gen Autonomous Freight Core</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl xl:text-[46px] font-extrabold tracking-tight text-slate-900 leading-[1.12]">
              The operating system
              <br />
              for <span className="text-indigo-600">modern logistics.</span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-sm xl:text-base text-slate-600 leading-relaxed max-w-xl font-normal">
              Manage dispatch, tracking, billing and compliance from one intelligent workspace built for real-world enterprise freight operations.
            </p>

            {/* Feature Highlights Row (4 items) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-2 max-w-lg">
              {/* Feature 1 */}
              <div className="flex flex-col items-center text-center group cursor-default">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50/90 border border-indigo-100/90 flex items-center justify-center text-indigo-600 shadow-2xs group-hover:scale-105 group-hover:bg-indigo-100/80 transition-all duration-200">
                  <Truck className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-slate-700 mt-2 leading-tight">
                  Dispatch
                  <br />
                  Management
                </span>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col items-center text-center group cursor-default">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50/90 border border-emerald-100/90 flex items-center justify-center text-emerald-600 shadow-2xs group-hover:scale-105 group-hover:bg-emerald-100/80 transition-all duration-200">
                  <MapPin className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-slate-700 mt-2 leading-tight">
                  Real-time
                  <br />
                  Tracking
                </span>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col items-center text-center group cursor-default">
                <div className="w-12 h-12 rounded-2xl bg-amber-50/90 border border-amber-100/90 flex items-center justify-center text-amber-600 shadow-2xs group-hover:scale-105 group-hover:bg-amber-100/80 transition-all duration-200">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-slate-700 mt-2 leading-tight">
                  Billing &amp;
                  <br />
                  Invoicing
                </span>
              </div>

              {/* Feature 4 */}
              <div className="flex flex-col items-center text-center group cursor-default">
                <div className="w-12 h-12 rounded-2xl bg-sky-50/90 border border-sky-100/90 flex items-center justify-center text-sky-600 shadow-2xs group-hover:scale-105 group-hover:bg-sky-100/80 transition-all duration-200">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-slate-700 mt-2 leading-tight">
                  Compliance
                  <br />
                  &amp; Reports
                </span>
              </div>
            </div>
          </div>

          {/* Floating Card 1: Top Right Fleet Metrics Pill (Desktop) */}
          <div className="hidden lg:block absolute right-4 xl:right-10 top-[23%] z-10">
            <div className="rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-4 shadow-[0_8px_30px_rgba(15,23,42,0.06)] space-y-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs font-bold text-slate-800">
                  Live Dispatch Telemetry
                </span>
              </div>

              <div className="flex items-center gap-4 text-left">
                {/* Active Fleet */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold font-mono text-slate-900 leading-none">1,420+</div>
                    <div className="text-[10px] text-slate-500 mt-1 whitespace-nowrap">Active Fleet</div>
                  </div>
                </div>

                <div className="h-7 w-px bg-slate-200/80" />

                {/* GST Compliant */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold font-mono text-slate-900 leading-none">100%</div>
                    <div className="text-[10px] text-slate-500 mt-1 whitespace-nowrap">GST Compliant</div>
                  </div>
                </div>

                <div className="h-7 w-px bg-slate-200/80" />

                {/* Sync Latency */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold font-mono text-slate-900 leading-none">&lt; 15ms</div>
                    <div className="text-[10px] text-slate-500 mt-1 whitespace-nowrap">Sync Latency</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Card 2: Bottom Route Milestones Journey Card */}
          <div className="relative z-10 max-w-lg xl:max-w-xl w-full mt-6 xl:mt-8">
            <div className="rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-5 sm:p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)] space-y-4">
              {/* Telemetry Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
                    Live Dispatch Telemetry
                  </span>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  Corridor Velocity: 99.4%
                </span>
              </div>

              {/* Milestones Flow with continuous gradient connector */}
              <div className="space-y-4 pt-1">
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2.5 before:bottom-2.5 before:w-0.5 before:bg-gradient-to-b before:from-indigo-600 before:via-blue-500 before:to-emerald-500">
                  {/* Step 1: BOM-01 */}
                  <div className="relative flex items-center justify-between group">
                    <span className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    </span>
                    <div className="pr-2">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <span>BOM-01 Gateway Hub</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                        Navi Mumbai • Consignments Loaded • Fastag Auto-Checked
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold font-mono px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 shrink-0">
                      Dispatched
                    </span>
                  </div>

                  {/* Step 2: NAG-04 */}
                  <div className="relative flex items-center justify-between group">
                    <span className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    </span>
                    <div className="pr-2">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <span>NAG-04 Consolidation Terminal</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                        Nagpur • Cross-dock Transhipment in progress
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold font-mono px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 shrink-0">
                      In-Transit
                    </span>
                  </div>

                  {/* Step 3: DEL-02 */}
                  <div className="relative flex items-center justify-between group">
                    <span className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-white border-2 border-emerald-500 flex items-center justify-center shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </span>
                    <div className="pr-2">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <span>DEL-02 Regional Fulfillment</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                        Delhi NCR • Automated E-way Reconciliation Ready
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 shrink-0">
                      ETA 4h 15m
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN: Elevated Workspace Login Card (~35%)                      */}
        {/* ======================================================================= */}
        <section className="lg:w-[38%] xl:w-[36%] flex flex-col justify-center items-center lg:items-end py-4 sm:py-6 relative z-10">
          <div className="w-full max-w-[450px]">
            {/* Elevated Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-7 sm:p-9 shadow-[0_12px_40px_-10px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)] space-y-6">
              {/* Card Header */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold tracking-wider text-indigo-600 uppercase font-sans">
                    WORKSPACE ACCESS
                  </span>
                </div>
                <h2 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-slate-900">
                  Sign in to your workspace
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 leading-normal">
                  Enter your workspace subdomain and credentials to continue to PantherTMS.
                </p>
              </div>

              {/* Forgot Password Notification Notice */}
              {forgotPasswordMsg && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-50/90 border border-indigo-100 text-indigo-900 text-xs animate-in fade-in-0 duration-200">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600" />
                  <div className="leading-relaxed">
                    Password resets are managed by your workspace administrator. Contact your admin or reach out to{" "}
                    <a href="mailto:support@panthertms.com" className="font-semibold underline text-indigo-700">
                      support@panthertms.com
                    </a>.
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {error && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs animate-in fade-in-0 duration-200">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span className="leading-relaxed font-medium">{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Company Subdomain Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 tracking-tight">
                    Company subdomain
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-200/90 bg-white shadow-2xs focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all overflow-hidden">
                    <input
                      type="text"
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="bharat"
                      autoComplete="organization"
                      required
                      className="flex-1 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none"
                    />
                    <div className="px-3.5 py-2.5 text-xs font-mono text-slate-400 bg-transparent select-none whitespace-nowrap">
                      {rootDomainSuffix}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1 font-sans">
                    <span>Resolved host:</span>
                    <span className="font-semibold text-indigo-600 font-mono">
                      {subdomain || "bharat"}{rootDomainSuffix}
                    </span>
                  </p>
                </div>

                {/* 2. Work Email Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 tracking-tight">
                    Work email
                  </label>
                  <div className="relative flex items-center rounded-xl border border-slate-200/90 bg-white shadow-2xs focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                    <div className="absolute left-3.5 pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="parth@example.com"
                      autoComplete="email"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                {/* 3. Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 tracking-tight">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setForgotPasswordMsg(!forgotPasswordMsg)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative flex items-center rounded-xl border border-slate-200/90 bg-white shadow-2xs focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                    <div className="absolute left-3.5 pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      className="w-full pl-10 pr-10 py-2.5 text-sm font-mono placeholder:font-sans font-medium text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none"
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

                {/* 4. Primary Sign In Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm shadow-[0_2px_10px_rgba(79,70,229,0.25)] hover:shadow-[0_4px_16px_rgba(79,70,229,0.35)] transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
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

              {/* 5. Divider */}
              <div className="relative flex items-center justify-center my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200/80" />
                </div>
                <span className="relative px-3 bg-white text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                  OR
                </span>
              </div>

              {/* 6. Demo Workspace Card */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 transition-all">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-slate-900 truncate">
                        Try the demo workspace
                      </h3>
                      <p className="text-[11px] text-slate-500 leading-tight truncate">
                        Pre-configured sandbox for evaluation.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={fillDemo}
                      className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-white hover:bg-indigo-50/80 border border-indigo-200 rounded-lg shadow-2xs transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 active:scale-[0.98]"
                    >
                      <span>Use demo credentials</span>
                      <ArrowRight className="w-3 h-3" />
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

                {/* Collapsible Demo Details for easy copying */}
                {isDemoExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-2 text-xs font-mono animate-in fade-in-0 slide-in-from-top-1 duration-150">
                    {/* Subdomain */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/70">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-[10px] font-sans font-semibold text-slate-400 uppercase w-16 shrink-0">
                          Workspace
                        </span>
                        <span className="text-slate-800 font-medium truncate">
                          bharat{rootDomainSuffix}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard("bharat", "subdomain")}
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
        </section>
      </main>

      {/* ========================================================================= */}
      {/* ENTERPRISE TRUST & SECURITY FOOTER                                        */}
      {/* ========================================================================= */}
      <footer className="w-full border-t border-slate-200/60 bg-transparent py-3 px-6 sm:px-10 lg:px-14 flex flex-wrap items-center justify-between gap-y-2 text-xs text-slate-500 z-20 shrink-0">
        <div className="flex flex-wrap items-center gap-5 sm:gap-8">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Tenant-Isolated architecture</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>256-bit SSL encrypted</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Layers className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span>Multi-tier RBAC security</span>
          </span>
        </div>

        <div>
          <a
            href="mailto:support@panthertms.com"
            className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Need help? Contact support</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
