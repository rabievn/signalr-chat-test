import { TEAM_CHAT_ID, dmChatId } from "../lib/chatIds";
import { countLabel } from "../lib/format";
import type { ChatMap } from "../hooks/useChatList";
import type { ChatId, Message, User, UserId } from "../lib/types";
import Avatar from "./Avatar";

function Preview({ message, userId }: { message: Message | null | undefined; userId: UserId }) {
  if (!message) return null;
  const who = message.senderId === userId ? "You" : message.senderName;
  return <span className="chat-preview">{who}: {message.text}</span>;
}

function Badge({ count }: { count: number }) {
  return count > 0 ? <span className="unread-badge">{countLabel(count)}</span> : null;
}

export interface ChatListProps {
  user: User;
  users: User[];
  onlineIds: UserId[];
  chats: ChatMap;
  unreadByChat: Partial<Record<ChatId, number>>;
  active: ChatId;
  onSelect: (chatId: ChatId) => void;
}

export default function ChatList({ user, users, onlineIds, chats, unreadByChat, active, onSelect }: ChatListProps) {
  return (
    <>
      <div className="sidebar-section-label">Channels</div>
      <div
        className={`channel-item ${active === TEAM_CHAT_ID ? "active" : ""}`}
        onClick={() => onSelect(TEAM_CHAT_ID)}
      >
        <span className="channel-hash">#</span>
        <div className="chat-item-body">
          <span>team</span>
          <Preview message={chats[TEAM_CHAT_ID]?.lastMessage} userId={user.id} />
        </div>
        <Badge count={unreadByChat[TEAM_CHAT_ID] ?? 0} />
      </div>

      <div className="sidebar-section-label">Members</div>
      <ul className="user-list">
        {users.map(u => {
          const isSelf = u.id === user.id;
          const chatId = isSelf ? null : dmChatId(user.id, u.id);
          return (
            <li
              key={u.id}
              className={`user-item ${isSelf ? "" : "clickable"} ${chatId !== null && active === chatId ? "active" : ""}`}
              onClick={() => { if (chatId !== null) onSelect(chatId); }}
            >
              <span className={`presence-dot ${onlineIds.includes(u.id) ? "online" : "offline"}`} />
              <Avatar name={u.name} color={u.color} />
              <div className="chat-item-body">
                <span className="user-name">{u.name}</span>
                {chatId !== null && <Preview message={chats[chatId]?.lastMessage} userId={user.id} />}
              </div>
              {isSelf && <span className="user-you">you</span>}
              {chatId !== null && <Badge count={unreadByChat[chatId] ?? 0} />}
            </li>
          );
        })}
      </ul>
    </>
  );
}
