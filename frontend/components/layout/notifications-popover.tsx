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
                className="text-[11px] text-[#4F46E5] hover:text-[#4338CA] hover:underline font-medium flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-[#F2F4F7]">
            {isLoading && notifications.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin mb-2" />
                <span className="text-xs text-slate-500">Checking notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-xs font-bold text-slate-800">All caught up!</div>
                <div className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
                  No operational alerts or pending notifications at this time.
                </div>
              </div>
            ) : (
              notifications.map((item) => (
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
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-[#E4E7EC] bg-[#FCFCFD] flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push("/settings/activity");
              }}
              className="text-xs text-[#4F46E5] hover:text-[#4338CA] font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              View System Audit Trail <ArrowRight className="w-3 h-3" />
            </button>
            <span className="text-xs text-slate-400">Live Telemetry</span>
          </div>
        </div>
      )}
    </div>
  );
}

