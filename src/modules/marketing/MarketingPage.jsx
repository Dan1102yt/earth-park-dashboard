import { useState, useCallback, useRef, useEffect } from "react";
import {
  Megaphone, Loader2, Sparkles, Calendar, Wand2,
  Copy, Check, RefreshCw, Camera, Palette, Hash, FileText,
  AlertCircle,
} from "lucide-react";
import { useMarketingStorage } from "./useMarketingStorage";

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

const SISTEMA = `Eres el agente de marketing digital de Earth Park,
un glamping ecológico en Boyacá, Colombia. Tu misión es llevar la cuenta
de Instagram de 0 a 10.000 seguidores en 3 meses usando contenido viral.

CONTEXTO DEL NEGOCIO:
- Ubicación: Boyacá, Colombia — naturaleza, silencio, desconexión
- Servicios: hospedaje glamping, gastronomía local, artesanías, cauchos moldeados
- Audiencia objetivo: familias, parejas, millennials urbanos que buscan escapar
- Diferenciador: experiencia completa de naturaleza con comodidad

PILARES DE CONTENIDO SEMANAL:
Lunes: Inspiración (paisajes, amanecer, naturaleza)
Martes: Detrás de cámaras (cocina, preparación, equipo)
Miércoles: Testimonio o reseña de huésped
Jueves: Educativo (flora, fauna, cultura boyacense)
Viernes: Oferta o paquete del fin de semana
Sábado: Experiencia en vivo (stories, reels del momento)
Domingo: Reflexión más CTA de reserva

ESTRUCTURA VIRAL OBLIGATORIA para cada post:
1. HOOK: primera línea que genera curiosidad o emoción en 0.3 segundos
2. DESARROLLO: 3-5 líneas que amplían el hook con valor real
3. CTA claro: una acción específica (reserva, comenta, comparte, guarda)
4. HASHTAGS: 20-25 hashtags en español mezclando nicho, masivos y locales

REGLAS DE ESCRITURA:
- Voz cercana, evocadora, sin tecnicismos
- Emojis: 2-4 por post, estratégicos
- Nunca usar comillas dobles en el texto de los posts
- Siempre en español colombiano natural

FORMATO DE RESPUESTA — ABSOLUTAMENTE CRÍTICO:
Debes responder ÚNICAMENTE con un array JSON.
USA COMILLAS SIMPLES dentro de los textos si necesitas citar algo.
NUNCA uses comillas dobles dentro de los valores de los campos.
El array tiene exactamente 7 objetos con esta estructura exacta:

[
  {
    "dia": "Lunes",
    "pilar": "Inspiración",
    "emoji": "🌄",
    "hook": "primera línea del post sin comillas dobles internas",
    "copy": "texto completo del post. Usa saltos de línea reales no barras n. Sin comillas dobles internas.",
    "hashtags": ["glamping", "boyaca", "naturaleza"],
    "instrucciones_foto": "descripción de la foto ideal sin comillas dobles",
    "instrucciones_canva": "instrucciones de diseño sin comillas dobles"
  }
]

No escribas nada antes ni después del array JSON.
No uses bloques de codigo markdown.
Empieza directamente con el corchete de apertura: [`;

function limpiarMarkdown(texto) {
  return texto.trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
}

function extraerJSON(texto) {
  if (!texto) return null;
  const limpio = limpiarMarkdown(texto);

  // Intento 1: parse directo
  try {
    const r = JSON.parse(limpio);
    return Array.isArray(r) ? r : [r];
  } catch {}

  // Intento 2: extraer entre primer [ y último ]
  const fb = limpio.indexOf("[");
  const lb = limpio.lastIndexOf("]");
  if (fb !== -1 && lb > fb) {
    try {
      const r = JSON.parse(limpio.slice(fb, lb + 1));
      return Array.isArray(r) ? r : [r];
    } catch {}
  }

  // Intento 3: construir objetos manualmente desde separadores conocidos
  const bloques = limpio.split(/\},\s*\{/);
  if (bloques.length >= 2) {
    try {
      const reconstruido = bloques
        .map((b, i) => {
          let bloque = b.trim();
          if (i === 0) bloque = bloque.replace(/^\[?\s*\{?/, "{");
          else bloque = "{" + bloque;
          if (i === bloques.length - 1) bloque = bloque.replace(/\}?\s*\]?$/, "}");
          else bloque = bloque + "}";
          return bloque;
        })
        .map(b => { try { return JSON.parse(b); } catch { return null; } })
        .filter(Boolean);
      if (reconstruido.length > 0) return reconstruido;
    } catch {}
  }

  return null;
}

