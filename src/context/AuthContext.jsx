import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const guardado = sessionStorage.getItem("ep_usuario");
    if (guardado) setUsuario(JSON.parse(guardado));
    setLoading(false);
  }, []);

  async function login(username, password) {
    if (!supabase) return { error: "Sin conexión a base de datos" };
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("username", username.toLowerCase().trim())
      .eq("password_hash", password)
      .single();
    if (error || !data) return { error: "Usuario o contraseña incorrectos" };
    const u = { id: data.id, username: data.username, nombre: data.nombre, rol: data.rol };
    sessionStorage.setItem("ep_usuario", JSON.stringify(u));
    setUsuario(u);
    return { ok: true };
  }

  function logout() {
    sessionStorage.removeItem("ep_usuario");
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
