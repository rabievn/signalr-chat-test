function timeAgo(iso) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationPanel({
  items, unread, error, permission,
  onOpen, onMarkAllRead, onClear, onRequestPermission, onClose,
}) {
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
              <span className="user-avatar sm" style={{ background: n.fromUserColor ?? "#5d7185" }}>
                {(n.fromUserName ?? "?")[0]}
              </span>
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
