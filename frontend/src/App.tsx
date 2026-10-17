import { useState } from "react";
import LoginPage from "./pages/LoginPage";
import ChatPage from "./pages/ChatPage";
import { isUser } from "./lib/types";
import type { User } from "./lib/types";

// Per tab, so each browser tab can be signed in as a different user.
const STORAGE_KEY = "chatUser";

function loadUser(): User | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : null;
    return isUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(loadUser);

  const handleLogin = (selectedUser: User): void => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selectedUser));
    setUser(selectedUser);
  };

  const handleLogout = (): void => {
    sessionStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  if (!user) return <LoginPage onLogin={handleLogin} />;
  return <ChatPage user={user} onLogout={handleLogout} />;
}
