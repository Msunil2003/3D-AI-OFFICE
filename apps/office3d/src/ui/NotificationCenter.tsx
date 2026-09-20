import React, { useEffect } from "react";
import { AlertTriangle, CheckCircle, Info, X, ArrowRight } from "lucide-react";
import { useOfficeStore, OfficeNotification } from "../state/officeStore";

export const NotificationCenter: React.FC = () => {
  const notifications = useOfficeStore((state) => state.notifications);
  const dismissNotification = useOfficeStore((state) => state.dismissNotification);
  const teleportCeo = useOfficeStore((state) => state.teleportCeo);

  // Auto-dismiss toasts after 7 seconds
  useEffect(() => {
    if (notifications.length === 0) return;
    const oldest = notifications[0];
    const timer = setTimeout(() => {
      dismissNotification(oldest.id);
    }, 7000);
    return () => clearTimeout(timer);
  }, [notifications, dismissNotification]);

  if (notifications.length === 0) return null;

  const handleAction = (n: OfficeNotification) => {
    if (n.targetPosition && n.targetFloor !== undefined) {
      teleportCeo(n.targetPosition, n.targetFloor);
    }
    if (n.onAction) n.onAction();
    dismissNotification(n.id);
  };

  return (
    <div className="toast-container" data-testid="notification-center">
      {notifications.map((n) => (
        <div key={n.id} className="toast">
          <div className="toast-icon">
            {n.type === "alert" || n.type === "warning" ? (
              <AlertTriangle size={15} color={n.type === "alert" ? "var(--accent-danger)" : "var(--accent-warning)"} />
            ) : n.type === "success" ? (
              <CheckCircle size={15} color="var(--accent-success)" />
            ) : (
              <Info size={15} color="var(--accent-info)" />
            )}
          </div>
          <div className="toast-content">
            <div className="toast-title">{n.title}</div>
            <div className="toast-message">{n.message}</div>
            {n.actionLabel && (
              <button className="toast-action" onClick={() => handleAction(n)}>
                <span>{n.actionLabel}</span>
              </button>
            )}
          </div>
          <button
            className="toast-dismiss"
            onClick={() => dismissNotification(n.id)}
            title="Dismiss"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
};
