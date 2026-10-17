import type { HubConnection } from "@microsoft/signalr";
import { API_URL } from "./config";
import { isUser } from "./types";
import type {
  AppNotification, ChatId, ChatSummary, IsoDate, Message, MessagePage, NotificationsSnapshot, User, UserId,
} from "./types";

export const PAGE_SIZE = 50;

/** Server → client events and their arguments (backend/Contracts/IChatClient.cs). */
export interface HubEventMap {
  ReceiveMessage: [message: Message];
  NotificationReceived: [notification: AppNotification];
  NotificationsChanged: [snapshot: NotificationsSnapshot];
  PresenceChanged: [onlineUserIds: UserId[]];
}

export type HubEvent = keyof HubEventMap;

export const HubEvents = {
  ReceiveMessage: "ReceiveMessage",
  NotificationReceived: "NotificationReceived",
  NotificationsChanged: "NotificationsChanged",
  PresenceChanged: "PresenceChanged",
} as const satisfies { [E in HubEvent]: E };

export type Unsubscribe = () => void;

/** Client → server calls (backend/Hubs/ChatHub.cs). */
export interface ChatApi {
  getMyChats(): Promise<ChatSummary[]>;
  getMessages(chatId: ChatId, before?: IsoDate | null, limit?: number): Promise<MessagePage>;
  sendMessage(chatId: ChatId, text: string): Promise<void>;
  setViewing(chatId: ChatId | null): Promise<void>;
  getNotifications(): Promise<NotificationsSnapshot>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;
  clearNotifications(): Promise<void>;
  /** Subscribes to a server event; returns the unsubscribe function (handy as an effect cleanup). */
  on<E extends HubEvent>(event: E, handler: (...args: HubEventMap[E]) => void): Unsubscribe;
}

export function createChatApi(connection: HubConnection): ChatApi {
  return {
    getMyChats: () => connection.invoke<ChatSummary[]>("GetMyChats"),
    getMessages: (chatId, before = null, limit = PAGE_SIZE) =>
      connection.invoke<MessagePage>("GetMessages", chatId, before, limit),
    sendMessage: (chatId, text) => connection.invoke<void>("SendMessage", chatId, text),
    setViewing: chatId => connection.invoke<void>("SetViewing", chatId),
    getNotifications: () => connection.invoke<NotificationsSnapshot>("GetNotifications"),
    markNotificationRead: id => connection.invoke<void>("MarkNotificationRead", id),
    markAllNotificationsRead: () => connection.invoke<void>("MarkAllNotificationsRead"),
    clearNotifications: () => connection.invoke<void>("ClearNotifications"),

    on(event, handler) {
      connection.on(event, handler);
      return () => connection.off(event, handler);
    },
  };
}

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${API_URL}/api/users`);
  if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
  const data: unknown = await res.json();
  if (!Array.isArray(data) || !data.every(isUser)) throw new Error("Unexpected /api/users response");
  return data;
}

/** SignalR wraps HubException text in a long prefix; keep only the server's message. */
export function errorMessage(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err);
  return text.replace(/^.*HubException:\s*/, "");
}
