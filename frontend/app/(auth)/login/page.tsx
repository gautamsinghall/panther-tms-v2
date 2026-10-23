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
  Truck,
  FileText,
  Building2,
  HelpCircle,
  Layers,
  Info,
} from "lucide-react";
import { login, getStoredAuth } from "@/lib/auth";
import { AuthNavbar } from "@/components/layout/auth-navbar";
import { VideoBackdrop } from "@/components/auth/VideoBackdrop";

export default function LoginPage() {
  const router = useRouter();
  const [companyCode, setCompanyCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [forgotPasswordMsg, setForgotPasswordMsg] = useState(false);

  // Dynamic pointer reflection tracking for Apple-inspired liquid glass specular highlight
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const auth = getStoredAuth();
      if (auth && auth.accessToken) {
        const searchParams = new URLSearchParams(window.location.search);
        const redirectParam = searchParams.get("redirect");
        if (redirectParam && redirectParam.startsWith("/")) {
          router.replace(auth.tenantId ? `/${auth.tenantId}${redirectParam}` : redirectParam);
        } else {
          router.replace(auth.tenantId ? `/${auth.tenantId}` : "/");
        }
        return;
      }
      setIsCheckingAuth(false);

      // Extract query params if redirected from signup or direct link
      const searchParams = new URLSearchParams(window.location.search);
      const codeParam = searchParams.get("company_code") || searchParams.get("code");
      const emailParam = searchParams.get("email");
      if (codeParam) setCompanyCode(codeParam.replace(/[^a-zA-Z]/g, "").toUpperCase());
      if (emailParam) setEmail(emailParam);
    }
  }, [router]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-transparent relative overflow-hidden">
        <VideoBackdrop />
        <div className="liquid-glass-panel rounded-2xl p-7 flex flex-col items-center gap-3.5 shadow-2xl z-10 border border-white/80 animate-liquid-fade-panel">
          <div className="w-9 h-9 border-[2.5px] border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-700 font-mono tracking-wide">
            Checking session...
          </span>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const auth = await login(companyCode, email, password);
      const searchParams = new URLSearchParams(window.location.search);
      const redirectParam = searchParams.get("redirect");
      if (redirectParam && redirectParam.startsWith("/")) {
        router.push(auth.tenantId ? `/${auth.tenantId}${redirectParam}` : redirectParam);
      } else {
        router.push(auth.tenantId ? `/${auth.tenantId}` : "/");
      }
    } catch (err: any) {
      setError(err.message || "Failed to log in. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = () => {
    setCompanyCode("DEMOLOGISTICS");
    setEmail("admin@demo.com");
    setPassword("PantherTMS@2026!");
    setError(null);
  };

  return (
    <div className="min-h-screen xl:h-screen w-full flex flex-col justify-between bg-transparent text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 relative overflow-x-hidden xl:overflow-hidden">
      {/* Full-screen fixed video backdrop with poster frame and dark gradient scrim */}
      <VideoBackdrop />

      {/* ========================================================================= */}
      {/* TOP HEADER BAR                                                            */}
      {/* ========================================================================= */}
      <AuthNavbar mode="login" />

      {/* ========================================================================= */}
      {/* MAIN CONTAINER: Split Layout (~62% Left / ~38% Right)                     */}
      {/* ========================================================================= */}
      <main className="flex-1 w-full max-w-[1580px] mx-auto px-6 sm:px-10 lg:px-14 py-2 xl:py-3 relative flex flex-col lg:flex-row items-center lg:items-center justify-between min-h-0 gap-8 lg:gap-12">
        {/* ======================================================================= */}
        {/* LEFT PRODUCT AREA: Brand Hero, Feature Highlights & Security Trust     */}
        {/* ======================================================================= */}
        <div className="w-full lg:w-[58%] xl:w-[60%] flex flex-col justify-center py-2 relative z-10">
          <div className="space-y-4 sm:space-y-5 max-w-[580px]">
            {/* 1. Pill Badge */}
            <div className="animate-liquid-fade-1">
              <div className="liquid-glass-pill inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-slate-800 text-xs font-semibold shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>Multi-Tenant Transport Operations Platform</span>
              </div>
            </div>

            {/* 2. Headline with crisp gradient emphasis */}
            <div className="animate-liquid-fade-2 space-y-1">
              <h1 className="text-3xl sm:text-4xl xl:text-[42px] font-extrabold tracking-tight text-slate-900 leading-[1.18] drop-shadow-[0_1px_2px_rgba(255,255,255,0.7)]">
                Enterprise transport operations,
                <span className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 bg-clip-text text-transparent block mt-1">
                  dependably handled.
                </span>
              </h1>
            </div>

            {/* 3. Supporting Copy - Apple Liquid Glass Container for crystal clarity */}
            <div className="animate-liquid-fade-2">
              <div className="liquid-glass-card rounded-2xl p-4 sm:p-5 max-w-[530px] border border-white/85">
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                  Unified consignment management, Lorry Receipts (GR/LR), double-entry transport accounting, and statutory GST compliance tailored for Indian logistics businesses.
                </p>
              </div>
            </div>

            {/* 4. 4 Feature Highlights Row */}
            <div className="animate-liquid-fade-3 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {/* Consignments */}
              <div className="liquid-glass-card p-3.5 rounded-2xl text-left space-y-1.5 group cursor-default">
                <div className="w-8 h-8 rounded-xl bg-indigo-50/80 border border-indigo-200/60 flex items-center justify-center text-indigo-600 shadow-2xs group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-200">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Consignments</div>
                  <div className="text-[11px] text-slate-600 leading-tight">LR booking & lorry contracts</div>
                </div>
              </div>

              {/* Accounting */}
              <div className="liquid-glass-card p-3.5 rounded-2xl text-left space-y-1.5 group cursor-default">
                <div className="w-8 h-8 rounded-xl bg-emerald-50/80 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shadow-2xs group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Accounting</div>
                  <div className="text-[11px] text-slate-600 leading-tight">Double-entry ledger & vouchers</div>
                </div>
              </div>

              {/* Multi-Branch */}
              <div className="liquid-glass-card p-3.5 rounded-2xl text-left space-y-1.5 group cursor-default">
                <div className="w-8 h-8 rounded-xl bg-blue-50/80 border border-blue-200/60 flex items-center justify-center text-blue-600 shadow-2xs group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Multi-Branch</div>
                  <div className="text-[11px] text-slate-600 leading-tight">Issuing offices & access control</div>
                </div>
              </div>

              {/* Compliance */}
              <div className="liquid-glass-card p-3.5 rounded-2xl text-left space-y-1.5 group cursor-default">
                <div className="w-8 h-8 rounded-xl bg-purple-50/80 border border-purple-200/60 flex items-center justify-center text-purple-600 shadow-2xs group-hover:bg-purple-600 group-hover:text-white transition-colors duration-200">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Compliance</div>
                  <div className="text-[11px] text-slate-600 leading-tight">GST E-Way Bill & IRN ready</div>
                </div>
              </div>
            </div>

            {/* 5. Security Guarantee Note */}
            <div className="animate-liquid-fade-3 pt-1">
              <div className="liquid-glass-pill inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-800 shadow-xs">
                <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Isolated tenant data with encrypted session authentication</span>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN: Apple-Inspired Liquid Glass Login Panel                   */}
        {/* ======================================================================= */}
        <div className="w-full lg:w-[42%] xl:w-[38%] flex justify-end z-20 py-2 lg:py-0 animate-liquid-fade-panel">
          <div className="w-full max-w-[440px] xl:max-w-[450px]">
            {/* Liquid Glass Floating Container with Interactive Specular Sheen */}
            <div
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="liquid-glass-panel rounded-[30px] p-7 sm:p-9 space-y-5 relative group"
            >
              {/* Dynamic pointer reflection / specular glass highlight */}
              <div
                className="pointer-events-none absolute inset-0 rounded-[30px] transition-opacity duration-300 ease-out z-0"
                style={{
                  opacity: isHovered ? 1 : 0,
                  background: `radial-gradient(420px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255, 255, 255, 0.32), rgba(255, 255, 255, 0.08) 40%, transparent 70%)`,
                }}
                aria-hidden="true"
              />

              {/* Dynamic perimeter rim refraction light */}
              <div
                className="pointer-events-none absolute -inset-[1px] rounded-[30px] transition-opacity duration-300 ease-out z-0"
                style={{
                  opacity: isHovered ? 0.8 : 0,
                  background: `radial-gradient(280px circle at ${mousePos.x}px ${mousePos.y}px, rgba(99, 102, 241, 0.45), rgba(255, 255, 255, 0.75) 40%, transparent 70%)`,
                  mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  maskComposite: "exclude",
                  WebkitMaskComposite: "xor",
                  padding: "1px",
                }}
                aria-hidden="true"
              />

              {/* Inner content container */}
              <div className="relative z-10 space-y-5">
                {/* 1. Header */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-200/60 text-indigo-700 shadow-2xs">
                      <div className="w-3.5 h-3.5 rounded-md bg-indigo-600/15 flex items-center justify-center text-indigo-600 shrink-0">
                        <Building2 className="w-2.5 h-2.5" />
                      </div>
                      <span className="text-[10px] font-bold tracking-wider uppercase font-sans">
                        WORKSPACE ACCESS
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    </div>
                  </div>

                  <h2 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-slate-900 pt-0.5 leading-snug">
                    Sign in to your workspace
                  </h2>
                  <p className="text-xs sm:text-[13px] text-slate-600 leading-normal">
                    Enter your Company Code and credentials to continue to PantherTMS.
                  </p>
                </div>

                {/* 2. Forgot Password Banner Notice */}
                {forgotPasswordMsg && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-50/90 backdrop-blur-md border border-indigo-200/80 text-indigo-900 text-xs shadow-xs animate-in fade-in-0 duration-200">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600" />
                    <div className="leading-relaxed">
                      Password resets are managed by your workspace administrator. Contact your admin or reach out to{" "}
                      <a href="mailto:support@panthertms.com" className="font-semibold underline text-indigo-700 hover:text-indigo-800">
                        support@panthertms.com
                      </a>.
                    </div>
                  </div>
                )}

                {/* 3. Error Banner */}
                {error && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50/90 backdrop-blur-md border border-rose-200/80 text-rose-800 text-xs shadow-xs animate-in fade-in-0 duration-200">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span className="leading-relaxed font-semibold">{error}</span>
                  </div>
                )}

                {/* 4. Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Field 1: Company Code */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="company-code-input" className="block text-xs font-semibold text-slate-800 tracking-tight">
                        Company Code
                      </label>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-wider bg-indigo-500/10 text-indigo-700 border border-indigo-200/60 shadow-2xs">
                        CAPITAL ALPHABETS ONLY
                      </span>
                    </div>

                    <div className="liquid-glass-input-wrapper relative flex items-center rounded-xl group/input">
                      <div className="absolute left-3.5 pointer-events-none text-slate-400 group-focus-within/input:text-indigo-600 transition-colors">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <input
                        id="company-code-input"
                        type="text"
                        value={companyCode}
                        onChange={(e) => setCompanyCode(e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase())}
                        placeholder="e.g. BHARATROADWAYS"
                        autoComplete="organization"
                        required
                        className="w-full pl-10 pr-3.5 py-2.5 text-sm font-semibold tracking-wider text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none uppercase font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Formed from your company name during account creation.
                    </p>
                  </div>

                  {/* Field 2: Work Email */}
                  <div className="space-y-1.5">
                    <label htmlFor="work-email-input" className="block text-xs font-semibold text-slate-800 tracking-tight">
                      Work email
                    </label>
                    <div className="liquid-glass-input-wrapper relative flex items-center rounded-xl group/input">
                      <div className="absolute left-3.5 pointer-events-none text-slate-400 group-focus-within/input:text-indigo-600 transition-colors">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="work-email-input"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        autoComplete="email"
                        required
                        className="w-full pl-10 pr-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Field 3: Password */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="password-input" className="block text-xs font-semibold text-slate-800 tracking-tight">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setForgotPasswordMsg(!forgotPasswordMsg)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <div className="liquid-glass-input-wrapper relative flex items-center rounded-xl group/input">
                      <div className="absolute left-3.5 pointer-events-none text-slate-400 group-focus-within/input:text-indigo-600 transition-colors">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="password-input"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        required
                        className="w-full pl-10 pr-11 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100/60 active:scale-95 transition-all focus:outline-none cursor-pointer"
                        title={showPassword ? "Hide password" : "Show password"}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Primary Sign In Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="liquid-glass-btn-primary w-full h-12 mt-2 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="tracking-wide">Authenticating Workspace...</span>
                      </>
                    ) : (
                      <>
                        <span className="tracking-wide">Sign in to Workspace</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                      </>
                    )}
                  </button>
                </form>

                {/* 5. Apple-styled Subtle Etched Divider */}
                <div className="relative flex items-center justify-center my-3.5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-slate-300/60 to-transparent" />
                  </div>
                  <span className="liquid-glass-pill relative px-3 py-0.5 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    OR
                  </span>
                </div>

                {/* 6. Demo Workspace Card with Apple Inset Glass Design */}
                <div className="liquid-glass-inset rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/15 via-white/80 to-purple-500/15 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-slate-900 leading-snug truncate">
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
                    className="liquid-glass-pill hover:bg-white text-indigo-600 hover:text-indigo-700 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-indigo-200/90 shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap shrink-0 group/demo"
                  >
                    <span>Use demo credentials</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover/demo:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* ENTERPRISE TRUST & SECURITY FOOTER                                        */}
      {/* ========================================================================= */}
      <footer className="w-full border-t border-slate-200/50 bg-transparent py-3 px-8 sm:px-12 lg:px-16 flex flex-wrap items-center justify-between gap-y-2 text-xs text-slate-600 z-30 shrink-0">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          {/* Status Badge */}
          <div className="liquid-glass-pill inline-flex items-center gap-2 px-3 py-1 rounded-full shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-semibold text-slate-800 font-sans text-[11px]">Systems Operational</span>
          </div>

          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 text-[11px] drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">
            <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Tenant-Isolated architecture</span>
          </span>

          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 text-[11px] drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>256-bit SSL encrypted</span>
          </span>

          <span className="hidden md:inline-flex items-center gap-1.5 font-medium text-slate-700 text-[11px] drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">
            <Layers className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span>Multi-tier RBAC security</span>
          </span>
        </div>

        <div>
          <a
            href="mailto:support@panthertms.com"
            className="liquid-glass-pill inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-slate-700 hover:text-indigo-600 font-medium text-[11px] transition-colors shadow-2xs"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Need help? Contact support</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
