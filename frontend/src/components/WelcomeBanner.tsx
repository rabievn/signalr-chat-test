interface WelcomeBannerProps {
  name: string;
  count: number;
  onOpen: () => void;
  onDismiss: () => void;
}

export default function WelcomeBanner({ name, count, onOpen, onDismiss }: WelcomeBannerProps) {
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
