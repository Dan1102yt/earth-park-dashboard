const colorMap = {
  earth:  { border: "border-l-emerald-500", bg: "bg-emerald-500/15", text: "text-emerald-400", glow: "metric-glow-earth" },
  bark:   { border: "border-l-amber-500",   bg: "bg-amber-500/15",   text: "text-amber-400",   glow: "metric-glow-bark"  },
  sky:    { border: "border-l-sky-500",      bg: "bg-sky-500/15",     text: "text-sky-400",     glow: "metric-glow-sky"   },
  danger: { border: "border-l-red-500",      bg: "bg-red-500/15",     text: "text-red-400",     glow: "metric-glow-danger"},
};

export default function MetricCard({ label, value, sub, icon: Icon, colorVariant = "earth", className = "" }) {
  const c = colorMap[colorVariant] || colorMap.earth;

  return (
    <div
      className={`glass-card border-l-4 ${c.border} ${c.glow} p-4 sm:p-5 animate-slide-up ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
            {label}
          </p>
          <p className="text-xl sm:text-2xl font-bold text-white truncate">{value}</p>
          {sub && (
            <p className="text-xs sm:text-sm text-gray-400 mt-1 truncate">{sub}</p>
          )}
        </div>
        {Icon && (
          <div className={`${c.bg} p-2.5 sm:p-3 rounded-xl ml-2 sm:ml-3 flex-shrink-0`}>
            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${c.text}`} />
          </div>
        )}
      </div>
    </div>
  );
}
