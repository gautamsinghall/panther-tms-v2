"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";

export interface AuthNavbarProps {
  mode?: "login" | "signup";
  promptText?: string;
  ctaText?: string;
  ctaHref?: string;
  className?: string;
}

export function AuthNavbar({
  mode,
  promptText,
  ctaText,
  ctaHref,
  className,
}: AuthNavbarProps) {
  const pathname = usePathname();

  const isSignup = mode ? mode === "signup" : pathname?.startsWith("/signup");

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
            className="h-8 sm:h-9 w-auto object-contain drop-shadow-xs group-hover:opacity-90 transition-opacity"
          />
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
              Panther<span className="text-indigo-600">TMS</span>
            </span>
            <span className="px-1.5 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100/90 ml-1">
              v2.0
            </span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs text-slate-500 font-medium">
          <span>Enterprise Logistics Operating System</span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 text-xs">
        <span className="hidden sm:inline text-slate-500 font-medium">
          {resolvedPrompt}
        </span>
        <Link
          href={resolvedCtaHref}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-white hover:bg-indigo-50/80 border border-indigo-200/80 transition-all shadow-2xs active:scale-[0.98]"
        >
          <span>{resolvedCtaText}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </header>
  );
}

export default AuthNavbar;
