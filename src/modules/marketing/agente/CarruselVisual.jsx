import { useEffect, useRef, useState, useCallback } from "react";
import {
  Upload, Download, Share2, Loader2, ImageOff, Wand2, Images, AlertCircle, LayoutGrid,
} from "lucide-react";
import SelectorFotos from "../comun/SelectorFotos";
import { TEMAS } from "../animado/motor";
import { enviarALu, canvasAJpeg, captionCompleto } from "../oficina/instagram";
import { renderizarSlide, canvasABlob, cargarImagen } from "./carruselRender";
import {
  obtenerCategorias, obtenerFotos, obtenerTodasLasFotos, urlsFoto, buscarCategoria, generarImagenIA,
} from "./fotosCarrusel";

const tarjeta = { background: "rgba(10,22,6,0.6)", border: "1px solid rgba(77,142,30,0.18)" };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function cargarFoto(foto) {
  for (const url of urlsFoto(foto)) {
    const img = await cargarImagen(url);
    if (img) return img;
  }
  return null;
}

const nombreArchivo = (i) => `earthpark-carrusel-${String(i + 1).padStart(2, "0")}.png`;

function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Prompt de IA para una slide (el del agente, o uno armado a partir de la descripción)
const promptIA = (s, variante) =>
  (s.prompt_ia || s.foto || s.titulo || "").replace(/\*/g, "") + (variante ? ` (variation ${variante})` : "");

/**
 * Vista previa real de cada slide (1080×1350) con su fondo:
 * foto real de Drive o imagen generada con IA, según decida el agente (y el usuario puede cambiarlo).
 * autoIA: si es true, genera de una vez las imágenes IA (solo para carruseles recién creados,
 * para no gastar al abrir uno viejo del historial).
 */
