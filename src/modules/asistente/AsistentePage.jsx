import { useState, useRef, useEffect, useCallback } from "react";
import { useReservas } from "../../context/ReservasContext";
import { formatCOP } from "../../utils/formatCOP";
import { Bot, Send, User, Loader2, Sparkles, RotateCcw } from "lucide-react";

const MODEL = "claude-sonnet-4-20250514";

function buildSistema(state) {
  const hoy = new Date().toISOString().split("T")[0];
  const { reservas, egresos } = state;

  const ingresoTotal = reservas.reduce((s, r) => s + (Number(r.ingreso_total) || 0), 0);
  const egresoTotal  = egresos.reduce((s, e) => s + (Number(e.monto) || 0), 0);
  const utilidad     = ingresoTotal - egresoTotal;
  const margenPct    = ingresoTotal > 0 ? ((utilidad / ingresoTotal) * 100).toFixed(1) : "0.0";

  const hoyLlegadas = reservas.filter(r => r.fecha_inicio === hoy);
  const hoySalidas  = reservas.filter(r => r.fecha_fin === hoy);
  const proximas    = reservas
    .filter(r => r.fecha_inicio >= hoy)
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))
    .slice(0, 15);

  const fmtR = (r) =>
    `[${r.fecha_inicio || "?"}] ${r.nombre_grupo || r.contacto || r.reserva_id} · ` +
    `${r.total_personas || "?"}p · Plan ${r.plan || "?"} · ` +
    `Ingreso: ${formatCOP(r.ingreso_total)}` +
    (r.fecha_fin ? ` · hasta ${r.fecha_fin}` : "") +
    (r.es_historico ? " · [histórico]" : "");

  const resumenReservas = reservas.slice(0, 100).map(fmtR).join("\n");
  const resumenEgresos = egresos.slice(0, 50).map(e =>
    `[${e.fecha || "?"}] ${e.descripcion || "Sin descripción"} · ${formatCOP(e.monto)}` +
    (e.reserva_id ? ` · Reserva: ${e.reserva_id}` : "")
  ).join("\n");

  return `Eres el asesor financiero experto y consultor de negocios de Earth Park, parque temático de ecoturismo en Macanal, Boyacá, Colombia. Tu rol es dar análisis financieros rigurosos, recomendaciones de inversión y gestión operativa con enfoque en rentabilidad y sostenibilidad.

## Negocio
Earth Park ofrece experiencias de ecoturismo con hospedaje (Cabaña Mariposa: máx 5 personas, Cuarto Ancestros: máx 2 personas), gastronomía y actividades de naturaleza.
Planes: Visita (1 día sin noche), 2D1N (2 días 1 noche), 3D2N (3 días 2 noches).
Precios: Experiencias $212.000/p · Alimentación $90.000/p · Alojamiento $90.000/p · Guía 2D1N $120.000 · Guía 3D2N $240.000

## Dashboard financiero — hoy ${hoy}
- Total reservas en sistema: ${reservas.length}
- Ingresos totales acumulados: ${formatCOP(ingresoTotal)}
- Egresos totales acumulados: ${formatCOP(egresoTotal)}
- Utilidad neta acumulada: ${formatCOP(utilidad)}
- Margen de utilidad: ${margenPct}% (benchmark mínimo objetivo: 85%)

## Actividad de hoy (${hoy})
Llegadas: ${hoyLlegadas.length > 0 ? hoyLlegadas.map(r => `${r.nombre_grupo || r.contacto || r.reserva_id} (${r.total_personas}p, plan ${r.plan})`).join("; ") : "Ninguna"}
Salidas: ${hoySalidas.length > 0 ? hoySalidas.map(r => `${r.nombre_grupo || r.contacto || r.reserva_id} (${r.total_personas}p)`).join("; ") : "Ninguna"}

## Próximas ${proximas.length} reservas
${proximas.length > 0 ? proximas.map(fmtR).join("\n") : "Sin reservas futuras registradas"}

## Historial completo de reservas (hasta 100)
${resumenReservas || "Sin datos"}

## Egresos registrados (hasta 50)
${resumenEgresos || "Sin egresos registrados"}

## Instrucciones de comportamiento
- Responde SIEMPRE en español colombiano
- Para análisis financiero: usa los números exactos del dashboard, identifica riesgos y oportunidades
- Para preguntas operativas sobre reservas específicas: busca en el historial y da respuestas precisas
- Para análisis de viabilidad o inversión: incluye ROI estimado, punto de equilibrio y recomendaciones concretas
- Formatea montos en pesos colombianos (ej: $2.500.000 COP)
- Sé directo, profesional y útil
- Si no tienes suficiente información, dilo claramente`;
}

