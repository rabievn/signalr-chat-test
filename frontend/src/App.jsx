import { useState } from "react";
import Login from "./Login";
import Chat from "./Chat";

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem("chatUser");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (selectedUser) => {
    sessionStorage.setItem("chatUser", JSON.stringify(selectedUser));
    setUser(selectedUser);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("chatUser");
    setUser(null);
  };

  if (!user) return <Login onLogin={handleLogin} />;
  return <Chat user={user} onLogout={handleLogout} />;
}
