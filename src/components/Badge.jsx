const variantClasses = {
  ok:      "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  warn:    "bg-amber-500/20 text-amber-400 border-amber-500/30",
  danger:  "bg-red-500/20 text-red-400 border-red-500/30",
  info:    "bg-sky-500/20 text-sky-400 border-sky-500/30",
  pending: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default function Badge({ children, variant = "info", className = "" }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
        ${variantClasses[variant] || variantClasses.info} ${className}`}
    >
      {children}
    </span>
  );
}
