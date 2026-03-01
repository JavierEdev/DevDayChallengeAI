export type ToastNotificationType = "success" | "error";

export interface ToastNotification {
  id: string;
  type: ToastNotificationType;
  message: string;
  durationMs: number;
}

type ToastListener = (notifications: ToastNotification[]) => void;

const listeners = new Set<ToastListener>();
let notifications: ToastNotification[] = [];
let nextToastId = 0;

function emitNotifications() {
  for (const listener of listeners) {
    listener(notifications);
  }
}

function addNotification(
  type: ToastNotificationType,
  message: string,
  durationMs: number = 3500
): string {
  const id = `toast-${++nextToastId}`;
  notifications = [...notifications, { id, type, message, durationMs }];
  emitNotifications();
  return id;
}

export function showSuccessToast(message: string, durationMs?: number): string {
  return addNotification("success", message, durationMs);
}

export function showErrorToast(message: string, durationMs?: number): string {
  return addNotification("error", message, durationMs);
}

export function removeToastNotification(id: string) {
  const next = notifications.filter((notification) => notification.id !== id);
  if (next.length === notifications.length) {
    return;
  }

  notifications = next;
  emitNotifications();
}

export function subscribeToastNotifications(listener: ToastListener): () => void {
  listeners.add(listener);
  listener(notifications);

  return () => {
    listeners.delete(listener);
  };
}
