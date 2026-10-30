"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredAuth, getActiveOffice, OfficeSummary } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { WorkspaceTabBar } from "@/components/layout/workspace-tab-bar";
import { WorkspaceTabsProvider, useWorkspaceTabs } from "@/lib/workspace-tabs-context";
import { cn } from "@/lib/utils";
import { FileEdit, ArrowRight } from "lucide-react";
import { PantherAIProvider, PantherAILauncher, PantherAIPanel } from "@/components/ai";

function WorkspaceCanvas({ children }: { children: React.ReactNode }) {
  const { activeTab, isFormOpen, formTabInfo, setActiveTab, closeFormTab } = useWorkspaceTabs();
  const [officeKey, setOfficeKey] = useState<string>(() => {
    const off = getActiveOffice();
    return off?.id !== undefined ? String(off.id) : "default";
  });

  useEffect(() => {
    const handleOfficeChange = (e: Event) => {
      const customEvent = e as CustomEvent<OfficeSummary>;
      const off = customEvent.detail;
      const keyId = off?.id !== undefined ? String(off.id) : "all";
      setOfficeKey((prev) => {
        const prevId = prev.split("-")[0];
        if (prevId === keyId) {
          return prev;
        }
        if (isFormOpen) {
          closeFormTab(false);
        }
        return `${keyId}-${Date.now()}`;
      });
    };

    window.addEventListener("panther_office_changed", handleOfficeChange);
    return () => window.removeEventListener("panther_office_changed", handleOfficeChange);
  }, [isFormOpen, closeFormTab]);

  return (
    <div className="flex-1 relative overflow-hidden flex flex-col min-w-0">
      {/* Main List Canvas (Visible when activeTab is "list") */}
      <main
        key={officeKey}
        id="workspace-main-canvas"
        className={cn(
          "flex-1 overflow-y-auto [scrollbar-gutter:stable] p-4 sm:p-6 lg:p-7 bg-[#F3F5FC] dark:bg-[#0B0B0D] relative transition-colors duration-200",
          activeTab === "form" ? "hidden" : "block"
        )}
      >
        <div className="max-w-[1440px] mx-auto space-y-6">
          {/* Draft Notification Banner when viewing list while keeping an active form open in background */}
          {isFormOpen && activeTab === "list" && (
            <div className="bg-gradient-to-r from-indigo-50 via-white to-indigo-50/70 dark:from-[#171928] dark:via-[#141622] dark:to-[#171928] border border-indigo-200/90 dark:border-[#2E3150] rounded-2xl p-4 flex items-center justify-between shadow-2xs mb-6 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 border border-indigo-600/20 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <FileEdit className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Form Draft in Progress
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/60">
                      Background Tab
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    You are browsing records while keeping{" "}
                    <strong className="text-indigo-900 dark:text-indigo-300 font-semibold">&ldquo;{formTabInfo?.title || "New Entry"}&rdquo;</strong>{" "}
                    open in the form tab.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0 ml-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("form")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-b from-indigo-500 to-indigo-600 border border-indigo-700/40 text-white text-xs font-semibold rounded-xl shadow-[0_1px_2px_rgba(79,70,229,0.22),0_0_0_1px_rgba(79,70,229,0.10)] hover:from-indigo-400 hover:to-indigo-500 hover:shadow-[0_2px_8px_rgba(79,70,229,0.28)] hover:-translate-y-px active:from-indigo-600 active:to-indigo-700 active:translate-y-0 transition-all cursor-pointer"
                >
                  <span>Return to Form</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => closeFormTab(true)}
                  className="px-3 py-2 bg-white dark:bg-[#1A1D2B] hover:bg-slate-50 dark:hover:bg-[#23273A] text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold rounded-xl border border-slate-300 dark:border-[#2D3145] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:-translate-y-px active:translate-y-0 transition-all cursor-pointer"
                >
                  Discard Draft
                </button>
              </div>
            </div>
          )}

          {children}
        </div>
      </main>

      {/* Form Canvas Portal Target (Visible when activeTab is "form") */}
      <div
        id="workspace-form-canvas"
        className={cn(
          "flex-1 overflow-y-auto [scrollbar-gutter:stable] p-4 sm:p-6 lg:p-7 bg-[#F3F5FC] dark:bg-[#0B0B0D] relative transition-colors duration-200",
          activeTab === "form" ? "block" : "hidden"
        )}
      />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth || !auth.accessToken) {
      setIsAuthenticated(false);
      router.replace("/login");
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  // While verifying authentication or if unauthenticated, do NOT render Sidebar, Header, or Dashboard content
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F3F5FC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-slate-500 font-mono">
            Verifying workspace session...
          </span>
        </div>
      </div>
    );
  }

  return (
    <WorkspaceTabsProvider>
      <PantherAIProvider>
        <div className="flex h-screen h-[100dvh] max-h-screen w-full overflow-hidden bg-[#F3F5FC]">
          {/* Sidebar Navigation - Always accessible & unblocked */}
          <Sidebar />

          {/* Main Content Column */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            {/* Top Header */}
            <Header />

            {/* In-App Workspace Tab Bar */}
            <WorkspaceTabBar />

            {/* Workspace Canvas (handles List Canvas and Form Canvas switching) */}
            <WorkspaceCanvas>{children}</WorkspaceCanvas>
          </div>

          {/* Panther AI Assistant Layer */}
          <PantherAILauncher />
          <PantherAIPanel />
        </div>
      </PantherAIProvider>
    </WorkspaceTabsProvider>
  );
}
