// Mirrors backend/Contracts/Dtos.cs (SignalR serializes as camelCase JSON; dates arrive as ISO strings).

export type UserId = string;
export type ChatId = string;
/** ISO 8601 timestamp in UTC, e.g. "2026-10-17T08:40:23.8Z". */
export type IsoDate = string;

export interface User {
  id: UserId;
  name: string;
  color: string;
}

export interface Message {
  id: string;
  chatId: ChatId;
  senderId: UserId;
  senderName: string;
  text: string;
  sentAt: IsoDate;
}

export interface MessagePage {
  messages: Message[];
  hasMore: boolean;
}

export type ChatType = "Group" | "Direct";

/** What the sidebar needs to know about a chat. */
export interface ChatPreview {
  id: ChatId;
  lastMessage: Message | null;
}

export interface ChatSummary extends ChatPreview {
  name: string;
  type: ChatType;
  otherUserId: UserId | null;
  unread: number;
}

export type NotificationType = "NewMessage" | "System";

/** Named AppNotification so it doesn't clash with the browser's Notification API. */
export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  text: string;
  fromUserId: UserId | null;
  fromUserName: string | null;
  fromUserColor: string | null;
  chatId: ChatId | null;
  createdAt: IsoDate;
  isRead: boolean;
}

export interface NotificationsSnapshot {
  items: AppNotification[];
  unread: number;
  unreadByChat: Record<ChatId, number>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Runtime check for data that doesn't come from the hub (REST responses, sessionStorage). */
export const isUser = (value: unknown): value is User =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.name === "string" &&
  typeof value.color === "string";
