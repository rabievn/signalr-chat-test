import { API_URL } from "./config";

export const PAGE_SIZE = 50;

// Server → client events (backend/Contracts/IChatClient.cs).
export const HubEvents = {
  ReceiveMessage: "ReceiveMessage",
  NotificationReceived: "NotificationReceived",
  NotificationsChanged: "NotificationsChanged",
  PresenceChanged: "PresenceChanged",
};

/** Client → server calls (backend/Hubs/ChatHub.cs), in one place instead of string names scattered around. */
export function createChatApi(connection) {
  const invoke = (method, ...args) => connection.invoke(method, ...args);
  return {
    getMyChats: () => invoke("GetMyChats"),
    getMessages: (chatId, before = null, limit = PAGE_SIZE) => invoke("GetMessages", chatId, before, limit),
    sendMessage: (chatId, text) => invoke("SendMessage", chatId, text),
    setViewing: chatId => invoke("SetViewing", chatId),
    getNotifications: () => invoke("GetNotifications"),
    markNotificationRead: id => invoke("MarkNotificationRead", id),
    markAllNotificationsRead: () => invoke("MarkAllNotificationsRead"),
    clearNotifications: () => invoke("ClearNotifications"),

    /** Subscribes to a server event; returns the unsubscribe function (handy as an effect cleanup). */
    on(event, handler) {
      connection.on(event, handler);
      return () => connection.off(event, handler);
    },
  };
}

export async function fetchUsers() {
  const res = await fetch(`${API_URL}/api/users`);
  if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
  return res.json();
}

// SignalR wraps HubException text in a long prefix; keep only the server's message.
export const errorMessage = err =>
  (err?.message ?? String(err)).replace(/^.*HubException:\s*/, "");
