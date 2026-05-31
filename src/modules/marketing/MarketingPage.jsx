import { useState, useCallback } from "react";
import {
  Megaphone, Loader2, Sparkles, Calendar, Wand2,
  Copy, Check, RefreshCw, Camera, Palette, Hash, FileText,
  AlertCircle,
} from "lucide-react";

const MODEL = "claude-sonnet-4-5";

const DIAS_SEMANA = [
  { dia: "Lunes",     pilar: "Reel mariposas educativo",             emoji: "🦋" },
  { dia: "Martes",    pilar: "Carrusel experiencia familiar",         emoji: "👨‍👩‍👧‍👦" },
  { dia: "Miércoles", pilar: "Detrás de cámaras",                    emoji: "🎬" },
  { dia: "Jueves",    pilar: "Post educativo mariposas Boyacá",       emoji: "📚" },
  { dia: "Viernes",   pilar: "TikTok plan fin de semana",             emoji: "🎵" },
  { dia: "Sábado",    pilar: "Stories + post del día",                emoji: "📸" },
  { dia: "Domingo",   pilar: "Reel cierre con llamado a reservar",    emoji: "✨" },
];

const SISTEMA = `Eres el estratega de contenido digital de Earth Park, parque temático de ecoturismo en Macanal, Boyacá, Colombia. Instagram y TikTok: @earthpark.co

## Identidad de marca
- Tono: cercano, familiar, educativo y auténtico colombiano
- Diferenciadores: mariposas vivas, ecosistema natural, hospedaje privado, gastronomía campesina
- Planes: Visita 1 día · 2D1N $340.000/persona · 3D2N $870.000/persona
- Público: familias colombianas, parejas, grupos de amigos
- Meta: 10.000 seguidores generando reservas reales
- Valores: naturaleza, educación, sostenibilidad, autenticidad colombiana

## Paleta de colores Canva
- Verde oscuro: #1B4332 (fondos principales)
- Verde medio: #2D6A4F (elementos secundarios)
- Verde claro: #81C784 (acentos y CTA)
- Blanco: #FFFFFF (texto sobre fondos oscuros)

## Reglas de contenido
- Escribe en español colombiano auténtico, nunca suena corporativo
- El copy debe conectar emocionalmente con la familia colombiana
- Hashtags: 10-15 mezclados español/inglés, específicos para ecoturismo Colombia
- Instrucciones de foto: ángulo exacto, tipo de luz, composición, qué elemento protagoniza
- Instrucciones Canva: colores exactos de la paleta, tipografía (Sans Bold para títulos, Regular para cuerpo), posición de elementos, iconos o ilustraciones sugeridos`;

function extraerJSON(texto) {
  const matchBlock = texto.match(/```json\s*([\s\S]*?)\s*```/);
  if (matchBlock) {
    try { return JSON.parse(matchBlock[1]); } catch (_) {}
  }
  const matchArray = texto.match(/(\[[\s\S]*\])/);
  if (matchArray) {
    try { return JSON.parse(matchArray[1]); } catch (_) {}
  }
  const matchObj = texto.match(/(\{[\s\S]*\})/);
  if (matchObj) {
    try { return JSON.parse(matchObj[1]); } catch (_) {}
  }
  try { return JSON.parse(texto.trim()); } catch (_) {}
  return null;
}

async function llamarClaude(workerUrl, userPrompt, onProgress, onDone, onError) {
  try {
    const resp = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        stream: true,
        system: SISTEMA,
        messages: [{ role: "user", content: userPrompt }],
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
            onProgress(accumulated);
          }
        } catch (_) {}
      }
    }

    onDone(accumulated);
  } catch (err) {
    onError(err.message || "Error al conectar con la API");
  }
}

