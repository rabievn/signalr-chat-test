import { TEAM_CHAT_ID, dmChatId } from "./chatIds";

function Preview({ message, userId }) {
  if (!message) return null;
  const who = message.senderId === userId ? "You" : message.senderName;
  return <span className="chat-preview">{who}: {message.text}</span>;
}

function Badge({ count }) {
  return count > 0 ? <span className="unread-badge">{count > 9 ? "9+" : count}</span> : null;
}

export default function ChatList({ user, users, onlineIds, chats, unreadByChat, active, onSelect }) {
  const team = chats[TEAM_CHAT_ID];

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
          <Preview message={team?.lastMessage} userId={user.id} />
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
              className={`user-item ${isSelf ? "" : "clickable"} ${chatId && active === chatId ? "active" : ""}`}
              onClick={() => chatId && onSelect(chatId)}
            >
              <span className={`presence-dot ${onlineIds.includes(u.id) ? "online" : "offline"}`} />
              <span className="user-avatar" style={{ background: u.color }}>{u.name[0]}</span>
              <div className="chat-item-body">
                <span className="user-name">{u.name}</span>
                {chatId && <Preview message={chats[chatId]?.lastMessage} userId={user.id} />}
              </div>
              {isSelf && <span className="user-you">you</span>}
              {chatId && <Badge count={unreadByChat[chatId] ?? 0} />}
            </li>
          );
        })}
      </ul>
    </>
  );
}
