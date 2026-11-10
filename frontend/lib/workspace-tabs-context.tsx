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
import { confirmModal } from "@/lib/toast";

export type MasterType =
  | "billing_client"
  | "consigner"
  | "consignee"
  | "location"
  | "vehicle_owner"
  | "driver"
  | "load_type"
  | "market_vehicle";

export interface OpenMasterTabConfig {
  type: MasterType;
  title?: string;
  subtitle?: string;
  initialValues?: Record<string, any>;
  onSuccess?: (created: { id: string | number; label: string; [key: string]: any }) => void;
  onCancel?: () => void;
}

export interface MasterTabItem {
  id: string;
  type: MasterType;
  title: string;
  subtitle?: string;
  initialValues?: Record<string, any>;
  isDirty?: boolean;
  returnToTabId?: string;
  onSuccess?: (created: { id: string | number; label: string; [key: string]: any }) => void;
  onCancel?: () => void;
}

export interface FormTabInfo {
  title: string;
  subtitle?: string;
  onClose: () => void;
}

interface WorkspaceTabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  formTabInfo: FormTabInfo | null;
  openFormTab: (info: FormTabInfo) => void;
  closeFormTab: (callOnClose?: boolean) => void;
  dismissFormTab: () => void;
  isFormOpen: boolean;
  masterTabs: MasterTabItem[];
  openMasterTab: (config: OpenMasterTabConfig) => string;
  closeMasterTab: (tabId: string, skipConfirm?: boolean) => Promise<boolean>;
  updateMasterTabDirty: (tabId: string, isDirty: boolean) => void;
  isMobileNavOpen: boolean;
  setIsMobileNavOpen: (open: boolean) => void;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleMobileNav: () => void;
}

const DEFAULT_TITLES: Record<MasterType, string> = {
  billing_client: "Add Billing Client",
  consigner: "Add Consignor",
  consignee: "Add Consignee",
  location: "Add Location",
  vehicle_owner: "Add Vehicle Owner",
  driver: "Add Driver",
  load_type: "Add Load Type",
  market_vehicle: "Add Vehicle",
};

const WorkspaceTabsContext = createContext<WorkspaceTabsContextValue | null>(null);

export function WorkspaceTabsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<string>("list");
  const [formTabInfo, setFormTabInfo] = useState<FormTabInfo | null>(null);
  const [masterTabs, setMasterTabs] = useState<MasterTabItem[]>([]);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const onCloseRef = useRef<(() => void) | null>(null);
  const masterTabsRef = useRef<MasterTabItem[]>([]);
  masterTabsRef.current = masterTabs;

  // Keep ref up to date with latest onClose callback
  useEffect(() => {
    onCloseRef.current = formTabInfo?.onClose ?? null;
  }, [formTabInfo]);

  // When pathname changes (user navigated via sidebar), reset to list tab, clear form & master tabs, close mobile nav
  useEffect(() => {
    const cb = onCloseRef.current;
    setActiveTab("list");
    setFormTabInfo(null);
    setMasterTabs([]);
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
    if (typeof window !== "undefined") {
      const reset = () => {
        const formCanvas = document.getElementById("workspace-form-canvas");
        if (formCanvas) formCanvas.scrollTop = 0;
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      };
      reset();
      requestAnimationFrame(reset);
      setTimeout(reset, 30);
    }
  }, []);

  // Closes the form tab and triggers the parent page's onClose handler
  const closeFormTab = useCallback((callOnClose = true) => {
    const cb = onCloseRef.current;
    setFormTabInfo(null);
    setActiveTab("list");
    if (typeof window !== "undefined") {
      const formCanvas = document.getElementById("workspace-form-canvas");
      if (formCanvas) formCanvas.scrollTop = 0;
    }
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
    if (typeof window !== "undefined") {
      const formCanvas = document.getElementById("workspace-form-canvas");
      if (formCanvas) formCanvas.scrollTop = 0;
    }
  }, []);

  // Open a full Master form in a new in-app TMS tab
  const openMasterTab = useCallback((config: OpenMasterTabConfig): string => {
    const newId = `master-${config.type}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const tabTitle = config.title || DEFAULT_TITLES[config.type] || "Add New Record";

    // Detect where user came from: if form is open, return to form, else list
    const currentActive = activeTab;
    const returnTarget = currentActive.startsWith("master-")
      ? currentActive
      : formTabInfo
      ? "form"
      : "list";

    const newTab: MasterTabItem = {
      id: newId,
      type: config.type,
      title: tabTitle,
      subtitle: config.subtitle,
      initialValues: config.initialValues,
      isDirty: false,
      returnToTabId: returnTarget,
      onSuccess: config.onSuccess,
      onCancel: config.onCancel,
    };

    setMasterTabs((prev) => [...prev, newTab]);
    setActiveTab(newId);
    return newId;
  }, [activeTab, formTabInfo]);

  // Close master tab with unsaved changes confirmation
  const closeMasterTab = useCallback(async (tabId: string, skipConfirm = false): Promise<boolean> => {
    const target = masterTabsRef.current.find((t) => t.id === tabId);
    if (!target) return true;

    if (target.isDirty && !skipConfirm) {
      const ok = await confirmModal({
        title: "Unsaved Changes",
        description: "You have unsaved changes. Do you want to close without saving?",
        confirmText: "Yes",
        cancelText: "No",
        variant: "warning",
      });
      if (!ok) return false;
    }

    setMasterTabs((prev) => prev.filter((t) => t.id !== tabId));
    setActiveTab((prev) => {
      if (prev === tabId) {
        // Return to the tab the user came from
        return target.returnToTabId || (formTabInfo ? "form" : "list");
      }
      return prev;
    });

    try {
      target.onCancel?.();
    } catch (err) {
      console.error("Error in master tab onCancel", err);
    }

    return true;
  }, [formTabInfo]);

  // Update dirty state for master tab
  const updateMasterTabDirty = useCallback((tabId: string, isDirty: boolean) => {
    setMasterTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, isDirty } : t))
    );
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
      masterTabs,
      openMasterTab,
      closeMasterTab,
      updateMasterTabDirty,
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
      masterTabs,
      openMasterTab,
      closeMasterTab,
      updateMasterTabDirty,
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