/* ─── Componente CopiarBtn ─────────────────────────────────── */
function CopiarBtn({ texto, className = "" }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = () => {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    });
  };
  return (
    <button
      onClick={copiar}
      className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg transition-all ${
        copiado
          ? "bg-emerald-500/20 text-emerald-300"
          : "bg-gray-700/40 text-gray-400 hover:bg-gray-700/70 hover:text-gray-200"
      } ${className}`}
    >
      {copiado ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copiado ? "Copiado" : "Copiar"}
    </button>
  );
}

/* ─── Componente PostCard ──────────────────────────────────── */
function PostCard({ post, index }) {
  const info = DIAS_SEMANA[index] || {};
  return (
    <div
      className="rounded-2xl p-4 space-y-3 flex flex-col"
      style={{
        background: "rgba(10,22,6,0.75)",
        border: "1px solid rgba(77,142,30,0.18)",
      }}
    >
      {/* Header del día */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{info.emoji || "📅"}</span>
          <div>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{post.dia || info.dia}</p>
            <p className="text-[10px] text-gray-500">{post.pilar || info.pilar}</p>
          </div>
        </div>
      </div>

      {/* Copy */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-emerald-400/70" />
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Copy</span>
          </div>
          <CopiarBtn texto={post.copy || ""} />
        </div>
        <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{post.copy}</p>
      </div>

      {/* Hashtags */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Hash className="w-3 h-3 text-emerald-400/70" />
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Hashtags</span>
          </div>
          <CopiarBtn texto={Array.isArray(post.hashtags) ? post.hashtags.join(" ") : (post.hashtags || "")} />
        </div>
        <div className="flex flex-wrap gap-1">
          {Array.isArray(post.hashtags)
            ? post.hashtags.map((h, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-md text-emerald-300"
                  style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.15)" }}>
                  {h}
                </span>
              ))
            : <span className="text-xs text-gray-400">{post.hashtags}</span>
          }
        </div>
      </div>

      {/* Instrucciones foto */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Camera className="w-3 h-3 text-emerald-400/70" />
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Instrucciones de foto</span>
        </div>
        <p className="text-xs text-gray-300 leading-relaxed">{post.instrucciones_foto}</p>
      </div>

      {/* Instrucciones Canva */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Palette className="w-3 h-3 text-emerald-400/70" />
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Instrucciones Canva</span>
        </div>
        <p className="text-xs text-gray-300 leading-relaxed">{post.instrucciones_canva}</p>
        <div className="flex gap-1.5 mt-1">
          {["#1B4332", "#2D6A4F", "#81C784", "#FFFFFF"].map(c => (
            <div key={c} title={c} className="w-5 h-5 rounded-full ring-1 ring-gray-700/60 flex-shrink-0"
              style={{ background: c }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Esqueleto de carga ───────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="rounded-2xl p-4 space-y-3 animate-pulse"
      style={{ background: "rgba(10,22,6,0.75)", border: "1px solid rgba(77,142,30,0.12)" }}>
      <div className="h-3 w-20 rounded bg-emerald-900/50" />
      <div className="space-y-1.5">
        <div className="h-2 w-full rounded bg-gray-800/60" />
        <div className="h-2 w-3/4 rounded bg-gray-800/60" />
        <div className="h-2 w-5/6 rounded bg-gray-800/60" />
      </div>
      <div className="flex gap-1">
        {[1,2,3,4].map(i => <div key={i} className="h-4 w-12 rounded-md bg-emerald-900/30" />)}
      </div>
      <div className="space-y-1.5">
        <div className="h-2 w-full rounded bg-gray-800/40" />
        <div className="h-2 w-4/5 rounded bg-gray-800/40" />
      </div>
    </div>
  );
}

/* ─── Componente principal ─────────────────────────────────── */
export default function MarketingPage() {
  const [semana, setSemana] = useState([]);
  const [loadingSemana, setLoadingSemana] = useState(false);
  const [errorSemana, setErrorSemana] = useState(null);
  const [progresoSemana, setProgresoSemana] = useState(0);

  const [inputPost, setInputPost] = useState("");
  const [postGenerado, setPostGenerado] = useState(null);
  const [loadingPost, setLoadingPost] = useState(false);
  const [errorPost, setErrorPost] = useState(null);

  const workerUrl = import.meta.env.VITE_WORKER_URL;

  const generarSemana = useCallback(async () => {
    if (!workerUrl) {
      setErrorSemana("VITE_WORKER_URL no está configurada.");
      return;
    }
    setLoadingSemana(true);
    setErrorSemana(null);
    setSemana([]);
    setProgresoSemana(0);

    const prompt = `Genera el calendario de contenido completo para esta semana de Earth Park en Instagram y TikTok (@earthpark.co).

Días y pilares:
${DIAS_SEMANA.map(d => `- ${d.dia}: ${d.pilar}`).join("\n")}

Para cada post incluye:
1. copy: texto listo para publicar (máx 280 chars, incluye emojis naturales, acción clara al final)
2. hashtags: array de 12-15 hashtags relevantes (mezcla español/inglés, ecoturismo Colombia, mariposas)
3. instrucciones_foto: descripción muy concreta de la toma (ángulo, tipo de luz, composición, sujeto principal)
4. instrucciones_canva: guía detallada para diseñar en Canva (colores de paleta, tipografía, disposición, elementos gráficos)

Responde ÚNICAMENTE con un JSON válido, sin texto adicional ni bloques de código markdown:
[{"dia":"Lunes","pilar":"...","copy":"...","hashtags":["#..."],"instrucciones_foto":"...","instrucciones_canva":"..."},...]`;

    let chars = 0;
    await llamarClaude(
      workerUrl,
      prompt,
      (acc) => {
        chars = acc.length;
        setProgresoSemana(Math.min(Math.round((chars / 3500) * 100), 95));
      },
      (final) => {
        setProgresoSemana(100);
        const parsed = extraerJSON(final);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSemana(parsed);
        } else {
          setErrorSemana("No se pudo interpretar la respuesta. Intenta de nuevo.");
        }
        setLoadingSemana(false);
      },
      (errMsg) => {
        setErrorSemana(errMsg);
        setLoadingSemana(false);
      }
    );
  }, [workerUrl]);

  const generarPost = useCallback(async () => {
    if (!inputPost.trim() || !workerUrl) return;
    setLoadingPost(true);
    setErrorPost(null);
    setPostGenerado(null);

    const prompt = `Genera un post para Earth Park (@earthpark.co) en Instagram o TikTok.

El usuario describe lo que quiere: "${inputPost.trim()}"

Responde ÚNICAMENTE con un JSON válido, sin texto adicional:
{"copy":"...","hashtags":["#..."],"instrucciones_foto":"...","instrucciones_canva":"..."}`;

    await llamarClaude(
      workerUrl,
      prompt,
      () => {},
      (final) => {
        const parsed = extraerJSON(final);
        if (parsed && parsed.copy) {
          setPostGenerado(parsed);
        } else {
          setErrorPost("No se pudo interpretar la respuesta. Intenta de nuevo.");
        }
        setLoadingPost(false);
      },
      (errMsg) => {
        setErrorPost(errMsg);
        setLoadingPost(false);
      }
    );
  }, [inputPost, workerUrl]);

  return (
    <div
      className="pt-16 pb-24 lg:pt-8 lg:pb-8 min-h-screen px-4 lg:px-8"
      style={{ background: "linear-gradient(135deg, #050d03 0%, #091806 50%, #060f04 100%)" }}
    >
      <div className="max-w-6xl mx-auto space-y-10">

        {/* ── Page header ──────────────────────────────────── */}
        <div className="flex items-center gap-3 pt-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(77,142,30,0.15)", border: "1px solid rgba(77,142,30,0.25)" }}>
            <Megaphone className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">Marketing</h1>
            <p className="text-xs text-gray-500">Genera contenido listo para @earthpark.co · Instagram & TikTok</p>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            SECCIÓN 1 — Calendario semanal
            ══════════════════════════════════════════════════ */}
        <section className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <h2 className="text-base font-semibold text-white">Calendario semanal</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full text-emerald-300 font-medium"
                style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}>
                7 posts
              </span>
            </div>
            <button
              onClick={generarSemana}
              disabled={loadingSemana}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: loadingSemana ? "rgba(77,142,30,0.20)" : "rgba(77,142,30,0.80)",
                border: "1px solid rgba(77,142,30,0.40)",
                color: "#fff",
              }}
            >
              {loadingSemana ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generando… {progresoSemana < 100 ? `${progresoSemana}%` : ""}
                </>
              ) : (
                <>
                  {semana.length > 0 ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  {semana.length > 0 ? "Regenerar semana" : "Generar semana"}
                </>
              )}
            </button>
          </div>

          {/* Pilares de la semana (siempre visibles) */}
          {semana.length === 0 && !loadingSemana && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {DIAS_SEMANA.map((d) => (
                <div key={d.dia}
                  className="rounded-xl px-3 py-2.5 text-center space-y-0.5"
                  style={{ background: "rgba(10,22,6,0.60)", border: "1px solid rgba(77,142,30,0.12)" }}>
                  <p className="text-lg">{d.emoji}</p>
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">{d.dia}</p>
                  <p className="text-[9px] text-gray-500 leading-snug">{d.pilar}</p>
                </div>
              ))}
            </div>
          )}

          {/* Barra de progreso */}
          {loadingSemana && (
            <div className="space-y-2">
              <div className="w-full h-1.5 rounded-full bg-gray-800/60 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progresoSemana}%`, background: "linear-gradient(90deg, #2D6A4F, #81C784)" }}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {DIAS_SEMANA.map((_, i) => <SkeletonCard key={i} />)}
              </div>
            </div>
          )}

          {/* Error semana */}
          {errorSemana && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)", color: "#f87171" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorSemana}</span>
            </div>
          )}

          {/* Grid de posts */}
          {semana.length > 0 && !loadingSemana && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {semana.map((post, i) => (
                <PostCard key={i} post={post} index={i} />
              ))}
            </div>
          )}
        </section>

        {/* Separador */}
        <div className="border-t" style={{ borderColor: "rgba(77,142,30,0.12)" }} />

        {/* ══════════════════════════════════════════════════
            SECCIÓN 2 — Generador individual
            ══════════════════════════════════════════════════ */}
        <section className="space-y-5">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-semibold text-white">Generador individual</h2>
          </div>

          <div
            className="rounded-2xl p-5 space-y-4"
            style={{ background: "rgba(10,22,6,0.75)", border: "1px solid rgba(77,142,30,0.18)" }}
          >
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Describe el post que quieres
              </label>
              <textarea
                value={inputPost}
                onChange={e => setInputPost(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && e.metaKey) generarPost(); }}
                placeholder="Ej: Un post sobre la temporada de mariposas en agosto, con foco en familias que quieren venir en vacaciones escolares…"
                rows={3}
                className="w-full resize-none text-sm py-3 px-4 rounded-xl placeholder-gray-600 text-gray-200 focus:outline-none transition-all"
                style={{
                  background: "rgba(20,38,12,0.8)",
                  border: "1px solid rgba(77,142,30,0.25)",
                }}
              />
              <p className="text-[10px] text-gray-600">⌘+Enter para generar</p>
            </div>

            <button
              onClick={generarPost}
              disabled={loadingPost || !inputPost.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background:
                  !loadingPost && inputPost.trim()
                    ? "rgba(77,142,30,0.80)"
                    : "rgba(77,142,30,0.18)",
                border: "1px solid rgba(77,142,30,0.35)",
                color: "#fff",
              }}
            >
              {loadingPost ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Generando post…</>
              ) : (
                <><Wand2 className="w-4 h-4" />Generar post</>
              )}
            </button>
          </div>

          {/* Error post individual */}
          {errorPost && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)", color: "#f87171" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorPost}</span>
            </div>
          )}

          {/* Post generado */}
          {postGenerado && !loadingPost && (
            <div
              className="rounded-2xl p-5 space-y-4"
              style={{ background: "rgba(10,22,6,0.75)", border: "1px solid rgba(77,142,30,0.25)" }}
            >
              <div className="flex items-center gap-2 pb-1 border-b" style={{ borderColor: "rgba(77,142,30,0.12)" }}>
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-300">Post generado</span>
              </div>

              {/* Copy */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-emerald-400/70" />
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Copy</span>
                  </div>
                  <CopiarBtn texto={postGenerado.copy || ""} />
                </div>
                <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{postGenerado.copy}</p>
              </div>

              {/* Hashtags */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Hash className="w-3 h-3 text-emerald-400/70" />
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Hashtags</span>
                  </div>
                  <CopiarBtn texto={Array.isArray(postGenerado.hashtags) ? postGenerado.hashtags.join(" ") : (postGenerado.hashtags || "")} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Array.isArray(postGenerado.hashtags)
                    ? postGenerado.hashtags.map((h, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded-md text-emerald-300"
                          style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.15)" }}>
                          {h}
                        </span>
                      ))
                    : <span className="text-xs text-gray-400">{postGenerado.hashtags}</span>
                  }
                </div>
              </div>

              {/* Foto */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Camera className="w-3 h-3 text-emerald-400/70" />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Instrucciones de foto</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{postGenerado.instrucciones_foto}</p>
              </div>

              {/* Canva */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Palette className="w-3 h-3 text-emerald-400/70" />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Instrucciones Canva</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{postGenerado.instrucciones_canva}</p>
                <div className="flex gap-2 mt-2">
                  {["#1B4332","#2D6A4F","#81C784","#FFFFFF"].map(c => (
                    <div key={c} title={c}
                      className="w-6 h-6 rounded-full ring-1 ring-gray-700/60"
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
