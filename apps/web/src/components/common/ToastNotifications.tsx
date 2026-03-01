import { Check, X, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { ToastNotification } from "@/services/toast-notifications.service";
import {
  removeToastNotification,
  subscribeToastNotifications
} from "@/services/toast-notifications.service";

export function ToastNotifications() {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    return subscribeToastNotifications(setNotifications);
  }, []);

  useEffect(() => {
    for (const notification of notifications) {
      if (timersRef.current.has(notification.id)) {
        continue;
      }

      const timeout = setTimeout(() => {
        removeToastNotification(notification.id);
      }, notification.durationMs);
      timersRef.current.set(notification.id, timeout);
    }

    for (const [id, timeout] of timersRef.current.entries()) {
      if (notifications.some((notification) => notification.id === id)) {
        continue;
      }

      clearTimeout(timeout);
      timersRef.current.delete(id);
    }
  }, [notifications]);

  useEffect(() => {
    return () => {
      for (const timeout of timersRef.current.values()) {
        clearTimeout(timeout);
      }
      timersRef.current.clear();
    };
  }, []);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <section className="toast-stack" aria-live="polite" aria-atomic="false">
      {notifications.map((notification) => (
        <article
          key={notification.id}
          className={`toast-item ${notification.type === "success" ? "is-success" : "is-error"}`}
          role="status"
        >
          <span className="toast-item__icon" aria-hidden="true">
            {notification.type === "success" ? <Check size={16} /> : <XCircle size={16} />}
          </span>
          <p className="toast-item__message">{notification.message}</p>
          <button
            type="button"
            className="toast-item__close"
            aria-label="Cerrar notificacion"
            onClick={() => removeToastNotification(notification.id)}
          >
            <X size={14} />
          </button>
        </article>
      ))}
    </section>
  );
}
