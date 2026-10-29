import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useReservas } from "../context/ReservasContext";
import { useAuth } from "../context/AuthContext";
import SyncButton from "./SyncButton";
import {
  PlusCircle,
  CalendarDays,
  ChefHat,
  BedDouble,
  TrendingUp,
  Bot,
  Megaphone,
  RotateCcw,
  FileText,
  LayoutGrid,
  X,
  Users,
  Clapperboard,
  Film,
  Images,
  Scissors,
} from "lucide-react";

function InstagramIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.31 6.31 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.71a8.18 8.18 0 0 0 4.79 1.53V6.8a4.85 4.85 0 0 1-1.03-.11z" />
    </svg>
  );
}

const LOGO_URL = `${import.meta.env.BASE_URL}logo-earth-park.png`;

const tabs = [
  { path: "/nueva",         label: "Nueva",         icon: PlusCircle   },
  { path: "/reservas",      label: "Reservas",      icon: CalendarDays },
  { path: "/cocina",        label: "Cocina",        icon: ChefHat      },
  { path: "/hospedaje",     label: "Hospedaje",     icon: BedDouble    },
  { path: "/financiero",    label: "Financiero",    icon: TrendingUp   },
  { path: "/informe",       label: "Informe",       icon: FileText     },
  { path: "/devoluciones",  label: "Devoluciones",  icon: RotateCcw    },
  { path: "/asistente",     label: "Asistente",     icon: Bot          },
  { path: "/marketing",     label: "Marketing",     icon: Megaphone    },
];

// En el celular: 4 accesos fijos + "Más" (el resto en una hoja que sube desde abajo)
const PRINCIPALES = ["/reservas", "/nueva", "/marketing", "/financiero"];
const HERRAMIENTAS_MARKETING = [
  { path: "/marketing/oficina", label: "Oficina IA", icon: Users },
  { path: "/marketing/agente", label: "Agente IA", icon: Bot },
  { path: "/marketing/cine", label: "Videos cine", icon: Clapperboard },
  { path: "/marketing/animado", label: "Animados", icon: Film },
  { path: "/marketing/editor-video", label: "Editor", icon: Scissors },
  { path: "/marketing/galeria-web", label: "Galería web", icon: Images },
];

