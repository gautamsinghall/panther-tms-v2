"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";

interface PantherAIContextType {
  isOpen: boolean;
  openAI: () => void;
  closeAI: () => void;
  toggleAI: () => void;
  currentPath: string;
}

const PantherAIContext = createContext<PantherAIContextType | undefined>(undefined);

export function PantherAIProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname() || "/";

  const openAI = useCallback(() => setIsOpen(true), []);
  const closeAI = useCallback(() => setIsOpen(false), []);
  const toggleAI = useCallback(() => setIsOpen((prev) => !prev), []);

  // Global keyboard shortcut: Ctrl+/ (or Cmd+/ or Alt+A) to toggle Panther AI without hijacking browser Ctrl+J (Downloads)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifierSlash = (e.ctrlKey || e.metaKey) && (e.key === "/" || e.code === "Slash");
      const isAltA = e.altKey && e.key.toLowerCase() === "a";
      if (isModifierSlash || isAltA) {
        e.preventDefault();
        toggleAI();
      }
      if (e.key === "Escape" && isOpen) {
        closeAI();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleAI, closeAI, isOpen]);

  return (
    <PantherAIContext.Provider
      value={{
        isOpen,
        openAI,
        closeAI,
        toggleAI,
        currentPath: pathname,
      }}
    >
      {children}
    </PantherAIContext.Provider>
  );
}

export function usePantherAI() {
  const context = useContext(PantherAIContext);
  if (!context) {
    throw new Error("usePantherAI must be used within a PantherAIProvider");
  }
  return context;
}

