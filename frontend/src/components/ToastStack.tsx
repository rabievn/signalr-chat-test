import type { AppNotification } from "../lib/types";

const MAX_VISIBLE = 3;

interface ToastStackProps {
  toasts: AppNotification[];
  onOpen: (toast: AppNotification) => void;
  onDismiss: (id: string) => void;
}

export default function ToastStack({ toasts, onOpen, onDismiss }: ToastStackProps) {
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.slice(-MAX_VISIBLE).map(t => (
        <div key={t.id} className="toast" onClick={() => onOpen(t)}>
          <div className="toast-head">
            <strong>{t.title}</strong>
            <button
              className="toast-close"
              aria-label="Dismiss"
              onClick={e => { e.stopPropagation(); onDismiss(t.id); }}
            >
              ×
            </button>
          </div>
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
