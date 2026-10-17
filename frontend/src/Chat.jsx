import { useState, useEffect, useRef } from "react";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { TEAM_CHAT_ID, hubErrorMessage } from "./chatIds";
import useNotifications from "./useNotifications";
import ChatList from "./ChatList";
import NotificationBell from "./NotificationBell";
import NotificationPanel from "./NotificationPanel";
import ToastStack from "./ToastStack";
import "./Chat.css";

const HUB_URL = import.meta.env.VITE_HUB_URL ?? "http://localhost:5000/chatHub";
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";
const PAGE_SIZE = 50;

export default function Chat({ user, onLogout }) {
  const [connection, setConnection] = useState(null);
  const [status, setStatus] = useState("Disconnected");
  const [allUsers, setAllUsers] = useState([]);
  const [onlineIds, setOnlineIds] = useState([]);
  const [chats, setChats] = useState({});             // chatId -> { lastMessage, ... } from GetMyChats
  const [history, setHistory] = useState({});         // chatId -> { items, hasMore }
  const [active, setActive] = useState(TEAM_CHAT_ID);
  const [text, setText] = useState("");
  const [error, setError] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const bottomRef = useRef(null);

  const notifications = useNotifications({ connection, status, onOpenChat: setActive });

  useEffect(() => {
    fetch(`${API_URL}/api/users`)
      .then(r => r.json())
      .then(setAllUsers)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const conn = new HubConnectionBuilder()
      .withUrl(`${HUB_URL}?userId=${encodeURIComponent(user.id)}`)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    conn.on("ReceiveMessage", msg => {
      setHistory(prev => {
        const entry = prev[msg.chatId];
        if (!entry || entry.items.some(m => m.id === msg.id)) return prev;
        return { ...prev, [msg.chatId]: { ...entry, items: [...entry.items, msg] } };
      });
      setChats(prev => ({ ...prev, [msg.chatId]: { ...prev[msg.chatId], id: msg.chatId, lastMessage: msg } }));
    });

    conn.on("PresenceChanged", ids => setOnlineIds(ids));

    conn.onreconnecting(() => !cancelled && setStatus("Reconnecting"));
    conn.onreconnected(() => !cancelled && setStatus("Connected"));
    conn.onclose(() => !cancelled && setStatus("Disconnected"));

    conn.start()
      .then(() => !cancelled && setStatus("Connected"))
      .catch(() => !cancelled && setStatus("Disconnected"));

    setConnection(conn);
    return () => {
      // React StrictMode mounts twice in dev: ignore late events from the discarded connection.
      cancelled = true;
      conn.stop();
    };
  }, [user.id]);

  // Chat list: on connect and after every reconnect.
  useEffect(() => {
    if (!connection || status !== "Connected") return;
    connection.invoke("GetMyChats")
      .then(list => setChats(Object.fromEntries(list.map(c => [c.id, c]))))
      .catch(err => setError(hubErrorMessage(err)));
  }, [connection, status]);

  // Latest page of the open chat: when it's selected and again after a reconnect.
  useEffect(() => {
    if (!connection || status !== "Connected") return;
    let cancelled = false;
    connection.invoke("GetMessages", active, null, PAGE_SIZE)
      .then(page => {
        if (cancelled) return;
        setHistory(prev => {
          // Keep anything that arrived live while the page was loading.
          const ids = new Set(page.messages.map(m => m.id));
          const newest = Date.parse(page.messages.at(-1)?.sentAt ?? 0);
          const live = (prev[active]?.items ?? []).filter(m => !ids.has(m.id) && Date.parse(m.sentAt) > newest);
          return { ...prev, [active]: { items: [...page.messages, ...live], hasMore: page.hasMore } };
        });
      })
      .catch(err => !cancelled && setError(hubErrorMessage(err)));
    return () => { cancelled = true; };
  }, [connection, status, active]);

  // Tell the server which chat is on screen, so it can skip notifications for messages we can already see.
  useEffect(() => {
    if (!connection || status !== "Connected") return;
    const report = () => {
      const viewing = document.visibilityState === "visible" && document.hasFocus() ? active : null;
      connection.invoke("SetViewing", viewing).catch(() => {});
    };
    report();
    document.addEventListener("visibilitychange", report);
    window.addEventListener("focus", report);
    window.addEventListener("blur", report);
    return () => {
      document.removeEventListener("visibilitychange", report);
      window.removeEventListener("focus", report);
      window.removeEventListener("blur", report);
    };
  }, [connection, status, active]);

  const current = history[active];
  const messages = current?.items ?? [];
  const lastId = messages.at(-1)?.id;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lastId, active]);

  const loadOlder = async () => {
    const oldest = messages[0];
    if (!connection || !oldest) return;
    try {
      const page = await connection.invoke("GetMessages", active, oldest.sentAt, PAGE_SIZE);
      setHistory(prev => {
        const entry = prev[active] ?? { items: [] };
        const ids = new Set(entry.items.map(m => m.id));
        return {
          ...prev,
          [active]: { items: [...page.messages.filter(m => !ids.has(m.id)), ...entry.items], hasMore: page.hasMore },
        };
      });
    } catch (err) {
      setError(hubErrorMessage(err));
    }
  };

  const send = async () => {
    const msg = text.trim();
    if (!msg || !connection) return;
    try {
      await connection.invoke("SendMessage", active, msg);
      setText("");
      setError(null);
    } catch (err) {
      setError(hubErrorMessage(err));
    }
  };

  const handleKey = e => { if (e.key === "Enter") send(); };

  const openNotification = n => {
    if (!n.isRead) notifications.markRead(n.id);
    if (n.chatId) setActive(n.chatId);
    setPanelOpen(false);
  };

  const openToast = t => {
    notifications.dismissToast(t.id);
    openNotification(t);
  };

  const dmPartner = allUsers.find(u => u.id !== user.id && active.startsWith("dm:") && active.split(":").includes(u.id));
  const title = active === TEAM_CHAT_ID ? "# team" : dmPartner?.name ?? "";

  const statusDotClass = status === "Connected" ? "dot-connected"
    : status === "Reconnecting" ? "dot-reconnecting"
    : "dot-disconnected";

  return (
    <div className="chat-root">
      <div className="chat-sidebar">
        <div className="sidebar-brand">
          <span className="brand-name">Team Chat</span>
        </div>

        <ChatList
          user={user}
          users={allUsers}
          onlineIds={onlineIds}
          chats={chats}
          unreadByChat={notifications.unreadByChat}
          active={active}
          onSelect={setActive}
        />

        <div className="sidebar-footer">
          <div className="self-chip">
            <span className="user-avatar sm" style={{ background: user.color }}>{user.name[0]}</span>
            <span className="self-name">{user.name}</span>
            <span className={`status-dot ${statusDotClass}`} title={status} />
          </div>
          <button className="switch-btn" onClick={onLogout} title="Switch user">⇄</button>
        </div>
      </div>

      <div className="chat-main">
        <div className="chat-header">
          <span className="chat-channel">{title}</span>
          <div className="header-actions">
            <NotificationBell
              unread={notifications.unread}
              open={panelOpen}
              onToggle={() => setPanelOpen(o => !o)}
            />
            {panelOpen && (
              <NotificationPanel
                items={notifications.items}
                unread={notifications.unread}
                error={notifications.error}
                permission={notifications.permission}
                onOpen={openNotification}
                onMarkAllRead={notifications.markAllRead}
                onClear={notifications.clear}
                onRequestPermission={notifications.requestPermission}
                onClose={() => setPanelOpen(false)}
              />
            )}
          </div>
        </div>

        {notifications.welcome != null && (
          <div className="welcome-banner">
            <span>
              Welcome back, {user.name}! You have {notifications.welcome} new
              {notifications.welcome === 1 ? " notification" : " notifications"}.
            </span>
            <button onClick={() => { setPanelOpen(true); notifications.dismissWelcome(); }}>Open</button>
            <button className="banner-close" onClick={notifications.dismissWelcome} aria-label="Dismiss">×</button>
          </div>
        )}

        <div className="message-list">
          {current?.hasMore && (
            <button className="load-older" onClick={loadOlder}>Load older messages</button>
          )}
          {messages.map(m => {
            const isOwn = m.senderId === user.id;
            return (
              <div key={m.id} className={`msg ${isOwn ? "own" : "other"}`}>
                <span className="msg-author">
                  {m.senderName} · {new Date(m.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="msg-bubble">{m.text}</span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="error-bar">
            {error}
            <button onClick={() => setError(null)} aria-label="Dismiss">×</button>
          </div>
        )}

        <div className="input-bar">
          <input
            className="text-input"
            placeholder={active === TEAM_CHAT_ID ? "Message #team…" : `Message ${dmPartner?.name ?? ""}…`}
            value={text}
            maxLength={2000}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
          />
          <button className="send-btn" onClick={send} disabled={status !== "Connected"}>
            Send
          </button>
        </div>
      </div>

      <ToastStack
        toasts={notifications.toasts}
        onOpen={openToast}
        onDismiss={notifications.dismissToast}
      />
    </div>
  );
}
