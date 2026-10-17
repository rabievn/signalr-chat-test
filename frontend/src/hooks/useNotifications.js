import { useState, useEffect, useRef, useCallback } from "react";
import { HubEvents, errorMessage } from "../lib/chatApi";

const MAX_ITEMS = 100;
const TOAST_MS = 5000;
const EMPTY = { items: [], unread: 0, unreadByChat: {} };

const canNotify = () => typeof window !== "undefined" && "Notification" in window;
const isAway = () => document.visibilityState !== "visible" || !document.hasFocus();

// Adds a live notification to the snapshot; read ones only join the list, unread ones also bump the counters.
function withReceived(state, n) {
  if (state.items.some(x => x.id === n.id)) return state;
  const items = [n, ...state.items].slice(0, MAX_ITEMS);
  if (n.isRead) return { ...state, items };
  const unreadByChat = { ...state.unreadByChat };
  if (n.chatId) unreadByChat[n.chatId] = (unreadByChat[n.chatId] ?? 0) + 1;
  return { items, unread: state.unread + 1, unreadByChat };
}

function showBrowserNotification(n, onClick) {
  if (!canNotify() || Notification.permission !== "granted") return;
  const note = new Notification(n.title, { body: n.text, tag: n.id });
  note.onclick = () => {
    window.focus();
    onClick();
    note.close();
  };
}

/**
 * Keeps the signed-in user's notifications in sync with the server:
 * loads them on (re)connect, applies live pushes, shows toasts and browser notifications.
 */
export default function useNotifications({ api, connected, onOpenChat }) {
  const [state, setState] = useState(EMPTY);
  const [toasts, setToasts] = useState([]);
  const [welcome, setWelcome] = useState(null); // number of unread notifications at sign-in
  const [error, setError] = useState(null);
  const [permission, setPermission] = useState(() => (canNotify() ? Notification.permission : "unsupported"));
  const welcomedRef = useRef(false);
  const openChatRef = useRef(onOpenChat);

  useEffect(() => { openChatRef.current = onOpenChat; }, [onOpenChat]);

  const dismissToast = useCallback(id => setToasts(prev => prev.filter(t => t.id !== id)), []);

  // Live updates pushed by the server.
  useEffect(() => {
    if (!api) return;

    const offReceived = api.on(HubEvents.NotificationReceived, n => {
      setState(prev => withReceived(prev, n));

      // Already read means the user was looking at that chat: no toast needed.
      if (n.isRead) return;

      setToasts(prev => prev.some(t => t.id === n.id) ? prev : [...prev, n]);
      setTimeout(() => dismissToast(n.id), TOAST_MS);

      if (isAway()) showBrowserNotification(n, () => n.chatId && openChatRef.current?.(n.chatId));
    });

    // Sent after any read/clear, so every open tab of this user stays in sync.
    const offChanged = api.on(HubEvents.NotificationsChanged, snapshot => setState(snapshot));

    return () => { offReceived(); offChanged(); };
  }, [api, dismissToast]);

  // Load on connect and again after every reconnect, so nothing missed during an outage is lost.
  useEffect(() => {
    if (!api || !connected) return;
    let cancelled = false;
    api.getNotifications()
      .then(snapshot => {
        if (cancelled) return;
        setState(snapshot);
        setError(null);
        if (!welcomedRef.current) {
          welcomedRef.current = true;
          if (snapshot.unread > 0) setWelcome(snapshot.unread);
        }
      })
      .catch(err => !cancelled && setError(errorMessage(err)));
    return () => { cancelled = true; };
  }, [api, connected]);

  // "(3) Team Chat" in the browser tab while there are unread notifications.
  useEffect(() => {
    document.title = state.unread > 0 ? `(${state.unread}) Team Chat` : "Team Chat";
  }, [state.unread]);

  // Server pushes NotificationsChanged after each of these, so there's no local state to update.
  const run = async action => {
    if (!api) return;
    try {
      await action(api);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const requestPermission = async () => {
    if (canNotify()) setPermission(await Notification.requestPermission());
  };

  return {
    ...state,
    toasts,
    dismissToast,
    welcome,
    dismissWelcome: () => setWelcome(null),
    error,
    permission,
    requestPermission,
    markRead: id => run(a => a.markNotificationRead(id)),
    markAllRead: () => run(a => a.markAllNotificationsRead()),
    clear: () => run(a => a.clearNotifications()),
  };
}
