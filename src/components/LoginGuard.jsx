import { useState, useEffect } from "react";

const STORAGE_KEY = "earthpark_auth";
const PASSWORD = "earthpark2026";

export default function LoginGuard({ children }) {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === "true") {
      setAuthed(true);
    }
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (password === PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      setAuthed(true);
      setError("");
    } else {
      setError("Contraseña incorrecta");
      setPassword("");
    }
  }

  if (authed) return children;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1B4332",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "16px",
          padding: "2.5rem",
          maxWidth: "400px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            fontSize: "3.5rem",
            marginBottom: "0.5rem",
          }}
        >
          🌿
        </div>
        <h1
          style={{
            color: "#fff",
            fontSize: "1.75rem",
            fontWeight: 700,
            margin: "0 0 0.25rem",
            letterSpacing: "-0.02em",
          }}
        >
          Earth Park
        </h1>
        <p
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: "0.9rem",
            margin: "0 0 2rem",
          }}
        >
          Dashboard administrativo
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            autoFocus
            style={{
              width: "100%",
              padding: "0.85rem 1rem",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(0,0,0,0.25)",
              color: "#fff",
              fontSize: "1rem",
              outline: "none",
              boxSizing: "border-box",
              marginBottom: "0.75rem",
            }}
          />

          {error && (
            <div
              style={{
                color: "#ff6b6b",
                fontSize: "0.875rem",
                marginBottom: "0.75rem",
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "0.85rem 1rem",
              borderRadius: "10px",
              border: "none",
              background: "#2D6A4F",
              color: "#fff",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.15s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#40916C")}
            onMouseOut={(e) => (e.currentTarget.style.background = "#2D6A4F")}
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
