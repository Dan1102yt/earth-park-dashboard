import { Link, useLocation } from "react-router-dom";
import { useReservas } from "../context/ReservasContext";
import {
  PlusCircle,
  CalendarDays,
  ChefHat,
  BedDouble,
  TrendingUp,
  TreePine,
} from "lucide-react";

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
        <div className="px-6 py-8 border-b border-gray-800/50">
          <Link to="/reservas" className="flex items-center gap-3 group">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-2.5 rounded-xl shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
              <TreePine className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-white">
                Earth Park
              </h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                Dashboard
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
