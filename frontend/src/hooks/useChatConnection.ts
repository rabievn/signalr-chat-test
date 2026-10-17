import { useState, useEffect, useMemo } from "react";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import type { HubConnection } from "@microsoft/signalr";
import { HUB_URL } from "../lib/config";
import { createChatApi, HubEvents } from "../lib/chatApi";
import type { ChatApi } from "../lib/chatApi";
import type { UserId } from "../lib/types";

export const Status = {
  Connected: "Connected",
  Reconnecting: "Reconnecting",
  Disconnected: "Disconnected",
} as const;

export type ConnectionStatus = (typeof Status)[keyof typeof Status];

export interface ChatConnection {
  /** Null until the connection object exists; calls fail until `connected` is true. */
  api: ChatApi | null;
  status: ConnectionStatus;
  connected: boolean;
  onlineIds: UserId[];
}

/** Opens the SignalR connection for the signed-in user and tracks its status and who is online. */
export default function useChatConnection(userId: UserId): ChatConnection {
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>(Status.Disconnected);
  const [onlineIds, setOnlineIds] = useState<UserId[]>([]);

  useEffect(() => {
    let cancelled = false;
    const conn = new HubConnectionBuilder()
      .withUrl(`${HUB_URL}?userId=${encodeURIComponent(userId)}`)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    // Registered before start(): the server sends presence as soon as we connect.
    conn.on(HubEvents.PresenceChanged, (ids: UserId[]) => setOnlineIds(ids));

    const update = (next: ConnectionStatus) => {
      if (!cancelled) setStatus(next);
    };
    conn.onreconnecting(() => update(Status.Reconnecting));
    conn.onreconnected(() => update(Status.Connected));
    conn.onclose(() => update(Status.Disconnected));

    conn.start()
      .then(() => update(Status.Connected))
      .catch(() => update(Status.Disconnected));

    setConnection(conn);
    return () => {
      // React StrictMode mounts twice in dev: ignore late events from the discarded connection.
      cancelled = true;
      void conn.stop();
    };
  }, [userId]);

  const api = useMemo(() => (connection ? createChatApi(connection) : null), [connection]);

  return { api, status, connected: status === Status.Connected, onlineIds };
}
