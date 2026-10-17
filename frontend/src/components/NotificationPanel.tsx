import { timeAgo } from "../lib/format";
import type { PermissionState } from "../hooks/useNotifications";
import type { AppNotification } from "../lib/types";
import Avatar from "./Avatar";

interface NotificationPanelProps {
  items: AppNotification[];
  unread: number;
  error: string | null;
  permission: PermissionState;
  onOpen: (notification: AppNotification) => void;
  onMarkAllRead: () => void;
  onClear: () => void;
  onRequestPermission: () => void;
  onClose: () => void;
}

export default function NotificationPanel({
  items, unread, error, permission,
  onOpen, onMarkAllRead, onClear, onRequestPermission, onClose,
}: NotificationPanelProps) {
  return (
    <div className="notif-panel" role="dialog" aria-label="Notifications">
      <div className="notif-head">
        <strong>Notifications</strong>
        <button className="notif-close" onClick={onClose} aria-label="Close">×</button>
      </div>

      <div className="notif-actions">
        <button onClick={onMarkAllRead} disabled={unread === 0}>Mark all as read</button>
        <button onClick={onClear} disabled={items.length === 0}>Clear</button>
      </div>

      {permission === "default" && (
        <button className="notif-permission" onClick={onRequestPermission}>
          Enable browser notifications
        </button>
      )}

      {error && <div className="notif-error">{error}</div>}

      {items.length === 0 ? (
        <div className="notif-empty">No notifications yet</div>
      ) : (
        <ul className="notif-list">
          {items.map(n => (
            <li
              key={n.id}
              className={`notif-item ${n.isRead ? "" : "unread"}`}
              onClick={() => onOpen(n)}
            >
              <Avatar name={n.fromUserName} color={n.fromUserColor} small />
              <div className="notif-body">
                <div className="notif-title">{n.title}</div>
                <div className="notif-text">{n.text}</div>
                <div className="notif-time">{timeAgo(n.createdAt)}</div>
              </div>
              {!n.isRead && <span className="notif-dot" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
