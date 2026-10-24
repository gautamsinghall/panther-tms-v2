"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";

export type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const THEME_STORAGE_KEY = "panther_theme";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");

  // Initialize theme state from localStorage if available, defaulting to light
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  // Apply theme class to documentElement
  const applyThemeToDOM = useCallback((currentTheme: Theme, isAuth: boolean) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    // Under NO circumstances should dark mode styling touch login or signup pages
    if (isAuth) {
      root.classList.remove("dark");
      root.removeAttribute("data-theme");
      root.style.colorScheme = "light";
      return;
    }

    // Add temporary transitioning class for buttery-smooth switch
    root.classList.add("theme-transitioning");

    if (currentTheme === "dark") {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
      root.style.colorScheme = "light";
    }

    const timer = setTimeout(() => {
      root.classList.remove("theme-transitioning");
    }, 400);
  }, []);

  // On initial mount: read stored preference
  useEffect(() => {
    setMounted(true);
    let initialTheme: Theme = "light";
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === "dark" || stored === "light") {
        initialTheme = stored;
      }
    } catch {
      // ignore storage access errors
    }
    setThemeState(initialTheme);
    applyThemeToDOM(initialTheme, isAuthPage);
  }, [applyThemeToDOM, isAuthPage]);

  // When pathname changes: re-check if we entered or left auth pages
  useEffect(() => {
    if (!mounted) return;
    applyThemeToDOM(theme, isAuthPage);
  }, [pathname, theme, isAuthPage, mounted, applyThemeToDOM]);

  // Synchronize with other tabs or windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && (e.newValue === "light" || e.newValue === "dark")) {
        const nextTheme = e.newValue as Theme;
        setThemeState(nextTheme);
        applyThemeToDOM(nextTheme, isAuthPage);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [isAuthPage, applyThemeToDOM]);

  // Keyboard shortcut listener: Ctrl+Shift+D or Cmd+Shift+D to toggle theme
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        // Prevent toggle if on auth page
        if (isAuthPage) return;
        e.preventDefault();
        setThemeState((prev) => {
          const next = prev === "dark" ? "light" : "dark";
          try {
            localStorage.setItem(THEME_STORAGE_KEY, next);
          } catch {}
          applyThemeToDOM(next, isAuthPage);
          return next;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthPage, applyThemeToDOM]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      } catch {}
      applyThemeToDOM(newTheme, isAuthPage);
    },
    [isAuthPage, applyThemeToDOM]
  );

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {}
      applyThemeToDOM(next, isAuthPage);
      return next;
    });
  }, [isAuthPage, applyThemeToDOM]);

  const value: ThemeContextType = {
    theme: isAuthPage ? "light" : theme,
    isDark: !isAuthPage && theme === "dark",
    toggleTheme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
