import { Status } from "../hooks/useChatConnection";
import Avatar from "./Avatar";
import ChatList from "./ChatList";

const statusDotClass = {
  [Status.Connected]: "dot-connected",
  [Status.Reconnecting]: "dot-reconnecting",
  [Status.Disconnected]: "dot-disconnected",
};

export default function Sidebar({ user, status, onLogout, ...chatListProps }) {
  return (
    <div className="chat-sidebar">
      <div className="sidebar-brand">
        <span className="brand-name">Team Chat</span>
      </div>

      <ChatList user={user} {...chatListProps} />

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
