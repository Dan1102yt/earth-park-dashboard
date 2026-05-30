import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { ReservasProvider } from "./context/ReservasContext";
import LoginGuard from "./components/LoginGuard";
import NavBar from "./components/NavBar";
import NuevaReserva from "./modules/reservas/NuevaReserva";
import ReservasPage from "./modules/reservas/ReservasPage";
import CocinaPage from "./modules/cocina/CocinaPage";
import HospedajePage from "./modules/hospedaje/HospedajePage";
import FinancieroPage from "./modules/financiero/FinancieroPage";
import GastronomiaPage from "./modules/gastronomia/GastronomiaPage";

export default function App() {
  return (
    <LoginGuard>
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
                <Route path="/gastronomia" element={<GastronomiaPage />} />
                <Route path="*" element={<Navigate to="/reservas" replace />} />
              </Routes>
            </main>
          </div>
        </HashRouter>
      </ReservasProvider>
    </LoginGuard>
  );
}
