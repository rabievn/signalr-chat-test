import { useState, useEffect, useRef, useCallback } from "react";
import { hubErrorMessage } from "./chatIds";

const MAX_ITEMS = 100;
const TOAST_MS = 5000;
const EMPTY = { items: [], unread: 0, unreadByChat: {} };

const canNotify = () => typeof window !== "undefined" && "Notification" in window;

/**
 * Keeps the signed-in user's notifications in sync with the server:
 * loads them on (re)connect, applies live pushes, shows toasts and browser notifications.
 */
export default function useNotifications({ connection, status, onOpenChat }) {
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
    if (!connection) return;

    const onReceived = n => {
      setState(prev => {
        if (prev.items.some(x => x.id === n.id)) return prev;
        const items = [n, ...prev.items].slice(0, MAX_ITEMS);
        if (n.isRead) return { ...prev, items };
        const unreadByChat = { ...prev.unreadByChat };
        if (n.chatId) unreadByChat[n.chatId] = (unreadByChat[n.chatId] ?? 0) + 1;
        return { items, unread: prev.unread + 1, unreadByChat };
      });

      // Already read means the user was looking at that chat: no toast needed.
      if (n.isRead) return;

      setToasts(prev => prev.some(t => t.id === n.id) ? prev : [...prev, n]);
      setTimeout(() => dismissToast(n.id), TOAST_MS);

      const away = document.visibilityState !== "visible" || !document.hasFocus();
      if (away && canNotify() && Notification.permission === "granted") {
        const browserNote = new Notification(n.title, { body: n.text, tag: n.id });
        browserNote.onclick = () => {
          window.focus();
          if (n.chatId) openChatRef.current?.(n.chatId);
          browserNote.close();
        };
      }
    };

    // Sent after any read/clear, so every open tab of this user stays in sync.
    const onChanged = snapshot => setState(snapshot);

    connection.on("NotificationReceived", onReceived);
    connection.on("NotificationsChanged", onChanged);
    return () => {
      connection.off("NotificationReceived", onReceived);
      connection.off("NotificationsChanged", onChanged);
    };
  }, [connection, dismissToast]);

  // Load on connect and again after every reconnect, so nothing missed during an outage is lost.
  useEffect(() => {
    if (!connection || status !== "Connected") return;
    let cancelled = false;
    connection.invoke("GetNotifications")
      .then(snapshot => {
        if (cancelled) return;
        setState(snapshot);
        setError(null);
        if (!welcomedRef.current) {
          welcomedRef.current = true;
          if (snapshot.unread > 0) setWelcome(snapshot.unread);
        }
      })
      .catch(err => { if (!cancelled) setError(hubErrorMessage(err)); });
    return () => { cancelled = true; };
  }, [connection, status]);

  // "(3) Team Chat" in the browser tab while there are unread notifications.
  useEffect(() => {
    document.title = state.unread > 0 ? `(${state.unread}) Team Chat` : "Team Chat";
  }, [state.unread]);

  const call = useCallback(async (method, ...args) => {
    if (!connection) return;
    try {
      await connection.invoke(method, ...args);
      setError(null);
    } catch (err) {
      setError(hubErrorMessage(err));
    }
  }, [connection]);

  const requestPermission = useCallback(async () => {
    if (!canNotify()) return;
    setPermission(await Notification.requestPermission());
  }, []);

  return {
    ...state,
    toasts,
    dismissToast,
    welcome,
    dismissWelcome: () => setWelcome(null),
    error,
    permission,
    requestPermission,
    markRead: id => call("MarkNotificationRead", id),
    markAllRead: () => call("MarkAllNotificationsRead"),
    clear: () => call("ClearNotifications"),
  };
}
