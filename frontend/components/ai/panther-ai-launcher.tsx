"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { usePantherAI } from "./panther-ai-context";

export function PantherAILauncher() {
  const { isOpen, toggleAI } = usePantherAI();

  return (
    <div className="fixed bottom-6 right-6 z-50 group">
      {/* Accessible Tooltip */}
      <div
        role="tooltip"
        className="pointer-events-none absolute right-16 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900/90 dark:bg-slate-800/95 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-xs opacity-0 transition-opacity duration-150 group-hover:opacity-100 motion-reduce:transition-none"
      >
        <span>{isOpen ? "Close Panther AI" : "Panther AI Copilot"}</span>
        <kbd className="ml-2 font-mono text-[10px] text-indigo-300">Ctrl+/</kbd>
      </div>

      {/* Floating Sparkle Button */}
      <button
        type="button"
        onClick={toggleAI}
        aria-label="Toggle Panther AI Copilot (Ctrl+/)"
        title="Toggle Panther AI (Ctrl+/)"
        className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-[#4F46E5] to-[#7C3AED] text-white shadow-[0_8px_25px_rgba(91,80,230,0.45)] hover:shadow-[0_12px_32px_rgba(91,80,230,0.6)] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-[#0F111D] motion-reduce:transform-none motion-reduce:transition-none ${
          isOpen ? "ring-2 ring-indigo-300/60 shadow-[0_0_20px_rgba(124,58,237,0.5)]" : ""
        }`}
      >
        <span className="sr-only">Panther AI</span>

        {/* 4-point Sparkle Icon */}
        <div className="relative flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-white transition-transform duration-300 group-hover:rotate-12 motion-reduce:transition-none" />
          {!isOpen && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-2 ring-[#4F46E5]" />
            </span>
          )}
        </div>
      </button>
    </div>
  );
}
