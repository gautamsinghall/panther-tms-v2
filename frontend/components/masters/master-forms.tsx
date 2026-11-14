"use client";

import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useWorkspaceTabs, MasterTabItem } from "@/lib/workspace-tabs-context";
import CompanyVehiclesPage, { CompanyVehicleRecord } from "@/app/(dashboard)/transport/company-vehicles/page";
import MarketVehiclesPage, { MarketVehicleRecord } from "@/app/(dashboard)/transport/market-vehicles/page";
import VehicleOwnersPage from "@/app/(dashboard)/transport/vehicle-owners/page";
import LoadTypePage from "@/app/(dashboard)/general/load-type/page";
import PackingMethodPage from "@/app/(dashboard)/general/packing-method/page";
import BillingClientPage from "@/app/(dashboard)/general/billing-client/page";
import VendorMasterPage from "@/app/(dashboard)/general/vendor/page";
import ConsignerPage from "@/app/(dashboard)/general/consigner/page";
import ConsigneePage from "@/app/(dashboard)/general/consignee/page";
import LocationPage from "@/app/(dashboard)/general/location/page";
import DriversPage from "@/app/(dashboard)/transport/drivers/page";

interface MasterFormViewProps {
  tab: MasterTabItem;
  onClose: () => void;
  onSuccess: (created: any) => void;
  onDirtyChange: (isDirty: boolean) => void;
}

function MasterFormView({ tab, onClose, onSuccess }: MasterFormViewProps) {
  useEffect(() => {
    const scrollToTop = () => {
      const el = document.getElementById(`workspace-master-canvas-${tab.id}`);
      if (el) el.scrollTop = 0;
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    scrollToTop();
    const rafId = requestAnimationFrame(scrollToTop);
    const t = setTimeout(scrollToTop, 30);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t);
    };
  }, [tab.id]);

  if (tab.type === "company_vehicle") {
    return (
      <CompanyVehiclesPage
        embedded
        onCreated={(vehicle: CompanyVehicleRecord) =>
          onSuccess({
            ...vehicle,
            id: vehicle.id,
            label: vehicle.vehicle_number,
            vehicle_number: vehicle.vehicle_number,
            vehicle_type: vehicle.vehicle_type,
            capacity_mt: vehicle.capacity_mt,
          })
        }
        onCancel={onClose}
      />
    );
  }

  if (tab.type === "market_vehicle") {
    return (
      <MarketVehiclesPage
        embedded
        onCreated={(vehicle: MarketVehicleRecord) =>
          onSuccess({
            ...vehicle,
            id: vehicle.id,
            label: vehicle.vehicle_number,
            vehicle_number: vehicle.vehicle_number,
            vehicle_type: vehicle.vehicle_type,
            capacity_mt: vehicle.capacity_mt,
          })
        }
        onCancel={onClose}
      />
    );
  }

  if (tab.type === "vehicle_owner") {
    return (
      <VehicleOwnersPage
        embedded
        onCreated={(rec: any) =>
          onSuccess({
            ...rec,
            id: rec.id,
            label: rec.name || rec.owner_name,
            name: rec.name || rec.owner_name,
            owner_name: rec.name || rec.owner_name,
          })
        }
        onCancel={onClose}
      />
    );
  }

  if (tab.type === "load_type") {
    return (
      <LoadTypePage
        embedded
        onCreated={(rec: any) =>
          onSuccess({
            ...rec,
            id: rec.id,
            label: rec.name,
            name: rec.name,
          })
        }
        onCancel={onClose}
      />
    );
  }

  if (tab.type === "packing_method") {
    return (
      <PackingMethodPage
        embedded
        onCreated={(rec: any) =>
          onSuccess({
            ...rec,
            id: rec.id,
            label: rec.name,
            name: rec.name,
          })
        }
        onCancel={onClose}
      />
    );
  }

  if (tab.type === "billing_client") {
    return (
      <BillingClientPage
        embedded
        onCreated={(rec: any) =>
          onSuccess({
            ...rec,
            id: rec.id,
            label: rec.name,
            name: rec.name,
          })
        }
        onCancel={onClose}
      />
    );
  }

  if (tab.type === "vendor") {
    return (
      <VendorMasterPage
        embedded
        onCreated={(rec: any) =>
          onSuccess({
            ...rec,
            id: rec.id,
            label: rec.name,
            name: rec.name,
            gstin: rec.gstin,
            state: rec.state || rec.billing_state,
          })
        }
        onCancel={onClose}
      />
    );
  }

  if (tab.type === "consigner") {
    return (
      <ConsignerPage
        embedded
        onCreated={(rec: any) =>
          onSuccess({
            ...rec,
            id: rec.id,
            label: rec.name,
            name: rec.name,
          })
        }
        onCancel={onClose}
      />
    );
  }

  if (tab.type === "consignee") {
    return (
      <ConsigneePage
        embedded
        onCreated={(rec: any) =>
          onSuccess({
            ...rec,
            id: rec.id,
            label: rec.name,
            name: rec.name,
          })
        }
        onCancel={onClose}
      />
    );
  }

  if (tab.type === "location") {
    return (
      <LocationPage
        embedded
        onCreated={(rec: any) =>
          onSuccess({
            ...rec,
            id: rec.id,
            label: rec.city_name ? `${rec.city_name}, ${rec.state || ""}` : (rec.name || String(rec.id)),
            city_name: rec.city_name,
            name: rec.name || rec.city_name,
          })
        }
        onCancel={onClose}
      />
    );
  }

  if (tab.type === "driver") {
    return (
      <DriversPage
        embedded
        onCreated={(rec: any) =>
          onSuccess({
            ...rec,
            id: rec.id,
            label: rec.name,
            name: rec.name,
            phone: rec.phone,
          })
        }
        onCancel={onClose}
      />
    );
  }

  return (
    <div className="w-full max-w-md mx-auto my-12 p-6 bg-white dark:bg-[#12131A] rounded-2xl border border-slate-200 dark:border-[#22232E] text-center space-y-4">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        Master form not found for: <span className="font-mono text-indigo-600">{tab.type}</span>
      </p>
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
      >
        Close Tab
      </button>
    </div>
  );
}

export function MasterTabsContainer() {
  const { masterTabs, activeTab, closeMasterTab, updateMasterTabDirty } = useWorkspaceTabs();

  if (!masterTabs || masterTabs.length === 0) {
    return null;
  }

  return (
    <>
      {masterTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <div
            key={tab.id}
            id={`workspace-master-canvas-${tab.id}`}
            className={cn(
              "flex-1 overflow-y-auto [scrollbar-gutter:stable] p-3 pb-28 sm:p-6 sm:pb-32 lg:p-7 lg:pb-36 bg-[#F3F5FC] dark:bg-[#0B0B0D] relative",
              isActive ? "block" : "hidden"
            )}
          >
            <MasterFormView
              tab={tab}
              onClose={() => closeMasterTab(tab.id)}
              onSuccess={(created) => {
                tab.onSuccess?.(created);
                closeMasterTab(tab.id, true);
              }}
              onDirtyChange={(isDirty) => updateMasterTabDirty(tab.id, isDirty)}
            />
          </div>
        );
      })}
    </>
  );
}
