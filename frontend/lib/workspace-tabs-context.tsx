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
}

const WorkspaceTabsContext = createContext<WorkspaceTabsContextValue | null>(null);

export function WorkspaceTabsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<"list" | "form">("list");
  const [formTabInfo, setFormTabInfo] = useState<FormTabInfo | null>(null);
  const onCloseRef = useRef<(() => void) | null>(null);

  // Keep ref up to date with latest onClose callback
  useEffect(() => {
    onCloseRef.current = formTabInfo?.onClose ?? null;
  }, [formTabInfo]);

  // When pathname changes (user navigated via sidebar), reset to list tab and clear form tab
  useEffect(() => {
    setActiveTab("list");
    setFormTabInfo(null);
    onCloseRef.current = null;
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

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      formTabInfo,
      openFormTab,
      closeFormTab,
      dismissFormTab,
      isFormOpen: formTabInfo !== null,
    }),
    [activeTab, formTabInfo, openFormTab, closeFormTab, dismissFormTab]
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
