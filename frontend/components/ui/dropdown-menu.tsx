"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  className?: string;
}

export function DropdownMenu({ trigger, items, align = "right", className }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuEstimatedHeight = 160;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // If space below is cramped and there is more room above, flip upward
    const openUpward = spaceBelow < menuEstimatedHeight && spaceAbove > spaceBelow;

    const style: React.CSSProperties = {
      position: "fixed",
      zIndex: 9999,
    };

    if (openUpward) {
      style.bottom = `${Math.max(8, window.innerHeight - rect.top + 4)}px`;
    } else {
      style.top = `${Math.max(8, rect.bottom + 4)}px`;
    }

    if (align === "right") {
      const rightCoord = window.innerWidth - rect.right;
      style.right = `${Math.max(8, rightCoord)}px`;
    } else {
      style.left = `${Math.max(8, rect.left)}px`;
    }

    setMenuStyle(style);
  }, [align]);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    function handleScroll(event: Event) {
      if (popoverRef.current && popoverRef.current.contains(event.target as Node)) {
        return;
      }
      setIsOpen(false);
    }

    function handleResize() {
      setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        (triggerRef.current && triggerRef.current.contains(target)) ||
        (popoverRef.current && popoverRef.current.contains(target))
      ) {
        return;
      }
      setIsOpen(false);
    }

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, updatePosition]);

  return (
    <>
      <div
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="inline-block"
      >
        {trigger}
      </div>

      {isOpen &&
        mounted &&
        createPortal(
          <div
            ref={popoverRef}
            style={menuStyle}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "min-w-[160px] rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95",
              className
            )}
          >
            {items.map((item, index) => (
              <button
                key={index}
                type="button"
                disabled={item.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!item.disabled) {
                    item.onClick();
                    setIsOpen(false);
                  }
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer",
                  item.variant === "danger" && "text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                )}
              >
                {item.icon && <span className="w-3.5 h-3.5 shrink-0">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
