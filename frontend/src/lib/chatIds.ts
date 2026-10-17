import type { ChatId, UserId } from "./types";

export const TEAM_CHAT_ID: ChatId = "team";

/** Must match ChatService.DirectChatId on the backend: ids sorted ordinally. */
export const dmChatId = (a: UserId, b: UserId): ChatId => (a <= b ? `dm:${a}:${b}` : `dm:${b}:${a}`);

/** The other user's id in a direct chat, or null for any other chat. */
export function dmPartnerId(chatId: ChatId, myId: UserId): UserId | null {
  const [kind, a, b] = chatId.split(":");
  if (kind !== "dm" || a === undefined || b === undefined) return null;
  return a === myId ? b : a;
}
