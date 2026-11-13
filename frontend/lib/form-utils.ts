"use client";

/**
 * Enterprise Form Scrolling & Error Highlighting Utility:
 * - Smoothly scrolls to the first missed or invalid form field across any scroll container
 *   (supports #workspace-form-canvas, modal dialogs, drawer panels, and global window).
 * - Focuses the interactive input/combobox without interrupting the smooth scroll animation.
 * - Applies a high-visibility animated pulse ring to immediately draw the user's eye to the missed column.
 */
export function scrollToMissedField(
  fieldNameOrId: string,
  options?: { fieldId?: string; label?: string }
) {
  if (typeof document === "undefined") return;

  const name = fieldNameOrId;
  const id = options?.fieldId || `form-field-${name}`;

  // 1. Locate the target element and its field group wrapper
  const groupEl =
    document.getElementById(`form-group-${name}`) ||
    document.querySelector(`[data-field-name="${name}"]`) as HTMLElement | null;

  const inputEl =
    document.getElementById(id) ||
    document.getElementById(`form-field-${name}`) ||
    (document.querySelector(`[name="${name}"]:not([type="hidden"])`) as HTMLElement | null);

  const fallbackNamedEl = document.querySelector(`[name="${name}"]`) as HTMLElement | null;
  const target: HTMLElement | null = groupEl || inputEl || fallbackNamedEl?.parentElement || fallbackNamedEl;

  if (!target) return;

  // 2. Locate the active scroll container (#workspace-form-canvas, modal dialog, or window)
  const findScrollContainer = (el: HTMLElement): HTMLElement | Window => {
    // If inside layout's workspace form canvas portal
    const canvas = document.getElementById("workspace-form-canvas");
    if (canvas && canvas.contains(el)) return canvas;

    // Check parent elements for overflow scroll
    let parent: HTMLElement | null = el.parentElement;
    while (parent && parent !== document.body && parent !== document.documentElement) {
      const style = window.getComputedStyle(parent);
      if (style.overflowY === "auto" || style.overflowY === "scroll") {
        return parent;
      }
      parent = parent.parentElement;
    }
    return window;
  };

  const container = findScrollContainer(target);

  // 3. Smoothly center the missed field in view
  try {
    if (container instanceof HTMLElement) {
      const targetRect = target.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const relativeTop = targetRect.top - containerRect.top + container.scrollTop;
      const targetScrollTop = Math.max(0, relativeTop - container.clientHeight / 2 + targetRect.height / 2);

      container.scrollTo({
        top: targetScrollTop,
        behavior: "smooth",
      });
    } else {
      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  } catch {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // 4. Focus interactive control with preventScroll to preserve smooth scroll centering
  const focusable =
    (inputEl && typeof inputEl.focus === "function" && inputEl.getAttribute("type") !== "hidden" ? inputEl : null) ||
    (groupEl?.querySelector("input:not([type='hidden']), select, textarea, button[role='combobox'], button") as HTMLElement | null) ||
    (target.querySelector("input:not([type='hidden']), select, textarea, button[role='combobox'], button") as HTMLElement | null);

  if (focusable && typeof focusable.focus === "function") {
    try {
      focusable.focus({ preventScroll: true });
    } catch {
      focusable.focus();
    }
  }

  // 5. Visual highlight animation: draw eye to the exact missed field with an animated glow ring
  const highlightEl = groupEl || target;
  if (highlightEl) {
    highlightEl.classList.remove("field-highlight-missed");
    // Trigger DOM reflow so re-applying class resets CSS animation
    void highlightEl.offsetWidth;
    highlightEl.classList.add("field-highlight-missed");

    setTimeout(() => {
      highlightEl.classList.remove("field-highlight-missed");
    }, 2800);
  }
}

/**
 * Fallback helper to find and scroll to the first invalid control in a form
 */
export function scrollToFirstInvalidControl(formElement?: HTMLFormElement | null) {
  if (typeof document === "undefined") return;
  const form = formElement || (document.querySelector("form") as HTMLFormElement | null);
  if (!form) return;

  const firstInvalid = form.querySelector(":invalid, [aria-invalid='true'], [data-error='true']") as HTMLElement | null;
  if (firstInvalid) {
    const name = firstInvalid.getAttribute("name") || firstInvalid.id;
    if (name) {
      scrollToMissedField(name, { fieldId: firstInvalid.id });
    } else {
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      try {
        firstInvalid.focus({ preventScroll: true });
      } catch {
        firstInvalid.focus();
      }
    }
  }
}

