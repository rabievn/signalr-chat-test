import { useState } from "react";
import type { KeyboardEvent } from "react";

const MAX_LENGTH = 2000; // matches ChatService.MaxMessageLength

interface MessageInputProps {
  placeholder: string;
  disabled: boolean;
  /** Resolves to true if the message was accepted; the box is cleared only then. */
  onSend: (text: string) => Promise<boolean>;
}

export default function MessageInput({ placeholder, disabled, onSend }: MessageInputProps) {
  const [text, setText] = useState("");

  const send = async (): Promise<void> => {
    const msg = text.trim();
    if (!msg) return;
    if (await onSend(msg)) setText("");
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") void send();
  };

  return (
    <div className="input-bar">
      <input
        className="text-input"
        placeholder={placeholder}
        value={text}
        maxLength={MAX_LENGTH}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKey}
      />
      <button className="send-btn" onClick={() => void send()} disabled={disabled}>
        Send
      </button>
    </div>
  );
}
