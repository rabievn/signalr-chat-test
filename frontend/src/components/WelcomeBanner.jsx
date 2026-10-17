export default function WelcomeBanner({ name, count, onOpen, onDismiss }) {
  return (
    <div className="welcome-banner">
      <span>
        Welcome back, {name}! You have {count} new {count === 1 ? "notification" : "notifications"}.
      </span>
      <button onClick={onOpen}>Open</button>
      <button className="banner-close" onClick={onDismiss} aria-label="Dismiss">×</button>
    </div>
  );
}