export default function CarruselVisual({ carrusel, autoIA = false, planId = null }) {
  const slides = carrusel.slides || [];
  const total = slides.length;

  // Por slide: { modo: "drive"|"ia"|"propia"|"collage", opciones, idx, elegida, collage, propia, ia: {url, cargando, error, variante} }
  const [fondos, setFondos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [preparando, setPreparando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const canvases = useRef([]);
  const imagenes = useRef(new Map());
  const [color, setColor] = useState(carrusel.color || "bosque");
  const [selector, setSelector] = useState(null); // { i, multiple }
  const [envio, setEnvio] = useState(null);         // { cargando, ok, error }

  const actualizar = (i, cambio) =>
    setFondos((fs) => fs.map((f, j) => (j === i ? { ...f, ...(typeof cambio === "function" ? cambio(f) : cambio) } : f)));

  // 1) Fondos iniciales según lo que eligió el agente
  useEffect(() => {
    let vivo = true;
    (async () => {
      setPreparando(true);
      setPreviews([]);
      const cats = await obtenerCategorias();
      const todas = await obtenerTodasLasFotos();
      const usadas = new Set();
      const asignados = [];
      for (const s of slides) {
        const cat = buscarCategoria(cats, s.categoria_foto);
        let opciones = cat ? await obtenerFotos(cat) : [];
        if (!opciones.length) opciones = todas;
        const libres = opciones.filter((f) => !usadas.has(f.id));
        const base = libres.length ? libres : opciones;
        const elegida = base.length ? base[Math.floor(Math.random() * base.length)] : null;
        if (elegida) usadas.add(elegida.id);
        const quiereIA = s.fondo === "ia";
        const quiereCollage = s.fondo === "collage" && opciones.length >= 2;
        const collageFotos = quiereCollage
          ? [...opciones].sort(() => Math.random() - 0.5).slice(0, Math.min(3, opciones.length))
          : null;
        asignados.push({
          modo: quiereCollage ? "collage" : quiereIA && autoIA ? "ia" : "drive",
          collage: collageFotos,
          sugeridoIA: quiereIA,
          opciones,
          idx: Math.max(0, opciones.indexOf(elegida)),
          propia: null,
          ia: { url: null, cargando: false, error: null, variante: 0 },
        });
      }
      if (vivo) { setFondos(asignados); setPreparando(false); }
    })();
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrusel]);

  // 2) Generar las imágenes IA que hagan falta
  useEffect(() => {
    fondos.forEach((f, i) => {
      if (f.modo !== "ia" || f.ia.url || f.ia.cargando || f.ia.error) return;
      actualizar(i, (x) => ({ ia: { ...x.ia, cargando: true, error: null } }));
      generarImagenIA(promptIA(slides[i], f.ia.variante))
        .then((url) => actualizar(i, (x) => ({ ia: { ...x.ia, url, cargando: false } })))
        .catch((e) => actualizar(i, (x) => ({ ia: { ...x.ia, cargando: false, error: e.message } })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fondos]);

  // 3) Dibujar cada slide con su fondo actual
  const dibujar = useCallback(async (i, f) => {
    let img = null;
    if (f.modo === "propia" && f.propia) img = await cargarImagen(f.propia);
    else if (f.modo === "ia" && f.ia.url) img = await cargarImagen(f.ia.url);
    else if (f.modo === "ia" && !f.ia.error) return; // generando: se queda la vista anterior
    else if (f.modo === "collage" && f.collage?.length) {
      img = [];
      for (const foto of f.collage) {
        if (!imagenes.current.has(foto.id)) imagenes.current.set(foto.id, await cargarFoto(foto));
        img.push(imagenes.current.get(foto.id));
      }
    } else { // Drive (o IA que falló: se usa la foto de Drive mientras tanto)
      const foto = f.elegida || f.opciones?.[f.idx];
      if (foto) {
        if (!imagenes.current.has(foto.id)) imagenes.current.set(foto.id, await cargarFoto(foto));
        img = imagenes.current.get(foto.id);
      }
    }
    const canvas = await renderizarSlide(slides[i], i, total, img, { ...carrusel, color });
    canvases.current[i] = canvas;
    const url = canvas.toDataURL("image/jpeg", 0.8);
    setPreviews((p) => { const n = [...p]; n[i] = { url, conFoto: !!img }; return n; });
  }, [slides, total, carrusel, color]);

  // Solo redibuja cuando cambia lo que se ve (no por el estado "cargando")
  const firmas = fondos.map((f) => `${f.modo}|${f.idx}|${f.elegida?.id}|${(f.collage || []).map((x) => x.id)}|${f.propia}|${f.ia.url}|${!!f.ia.error}`).join("§") + color;
  useEffect(() => {
    if (preparando) return;
    fondos.forEach((f, i) => dibujar(i, f));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmas, preparando, dibujar]);

  /* ─── Acciones ─── */
  const elegirFotos = (fotos) => {
    const { i, multiple } = selector;
    setSelector(null);
    if (!fotos?.length) return;
    if (multiple && fotos.length > 1) actualizar(i, { modo: "collage", collage: fotos });
    else actualizar(i, { modo: "drive", elegida: fotos[0] });
  };
  const usarDrive = (i) => actualizar(i, { modo: "drive" });
  const usarIA = (i) => actualizar(i, (f) => ({ modo: "ia", ia: { ...f.ia, error: null } }));
  const otraIA = (i) => actualizar(i, (f) => ({ modo: "ia", ia: { url: null, cargando: false, error: null, variante: f.ia.variante + 1 } }));
  const subirFoto = (i, archivo) => {
    if (archivo) actualizar(i, { modo: "propia", propia: URL.createObjectURL(archivo) });
  };

  const blobs = async () => Promise.all(canvases.current.slice(0, total).map(canvasABlob));
  const descargarUna = async (i) => descargarBlob(await canvasABlob(canvases.current[i]), nombreArchivo(i));
  const descargarTodas = async () => {
    setOcupado(true);
    const bs = await blobs();
    for (let i = 0; i < bs.length; i++) {
      descargarBlob(bs[i], nombreArchivo(i));
      await esperar(450);
    }
    setOcupado(false);
  };

  const puedeCompartir = typeof navigator !== "undefined" && !!navigator.canShare;
  const compartir = async () => {
    setOcupado(true);
    try {
      const files = (await blobs()).map((b, i) => new File([b], nombreArchivo(i), { type: "image/png" }));
      if (navigator.canShare({ files })) await navigator.share({ files, title: "Carrusel Earth Park" });
      else await descargarTodas();
    } catch (e) {
      if (e.name !== "AbortError") console.warn("[carrusel] compartir:", e.message);
    } finally {
      setOcupado(false);
    }
  };

  const enviar = async () => {
    setEnvio({ cargando: true });
    try {
      const archivos = await Promise.all(canvases.current.slice(0, total).map(canvasAJpeg));
      await enviarALu(planId, { tipo: "carrusel", archivos, caption: captionCompleto(carrusel.caption, carrusel.hashtags) });
      setEnvio({ ok: true });
    } catch (e) {
      setEnvio({ error: e.message });
    }
  };

  const generandoIA = fondos.some((f) => f.modo === "ia" && f.ia.cargando);
  const listo = !preparando && !generandoIA && previews.filter(Boolean).length === total;
  const sugeridasSinGenerar = fondos.filter((f) => f.sugeridoIA && f.modo !== "ia").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-gray-400">
          1080×1350 (4:5). <span className="text-emerald-400">Drive</span> = foto real del parque ·{" "}
          <span className="text-fuchsia-300">IA</span> = imagen generada para ideas y conceptos.
        </p>
        <div className="flex gap-2 flex-wrap">
          {sugeridasSinGenerar > 0 && (
            <button onClick={() => fondos.forEach((f, i) => f.sugeridoIA && f.modo !== "ia" && usarIA(i))}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-fuchsia-200 border border-fuchsia-500/40 hover:bg-fuchsia-500/10">
              <Wand2 className="w-3.5 h-3.5" /> Generar las {sugeridasSinGenerar} imágenes IA sugeridas
            </button>
          )}
          {puedeCompartir && (
            <button onClick={compartir} disabled={!listo || ocupado}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50">
              <Share2 className="w-3.5 h-3.5" /> Guardar en galería / Compartir
            </button>
          )}
          {planId && (
            <button onClick={enviar} disabled={!listo || ocupado || envio?.cargando}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-emerald-950 bg-lime-300 hover:bg-lime-200 disabled:opacity-50">
              {envio?.cargando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />} Enviar a Lu para publicar
            </button>
          )}
          <button onClick={descargarTodas} disabled={!listo || ocupado}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: "rgba(77,142,30,0.80)", border: "1px solid rgba(77,142,30,0.40)" }}>
            {ocupado || generandoIA ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {generandoIA ? "Generando imágenes..." : "Descargar todas (PNG)"}
          </button>
        </div>
      </div>

      {envio?.ok && <p className="text-xs text-lime-300">✓ Listo. Lu ya lo tiene: prográmalo desde la Oficina IA.</p>}
      {envio?.error && <p className="text-xs text-red-300">{envio.error}</p>}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400">Color</span>
        {Object.entries(TEMAS).map(([id, t]) => (
          <button key={id} onClick={() => setColor(id)}
            className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full border ${color === id ? "border-white text-white" : "border-white/15 text-gray-300"}`}>
            <span className="w-3 h-3 rounded-full" style={{ background: t.acento }} /> {t.nombre}
          </button>
        ))}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory">
        {slides.map((s, i) => {
          const p = previews[i];
          const f = fondos[i];
          const enIA = f?.modo === "ia";
          return (
            <div key={i} className="snap-start flex-shrink-0 w-64 sm:w-72 rounded-xl p-2 space-y-2" style={tarjeta}>
              <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-black/40 flex items-center justify-center">
                {p ? <img src={p.url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
                  : preparando || f?.ia.cargando ? <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  : <ImageOff className="w-6 h-6 text-gray-600" />}
                {enIA && f.ia.cargando && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 text-xs text-fuchsia-200">
                    <Loader2 className="w-6 h-6 animate-spin" /> Generando imagen IA...
                  </div>
                )}
                {f && (
                  <span className={`absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    enIA ? "bg-fuchsia-500/80 text-white" : f.modo === "propia" ? "bg-sky-500/80 text-white" : "bg-emerald-500/80 text-emerald-950"}`}>
                    {enIA ? "IA" : f.modo === "propia" ? "TU FOTO" : f.modo === "collage" ? `COLLAGE ${f.collage.length}` : "DRIVE"}
                  </span>
                )}
              </div>

              {enIA && f.ia.error && (
                <p className="flex items-start gap-1 text-[10px] text-red-300"><AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />{f.ia.error}</p>
              )}

              <div className="flex flex-wrap items-center gap-1">
                <button onClick={() => setSelector({ i, multiple: false })}
                  className="flex items-center gap-1 text-[11px] text-emerald-300 px-2 py-1 rounded-md border border-emerald-700/60" title="Elegir foto de Drive">
                  <Images className="w-3 h-3" /> Foto
                </button>
                <button onClick={() => setSelector({ i, multiple: true })}
                  className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border ${f?.modo === "collage" ? "text-lime-200 border-lime-400/60" : "text-sky-300 border-sky-500/40"}`} title="Collage de varias fotos">
                  <LayoutGrid className="w-3 h-3" /> Collage
                </button>
                {enIA ? (
                  <button onClick={() => otraIA(i)} disabled={f.ia.cargando}
                    className="flex items-center gap-1 text-[11px] text-fuchsia-300 px-2 py-1 rounded-md border border-fuchsia-500/40 disabled:opacity-40" title="Generar otra versión">
                    <Wand2 className="w-3 h-3" /> Otra IA
                  </button>
                ) : (
                  <button onClick={() => usarIA(i)}
                    className="flex items-center gap-1 text-[11px] text-fuchsia-300 px-2 py-1 rounded-md border border-fuchsia-500/40" title="Generar fondo con IA">
                    <Wand2 className="w-3 h-3" /> IA
                  </button>
                )}
                <label className="p-1.5 text-sky-300 hover:text-sky-200 cursor-pointer ml-auto" title="Subir mi foto">
                  <Upload className="w-3.5 h-3.5" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => subirFoto(i, e.target.files?.[0])} />
                </label>
                <button onClick={() => descargarUna(i)} disabled={!p}
                  className="p-1.5 rounded-md text-gray-300 hover:text-white hover:bg-white/5 disabled:opacity-30" title="Descargar esta slide">
                  <Download className="w-4 h-4" />
                </button>
              </div>
              {s.foto && <p className="text-[10px] text-gray-500 italic leading-snug">{f?.sugeridoIA ? "✨ IA sugerida: " : "📷 Ideal: "}{s.foto}</p>}
            </div>
          );
        })}
      </div>
      {selector && (
        <SelectorFotos titulo={selector.multiple ? `Collage para la slide ${selector.i + 1}` : `Foto para la slide ${selector.i + 1}`}
          categoriaSugerida={slides[selector.i]?.categoria_foto} multiple={selector.multiple}
          onElegir={elegirFotos} onCerrar={() => setSelector(null)} />
      )}
    </div>
  );
}
