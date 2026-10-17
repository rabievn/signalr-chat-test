import { useState, useEffect, useMemo } from "react";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { HUB_URL } from "../lib/config";
import { createChatApi, HubEvents } from "../lib/chatApi";

export const Status = {
  Connected: "Connected",
  Reconnecting: "Reconnecting",
  Disconnected: "Disconnected",
};

/** Opens the SignalR connection for the signed-in user and tracks its status and who is online. */
export default function useChatConnection(userId) {
  const [connection, setConnection] = useState(null);
  const [status, setStatus] = useState(Status.Disconnected);
  const [onlineIds, setOnlineIds] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const conn = new HubConnectionBuilder()
      .withUrl(`${HUB_URL}?userId=${encodeURIComponent(userId)}`)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    // Registered before start(): the server sends presence as soon as we connect.
    conn.on(HubEvents.PresenceChanged, ids => setOnlineIds(ids));

    conn.onreconnecting(() => !cancelled && setStatus(Status.Reconnecting));
    conn.onreconnected(() => !cancelled && setStatus(Status.Connected));
    conn.onclose(() => !cancelled && setStatus(Status.Disconnected));

    conn.start()
      .then(() => !cancelled && setStatus(Status.Connected))
      .catch(() => !cancelled && setStatus(Status.Disconnected));

    setConnection(conn);
    return () => {
      // React StrictMode mounts twice in dev: ignore late events from the discarded connection.
      cancelled = true;
      conn.stop();
    };
  }, [userId]);

  const api = useMemo(() => (connection ? createChatApi(connection) : null), [connection]);

  return { api, status, connected: status === Status.Connected, onlineIds };
}
