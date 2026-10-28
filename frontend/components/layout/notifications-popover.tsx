"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
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
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timeAgo: string;
  type: "dispatch" | "alert" | "payment" | "success";
  unread: boolean;
  href: string;
}

export function NotificationsPopover() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiClient<NotificationItem[]>("/api/v1/home/notifications");
      if (Array.isArray(data)) {
        let readIds: string[] = [];
        if (typeof window !== "undefined") {
          try {
            const stored = localStorage.getItem("panther_read_notifications");
            if (stored) readIds = JSON.parse(stored);
          } catch {
            // ignore
          }
        }
        const synced = data.map((n) => ({
          ...n,
          unread: !readIds.includes(n.id) && (n.unread ?? true),
        }));
        setNotifications(synced);
      } else {
        setNotifications([]);
      }
    } catch {
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    const handleOfficeChange = () => {
      loadNotifications();
    };
    window.addEventListener("panther_office_changed", handleOfficeChange);
    return () => window.removeEventListener("panther_office_changed", handleOfficeChange);
  }, [loadNotifications]);

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
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, unread: false }));
      if (typeof window !== "undefined") {
        try {
          const allIds = updated.map((n) => n.id);
          localStorage.setItem("panther_read_notifications", JSON.stringify(allIds));
        } catch {
          // ignore
        }
      }
      return updated;
    });
  };

  const handleNotificationClick = (item: NotificationItem) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n));
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("panther_read_notifications");
          const readIds: string[] = stored ? JSON.parse(stored) : [];
          if (!readIds.includes(item.id)) {
            readIds.push(item.id);
            localStorage.setItem("panther_read_notifications", JSON.stringify(readIds));
          }
        } catch {
          // ignore
        }
      }
      return updated;
    });
    setIsOpen(false);
    router.push(item.href);
  };

  const getIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "dispatch":
        return <Truck className="w-3.5 h-3.5 text-[#4F46E5] dark:text-[#7C6FF7]" />;
      case "alert":
        return <AlertTriangle className="w-3.5 h-3.5 text-[#D97706] dark:text-[#F5BB45]" />;
      case "payment":
        return <Receipt className="w-3.5 h-3.5 text-[#027A48] dark:text-[#34D5A0]" />;
      case "success":
        return <CheckCircle2 className="w-3.5 h-3.5 text-[#027A48] dark:text-[#34D5A0]" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-[#667085] dark:text-[#898991]" />;
    }
  };

  return (
    <div className="relative flex items-center" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative w-9 h-9 flex items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer select-none group focus:outline-none active:scale-95",
          "bg-slate-50 hover:bg-white border-slate-200/90 hover:border-slate-300 text-slate-600 hover:text-indigo-600 shadow-2xs",
          "dark:bg-[#17171B] dark:hover:bg-[#26262D] dark:border-[#303036] dark:hover:border-[#42424A] dark:text-[#CACAD0] dark:hover:text-[#F5F5F7]",
          isOpen && "bg-white border-slate-300 text-indigo-600 dark:bg-[#26262D] dark:border-[#42424A] dark:text-[#F5F5F7]"
        )}
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="min-w-[16px] h-4 px-1 rounded-full bg-[#4F46E5] dark:bg-[#7C6FF7] text-white text-[10px] font-bold font-mono flex items-center justify-center absolute -top-1 -right-1 shadow-xs ring-2 ring-white dark:ring-[#111114]">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#17171B] shadow-floating z-50 animate-in fade-in-0 zoom-in-95 duration-150 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-[#303036] bg-white dark:bg-[#17171B] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-[#F5F5F7]">Notifications</span>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-[#C5A5FF] text-xs font-semibold font-mono border border-indigo-200/50 dark:border-indigo-500/30">
                  {unreadCount} new
                </span>
              ) : (
                <span className="text-xs text-slate-500 dark:text-[#898991]">All caught up</span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] text-indigo-600 dark:text-[#C5A5FF] hover:underline font-medium flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-[#26262D]">
            {isLoading && notifications.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-5 h-5 text-indigo-600 dark:text-[#7C6FF7] animate-spin mb-2" />
                <span className="text-xs text-slate-500 dark:text-[#898991]">Checking notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-[#34D5A0] mb-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-[#34D5A0]" />
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-[#F5F5F7]">All caught up!</div>
                <div className="text-[11px] text-slate-400 dark:text-[#898991] mt-1 max-w-[220px]">
                  No operational alerts or pending notifications at this time.
                </div>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={cn(
                    "p-3.5 hover:bg-slate-50 dark:hover:bg-[#202026] transition-colors cursor-pointer flex items-start gap-3 group",
                    item.unread ? "bg-slate-50/50 dark:bg-[#1A1A20]" : "bg-white dark:bg-[#17171B]"
                  )}
                >
                  <div
                    className={cn(
                      "p-2 rounded-xl border shrink-0 mt-0.5",
                      item.unread
                        ? "bg-white dark:bg-[#202026] border-indigo-200 dark:border-indigo-500/40 shadow-xs"
                        : "bg-slate-50 dark:bg-[#131317] border-slate-200 dark:border-[#303036]"
                    )}
                  >
                    {getIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-slate-900 dark:text-[#F5F5F7] truncate">
                        {item.title}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-[#898991] shrink-0 font-mono">
                        {item.timeAgo}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-[#CACAD0] mt-0.5 leading-normal">
                      {item.message}
                    </p>
                  </div>

                  {item.unread && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-[#7C6FF7] shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-200 dark:border-[#303036] bg-slate-50 dark:bg-[#131317] flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push("/settings/activity");
              }}
              className="text-xs text-indigo-600 dark:text-[#C5A5FF] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              View System Audit Trail <ArrowRight className="w-3 h-3" />
            </button>
            <span className="text-xs text-slate-400 dark:text-[#898991]">Live Telemetry</span>
          </div>
        </div>
      )}
    </div>
  );
}

