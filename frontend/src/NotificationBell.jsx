export default function NotificationBell({ unread, open, onToggle }) {
  return (
    <button
      className={`bell-btn ${open ? "open" : ""}`}
      onClick={onToggle}
      title="Notifications"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {unread > 0 && <span className="bell-badge">{unread > 9 ? "9+" : unread}</span>}
    </button>
  );
}
