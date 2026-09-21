"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Truck,
  Receipt,
  Check,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timeAgo: string;
  type: "dispatch" | "alert" | "payment" | "success";
  unread: boolean;
  href: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n-1",
    title: "Vehicle Movement Alert",
    message: "Truck HR-55-AJ-9021 passed Toll Plaza: Kherki Daula (Delhi Hub Corridor).",
    timeAgo: "8 mins ago",
    type: "dispatch",
    unread: true,
    href: "/transport/tracking",
  },
  {
    id: "n-2",
    title: "E-Way Bill Expiring Soon",
    message: "EWB #121008472912 for LR-2026-00102 expires in 3 hours. Update Part-B if en route.",
    timeAgo: "25 mins ago",
    type: "alert",
    unread: true,
    href: "/transport/eway-bill",
  },
  {
    id: "n-3",
    title: "Freight Payment Disbursed",
    message: "ATH Payment Voucher PV-2026-0042 posted (₹15,000 advance to Malwa Roadlines).",
    timeAgo: "1 hour ago",
    type: "payment",
    unread: true,
    href: "/accounts/payment-voucher",
  },
  {
    id: "n-4",
    title: "POD Verified & Closed",
    message: "Delivery POD collected and verified for Consignment LR-2026-00101 (Maruti Suzuki).",
    timeAgo: "3 hours ago",
    type: "success",
    unread: false,
    href: "/transport/pod-records",
  },
  {
    id: "n-5",
    title: "Statutory Tax Summary Ready",
    message: "Monthly GST Output Ledger reconciled with 12 B2B freight invoices.",
    timeAgo: "1 day ago",
    type: "payment",
    unread: false,
    href: "/statements/gst-output",
  },
];

export function NotificationsPopover() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const popoverRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const handleNotificationClick = (item: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n))
    );
    setIsOpen(false);
    router.push(item.href);
  };

  const getIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "dispatch":
        return <Truck className="w-3.5 h-3.5 text-[#4F46E5]" />;
      case "alert":
        return <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />;
      case "payment":
        return <Receipt className="w-3.5 h-3.5 text-[#027A48]" />;
      case "success":
        return <CheckCircle2 className="w-3.5 h-3.5 text-[#027A48]" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-[#667085]" />;
    }
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-2 text-[#667085] hover:text-[#101828] hover:bg-[#F8F9FB] rounded-control transition-colors relative cursor-pointer",
          isOpen && "bg-[#F8F9FB] text-[#101828]"
        )}
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="min-w-[16px] h-4 px-1 rounded-full bg-[#4F46E5] text-white text-[10px] font-bold font-mono flex items-center justify-center absolute -top-1 -right-1 shadow-xs ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-card border border-[#E4E7EC] bg-white shadow-floating z-50 animate-in fade-in-0 zoom-in-95 duration-150 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#E4E7EC] bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#101828]">Notifications</span>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold font-mono">
                  {unreadCount} new
                </span>
              ) : (
                <span className="text-xs text-slate-500">All caught up</span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] text-[#4F46E5] hover:text-[#4338CA] hover:underline font-medium flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-[#F2F4F7]">
            {notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={cn(
                  "p-3.5 hover:bg-[#F8F9FB] transition-colors cursor-pointer flex items-start gap-3 group",
                  item.unread && "bg-[#F8F9FC]"
                )}
              >
                <div
                  className={cn(
                    "p-2 rounded-control border shrink-0 mt-0.5",
                    item.unread ? "bg-white border-[#C7D2FE] shadow-xs" : "bg-[#F8F9FB] border-[#E4E7EC]"
                  )}
                >
                  {getIcon(item.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-[#101828] truncate">
                      {item.title}
                    </span>
                    <span className="text-xs text-slate-400 shrink-0 font-mono">
                      {item.timeAgo}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 leading-normal">
                    {item.message}
                  </p>
                </div>

                {item.unread && (
                  <span className="w-2 h-2 rounded-full bg-[#4F46E5] shrink-0 mt-1.5" />
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-[#E4E7EC] bg-[#FCFCFD] flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push("/settings/activity");
              }}
              className="text-xs text-[#4F46E5] hover:text-[#4338CA] font-medium inline-flex items-center gap-1"
            >
              View System Audit Trail <ArrowRight className="w-3 h-3" />
            </button>
            <span className="text-xs text-slate-400">Operational Alerts</span>
          </div>
        </div>
      )}
    </div>
  );
}
