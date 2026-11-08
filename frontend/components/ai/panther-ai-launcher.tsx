"use client";

import React from "react";
import { usePantherAI } from "./panther-ai-context";

export function PantherAILauncher() {
  const { isOpen, toggleAI } = usePantherAI();

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 group">
      {/* Accessible Tooltip */}
      <div
        role="tooltip"
        className="pointer-events-none absolute right-16 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900/90 dark:bg-slate-800/95 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-xs opacity-0 transition-opacity duration-150 group-hover:opacity-100 motion-reduce:transition-none"
      >
        <span>{isOpen ? "Close Panther AI" : "Panther AI Copilot"}</span>
        <kbd className="ml-2 font-mono text-[10px] text-blue-300">Ctrl+/</kbd>
      </div>

      {/* Floating Blue Panther Button (56px, rounded-full, no purple, no gradient, no sparkle) */}
      <button
        type="button"
        onClick={toggleAI}
        aria-label="Toggle Panther AI Copilot (Ctrl+/)"
        title="Toggle Panther AI (Ctrl+/)"
        className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-[#0B2A5B] text-white shadow-[0_8px_25px_rgba(11,42,91,0.5)] hover:shadow-[0_12px_32px_rgba(11,42,91,0.7)] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-[#0B2A5B] motion-reduce:transform-none motion-reduce:transition-none overflow-visible ${
          isOpen ? "ring-2 ring-blue-400 shadow-[0_0_20px_rgba(11,42,91,0.6)]" : ""
        }`}
      >
        <span className="sr-only">Panther AI</span>

        {/* Blue Panther Icon */}
        <div className="relative h-14 w-14 rounded-full overflow-hidden bg-[#0B2A5B] flex items-center justify-center">
          <img
            src="/panther-ai-icon.png"
            alt="Panther AI Copilot"
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none"
          />
        </div>

        {/* Online Indicator Badge */}
        {!isOpen && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 z-10 pointer-events-none">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-[#0B2A5B]" />
          </span>
        )}
      </button>
    </div>
  );
}