async function llamarClaude(workerUrl, userPrompt) {
  const response = await fetch(workerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: SISTEMA,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Worker error ${response.status}: ${errText}`);
  }

  const data = await response.json();

  const texto = data?.content?.[0]?.text || "";
  if (!texto) throw new Error("Respuesta vacía del modelo");

  const parsed = extraerJSON(texto);
  if (!parsed) {
    throw new Error(
      "No se pudo interpretar la respuesta. Primeros 300 chars: " +
      texto.substring(0, 300)
    );
  }
  return parsed;
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
  const [copiado, setCopiado] = useState(false);
  const [foto, setFoto] = useState(null);
  const [fotoUrl, setFotoUrl] = useState(null);
  const inputRef = useRef(null);
  const cardRef = useRef(null);
  const info = DIAS_SEMANA[index] || {};

  useEffect(() => {
    return () => { if (fotoUrl) URL.revokeObjectURL(fotoUrl); };
  }, [fotoUrl]);

  const handleFoto = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (fotoUrl) URL.revokeObjectURL(fotoUrl);
    setFoto(file);
    setFotoUrl(URL.createObjectURL(file));
  };

  const quitarFoto = () => {
    if (fotoUrl) URL.revokeObjectURL(fotoUrl);
    setFoto(null);
    setFotoUrl(null);
  };

  const diaLabel = post.dia || info.dia || "";
  const pilarLabel = post.pilar || info.pilar || "";
  const emojiLabel = post.emoji || info.emoji || "📅";
  const hashtagsTexto = Array.isArray(post.hashtags)
    ? post.hashtags.map(h => (h.startsWith("#") ? h : `#${h}`)).join(" ")
    : (post.hashtags || "");

  const fotoLinea = foto
    ? `\n\n📎 FOTO ADJUNTA: ${foto.name} (${(foto.size / 1024).toFixed(0)} KB)`
    : "";
  const textoCompleto = `--- POST ${diaLabel} — ${pilarLabel} ${emojiLabel} ---

${post.copy || ""}

${hashtagsTexto}

---
📸 FOTO: ${post.instrucciones_foto || ""}
🎨 CANVA: ${post.instrucciones_canva || ""}${fotoLinea}`;

  const copiarPost = () => {
    navigator.clipboard.writeText(textoCompleto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  const descargar = () => {
    const blob = new Blob([textoCompleto], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `earthpark-post-${diaLabel}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generarImagenPost = async () => {
    const W = 1080;
    const H = 1080;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    const shadowText = (texto, x, y, fuente, color, maxW, lineH) => {
      ctx.font = fuente;
      ctx.shadowColor = "rgba(0,0,0,0.95)";
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = color;
      ctx.shadowColor = "transparent";
      if (maxW) {
        const palabras = String(texto || "").split(" ");
        let linea = "";
        let cy = y;
        for (const p of palabras) {
          const prueba = linea + p + " ";
          if (ctx.measureText(prueba).width > maxW && linea) {
            ctx.shadowColor = "rgba(0,0,0,0.95)";
            ctx.fillText(linea.trim(), x, cy);
            ctx.shadowColor = "transparent";
            linea = p + " ";
            cy += lineH;
          } else linea = prueba;
        }
        if (linea.trim()) {
          ctx.shadowColor = "rgba(0,0,0,0.95)";
          ctx.fillText(linea.trim(), x, cy);
          ctx.shadowColor = "transparent";
        }
        return cy + lineH;
      } else {
        ctx.shadowColor = "rgba(0,0,0,0.95)";
        ctx.fillText(String(texto || ""), x, y);
        ctx.shadowColor = "transparent";
        return y + (lineH || 0);
      }
    };

    const roundRect = (x, y, w, h, r, fill, alpha = 1) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.restore();
    };

    // ── 1. Fondo ─────────────────────────────────────────────
    await new Promise((resolve) => {
      if (!fotoUrl) {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, "#071a07");
        grad.addColorStop(0.5, "#0f2e0f");
        grad.addColorStop(1, "#071a07");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        resolve();
      } else {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const r = Math.max(W / img.width, H / img.height);
          const iw = img.width * r;
          const ih = img.height * r;
          ctx.drawImage(img, (W - iw) / 2, (H - ih) / 2, iw, ih);
          const ov = ctx.createLinearGradient(0, 0, 0, H);
          ov.addColorStop(0, "rgba(0,10,0,0.60)");
          ov.addColorStop(0.45, "rgba(0,10,0,0.35)");
          ov.addColorStop(1, "rgba(0,10,0,0.85)");
          ctx.fillStyle = ov;
          ctx.fillRect(0, 0, W, H);
          resolve();
        };
        img.onerror = resolve;
        img.src = fotoUrl;
      }
    });

    // ── 2. Mariposas decorativas (SVG-style con Canvas) ──────
    const dibujarMariposa = (x, y, size, alpha, angle = 0) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.ellipse(-size * 0.6, -size * 0.3, size * 0.7, size * 0.45, -0.5, 0, Math.PI * 2);
      ctx.fillStyle = "#4CAF50";
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(size * 0.6, -size * 0.3, size * 0.7, size * 0.45, 0.5, 0, Math.PI * 2);
      ctx.fillStyle = "#66BB6A";
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-size * 0.45, size * 0.25, size * 0.5, size * 0.3, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = "#388E3C";
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(size * 0.45, size * 0.25, size * 0.5, size * 0.3, 0.3, 0, Math.PI * 2);
      ctx.fillStyle = "#43A047";
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.08, size * 0.55, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#1B5E20";
      ctx.fill();
      ctx.restore();
    };

    dibujarMariposa(80, 80, 28, 0.18, 0.3);
    dibujarMariposa(980, 120, 22, 0.15, -0.5);
    dibujarMariposa(950, 950, 32, 0.20, 0.8);
    dibujarMariposa(100, 960, 24, 0.16, -0.3);
    dibujarMariposa(540, 40, 18, 0.12, 0.1);
    dibujarMariposa(200, 500, 16, 0.10, 0.6);
    dibujarMariposa(880, 500, 20, 0.12, -0.4);
    dibujarMariposa(700, 80, 14, 0.10, 0.2);

    // ── 3. Borde elegante ─────────────────────────────────────
    ctx.strokeStyle = "rgba(76,175,80,0.3)";
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 24, W - 48, H - 48);

    const PAD = 72;
    const ANCHO = W - PAD * 2;
    let y = 72;

    // ── 4. Chip pilar (SIN el día) ────────────────────────────
    roundRect(PAD, y, 280, 44, 22, "rgba(27,94,32,0.85)");
    ctx.font = "bold 20px sans-serif";
    ctx.fillStyle = "#A5D6A7";
    ctx.textAlign = "left";
    ctx.shadowColor = "transparent";
    ctx.fillText(`${emojiLabel}  ${pilarLabel}`, PAD + 18, y + 28);
    y += 68;

    // ── 5. Hook grande y llamativo ────────────────────────────
    if (post.hook) {
      ctx.fillStyle = "#4CAF50";
      ctx.shadowColor = "rgba(76,175,80,0.6)";
      ctx.shadowBlur = 10;
      ctx.fillRect(PAD, y, 5, 160);
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      y = shadowText(
        String(post.hook).substring(0, 100),
        PAD + 22, y + 38,
        "bold italic 40px sans-serif",
        "#F9E04B",
        ANCHO - 22,
        50
      );
      y += 28;
    }

    // ── 6. Copy ───────────────────────────────────────────────
    y = shadowText(
      String(post.copy || "").substring(0, 380),
      PAD, y,
      "23px sans-serif",
      "rgba(255,255,255,0.93)",
      ANCHO,
      33
    );
    y += 36;

    // ── 7. CTA pill centrado ──────────────────────────────────
    const ctaW = 400;
    const ctaX = (W - ctaW) / 2;
    roundRect(ctaX, y, ctaW, 54, 27, "rgba(46,125,50,0.92)");
    ctx.font = "bold 24px sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 6;
    ctx.fillText("🌿 Reserva tu escape · link en bio", W / 2, y + 35);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.textAlign = "left";
    y += 80;

    // ── 8. Ubicación discreta ─────────────────────────────────
    ctx.font = "italic 19px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.38)";
    ctx.textAlign = "center";
    ctx.fillText("📍 Macanal, Boyacá · Colombia", W / 2, H - 110);
    ctx.textAlign = "left";

    // ── 9. Banda marca inferior ───────────────────────────────
    const gradBar = ctx.createLinearGradient(0, H - 85, 0, H);
    gradBar.addColorStop(0, "rgba(27,94,32,0)");
    gradBar.addColorStop(0.35, "rgba(27,94,32,0.97)");
    gradBar.addColorStop(1, "rgba(10,40,10,1)");
    ctx.fillStyle = gradBar;
    ctx.fillRect(0, H - 85, W, 85);

    ctx.font = "bold 28px sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 8;
    ctx.fillText("🦋 Earth Park  ·  @earthpark.co", W / 2, H - 28);
    ctx.shadowColor = "transparent";

    // ── Descargar ─────────────────────────────────────────────
    const link = document.createElement("a");
    link.download = `earthpark-${diaLabel}-post.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const background = "rgba(10,22,6,0.75)";
  const border = "1px solid rgba(77,142,30,0.18)";

  return (
    <div ref={cardRef} className="rounded-2xl p-4 space-y-3 flex flex-col" style={{ background, border }}>

      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">{emojiLabel}</span>
        <div>
          <p className="font-bold text-sm text-white uppercase tracking-wide">{diaLabel}</p>
          <p className="text-xs text-gray-400">{pilarLabel}</p>
        </div>
      </div>

      {/* Hook */}
      {post.hook && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-bold text-amber-600 uppercase mb-1">🎣 Hook</p>
          <p className="text-sm font-medium italic text-amber-900">{post.hook}</p>
        </div>
      )}

      {/* Copy */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Copy</p>
        <p className="text-sm text-gray-200 whitespace-pre-line">{post.copy}</p>
      </div>

      {/* Hashtags */}
      {Array.isArray(post.hashtags) && post.hashtags.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Hashtags</p>
          <div className="flex flex-wrap gap-1">
            {post.hashtags.map((h, i) => (
              <span key={i} className="bg-green-900/40 text-green-300 text-xs px-2 py-0.5 rounded-full">
                {h.startsWith("#") ? h : `#${h}`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Instrucciones foto */}
      {post.instrucciones_foto && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">📸 Foto ideal</p>
          <p className="text-xs text-gray-300">{post.instrucciones_foto}</p>
        </div>
      )}

      {/* Instrucciones Canva */}
      {post.instrucciones_canva && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">🎨 Diseño Canva</p>
          <p className="text-xs text-gray-300">{post.instrucciones_canva}</p>
        </div>
      )}

      {/* Upload de foto */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">📸 Tu foto para este post</p>
        {!fotoUrl ? (
          <div
            className="border-2 border-dashed border-gray-600 rounded-xl p-4 text-center hover:border-green-400 hover:bg-green-900/20 transition cursor-pointer"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFoto(e.dataTransfer.files[0]); }}
          >
            <p className="text-sm text-gray-500">Haz clic o arrastra tu foto aquí</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFoto(e.target.files[0])}
            />
          </div>
        ) : (
          <div className="relative">
            <img src={fotoUrl} alt="preview" className="max-h-48 rounded-lg object-cover w-full" />
            <button
              onClick={quitarFoto}
              className="absolute top-1 right-1 bg-white rounded-full shadow px-1.5 py-0.5 text-gray-600 text-xs hover:bg-red-50"
            >✕</button>
          </div>
        )}
      </div>

      {/* Botones */}
      <div className="botones-export flex flex-col sm:flex-row gap-2 mt-auto pt-2">
        <button
          onClick={copiarPost}
          className="flex-1 border border-gray-500 rounded-lg px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 transition"
        >
          {copiado ? "✓ Copiado" : "📋 Copiar post"}
        </button>
        <button
          onClick={descargar}
          className="flex-1 bg-green-600 text-white rounded-lg px-3 py-1.5 text-sm hover:bg-green-700 transition"
        >
          ⬇️ Descargar .txt
        </button>
        <button
          onClick={generarImagenPost}
          className="flex-1 bg-emerald-600 text-white rounded-lg px-3 py-1.5 text-sm hover:bg-emerald-700 transition"
        >
          🖼️ Descargar imagen
        </button>
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
  const [generacionId, setGeneracionId] = useState(0);
  const [loadingSemana, setLoadingSemana] = useState(false);
  const [errorSemana, setErrorSemana] = useState(null);

  const [inputPost, setInputPost] = useState("");
  const [postGenerado, setPostGenerado] = useState(null);
  const [loadingPost, setLoadingPost] = useState(false);
  const [errorPost, setErrorPost] = useState(null);

  const workerUrl = import.meta.env.VITE_WORKER_URL;
  const { semanas, loading, guardarSemana } = useMarketingStorage();

  useEffect(() => {
    if (semanas.length > 0 && semana.length === 0) {
      setSemana(semanas[0].posts || []);
    }
  }, [semanas]);

  const generarSemana = useCallback(async () => {
    if (!workerUrl) {
      setErrorSemana("VITE_WORKER_URL no está configurada.");
      return;
    }
    setLoadingSemana(true);
    setErrorSemana(null);
    setSemana([]);

    const temasUsados = semanas.slice(0, 4)
      .flatMap(s => (s.posts || []).map(p => p.pilar))
      .filter(Boolean);
    const antiRepeticion = temasUsados.length > 0
      ? `\n\nTEMAS YA PUBLICADOS — NO REPETIR:\n${[...new Set(temasUsados)].join(", ")}`
      : "";

    const prompt = `Genera el calendario de contenido completo para esta semana de Earth Park en Instagram y TikTok (@earthpark.co).

Días y pilares:
${DIAS_SEMANA.map(d => `- ${d.dia}: ${d.pilar}`).join("\n")}

Para cada post incluye:
1. copy: texto listo para publicar (máx 280 chars, incluye emojis naturales, acción clara al final)
2. hashtags: array de 12-15 hashtags relevantes (mezcla español/inglés, ecoturismo Colombia, mariposas)
3. instrucciones_foto: descripción muy concreta de la toma (ángulo, tipo de luz, composición, sujeto principal)
4. instrucciones_canva: guía detallada para diseñar en Canva (colores de paleta, tipografía, disposición, elementos gráficos)

Responde ÚNICAMENTE con un JSON válido, sin texto adicional ni bloques de código markdown:
[{"dia":"Lunes","pilar":"...","copy":"...","hashtags":["#..."],"instrucciones_foto":"...","instrucciones_canva":"..."},...]${antiRepeticion}`;

    try {
      const parsed = await llamarClaude(workerUrl, prompt);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setSemana(parsed);
        await guardarSemana(parsed);
        setGeneracionId(id => id + 1);
      } else {
        setErrorSemana("No se pudo interpretar la respuesta. Intenta de nuevo.");
      }
    } catch (err) {
      setErrorSemana(err.message);
    } finally {
      setLoadingSemana(false);
    }
  }, [workerUrl, semanas]);

  const generarPost = useCallback(async () => {
    if (!inputPost.trim() || !workerUrl) return;
    setLoadingPost(true);
    setErrorPost(null);
    setPostGenerado(null);

    const prompt = `Genera un post para Earth Park (@earthpark.co) en Instagram o TikTok.

El usuario describe lo que quiere: "${inputPost.trim()}"

Responde ÚNICAMENTE con un JSON válido, sin texto adicional:
{"copy":"...","hashtags":["#..."],"instrucciones_foto":"...","instrucciones_canva":"..."}`;

    try {
      const parsed = await llamarClaude(workerUrl, prompt);
      const post = Array.isArray(parsed) ? parsed[0] : parsed;
      if (post && post.copy) {
        setPostGenerado(post);
      } else {
        setErrorPost("No se pudo interpretar la respuesta. Intenta de nuevo.");
      }
    } catch (err) {
      setErrorPost(err.message);
    } finally {
      setLoadingPost(false);
    }
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
                  Generando contenido... ⏳
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

          {/* Skeleton cards mientras carga */}
          {loadingSemana && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {DIAS_SEMANA.map((_, i) => <SkeletonCard key={i} />)}
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
                <PostCard key={`${post.dia}-${generacionId}`} post={post} index={i} />
              ))}
            </div>
          )}

          {semanas.length > 1 && (
            <div className="mt-10">
              <h2 className="text-lg font-bold text-white mb-4">
                📅 Historial de semanas
              </h2>
              <div className="space-y-8">
                {semanas.slice(1).map((semana) => (
                  <div key={semana.id}>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                      Semana del {semana.semana_label}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {(semana.posts || []).map((post, i) => (
                        <PostCard
                          key={`${semana.id}-${i}`}
                          post={post}
                          index={i}
                          generacionId={semana.id}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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