export default function NavBar() {
  const location = useLocation();
  const { state } = useReservas();
  const { usuario, logout } = useAuth();
  const reservasCount = state.reservas.length;

  const isActive = (path) => location.pathname === path;
  const activoMovil = (path) => (path === "/marketing" ? location.pathname.startsWith("/marketing") : location.pathname === path);
  const [mas, setMas] = useState(false);
  useEffect(() => { setMas(false); }, [location.pathname]);
  const principales = PRINCIPALES.map((p) => tabs.find((t) => t.path === p));
  const resto = tabs.filter((t) => !PRINCIPALES.includes(t.path));
  const masActivo = resto.some((t) => isActive(t.path));

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

        {/* Sync Google Sheets */}
        <div className="px-6 py-3 border-b" style={{ borderColor: 'rgba(77,142,30,0.2)' }}>
          <SyncButton />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
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
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-gray-600">
              Macanal, Boyacá 🇨🇴
            </p>
            <div className="flex items-center gap-1">
              <a
                href="https://www.instagram.com/earthpark.co"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-gray-600 hover:text-pink-400 transition-colors duration-200 p-1.5 rounded-lg hover:bg-pink-500/10"
              >
                <InstagramIcon className="w-4 h-4" />
              </a>
              <a
                href="https://www.tiktok.com/@earthpark.co"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="text-gray-600 hover:text-gray-200 transition-colors duration-200 p-1.5 rounded-lg hover:bg-gray-700/50"
              >
                <TikTokIcon className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Usuario logueado */}
        <div className="flex items-center gap-3 px-4 py-3 border-t border-green-900/50">
          <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center
            text-white text-sm font-bold flex-shrink-0">
            {usuario?.nombre?.[0] || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{usuario?.nombre}</p>
            <p className="text-xs text-gray-500 capitalize">{usuario?.rol}</p>
          </div>
          <button
            onClick={logout}
            className="text-gray-500 hover:text-red-400 transition text-xs"
            title="Cerrar sesión"
          >
            Salir
          </button>
        </div>
      </aside>

      {/* ── Mobile Top Header ───────────────────────────────────── */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-2 px-3 py-2 border-b glass-nav safe-area-top"
        style={{ borderColor: 'rgba(77,142,30,0.2)' }}
      >
        <Link to="/reservas" className="flex items-center gap-2 min-w-0">
          <img
            src={LOGO_URL}
            alt="Earth Park"
            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
            style={{ boxShadow: '0 0 0 1.5px rgba(77,142,30,0.40)' }}
          />
          <div className="min-w-0">
            <h1 className="font-display text-sm font-bold text-white leading-tight whitespace-nowrap">Earth Park</h1>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest leading-tight whitespace-nowrap hidden min-[380px]:block">Parque Tem&aacute;tico &middot; Macanal</p>
          </div>
        </Link>
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <SyncButton compacto />
          {usuario && (
            <button
              onClick={logout}
              className="text-gray-500 hover:text-red-400 transition text-xs px-2 py-1
                rounded-lg border border-gray-700 hover:border-red-800"
              title="Cerrar sesión"
            >
              Salir
            </button>
          )}
          <a
            href="https://www.instagram.com/earthpark.co"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="hidden sm:inline-flex text-gray-600 hover:text-pink-400 transition-colors duration-200 p-1.5 rounded-lg"
          >
            <InstagramIcon className="w-4 h-4" />
          </a>
          <a
            href="https://www.tiktok.com/@earthpark.co"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TikTok"
            className="hidden sm:inline-flex text-gray-600 hover:text-gray-300 transition-colors duration-200 p-1.5 rounded-lg"
          >
            <TikTokIcon className="w-4 h-4" />
          </a>
          {reservasCount > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
              {reservasCount}
            </span>
          )}
        </div>
      </header>

      {/* ── Mobile Bottom Bar: 4 accesos + "Más" ─────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass-nav border-t z-40 safe-area-bottom">
        <div className="grid grid-cols-5 px-1 py-1.5">
          {[...principales, { path: "#mas", label: "Más", icon: LayoutGrid }].map((tab) => {
            const Icon = tab.icon;
            const esMas = tab.path === "#mas";
            const active = esMas ? (mas || masActivo) : activoMovil(tab.path);
            const contenido = (
              <>
                <div className="relative">
                  <Icon className="w-6 h-6" />
                  {tab.path === "/reservas" && reservasCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 bg-emerald-500 text-white text-[9px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                      {reservasCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium">{tab.label}</span>
              </>
            );
            const clase = `flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-colors
              ${active ? "text-emerald-400 bg-emerald-500/10" : "text-gray-400 active:bg-white/5"}`;
            return esMas
              ? <button key={tab.path} onClick={() => setMas((v) => !v)} className={clase}>{contenido}</button>
              : <Link key={tab.path} to={tab.path} className={clase}>{contenido}</Link>;
          })}
        </div>
      </nav>

      {/* Hoja "Más": el resto de secciones y las herramientas de marketing */}
      {mas && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/60" onClick={() => setMas(false)}>
          <div className="absolute left-0 right-0 bottom-0 rounded-t-3xl px-4 pt-3 pb-24 space-y-4"
            style={{ background: "#071407", borderTop: "1px solid rgba(77,142,30,0.35)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="w-10 h-1 rounded-full bg-white/20 mx-auto" />
              <button onClick={() => setMas(false)} className="absolute right-4 top-3 text-gray-400 p-1"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Secciones</p>
              <div className="grid grid-cols-3 gap-2">
                {resto.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <Link key={tab.path} to={tab.path}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl text-xs font-medium border ${isActive(tab.path) ? "text-emerald-300 border-emerald-500/50 bg-emerald-500/10" : "text-gray-200 border-white/10 bg-white/5"}`}>
                      <Icon className="w-6 h-6" /> {tab.label}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Marketing</p>
              <div className="grid grid-cols-3 gap-2">
                {HERRAMIENTAS_MARKETING.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <Link key={tab.path} to={tab.path}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl text-xs font-medium border ${isActive(tab.path) ? "text-lime-300 border-lime-500/50 bg-lime-500/10" : "text-gray-200 border-white/10 bg-white/5"}`}>
                      <Icon className="w-6 h-6" /> {tab.label}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 text-gray-500">
              <a href="https://www.instagram.com/earthpark.co" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="p-2"><InstagramIcon className="w-5 h-5" /></a>
              <a href="https://www.tiktok.com/@earthpark.co" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="p-2"><TikTokIcon className="w-5 h-5" /></a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
