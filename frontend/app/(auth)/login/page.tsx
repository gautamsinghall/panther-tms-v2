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
  Cloud,
  Play,
} from "lucide-react";
import { login, getStoredAuth } from "@/lib/auth";
import { AuthNavbar } from "@/components/layout/auth-navbar";
import { VideoBackdrop } from "@/components/auth/VideoBackdrop";

export default function LoginPage() {
  const router = useRouter();
  const [companyCode, setCompanyCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [forgotPasswordMsg, setForgotPasswordMsg] = useState(false);

  // Dynamic neutral pointer reflection for Apple-inspired liquid glass (Desktop)
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

      // Restore remembered credentials if available
      try {
        const saved = localStorage.getItem("panther_remembered_credentials");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.companyCode) setCompanyCode(parsed.companyCode);
          if (parsed.email) setEmail(parsed.email);
          setRememberMe(true);
        }
      } catch {}

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
      <div className="min-h-screen w-full flex items-center justify-center bg-[#060813] relative overflow-hidden">
        <VideoBackdrop />
        <div className="liquid-glass-panel rounded-2xl p-7 flex flex-col items-center gap-3.5 z-10 border border-white/20 animate-liquid-fade-panel">
          <div className="w-9 h-9 border-[2.5px] border-white/30 border-t-white rounded-full animate-spin" />
          <span className="text-xs font-medium text-white/90 font-mono tracking-wide">
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
      if (typeof window !== "undefined") {
        if (rememberMe) {
          localStorage.setItem("panther_remembered_credentials", JSON.stringify({ companyCode, email }));
        } else {
          localStorage.removeItem("panther_remembered_credentials");
        }
      }

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
    <>
      {/* ========================================================================= */}
      {/* 1. MOBILE & TABLET VIEWPORT (< 1024px): Premium Cinematic Logistics UI   */}
      {/* Inspired by reference: Deep midnight-navy, top cinematic truck video/hero, */}
      {/* glassmorphic card, gradient button, and bottom trust indicators.          */}
      {/* ========================================================================= */}
      <div className="lg:hidden min-h-screen min-h-[100dvh] w-full flex flex-col justify-between bg-[#060813] text-white relative overflow-x-hidden selection:bg-indigo-500/30 selection:text-white">
        {/* Top Truck Hero with Autoplaying Video & Scrim Gradients */}
        <div className="absolute top-0 inset-x-0 h-[36vh] min-h-[250px] max-h-[340px] overflow-hidden pointer-events-none select-none z-0">
          <video
            src="/panther-tms-mobile.mp4"
            poster="/panther-tms-mobile-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            controls={false}
            disablePictureInPicture
            aria-hidden="true"
            className="w-full h-full object-cover object-top select-none pointer-events-none transform-gpu will-change-transform"
          />
          {/* Top dark gradient for status bar / header contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#060813]/80 via-transparent to-[#060813] z-10 pointer-events-none" />
          {/* Bottom blend to seamlessly dissolve the road into deep midnight navy */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#060813] via-[#060813]/85 to-transparent z-10 pointer-events-none" />
        </div>

        {/* Ambient bottom particle/aurora glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 inset-x-0 h-48 bg-[radial-gradient(ellipse_at_bottom,_rgba(79,70,229,0.22)_0%,_transparent_70%)] z-0"
        />

        {/* Mobile Header: Logo, Brand & Hairline Subtitle */}
        <header className="relative z-10 pt-5 sm:pt-7 pb-2 px-4 text-center select-none">
          <div className="inline-flex flex-col items-center">
            <img
              src="/panther-logo-transparent.png"
              alt="PantherTMS"
              className="h-10 sm:h-12 w-auto object-contain drop-shadow-[0_4px_16px_rgba(59,130,246,0.6)] animate-in fade-in zoom-in-95 duration-300"
            />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center justify-center gap-1 mt-1.5 leading-none">
              Panther<span className="text-[#60A5FA]">TMS</span>
            </h1>
            <div className="flex items-center justify-center gap-2 mt-2 px-2 max-w-[90vw]">
              <div className="h-[1px] w-6 sm:w-10 bg-white/20 shrink-0" />
              <span className="text-[10px] sm:text-xs font-medium tracking-widest uppercase text-white/60 font-mono truncate">
                Enterprise Transport Management System
              </span>
              <div className="h-[1px] w-6 sm:w-10 bg-white/20 shrink-0" />
            </div>
          </div>
        </header>

        {/* Mobile Main Section: Centered Glassmorphic Login Card */}
        <main className="relative z-10 flex-1 flex flex-col justify-center w-full max-w-[420px] sm:max-w-[460px] mx-auto px-4 py-2">
          <div className="rounded-[28px] sm:rounded-[32px] p-5 sm:p-7 bg-[#0D1326]/85 backdrop-blur-2xl border border-white/12 shadow-[0_20px_50px_rgba(0,0,0,0.7),0_0_40px_rgba(59,130,246,0.12)] space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.07] border border-white/15 text-white/90">
              <Truck className="w-3.5 h-3.5 text-white shrink-0" />
              <span className="text-[11px] font-semibold tracking-wide">
                Workspace Access
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            </div>

            {/* Heading & Subtitle */}
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-[26px] font-bold text-white tracking-tight leading-snug">
                Sign in to <span className="text-[#60A5FA]">PantherTMS</span>
              </h2>
              <p className="text-xs text-white/70 leading-relaxed font-normal">
                Access your transport operations, accounts and logistics from anywhere.
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/20 backdrop-blur-md border border-rose-400/40 text-rose-200 text-xs animate-in fade-in-0 duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-300" />
                <span className="leading-relaxed font-semibold">{error}</span>
              </div>
            )}

            {/* Forgot Password Banner */}
            {forgotPasswordMsg && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-xs animate-in fade-in-0 duration-200">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-white/80" />
                <div className="leading-relaxed">
                  Password resets are managed by your administrator. Contact support at{" "}
                  <a href="mailto:support@panthertms.com" className="font-semibold underline text-white hover:text-white/80">
                    support@panthertms.com
                  </a>.
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 pt-1" style={{ colorScheme: "dark" }}>
              {/* Field 1: Company Code */}
              <div className="relative flex items-center rounded-xl bg-white/[0.04] border border-white/12 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                <div className="absolute left-3.5 text-white/40 pointer-events-none">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  id="mobile-company-code-input"
                  type="text"
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase())}
                  placeholder="Company Code"
                  autoComplete="organization"
                  required
                  style={{ colorScheme: "dark" }}
                  className="w-full pl-10 pr-3.5 py-3 text-sm font-semibold tracking-wider text-white placeholder:text-white/40 bg-transparent focus:outline-none uppercase font-mono"
                />
              </div>

              {/* Field 2: Work Email */}
              <div className="relative flex items-center rounded-xl bg-white/[0.04] border border-white/12 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                <div className="absolute left-3.5 text-white/40 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="mobile-work-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Work Email"
                  autoComplete="email"
                  required
                  style={{ colorScheme: "dark" }}
                  className="w-full pl-10 pr-3.5 py-3 text-sm font-medium text-white placeholder:text-white/40 bg-transparent focus:outline-none"
                />
              </div>

              {/* Field 3: Password */}
              <div className="relative flex items-center rounded-xl bg-white/[0.04] border border-white/12 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                <div className="absolute left-3.5 text-white/40 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="mobile-password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  required
                  style={{ colorScheme: "dark" }}
                  className="w-full pl-10 pr-11 py-3 text-sm font-medium text-white placeholder:text-white/40 bg-transparent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 p-1 rounded-lg text-white/40 hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-white/10 border-white/20 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-indigo-600"
                  />
                  <span className="text-white/80 group-hover:text-white transition-colors">
                    Remember me
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setForgotPasswordMsg(!forgotPasswordMsg)}
                  className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {/* Primary Gradient Action Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r from-[#4F46E5] via-[#5B4FE8] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9] active:scale-[0.98] transition-all shadow-[0_4px_24px_rgba(99,102,241,0.45)] group focus:outline-none mt-1"
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

            {/* Hairline OR Divider */}
            <div className="relative flex items-center justify-center my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-[1px] bg-white/10" />
              </div>
              <span className="relative px-3 py-0.5 rounded-full text-[10px] font-bold text-white/50 uppercase tracking-widest bg-[#0D1326] border border-white/10">
                OR
              </span>
            </div>

            {/* Secondary Demo Workspace Pill */}
            <button
              type="button"
              onClick={fillDemo}
              className="w-full h-11 rounded-xl text-white/90 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/15 text-xs font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer group/demo"
            >
              <Play className="w-3.5 h-3.5 fill-white/80 text-white/80 group-hover/demo:fill-white group-hover/demo:text-white transition-colors" />
              <span>Try Demo Workspace</span>
            </button>
          </div>
        </main>

        {/* Mobile Bottom Trust Indicators */}
        <footer className="relative z-10 py-4 px-4 text-center select-none shrink-0">
          <div className="flex items-center justify-center gap-3 sm:gap-6 max-w-[420px] mx-auto">
            <div className="flex flex-col items-center gap-1 flex-1">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] sm:text-[11px] font-medium text-white/70 leading-tight">
                Multi-Tenant &amp; Secure
              </span>
            </div>
            <div className="h-6 w-[1px] bg-white/10 shrink-0" />
            <div className="flex flex-col items-center gap-1 flex-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] sm:text-[11px] font-medium text-white/70 leading-tight">
                GST &amp; Compliance Ready
              </span>
            </div>
            <div className="h-6 w-[1px] bg-white/10 shrink-0" />
            <div className="flex flex-col items-center gap-1 flex-1">
              <Cloud className="w-4 h-4 text-sky-400" />
              <span className="text-[10px] sm:text-[11px] font-medium text-white/70 leading-tight">
                Anywhere Access
              </span>
            </div>
          </div>

          {/* iOS safe area indicator */}
          <div className="w-32 h-1 bg-white/20 rounded-full mx-auto mt-4 mb-1" />
        </footer>
      </div>

      {/* ========================================================================= */}
      {/* 2. STRICTLY PRESERVED DESKTOP & LAPTOP VIEWPORT (>= 1024px)              */}
      {/* 100% UNCHANGED: 4K Video Backdrop, AuthNavbar, Left Product Marketing     */}
      {/* column with 4 feature cards, Glassmorphic Login card & Enterprise footer. */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex min-h-screen xl:h-screen w-full flex-col justify-between bg-transparent text-white font-sans selection:bg-indigo-500/30 selection:text-white relative overflow-x-hidden xl:overflow-hidden">
        {/* Full-screen fixed video backdrop with poster frame and dark gradient scrim */}
        <VideoBackdrop />

        {/* Top Header Bar */}
        <AuthNavbar mode="login" />

        {/* Main Split Layout: (~60% Left / ~40% Right) */}
        <main className="flex-1 w-full max-w-[1580px] mx-auto px-4 sm:px-10 lg:px-14 py-2 xl:py-3 relative flex items-center justify-between min-h-0 gap-6 sm:gap-8 lg:gap-12">
          {/* Left Product Area: Brand Hero, Feature Highlights & Security Trust */}
          <div className="w-full lg:w-[58%] xl:w-[60%] flex flex-col justify-center py-2 relative z-10">
            <div className="space-y-4 sm:space-y-5 max-w-[580px]">
              {/* 1. Pill Badge */}
              <div className="animate-liquid-fade-1">
                <div className="liquid-glass-pill inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-white text-xs font-semibold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  <span>Multi-Tenant Transport Operations Platform</span>
                </div>
              </div>

              {/* 2. Headline */}
              <div className="animate-liquid-fade-2 space-y-1">
                <h1 className="text-3xl sm:text-4xl xl:text-[42px] font-extrabold tracking-tight text-white leading-[1.18]">
                  Enterprise transport operations,
                  <span className="text-white/90 block mt-1">
                    dependably handled.
                  </span>
                </h1>
              </div>

              {/* 3. Supporting Copy */}
              <div className="animate-liquid-fade-2">
                <div className="liquid-glass-card rounded-2xl p-4 sm:p-5 max-w-[530px]">
                  <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-normal">
                    Unified consignment management, Lorry Receipts (GR/LR), double-entry transport accounting, and statutory GST compliance tailored for Indian logistics businesses.
                  </p>
                </div>
              </div>

              {/* 4. 4 Feature Highlights Row */}
              <div className="animate-liquid-fade-3 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {/* Consignments */}
                <div className="liquid-glass-card p-3.5 rounded-2xl text-left space-y-1.5 group cursor-default">
                  <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white transition-colors duration-200">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Consignments</div>
                    <div className="text-[11px] text-white/70 leading-tight">LR booking &amp; lorry contracts</div>
                  </div>
                </div>

                {/* Accounting */}
                <div className="liquid-glass-card p-3.5 rounded-2xl text-left space-y-1.5 group cursor-default">
                  <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white transition-colors duration-200">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Accounting</div>
                    <div className="text-[11px] text-white/70 leading-tight">Double-entry ledger &amp; vouchers</div>
                  </div>
                </div>

                {/* Multi-Branch */}
                <div className="liquid-glass-card p-3.5 rounded-2xl text-left space-y-1.5 group cursor-default">
                  <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white transition-colors duration-200">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Multi-Branch</div>
                    <div className="text-[11px] text-white/70 leading-tight">Issuing offices &amp; access control</div>
                  </div>
                </div>

                {/* Compliance */}
                <div className="liquid-glass-card p-3.5 rounded-2xl text-left space-y-1.5 group cursor-default">
                  <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white transition-colors duration-200">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Compliance</div>
                    <div className="text-[11px] text-white/70 leading-tight">GST E-Way Bill &amp; IRN ready</div>
                  </div>
                </div>
              </div>

              {/* 5. Security Guarantee Note */}
              <div className="animate-liquid-fade-3 pt-1">
                <div className="liquid-glass-pill inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-white/85">
                  <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Isolated tenant data with encrypted session authentication</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Desktop Liquid Glass Login Panel */}
          <div className="w-full lg:w-[42%] xl:w-[38%] flex justify-end z-20 py-0 animate-liquid-fade-panel">
            <div className="w-full max-w-[440px] xl:max-w-[450px]">
              <div
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="liquid-glass-panel rounded-[32px] p-9 space-y-5 relative"
              >
                {/* Dynamic neutral reflection / subtle glint */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-[32px] transition-opacity duration-300 ease-out z-0"
                  style={{
                    opacity: isHovered ? 1 : 0,
                    background: `radial-gradient(420px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255, 255, 255, 0.12), transparent 70%)`,
                  }}
                  aria-hidden="true"
                />

                <div className="relative z-10 space-y-5">
                  {/* Header */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white/90">
                        <div className="w-3.5 h-3.5 rounded-md bg-white/10 flex items-center justify-center text-white shrink-0">
                          <Building2 className="w-2.5 h-2.5" />
                        </div>
                        <span className="text-[10px] font-bold tracking-wider uppercase font-sans">
                          WORKSPACE ACCESS
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                    </div>

                    <h2 className="text-[26px] font-extrabold tracking-tight text-white pt-0.5 leading-snug">
                      Sign in to your workspace
                    </h2>
                    <p className="text-[13px] text-white/70 leading-normal">
                      Enter your Company Code and credentials to continue to PantherTMS.
                    </p>
                  </div>

                  {/* Forgot Password Banner */}
                  {forgotPasswordMsg && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-xs animate-in fade-in-0 duration-200">
                      <Info className="w-4 h-4 shrink-0 mt-0.5 text-white/80" />
                      <div className="leading-relaxed">
                        Password resets are managed by your workspace administrator. Contact your admin or reach out to{" "}
                        <a href="mailto:support@panthertms.com" className="font-semibold underline text-white hover:text-white/80">
                          support@panthertms.com
                        </a>.
                      </div>
                    </div>
                  )}

                  {/* Error Banner */}
                  {error && (
                    <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/20 backdrop-blur-md border border-rose-400/40 text-rose-200 text-xs animate-in fade-in-0 duration-200">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-300" />
                      <span className="leading-relaxed font-semibold">{error}</span>
                    </div>
                  )}

                  {/* Desktop Form */}
                  <form onSubmit={handleSubmit} className="space-y-4" style={{ colorScheme: "dark" }}>
                    {/* Field 1: Company Code */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="company-code-input" className="block text-xs font-semibold text-white/90 tracking-tight">
                          Company Code
                        </label>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-wider bg-white/10 text-white/80 border border-white/20">
                          CAPITAL ALPHABETS ONLY
                        </span>
                      </div>
                      <div className="liquid-glass-input-wrapper relative flex items-center rounded-xl group/input">
                        <div className="absolute left-3.5 pointer-events-none text-white/50 group-focus-within/input:text-white transition-colors">
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
                          style={{ colorScheme: "dark" }}
                          className="w-full pl-10 pr-3.5 py-2.5 text-sm font-semibold tracking-wider text-white placeholder:text-white/35 bg-transparent focus:outline-none uppercase font-mono"
                        />
                      </div>
                      <p className="text-[11px] text-white/50 font-normal">
                        Formed from your company name during account creation.
                      </p>
                    </div>

                    {/* Field 2: Work Email */}
                    <div className="space-y-1.5">
                      <label htmlFor="work-email-input" className="block text-xs font-semibold text-white/90 tracking-tight">
                        Work email
                      </label>
                      <div className="liquid-glass-input-wrapper relative flex items-center rounded-xl group/input">
                        <div className="absolute left-3.5 pointer-events-none text-white/50 group-focus-within/input:text-white transition-colors">
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
                          style={{ colorScheme: "dark" }}
                          className="w-full pl-10 pr-3.5 py-2.5 text-sm font-medium text-white placeholder:text-white/35 bg-transparent focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Field 3: Password */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="password-input" className="block text-xs font-semibold text-white/90 tracking-tight">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setForgotPasswordMsg(!forgotPasswordMsg)}
                          className="text-xs font-medium text-indigo-300 hover:text-white transition-colors cursor-pointer hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>

                      <div className="liquid-glass-input-wrapper relative flex items-center rounded-xl group/input">
                        <div className="absolute left-3.5 pointer-events-none text-white/50 group-focus-within/input:text-white transition-colors">
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
                          style={{ colorScheme: "dark" }}
                          className="w-full pl-10 pr-11 py-2.5 text-sm font-medium text-white placeholder:text-white/35 bg-transparent focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 active:scale-95 transition-all focus:outline-none cursor-pointer"
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
                      className="liquid-glass-btn-primary w-full h-12 mt-2 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group focus:outline-none"
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

                  {/* Divider */}
                  <div className="relative flex items-center justify-center my-3.5">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full h-[1px] bg-white/15" />
                    </div>
                    <span className="liquid-glass-pill relative px-3 py-0.5 rounded-full text-[10px] font-bold text-white/50 uppercase tracking-widest">
                      OR
                    </span>
                  </div>

                  {/* Demo Workspace Card */}
                  <div className="liquid-glass-inset rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-white leading-snug">
                          Try the demo workspace
                        </h3>
                        <p className="text-[11px] text-white/60 leading-tight">
                          Pre-configured sandbox for evaluation.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={fillDemo}
                      className="liquid-glass-pill hover:bg-white/20 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/25 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap shrink-0 group/demo"
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

        {/* Desktop Enterprise Trust & Security Footer */}
        <footer className="w-full border-t border-white/10 bg-transparent py-3 px-12 lg:px-16 flex flex-wrap items-center justify-between gap-y-2 text-xs text-white/70 z-30 shrink-0">
          <div className="flex flex-wrap items-center gap-6">
            <div className="liquid-glass-pill inline-flex items-center gap-2 px-3 py-1 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="font-semibold text-white font-sans text-[11px]">Systems Operational</span>
            </div>

            <span className="inline-flex items-center gap-1.5 font-medium text-white/75 text-[11px]">
              <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Tenant-Isolated architecture</span>
            </span>

            <span className="inline-flex items-center gap-1.5 font-medium text-white/75 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-white/80 shrink-0" />
              <span>256-bit SSL encrypted</span>
            </span>

            <span className="inline-flex items-center gap-1.5 font-medium text-white/75 text-[11px]">
              <Layers className="w-3.5 h-3.5 text-white/80 shrink-0" />
              <span>Multi-tier RBAC security</span>
            </span>
          </div>

          <div>
            <a
              href="mailto:support@panthertms.com"
              className="liquid-glass-pill inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white/80 hover:text-white font-medium text-[11px] transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-white/60 shrink-0" />
              <span>Need help? Contact support</span>
            </a>
          </div>
        </footer>
      </div>
    </>
  );
}
