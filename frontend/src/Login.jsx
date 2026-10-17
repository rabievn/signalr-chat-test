import { useState, useEffect } from "react";
import "./Login.css";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

export default function Login({ onLogin }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/api/users`)
      .then(r => r.json())
      .then(setUsers)
      .catch(() => {});
  }, []);

  return (
    <div className="login-root">
      <div className="login-card">
        <h1 className="login-title">Team Chat</h1>
        <p className="login-subtitle">Choose who you are</p>
        <div className="login-users">
          {users.map(u => (
            <button
              key={u.id}
              className="login-user-btn"
              style={{ "--user-color": u.color }}
              onClick={() => onLogin(u)}
            >
              <span className="login-avatar">{u.name[0]}</span>
              {u.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
