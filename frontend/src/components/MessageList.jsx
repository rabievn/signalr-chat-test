import { useEffect, useRef } from "react";
import { formatTime } from "../lib/format";

export default function MessageList({ chatId, messages, userId, hasMore, onLoadOlder }) {
  const bottomRef = useRef(null);
  const lastId = messages.at(-1)?.id;

  // Follow new messages and chat switches, but not older pages being prepended.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lastId, chatId]);

  return (
    <div className="message-list">
      {hasMore && (
        <button className="load-older" onClick={onLoadOlder}>Load older messages</button>
      )}
      {messages.map(m => (
        <div key={m.id} className={`msg ${m.senderId === userId ? "own" : "other"}`}>
          <span className="msg-author">{m.senderName} · {formatTime(m.sentAt)}</span>
          <span className="msg-bubble">{m.text}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
