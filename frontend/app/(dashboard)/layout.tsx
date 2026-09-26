"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { WorkspaceTabBar } from "@/components/layout/workspace-tab-bar";
import { WorkspaceTabsProvider, useWorkspaceTabs } from "@/lib/workspace-tabs-context";
import { cn } from "@/lib/utils";
import { FileEdit, ArrowRight } from "lucide-react";

function WorkspaceCanvas({ children }: { children: React.ReactNode }) {
  const { activeTab, isFormOpen, formTabInfo, setActiveTab, closeFormTab } = useWorkspaceTabs();

  return (
    <div className="flex-1 relative overflow-hidden flex flex-col min-w-0">
      {/* Main List Canvas (Visible when activeTab is "list") */}
      <main
        id="workspace-main-canvas"
        className={cn(
          "flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 bg-[#F8FAFC]",
          activeTab === "form" ? "hidden" : "block"
        )}
      >
        <div className="max-w-[1440px] mx-auto space-y-6">
          {/* Draft Notification Banner when viewing list while keeping an active form open in background */}
          {isFormOpen && activeTab === "list" && (
            <div className="bg-gradient-to-r from-indigo-50 via-white to-indigo-50/70 border border-indigo-200/90 rounded-2xl p-4 flex items-center justify-between shadow-2xs mb-6 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-600 shrink-0">
                  <FileEdit className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      Form Draft in Progress
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      Background Tab
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    You are browsing records while keeping{" "}
                    <strong className="text-indigo-900 font-semibold">&ldquo;{formTabInfo?.title || "New Entry"}&rdquo;</strong>{" "}
                    open in the form tab.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0 ml-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("form")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <span>Return to Form</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => closeFormTab(true)}
                  className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-600 hover:text-rose-600 text-xs font-medium rounded-xl border border-slate-200 transition-colors cursor-pointer"
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
          "flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 bg-[#F8FAFC]",
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
      <div className="flex h-screen w-full items-center justify-center bg-[#F8FAFC]">
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
      <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
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
      </div>
    </WorkspaceTabsProvider>
  );
}
