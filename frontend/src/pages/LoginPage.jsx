import useUsers from "../hooks/useUsers";
import "./LoginPage.css";

export default function LoginPage({ onLogin }) {
  const users = useUsers();

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
