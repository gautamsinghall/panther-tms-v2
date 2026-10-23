"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";

export interface AuthNavbarProps {
  mode?: "login" | "signup";
  theme?: "dark" | "light";
  promptText?: string;
  ctaText?: string;
  ctaHref?: string;
  className?: string;
}

export function AuthNavbar({
  mode,
  theme,
  promptText,
  ctaText,
  ctaHref,
  className,
}: AuthNavbarProps) {
  const pathname = usePathname();

  const isSignup = mode ? mode === "signup" : pathname?.startsWith("/signup");
  const isDark = theme ? theme === "dark" : !isSignup;

  const resolvedPrompt =
    promptText ?? (isSignup ? "Already have an account?" : "New to PantherTMS?");
  const resolvedCtaText =
    ctaText ?? (isSignup ? "Sign in" : "Create workspace");
  const resolvedCtaHref =
    ctaHref ?? (isSignup ? "/login" : "/signup");

  return (
    <header
      className={`w-full bg-transparent px-8 sm:px-12 lg:px-16 h-16 sm:h-20 flex items-center justify-between z-30 shrink-0 ${
        className || ""
      }`}
    >
      <div className="flex items-center gap-3">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <img
            src="/panther-logo.png"
            alt="Panther Digital Solutions"
            className="h-8 sm:h-9 w-auto object-contain group-hover:opacity-90 transition-opacity"
          />
          <div className="flex items-center gap-1.5 ml-1">
            <span
              className={`text-base sm:text-lg font-bold tracking-tight ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              Panther
              <span className={isDark ? "text-indigo-400" : "text-indigo-600"}>
                TMS
              </span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ml-1 ${
                isDark
                  ? "liquid-glass-pill text-white/90 border border-white/20"
                  : "bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs"
              }`}
            >
              v2.0
            </span>
          </div>
        </Link>

        <div
          className={`hidden md:flex items-center gap-2 pl-3 border-l text-xs font-medium ${
            isDark
              ? "border-white/20 text-white/70"
              : "border-slate-300 text-slate-600"
          }`}
        >
          <span>Enterprise Logistics Operating System</span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 text-xs">
        <span
          className={`hidden sm:inline font-medium ${
            isDark ? "text-white/70" : "text-slate-600"
          }`}
        >
          {resolvedPrompt}
        </span>
        <Link
          href={resolvedCtaHref}
          className={`px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 active:scale-[0.98] transition-all group/cta ${
            isDark
              ? "liquid-glass-pill hover:bg-white/20 text-white border border-white/25"
              : "bg-white hover:bg-slate-50 text-slate-800 hover:text-indigo-600 border border-slate-200/90 shadow-2xs hover:shadow-xs"
          }`}
        >
          <span>{resolvedCtaText}</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover/cta:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </header>
  );
}

export default AuthNavbar;
