export function formatCOP(valor, opts = {}) {
  if (valor === null || valor === undefined) return "—";
  const n = Math.round(valor);
  if (opts.short && n >= 1_000_000)
    return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (opts.short && n >= 1_000)
    return "$" + (n / 1_000).toFixed(0) + "K";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}
