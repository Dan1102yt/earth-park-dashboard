import { Link, useLocation } from "react-router-dom";
import { useReservas } from "../context/ReservasContext";
import {
  PlusCircle,
  CalendarDays,
  ChefHat,
  BedDouble,
  TrendingUp,
} from "lucide-react";

const LOGO_URL = `${import.meta.env.BASE_URL}logo-earth-park.png`;

const tabs = [
  { path: "/nueva",      label: "Nueva",      icon: PlusCircle   },
  { path: "/reservas",   label: "Reservas",   icon: CalendarDays },
  { path: "/cocina",     label: "Cocina",     icon: ChefHat      },
  { path: "/hospedaje",  label: "Hospedaje",  icon: BedDouble    },
  { path: "/financiero", label: "Financiero", icon: TrendingUp   },
];

export default function NavBar() {
  const location = useLocation();
  const { state } = useReservas();
  const reservasCount = state.reservas.length;

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────────────── */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col glass-nav border-r z-40">
        {/* Logo */}
        <div className="px-6 py-6 border-b" style={{ borderColor: 'rgba(77,142,30,0.2)' }}>
          <Link to="/reservas" className="flex items-center gap-3 group">
            <img
              src={LOGO_URL}
              alt="Earth Park"
              className="w-12 h-12 rounded-full object-cover flex-shrink-0 ring-2 transition-all duration-300"
              style={{ ringColor: 'rgba(77,142,30,0.35)', boxShadow: '0 0 0 2px rgba(77,142,30,0.30)' }}
            />
            <div>
              <h1 className="font-display text-lg font-bold text-white leading-tight">
                Earth Park
              </h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                Parque Temático · Macanal
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path);
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                  ${active
                    ? "bg-emerald-500/15 text-emerald-400 shadow-lg shadow-emerald-500/10"
                    : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
                  }`}
              >
                <Icon className={`w-5 h-5 ${active ? "text-emerald-400" : ""}`} />
                <span>{tab.label}</span>
                {tab.path === "/reservas" && reservasCount > 0 && (
                  <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full
                    ${active
                      ? "bg-emerald-500/30 text-emerald-300"
                      : "bg-gray-700/80 text-gray-400"
                    }`}>
                    {reservasCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800/50">
          <p className="text-[10px] text-gray-600 text-center">
            Macanal, Boyacá 🇨🇴
          </p>
        </div>
      </aside>

      {/* ── Mobile Top Header ───────────────────────────────────── */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 py-2.5 border-b glass-nav"
        style={{ borderColor: 'rgba(77,142,30,0.2)' }}
      >
        <Link to="/reservas" className="flex items-center gap-2.5">
          <img
            src={LOGO_URL}
            alt="Earth Park"
            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
            style={{ boxShadow: '0 0 0 1.5px rgba(77,142,30,0.40)' }}
          />
          <div>
            <h1 className="font-display text-sm font-bold text-white leading-tight">Earth Park</h1>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest leading-tight">Parque Temático · Macanal</p>
          </div>
        </Link>
        {reservasCount > 0 && (
          <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex-shrink-0">
            {reservasCount}
          </span>
        )}
      </header>

      {/* ── Mobile Bottom Bar ───────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass-nav border-t z-40 safe-area-bottom">
        <div className="flex items-center justify-around px-1 py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path);
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[56px] transition-all duration-200
                  ${active
                    ? "text-emerald-400"
                    : "text-gray-500 hover:text-gray-300"
                  }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {tab.path === "/reservas" && reservasCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 bg-emerald-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {reservasCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{tab.label}</span>
                {active && (
                  <div className="w-1 h-1 rounded-full bg-emerald-400 mt-0.5" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
