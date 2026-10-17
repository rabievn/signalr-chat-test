export const TEAM_CHAT_ID = "team";

// Must match ChatService.DirectChatId on the backend: ids sorted ordinally.
export const dmChatId = (a, b) => (a <= b ? `dm:${a}:${b}` : `dm:${b}:${a}`);

// SignalR wraps HubException text in a long prefix; keep only the server's message.
export const hubErrorMessage = err =>
  (err?.message ?? String(err)).replace(/^.*HubException:\s*/, "");
