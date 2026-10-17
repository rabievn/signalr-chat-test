export default function ErrorBar({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="error-bar">
      {message}
      <button onClick={onDismiss} aria-label="Dismiss">×</button>
    </div>
  );
}