const SUGERENCIAS = [
  "¿Cuál es el margen de utilidad actual?",
  "¿Quién llega o sale hoy?",
  "¿Cuáles son las próximas reservas?",
  "¿Cómo mejorar la rentabilidad del parque?",
  "Analiza la viabilidad financiera del negocio",
  "¿Cuánto se generó en ingresos este año?",
];

export default function AsistentePage() {
  const { state } = useReservas();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 128) + "px";
  }, [input]);

  const sendMessage = useCallback(async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const workerUrl = import.meta.env.VITE_WORKER_URL;
    if (!workerUrl) {
      setError("VITE_WORKER_URL no está configurada. Despliega el Cloudflare Worker y agrega su URL al .env");
      return;
    }

    const userMsg = { role: "user", content: msg };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", content: "", streaming: true }]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const resp = await fetch(workerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 2048,
          stream: true,
          system: buildSistema(state),
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error?.message || `Error HTTP ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
              accumulated += parsed.delta.text;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: accumulated, streaming: true };
                return updated;
              });
            }
          } catch (_) {}
        }
      }

      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: accumulated };
        return updated;
      });
    } catch (err) {
      setMessages(prev => prev.slice(0, -1));
      setError(err.message || "Error al conectar con el asistente");
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading, state]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    /* Fixed container that fills the content area excluding both nav bars */
    <div
      className="fixed inset-0 top-14 bottom-16 lg:top-0 lg:bottom-0 lg:left-64 flex flex-col z-10"
      style={{ background: "linear-gradient(135deg, #050d03 0%, #091806 50%, #060f04 100%)" }}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: "rgba(77,142,30,0.2)", background: "rgba(6,14,3,0.97)" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
            <Bot className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white leading-tight">Asistente Earth Park</h2>
            <p className="text-[10px] text-gray-500 leading-tight">
              Asesor financiero · {state.reservas.length} reservas cargadas
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); setError(null); }}
            className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 px-2.5 py-1.5 rounded-lg hover:bg-gray-800/50 transition-all"
          >
            <RotateCcw className="w-3 h-3" />
            Limpiar
          </button>
        )}
      </div>

      {/* ── Messages ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-5 py-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-white mb-1">¿En qué puedo ayudarte?</h3>
              <p className="text-xs text-gray-500">Tengo acceso completo a los datos del dashboard</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left text-xs text-gray-300 px-3 py-2.5 rounded-xl border transition-all hover:text-white"
                  style={{
                    borderColor: "rgba(77,142,30,0.18)",
                    background: "rgba(10,22,6,0.5)",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "rgba(77,142,30,0.40)";
                    e.currentTarget.style.background = "rgba(77,142,30,0.07)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "rgba(77,142,30,0.18)";
                    e.currentTarget.style.background = "rgba(10,22,6,0.5)";
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {/* Assistant avatar */}
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            )}

            {/* Bubble */}
            <div
              className={`max-w-[82%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "rounded-tr-sm text-emerald-50"
                  : "rounded-tl-sm text-gray-200"
              }`}
              style={
                msg.role === "user"
                  ? {
                      background: "rgba(52,211,153,0.15)",
                      border: "1px solid rgba(52,211,153,0.25)",
                    }
                  : {
                      background: "rgba(10,22,6,0.75)",
                      border: "1px solid rgba(77,142,30,0.15)",
                    }
              }
            >
              {msg.content ? (
                <>
                  <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                  {msg.streaming && (
                    <span className="inline-block w-0.5 h-4 bg-emerald-400 animate-pulse ml-0.5 align-middle" />
                  )}
                </>
              ) : msg.streaming ? (
                <span className="inline-flex items-center gap-1.5 text-gray-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Pensando…
                </span>
              ) : null}
            </div>

            {/* User avatar */}
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-lg bg-gray-700/60 border border-gray-600/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-gray-400" />
              </div>
            )}
          </div>
        ))}

        {/* Error notice */}
        {error && (
          <div className="mx-auto max-w-sm px-4 py-3 rounded-xl text-sm text-center"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ───────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 border-t px-4 py-3"
        style={{ borderColor: "rgba(77,142,30,0.2)", background: "rgba(6,14,3,0.97)" }}
      >
        <div className="flex gap-2 items-end max-w-3xl mx-auto">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu pregunta… (Enter para enviar)"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none text-sm py-2.5 px-4 disabled:opacity-60"
            style={{
              minHeight: "42px",
              maxHeight: "128px",
              background: "rgba(20,38,12,0.8)",
              border: "1px solid rgba(77,142,30,0.25)",
              borderRadius: "14px",
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background:
                !loading && input.trim()
                  ? "rgba(77,142,30,0.85)"
                  : "rgba(77,142,30,0.15)",
            }}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 text-emerald-300 animate-spin" />
            ) : (
              <Send className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-gray-600 text-center mt-1.5">
          Enter para enviar · Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  );
}
