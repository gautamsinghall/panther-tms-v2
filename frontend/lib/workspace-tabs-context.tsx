"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { usePathname } from "next/navigation";

export interface FormTabInfo {
  title: string;
  subtitle?: string;
  onClose: () => void;
}

interface WorkspaceTabsContextValue {
  activeTab: "list" | "form";
  setActiveTab: (tab: "list" | "form") => void;
  formTabInfo: FormTabInfo | null;
  openFormTab: (info: FormTabInfo) => void;
  closeFormTab: (callOnClose?: boolean) => void;
  dismissFormTab: () => void;
  isFormOpen: boolean;
  isMobileNavOpen: boolean;
  setIsMobileNavOpen: (open: boolean) => void;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleMobileNav: () => void;
}

const WorkspaceTabsContext = createContext<WorkspaceTabsContextValue | null>(null);

export function WorkspaceTabsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<"list" | "form">("list");
  const [formTabInfo, setFormTabInfo] = useState<FormTabInfo | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const onCloseRef = useRef<(() => void) | null>(null);

  // Keep ref up to date with latest onClose callback
  useEffect(() => {
    onCloseRef.current = formTabInfo?.onClose ?? null;
  }, [formTabInfo]);

  // When pathname changes (user navigated via sidebar), reset to list tab, clear form tab, and close mobile nav
  useEffect(() => {
    const cb = onCloseRef.current;
    setActiveTab("list");
    setFormTabInfo(null);
    setIsMobileNavOpen(false);
    onCloseRef.current = null;
    if (cb) {
      try {
        cb();
      } catch (err) {
        console.error("Error executing form tab onClose callback on pathname change", err);
      }
    }
  }, [pathname]);

  const openFormTab = useCallback((info: FormTabInfo) => {
    setFormTabInfo(info);
    setActiveTab("form");
  }, []);

  // Closes the form tab and triggers the parent page's onClose handler
  const closeFormTab = useCallback((callOnClose = true) => {
    const cb = onCloseRef.current;
    setFormTabInfo(null);
    setActiveTab("list");
    if (callOnClose && cb) {
      try {
        cb();
      } catch (err) {
        console.error("Error executing form tab onClose callback", err);
      }
    }
  }, []);

  // Dismisses tab state without triggering onClose (used when parent already closed drawer)
  const dismissFormTab = useCallback(() => {
    setFormTabInfo(null);
    setActiveTab("list");
  }, []);

  const openMobileNav = useCallback(() => setIsMobileNavOpen(true), []);
  const closeMobileNav = useCallback(() => setIsMobileNavOpen(false), []);
  const toggleMobileNav = useCallback(() => setIsMobileNavOpen((prev) => !prev), []);

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      formTabInfo,
      openFormTab,
      closeFormTab,
      dismissFormTab,
      isFormOpen: formTabInfo !== null,
      isMobileNavOpen,
      setIsMobileNavOpen,
      openMobileNav,
      closeMobileNav,
      toggleMobileNav,
    }),
    [
      activeTab,
      formTabInfo,
      openFormTab,
      closeFormTab,
      dismissFormTab,
      isMobileNavOpen,
      openMobileNav,
      closeMobileNav,
      toggleMobileNav,
    ]
  );

  return (
    <WorkspaceTabsContext.Provider value={value}>
      {children}
    </WorkspaceTabsContext.Provider>
  );
}

export function useWorkspaceTabs() {
  const context = useContext(WorkspaceTabsContext);
  if (!context) {
    throw new Error("useWorkspaceTabs must be used within a WorkspaceTabsProvider");
  }
  return context;
}
