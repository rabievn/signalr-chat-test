import { useState, useEffect } from "react";
import { HubEvents } from "../lib/chatApi";
import type { ChatApi } from "../lib/chatApi";
import type { ChatId, IsoDate, Message, MessagePage } from "../lib/types";

interface ChatHistory {
  items: Message[];
  hasMore: boolean;
}

type HistoryMap = Partial<Record<ChatId, ChatHistory>>;

const time = (iso: IsoDate | undefined): number => (iso ? Date.parse(iso) : 0);

// Replace a chat's history with its latest page, keeping anything newer that arrived live meanwhile.
function withLatestPage(history: HistoryMap, chatId: ChatId, page: MessagePage): HistoryMap {
  const ids = new Set(page.messages.map(m => m.id));
  const newest = time(page.messages.at(-1)?.sentAt);
  const live = (history[chatId]?.items ?? []).filter(m => !ids.has(m.id) && time(m.sentAt) > newest);
  return { ...history, [chatId]: { items: [...page.messages, ...live], hasMore: page.hasMore } };
}

function withOlderPage(history: HistoryMap, chatId: ChatId, page: MessagePage): HistoryMap {
  const items = history[chatId]?.items ?? [];
  const ids = new Set(items.map(m => m.id));
  const older = page.messages.filter(m => !ids.has(m.id));
  return { ...history, [chatId]: { items: [...older, ...items], hasMore: page.hasMore } };
}

function withLiveMessage(history: HistoryMap, msg: Message): HistoryMap {
  const entry = history[msg.chatId];
  // Not loaded yet: it will come with the first page.
  if (!entry || entry.items.some(m => m.id === msg.id)) return history;
  return { ...history, [msg.chatId]: { ...entry, items: [...entry.items, msg] } };
}

export interface ChatMessages {
  messages: Message[];
  hasMore: boolean;
  loadOlder: () => Promise<void>;
  /** Resolves to true once the server accepted the message. */
  send: (text: string) => Promise<boolean>;
}

/** Message history of the open chat: paged loading, live updates and sending. */
export default function useMessages(
  api: ChatApi | null,
  connected: boolean,
  chatId: ChatId,
  onError: (err: unknown) => void,
): ChatMessages {
  const [history, setHistory] = useState<HistoryMap>({});

  useEffect(() => {
    if (!api) return;
    return api.on(HubEvents.ReceiveMessage, msg => setHistory(prev => withLiveMessage(prev, msg)));
  }, [api]);

  // Latest page when the chat is opened and again after a reconnect.
  useEffect(() => {
    if (!api || !connected) return;
    let cancelled = false;
    api.getMessages(chatId)
      .then(page => {
        if (!cancelled) setHistory(prev => withLatestPage(prev, chatId, page));
      })
      .catch((err: unknown) => {
        if (!cancelled) onError(err);
      });
    return () => { cancelled = true; };
  }, [api, connected, chatId, onError]);

  const entry = history[chatId];
  const messages = entry?.items ?? [];

  const loadOlder = async (): Promise<void> => {
    const oldest = messages[0];
    if (!api || !oldest) return;
    try {
      const page = await api.getMessages(chatId, oldest.sentAt);
      setHistory(prev => withOlderPage(prev, chatId, page));
    } catch (err) {
      onError(err);
    }
  };

  const send = async (text: string): Promise<boolean> => {
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
