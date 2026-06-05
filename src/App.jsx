import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ReservasProvider } from "./context/ReservasContext";
import LoginPage from "./components/LoginPage";
import NavBar from "./components/NavBar";
import NuevaReserva from "./modules/reservas/NuevaReserva";
import ReservasPage from "./modules/reservas/ReservasPage";
import CocinaPage from "./modules/cocina/CocinaPage";
import HospedajePage from "./modules/hospedaje/HospedajePage";
import FinancieroPage from "./modules/financiero/FinancieroPage";
import AsistentePage from "./modules/asistente/AsistentePage";
import MarketingPage from "./modules/marketing/MarketingPage";
import Devoluciones from "./modules/financiero/Devoluciones";

function AppContent() {
  const { usuario, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#071a07" }}
      >
        <span className="text-green-400 text-lg">Cargando...</span>
      </div>
    );
  }

  if (!usuario) return <LoginPage />;

  return (
    <ReservasProvider>
      <HashRouter>
        <div className="min-h-screen relative">
          <NavBar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/reservas" replace />} />
              <Route path="/nueva" element={<NuevaReserva />} />
              <Route path="/reservas" element={<ReservasPage />} />
              <Route path="/cocina" element={<CocinaPage />} />
              <Route path="/hospedaje" element={<HospedajePage />} />
              <Route path="/financiero" element={<FinancieroPage />} />
              <Route path="/asistente" element={<AsistentePage />} />
              <Route path="/marketing" element={<MarketingPage />} />
              <Route path="/devoluciones" element={<Devoluciones />} />
              <Route path="*" element={<Navigate to="/reservas" replace />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </ReservasProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
