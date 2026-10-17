export const TEAM_CHAT_ID = "team";

// Must match ChatService.DirectChatId on the backend: ids sorted ordinally.
export const dmChatId = (a, b) => (a <= b ? `dm:${a}:${b}` : `dm:${b}:${a}`);

// The other user's id in a direct chat, or null for any other chat.
export function dmPartnerId(chatId, myId) {
  const [kind, a, b] = chatId.split(":");
  if (kind !== "dm") return null;
  return a === myId ? b : a;
}
