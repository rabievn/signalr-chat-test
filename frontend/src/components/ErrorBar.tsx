interface ErrorBarProps {
  message: string | null;
  onDismiss: () => void;
}

export default function ErrorBar({ message, onDismiss }: ErrorBarProps) {
  if (!message) return null;
  return (
    <div className="error-bar">
      {message}
      <button onClick={onDismiss} aria-label="Dismiss">×</button>
    </div>
  );
}
