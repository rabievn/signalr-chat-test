import { useState } from "react";

const MAX_LENGTH = 2000; // matches ChatService.MaxMessageLength

/** Text box + Send button. Clears itself only after the server accepted the message. */
export default function MessageInput({ placeholder, disabled, onSend }) {
  const [text, setText] = useState("");

  const send = async () => {
    const msg = text.trim();
    if (!msg) return;
    if (await onSend(msg)) setText("");
  };

  return (
    <div className="input-bar">
      <input
        className="text-input"
        placeholder={placeholder}
        value={text}
        maxLength={MAX_LENGTH}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") send(); }}
      />
      <button className="send-btn" onClick={send} disabled={disabled}>
        Send
      </button>
    </div>
  );
}
