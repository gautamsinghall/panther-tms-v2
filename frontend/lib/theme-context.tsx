"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";

export type Theme = "light" | "dark";

export interface ThemeToggleOrigin {
  clientX?: number;
  clientY?: number;
  currentTarget?: HTMLElement | null;
}

export type ThemeToggleEvent =
  | React.MouseEvent
  | MouseEvent
  | ThemeToggleOrigin
  | undefined;

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: (event?: ThemeToggleEvent) => void;
  setTheme: (theme: Theme, event?: ThemeToggleEvent) => void;
}

const THEME_STORAGE_KEY = "panther_theme";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");

  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);
  const [switchingTheme, setSwitchingTheme] = useState<Theme | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const isSwitchingRef = useRef(false);
  const switchTimerRef = useRef<{ fade?: NodeJS.Timeout; finish?: NodeJS.Timeout }>({});

  // Apply theme with a clean loading overlay so background DOM repaints are hidden
  const applyThemeWithTransition = useCallback(
    (nextTheme: Theme) => {
      if (typeof document === "undefined") return;
      const root = document.documentElement;

      // Under NO circumstances should dark mode styling touch login or signup pages
      if (isAuthPage) {
        root.classList.remove("dark");
        root.removeAttribute("data-theme");
        root.style.colorScheme = "light";
        setThemeState("light");
        isSwitchingRef.current = false;
        return;
      }

      isSwitchingRef.current = true;
      if (switchTimerRef.current.fade) clearTimeout(switchTimerRef.current.fade);
      if (switchTimerRef.current.finish) clearTimeout(switchTimerRef.current.finish);

      // 1. Show the solid loading screen overlay FIRST
      setSwitchingTheme(nextTheme);
      setIsFadingOut(false);

      // 2. Allow browser to paint the overlay over the entire screen, then swap theme classes
      setTimeout(() => {
        if (nextTheme === "dark") {
          root.classList.add("dark");
          root.setAttribute("data-theme", "dark");
          root.style.colorScheme = "dark";
        } else {
          root.classList.remove("dark");
          root.setAttribute("data-theme", "light");
          root.style.colorScheme = "light";
        }

        setThemeState(nextTheme);
        try {
          localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        } catch {}
      }, 50);

      // 3. Fade out loading screen smoothly after backing has rendered
      switchTimerRef.current.fade = setTimeout(() => {
        setIsFadingOut(true);
      }, 350);

      // 4. Remove loading overlay and allow next toggle
      switchTimerRef.current.finish = setTimeout(() => {
        setSwitchingTheme(null);
        setIsFadingOut(false);
        isSwitchingRef.current = false;
      }, 550);
    },
    [isAuthPage]
  );

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (switchTimerRef.current.fade) clearTimeout(switchTimerRef.current.fade);
      if (switchTimerRef.current.finish) clearTimeout(switchTimerRef.current.finish);
    };
  }, []);

  // On initial mount: read stored preference and set state directly without animation
  useEffect(() => {
    setMounted(true);
    let initialTheme: Theme = "light";
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === "dark" || stored === "light") {
        initialTheme = stored;
      }
    } catch {}
    setThemeState(initialTheme);

    const root = document.documentElement;
    if (isAuthPage) {
      root.classList.remove("dark");
      root.removeAttribute("data-theme");
      root.style.colorScheme = "light";
    } else if (initialTheme === "dark") {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
      root.style.colorScheme = "light";
    }
  }, [isAuthPage]);

  // When pathname changes: re-check if we entered or left auth pages
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (isAuthPage) {
      root.classList.remove("dark");
      root.removeAttribute("data-theme");
      root.style.colorScheme = "light";
    }
  }, [pathname, isAuthPage, mounted]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      if (isSwitchingRef.current || newTheme === theme) return;
      applyThemeWithTransition(newTheme);
    },
    [theme, applyThemeWithTransition]
  );

  const toggleTheme = useCallback(() => {
    if (isSwitchingRef.current) return;
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    applyThemeWithTransition(nextTheme);
  }, [theme, applyThemeWithTransition]);

  // Synchronize across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && (e.newValue === "light" || e.newValue === "dark")) {
        const nextTheme = e.newValue as Theme;
        if (nextTheme !== theme) {
          applyThemeWithTransition(nextTheme);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [theme, applyThemeWithTransition]);

  // Keyboard shortcut listener: Ctrl+Shift+D or Cmd+Shift+D to toggle theme
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        if (isAuthPage || isSwitchingRef.current) return;
        e.preventDefault();
        toggleTheme();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthPage, toggleTheme]);

  const value: ThemeContextType = {
    theme: isAuthPage ? "light" : theme,
    isDark: !isAuthPage && theme === "dark",
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
      {switchingTheme && (
        <div
          className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center transition-opacity duration-200 pointer-events-auto select-none ${
            isFadingOut ? "opacity-0" : "opacity-100"
          }`}
          style={{
            backgroundColor: switchingTheme === "dark" ? "#0B0B0D" : "#F8FAFC",
            color: switchingTheme === "dark" ? "#F5F5F7" : "#0F172A",
          }}
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{
                borderColor: switchingTheme === "dark" ? "#7C6FF7" : "#4F46E5",
                borderTopColor: "transparent",
              }}
            />
            <span
              className="text-xs font-medium font-mono"
              style={{
                color: switchingTheme === "dark" ? "#CACAD0" : "#475569",
              }}
            >
              {switchingTheme === "dark" ? "Switching to dark mode..." : "Switching to light mode..."}
            </span>
          </div>
        </div>
      )}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
