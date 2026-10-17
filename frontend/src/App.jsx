import { useState } from "react";
import LoginPage from "./pages/LoginPage";
import ChatPage from "./pages/ChatPage";

// Per tab, so each browser tab can be signed in as a different user.
const STORAGE_KEY = "chatUser";

function loadUser() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState(loadUser);

  const handleLogin = selectedUser => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selectedUser));
    setUser(selectedUser);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  if (!user) return <LoginPage onLogin={handleLogin} />;
  return <ChatPage user={user} onLogout={handleLogout} />;
}
