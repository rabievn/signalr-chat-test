import { useState, useEffect } from "react";
import { HubEvents } from "../lib/chatApi";
import type { ChatApi } from "../lib/chatApi";
import type { ChatId, ChatPreview } from "../lib/types";

export type ChatMap = Partial<Record<ChatId, ChatPreview>>;

/** The user's chats keyed by id, loaded on connect and kept fresh by live messages. */
export default function useChatList(
  api: ChatApi | null,
  connected: boolean,
  onError: (err: unknown) => void,
): ChatMap {
  const [chats, setChats] = useState<ChatMap>({});

  useEffect(() => {
    if (!api) return;
    return api.on(HubEvents.ReceiveMessage, msg =>
      setChats(prev => ({ ...prev, [msg.chatId]: { ...prev[msg.chatId], id: msg.chatId, lastMessage: msg } })));
  }, [api]);

  // On connect and after every reconnect.
  useEffect(() => {
    if (!api || !connected) return;
    api.getMyChats()
      .then(list => setChats(Object.fromEntries(list.map(c => [c.id, c]))))
      .catch(onError);
  }, [api, connected, onError]);

  return chats;
}
