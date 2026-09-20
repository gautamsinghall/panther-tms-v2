import React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#FCFCFD]">
      {/* Sidebar Navigation per docs/design.md §4 */}
      <Sidebar />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header (thin 56px per docs/design.md §4) */}
        <Header />

        {/* Scrollable Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-6 bg-[#FCFCFD]">
          <div className="max-w-[1440px] mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
