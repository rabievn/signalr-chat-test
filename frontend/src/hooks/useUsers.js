import { useState, useEffect } from "react";
import { fetchUsers } from "../lib/chatApi";

/** The fixed list of chat users ({ id, name, color }). Empty until loaded or if the backend is down. */
export default function useUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchUsers()
      .then(list => !cancelled && setUsers(list))
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return users;
}
