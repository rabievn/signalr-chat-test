import { useState, useCallback } from "react";
import { TEAM_CHAT_ID, dmPartnerId } from "../lib/chatIds";
import { errorMessage } from "../lib/chatApi";
import type { AppNotification, ChatId, User } from "../lib/types";
import useUsers from "../hooks/useUsers";
import useChatConnection from "../hooks/useChatConnection";
import useChatList from "../hooks/useChatList";
import useMessages from "../hooks/useMessages";
import useViewingReport from "../hooks/useViewingReport";
import useNotifications from "../hooks/useNotifications";
import Sidebar from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";
import NotificationPanel from "../components/NotificationPanel";
import WelcomeBanner from "../components/WelcomeBanner";
import MessageList from "../components/MessageList";
import ErrorBar from "../components/ErrorBar";
import MessageInput from "../components/MessageInput";
import ToastStack from "../components/ToastStack";
import "./ChatPage.css";

interface ChatPageProps {
  user: User;
  onLogout: () => void;
}

export default function ChatPage({ user, onLogout }: ChatPageProps) {
  const [active, setActive] = useState<ChatId>(TEAM_CHAT_ID);
  const [panelOpen, setPanelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onError = useCallback((err: unknown) => setError(errorMessage(err)), []);

  const users = useUsers();
  const { api, status, connected, onlineIds } = useChatConnection(user.id);
  const chats = useChatList(api, connected, onError);
  const { messages, hasMore, loadOlder, send } = useMessages(api, connected, active, onError);
  const notifications = useNotifications({ api, connected, onOpenChat: setActive });
  useViewingReport(api, connected, active);

  const partnerId = dmPartnerId(active, user.id);
  const partner = users.find(u => u.id === partnerId);
  const title = active === TEAM_CHAT_ID ? "# team" : partner?.name ?? "";
  const placeholder = active === TEAM_CHAT_ID ? "Message #team…" : `Message ${partner?.name ?? ""}…`;

  const openNotification = (n: AppNotification): void => {
    if (!n.isRead) void notifications.markRead(n.id);
    if (n.chatId) setActive(n.chatId);
    setPanelOpen(false);
  };

  const sendMessage = async (text: string): Promise<boolean> => {
    const ok = await send(text);
    if (ok) setError(null);
    return ok;
  };

  return (
    <div className="chat-root">
      <Sidebar
        user={user}
        status={status}
        onLogout={onLogout}
        users={users}
        onlineIds={onlineIds}
        chats={chats}
        unreadByChat={notifications.unreadByChat}
        active={active}
        onSelect={setActive}
      />

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
                onMarkAllRead={() => void notifications.markAllRead()}
                onClear={() => void notifications.clear()}
                onRequestPermission={() => void notifications.requestPermission()}
                onClose={() => setPanelOpen(false)}
              />
            )}
          </div>
        </div>

        {notifications.welcome !== null && (
          <WelcomeBanner
            name={user.name}
            count={notifications.welcome}
            onOpen={() => { setPanelOpen(true); notifications.dismissWelcome(); }}
            onDismiss={notifications.dismissWelcome}
          />
        )}

        <MessageList
          chatId={active}
          messages={messages}
          userId={user.id}
          hasMore={hasMore}
          onLoadOlder={() => void loadOlder()}
        />

        <ErrorBar message={error} onDismiss={() => setError(null)} />

        <MessageInput placeholder={placeholder} disabled={!connected} onSend={sendMessage} />
      </div>

      <ToastStack
        toasts={notifications.toasts}
        onOpen={t => { notifications.dismissToast(t.id); openNotification(t); }}
        onDismiss={notifications.dismissToast}
      />
    </div>
  );
}
