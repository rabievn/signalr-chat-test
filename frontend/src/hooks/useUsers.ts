import { useState, useEffect } from "react";
import { fetchUsers } from "../lib/chatApi";
import type { User } from "../lib/types";

/** The fixed list of chat users. Empty until loaded or if the backend is down. */
export default function useUsers(): User[] {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchUsers()
      .then(list => {
        if (!cancelled) setUsers(list);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return users;
}
