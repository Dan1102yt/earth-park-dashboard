import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await login(username, password);
    if (res.error) setError(res.error);
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, #071a07 0%, #0f2e0f 50%, #071a07 100%)" }}
    >
      <div className="w-full max-w-sm px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-5xl">🦋</span>
          <h1 className="text-2xl font-bold text-white mt-3">Earth Park</h1>
          <p className="text-green-400 text-sm mt-1">Dashboard de gestión</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-green-900 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-6">Iniciar sesión</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="oscar / olga / andres / david"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5
                  text-white text-sm focus:outline-none focus:border-green-500 transition"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5
                  text-white text-sm focus:outline-none focus:border-green-500 transition"
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50
                text-white font-semibold rounded-lg py-2.5 text-sm transition mt-2"
            >
              {loading ? "Verificando..." : "Entrar"}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Earth Park · Macanal, Boyacá
        </p>
      </div>
    </div>
  );
}
