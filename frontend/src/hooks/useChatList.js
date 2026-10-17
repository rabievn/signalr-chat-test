import { useState, useEffect } from "react";
import { HubEvents } from "../lib/chatApi";

/** The user's chats keyed by id ({ lastMessage, ... }), loaded on connect and kept fresh by live messages. */
export default function useChatList(api, connected, onError) {
  const [chats, setChats] = useState({});

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
