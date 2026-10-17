import { Status } from "../hooks/useChatConnection";
import type { ConnectionStatus } from "../hooks/useChatConnection";
import Avatar from "./Avatar";
import ChatList from "./ChatList";
import type { ChatListProps } from "./ChatList";

const statusDotClass: Record<ConnectionStatus, string> = {
  [Status.Connected]: "dot-connected",
  [Status.Reconnecting]: "dot-reconnecting",
  [Status.Disconnected]: "dot-disconnected",
};

interface SidebarProps extends ChatListProps {
  status: ConnectionStatus;
  onLogout: () => void;
}

export default function Sidebar({ status, onLogout, ...chatListProps }: SidebarProps) {
  const { user } = chatListProps;
  return (
    <div className="chat-sidebar">
      <div className="sidebar-brand">
        <span className="brand-name">Team Chat</span>
      </div>

      <ChatList {...chatListProps} />

      <div className="sidebar-footer">
        <div className="self-chip">
          <Avatar name={user.name} color={user.color} small />
          <span className="self-name">{user.name}</span>
          <span className={`status-dot ${statusDotClass[status]}`} title={status} />
        </div>
        <button className="switch-btn" onClick={onLogout} title="Switch user">⇄</button>
      </div>
    </div>
  );
}
