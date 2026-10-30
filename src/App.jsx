import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./compartido/contexto/AuthContext";
import { ReservasProvider } from "./compartido/contexto/ReservasContext";
import LoginPage from "./compartido/componentes/LoginPage";
import NavBar from "./compartido/componentes/NavBar";
import InstalarApp from "./compartido/componentes/InstalarApp";
import NuevaReserva from "./modulos/reservas/NuevaReserva";
import ReservasPage from "./modulos/reservas/ReservasPage";
import CocinaPage from "./modulos/cocina/CocinaPage";
import HospedajePage from "./modulos/hospedaje/HospedajePage";
import FinancieroPage from "./modulos/financiero/FinancieroPage";
import InformeMensual from "./modulos/financiero/InformeMensual";
import AsistentePage from "./modulos/asistente/AsistentePage";
import MarketingPage from "./modulos/marketing/MarketingPage";
import GaleriaWebPage from "./modulos/marketing/galeria/GaleriaWebPage";
import EditorVideoPage from "./modulos/marketing/editor/EditorVideoPage";
import AgentePage from "./modulos/marketing/agente/AgentePage";
import AnimadoPage from "./modulos/marketing/animado/AnimadoPage";
import CinePage from "./modulos/marketing/cine/CinePage";
import OficinaPage from "./modulos/marketing/oficina/OficinaPage";
import Devoluciones from "./modulos/financiero/Devoluciones";

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
          <InstalarApp />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/reservas" replace />} />
              <Route path="/nueva" element={<NuevaReserva />} />
              <Route path="/reservas" element={<ReservasPage />} />
              <Route path="/cocina" element={<CocinaPage />} />
              <Route path="/hospedaje" element={<HospedajePage />} />
              <Route path="/financiero" element={<FinancieroPage />} />
              <Route path="/informe" element={<InformeMensual />} />
              <Route path="/asistente" element={<AsistentePage />} />
              <Route path="/marketing" element={<MarketingPage />} />
              <Route path="/marketing/galeria-web" element={<GaleriaWebPage />} />
              <Route path="/marketing/editor-video" element={<EditorVideoPage />} />
              <Route path="/marketing/agente" element={<AgentePage />} />
              <Route path="/marketing/animado" element={<AnimadoPage />} />
              <Route path="/marketing/cine" element={<CinePage />} />
              <Route path="/marketing/oficina" element={<OficinaPage />} />
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
