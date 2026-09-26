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
  const [subdomain, setSubdomain] = useState("bharat");
  const [email, setEmail] = useState("parth@example.com");
  const [password, setPassword] = useState("•••••••••");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
      const effectivePassword = password === "•••••••••" ? "PantherTMS@2026!" : password;
      await login(email, effectivePassword, subdomain);
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

  return (
    <div className="min-h-screen xl:h-screen w-full flex flex-col justify-between bg-[#F8FAFC] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 relative overflow-x-hidden xl:overflow-hidden">
      {/* ========================================================================= */}
      {/* TOP HEADER BAR                                                            */}
      {/* ========================================================================= */}
      <header className="w-full bg-transparent px-8 sm:px-12 lg:px-16 h-16 sm:h-20 flex items-center justify-between z-30 shrink-0">
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
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-200/70 transition-all shadow-2xs active:scale-[0.98]"
          >
            <span>Create workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN CONTAINER: Split Layout (~64% Left / ~36% Right)                     */}
      {/* ========================================================================= */}
      <main className="flex-1 w-full max-w-[1580px] mx-auto px-6 sm:px-10 lg:px-14 py-1 xl:py-2 relative flex flex-col lg:flex-row items-stretch justify-between min-h-0">
        {/* ======================================================================= */}
        {/* LEFT PRODUCT AREA: Brand Hero, Visual Scene, Telemetry Cards           */}
        {/* ======================================================================= */}
        <div className="w-full lg:w-[63%] xl:w-[64%] flex flex-col justify-between py-1 relative z-10">
          {/* 1. Natural Aspect Ratio Logistics Scene (Truck, Port, Highway) */}
          <div className="hidden lg:block absolute -right-6 xl:-right-2 bottom-0 top-12 w-[750px] xl:w-[820px] pointer-events-none select-none z-0">
            <div
              className="w-full h-full relative"
              style={{
                maskImage:
                  "radial-gradient(ellipse 85% 76% at 56% 52%, black 40%, transparent 86%)",
                WebkitMaskImage:
                  "radial-gradient(ellipse 85% 76% at 56% 52%, black 40%, transparent 86%)",
              }}
            >
              <img
                src="/logistics-truck-bg.jpg"
                alt="PantherTMS Freight Operations"
                className="w-full h-full object-cover object-[58%_center]"
              />
              {/* Subtle linear soft edge blends */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#F8FAFC] via-transparent to-transparent h-16 bottom-0 top-auto" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#F8FAFC] via-transparent to-transparent h-16 top-0 bottom-auto" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#F8FAFC] via-[#F8FAFC]/40 to-transparent w-28 left-0 right-auto" />
            </div>
          </div>

          {/* 2. Top Floating Telemetry Card (Directly over truck cab) */}
          <div className="hidden lg:block absolute right-[30px] xl:right-[50px] top-[140px] xl:top-[150px] z-20">
            <div className="rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md px-5 py-3.5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs font-bold text-slate-800 font-sans">
                  Live Dispatch Telemetry
                </span>
              </div>

              <div className="flex items-center gap-6 text-left">
                {/* Active Fleet */}
                <div>
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold text-sm">
                    <Truck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>1,420+</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">Active Fleet</div>
                </div>

                {/* GST Compliant */}
                <div>
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold text-sm">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>100%</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">GST Compliant</div>
                </div>

                {/* Sync Latency */}
                <div>
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold text-sm">
                    <Zap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>&lt; 15ms</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">Sync Latency</div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Left Headline, Subtitle, and Feature Chips */}
          <div className="space-y-4 max-w-[460px] z-10">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50/80 border border-indigo-200/60 text-indigo-700 text-xs font-semibold shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              <span>Next-Gen Autonomous Freight Core</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl xl:text-[42px] font-extrabold tracking-tight text-slate-900 leading-[1.12]">
              The operating system
              <br />
              for <span className="text-indigo-600">modern logistics.</span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-sm xl:text-base text-slate-600 leading-relaxed font-normal">
              Manage dispatch, tracking, billing and compliance from one intelligent workspace built for real-world enterprise freight operations.
            </p>

            {/* 4 Feature Highlights Row */}
            <div className="grid grid-cols-4 gap-3.5 pt-2 max-w-sm text-center">
              {/* Feature 1 */}
              <div className="flex flex-col items-center group cursor-default">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50/90 border border-indigo-100/90 flex items-center justify-center text-indigo-600 shadow-2xs group-hover:scale-105 transition-all">
                  <Truck className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-slate-700 mt-2 leading-tight">
                  Dispatch
                  <br />
                  Management
                </span>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col items-center group cursor-default">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50/90 border border-emerald-100/90 flex items-center justify-center text-emerald-600 shadow-2xs group-hover:scale-105 transition-all">
                  <MapPin className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-slate-700 mt-2 leading-tight">
                  Real-time
                  <br />
                  Tracking
                </span>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col items-center group cursor-default">
                <div className="w-12 h-12 rounded-2xl bg-amber-50/90 border border-amber-100/90 flex items-center justify-center text-amber-600 shadow-2xs group-hover:scale-105 transition-all">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-slate-700 mt-2 leading-tight">
                  Billing &amp;
                  <br />
                  Invoicing
                </span>
              </div>

              {/* Feature 4 */}
              <div className="flex flex-col items-center group cursor-default">
                <div className="w-12 h-12 rounded-2xl bg-sky-50/90 border border-sky-100/90 flex items-center justify-center text-sky-600 shadow-2xs group-hover:scale-105 transition-all">
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

          {/* 4. Bottom Route Milestones Journey Card */}
          <div className="max-w-[490px] xl:max-w-[510px] w-full mt-6 xl:mt-8 z-10">
            <div className="rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-5 sm:p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)] space-y-4">
              {/* Telemetry Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
                  <span className="text-xs font-bold text-slate-800 font-sans tracking-tight">
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
        </div>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN: Elevated Workspace Login Card (~35%)                      */}
        {/* ======================================================================= */}
        <div className="w-full lg:w-[36%] xl:w-[35%] flex justify-end z-20 py-4 lg:py-0">
          <div className="w-full max-w-[430px] xl:max-w-[440px]">
            {/* Elevated Card */}
            <div className="bg-white rounded-[26px] border border-slate-200/90 p-7 sm:p-9 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)] space-y-6">
              {/* Card Header */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold tracking-wider text-indigo-600 uppercase font-sans">
                    WORKSPACE ACCESS
                  </span>
                </div>
                <h2 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-slate-900 pt-1">
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
                      placeholder="•••••••••"
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

              {/* 6. Demo Workspace Card matching Reference 1:1 */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 flex items-center justify-between gap-3 transition-all">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 leading-snug">
                      Try the demo workspace
                    </h3>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Pre-configured sandbox for evaluation.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={fillDemo}
                  className="px-3.5 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-white hover:bg-indigo-50/80 border border-indigo-200/80 rounded-lg shadow-2xs transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 active:scale-[0.98] shrink-0"
                >
                  <span>Use demo credentials</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* ENTERPRISE TRUST & SECURITY FOOTER                                        */}
      {/* ========================================================================= */}
      <footer className="w-full border-t border-slate-200/60 bg-transparent py-3 px-8 sm:px-12 lg:px-16 flex flex-wrap items-center justify-between gap-y-2 text-xs text-slate-500 z-30 shrink-0">
        <div className="flex flex-wrap items-center gap-6 sm:gap-8">
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
