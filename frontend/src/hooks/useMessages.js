import { useState, useEffect } from "react";
import { HubEvents } from "../lib/chatApi";

const time = iso => Date.parse(iso ?? 0);

// Replace a chat's history with its latest page, keeping anything newer that arrived live meanwhile.
function withLatestPage(history, chatId, page) {
  const ids = new Set(page.messages.map(m => m.id));
  const newest = time(page.messages.at(-1)?.sentAt);
  const live = (history[chatId]?.items ?? []).filter(m => !ids.has(m.id) && time(m.sentAt) > newest);
  return { ...history, [chatId]: { items: [...page.messages, ...live], hasMore: page.hasMore } };
}

function withOlderPage(history, chatId, page) {
  const entry = history[chatId] ?? { items: [] };
  const ids = new Set(entry.items.map(m => m.id));
  const older = page.messages.filter(m => !ids.has(m.id));
  return { ...history, [chatId]: { items: [...older, ...entry.items], hasMore: page.hasMore } };
}

function withLiveMessage(history, msg) {
  const entry = history[msg.chatId];
  // Not loaded yet: it will come with the first page.
  if (!entry || entry.items.some(m => m.id === msg.id)) return history;
  return { ...history, [msg.chatId]: { ...entry, items: [...entry.items, msg] } };
}

/** Message history of the open chat: paged loading, live updates and sending. */
export default function useMessages(api, connected, chatId, onError) {
  const [history, setHistory] = useState({}); // chatId -> { items, hasMore }

  useEffect(() => {
    if (!api) return;
    return api.on(HubEvents.ReceiveMessage, msg => setHistory(prev => withLiveMessage(prev, msg)));
  }, [api]);

  // Latest page when the chat is opened and again after a reconnect.
  useEffect(() => {
    if (!api || !connected) return;
    let cancelled = false;
    api.getMessages(chatId)
      .then(page => !cancelled && setHistory(prev => withLatestPage(prev, chatId, page)))
      .catch(err => !cancelled && onError(err));
    return () => { cancelled = true; };
  }, [api, connected, chatId, onError]);

  const entry = history[chatId];
  const messages = entry?.items ?? [];

  const loadOlder = async () => {
    const oldest = messages[0];
    if (!api || !oldest) return;
    try {
      const page = await api.getMessages(chatId, oldest.sentAt);
      setHistory(prev => withOlderPage(prev, chatId, page));
    } catch (err) {
      onError(err);
    }
  };

  /** Resolves to true once the server accepted the message. */
  const send = async text => {
    if (!api) return false;
    try {
      await api.sendMessage(chatId, text);
      return true;
    } catch (err) {
      onError(err);
      return false;
    }
  };

  return { messages, hasMore: entry?.hasMore ?? false, loadOlder, send };
}
