export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  id?: string;
  title?: string;
  duration?: number; // ms, default 4000
}

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration: number;
  createdAt: number;
}

export interface ConfirmModalOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "primary";
}

type ToastListener = (toasts: ToastItem[]) => void;
type ConfirmListener = (options: ConfirmModalOptions | null, resolve?: (val: boolean) => void) => void;

class ToastManager {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();
  private confirmListener: ConfirmListener | null = null;

  subscribe(listener: ToastListener) {
    this.listeners.add(listener);
    listener([...this.toasts]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setConfirmListener(listener: ConfirmListener | null) {
    this.confirmListener = listener;
  }

  private notify() {
    this.listeners.forEach((listener) => listener([...this.toasts]));
  }

  show(message: string, type: ToastType = "info", options: ToastOptions = {}) {
    const id = options.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const duration = options.duration ?? (type === "error" ? 5000 : 4000);

    const defaultTitle =
      options.title ||
      (type === "success"
        ? "Success"
        : type === "error"
        ? "Error"
        : type === "warning"
        ? "Attention"
        : "Notification");

    const newToast: ToastItem = {
      id,
      type,
      message,
      title: defaultTitle,
      duration,
      createdAt: Date.now(),
    };

    // Remove existing if duplicate ID
    this.toasts = this.toasts.filter((t) => t.id !== id);
    // Keep max 5 toasts visible at once
    this.toasts = [newToast, ...this.toasts].slice(0, 5);
    this.notify();

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  success(message: string, options?: ToastOptions) {
    return this.show(message, "success", options);
  }

  error(message: string, options?: ToastOptions) {
    return this.show(message, "error", options);
  }

  warning(message: string, options?: ToastOptions) {
    return this.show(message, "warning", options);
  }

  info(message: string, options?: ToastOptions) {
    return this.show(message, "info", options);
  }

  dismiss(id?: string) {
    if (!id) {
      this.toasts = [];
    } else {
      this.toasts = this.toasts.filter((t) => t.id !== id);
    }
    this.notify();
  }

  confirm(options: ConfirmModalOptions): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.confirmListener) {
        this.confirmListener(options, resolve);
      } else {
        // Fallback to true if modal listener is not mounted
        resolve(true);
      }
    });
  }
}

export const toast = new ToastManager();
export const confirmModal = (options: ConfirmModalOptions) => toast.confirm(options);
