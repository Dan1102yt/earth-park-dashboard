import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Images, Loader2, AlertCircle, Check, ArrowLeft, ImageOff } from "lucide-react";
import { listarSubcarpetas, listarFotosCarpeta } from "../../../services/driveService";
import { useFotosPublicas } from "./useFotosPublicas";

const ROOT_FOLDER_ID = "14VB2pCIKlIHqOtEm7hlLNdKnoZXRyE65";

function Miniatura({ foto }) {
  const [fallo, setFallo] = useState(false);
  if (fallo || !foto.urlMiniatura) {
    return (
      <div className="w-full aspect-square rounded-xl flex items-center justify-center bg-gray-800/60">
        <ImageOff className="w-6 h-6 text-gray-600" />
      </div>
    );
  }
  return (
    <img
      src={foto.urlMiniatura}
      alt={foto.nombre}
      loading="lazy"
      onError={() => setFallo(true)}
      className="w-full aspect-square object-cover rounded-xl"
    />
  );
}

function FotoCard({ foto, aprobada, procesando, onToggle }) {
  return (
    <div
      className="relative rounded-xl p-1.5 transition-all"
      style={{
        border: aprobada ? "2px solid rgb(52,211,153)" : "1px solid rgba(77,142,30,0.18)",
        background: "rgba(10,22,6,0.6)",
      }}
    >
      <Miniatura foto={foto} />

      {aprobada && (
        <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow">
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </span>
      )}

      <p className="text-[10px] text-gray-400 truncate mt-1.5 px-0.5">{foto.nombre}</p>

      <label className="flex items-center gap-1.5 px-0.5 pt-1 pb-0.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={aprobada}
          disabled={procesando}
          onChange={onToggle}
          className="accent-emerald-500 w-3.5 h-3.5"
        />
        <span className="text-[10px] text-gray-400">
          {procesando ? "Guardando..." : "Publicar en la web"}
        </span>
      </label>
    </div>
  );
}

export default function GaleriaWebPage() {
  const [carpetas, setCarpetas] = useState([]);
  const [carpetaActiva, setCarpetaActiva] = useState(null);
  const [loadingCarpetas, setLoadingCarpetas] = useState(true);
  const [errorCarpetas, setErrorCarpetas] = useState(null);

  const [fotos, setFotos] = useState([]);
  const [loadingFotos, setLoadingFotos] = useState(false);
  const [errorFotos, setErrorFotos] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [toggleError, setToggleError] = useState(null);
  const cacheFotos = useRef(new Map());

  const { aprobadas, loading: loadingAprobadas, error: errorAprobadas, toggle } = useFotosPublicas();

  useEffect(() => {
    listarSubcarpetas(ROOT_FOLDER_ID)
      .then((cs) => {
        setCarpetas(cs);
        if (cs.length > 0) setCarpetaActiva(cs[0].id);
      })
      .catch((e) => setErrorCarpetas(e.message))
      .finally(() => setLoadingCarpetas(false));
  }, []);

  const cargarFotos = useCallback(async (folderId) => {
    if (cacheFotos.current.has(folderId)) {
      setFotos(cacheFotos.current.get(folderId));
      return;
    }
    setLoadingFotos(true);
    setErrorFotos(null);
    try {
      const lista = await listarFotosCarpeta(folderId);
      cacheFotos.current.set(folderId, lista);
      setFotos(lista);
    } catch (e) {
      setErrorFotos(e.message);
      setFotos([]);
    } finally {
      setLoadingFotos(false);
    }
  }, []);

  useEffect(() => {
    if (carpetaActiva) cargarFotos(carpetaActiva);
  }, [carpetaActiva, cargarFotos]);

  const nombreCarpetaActiva = carpetas.find((c) => c.id === carpetaActiva)?.nombre || "";

  async function handleToggle(foto) {
    setTogglingId(foto.id);
    setToggleError(null);
    const res = await toggle(foto, nombreCarpetaActiva);
    if (res.error) setToggleError(res.error);
    setTogglingId(null);
  }

  return (
    <div
      className="pt-16 pb-24 lg:pt-8 lg:pb-8 min-h-screen px-4 lg:px-8"
      style={{ background: "linear-gradient(135deg, #050d03 0%, #091806 50%, #060f04 100%)" }}
    >
      <div className="max-w-6xl mx-auto space-y-6">

        <div className="flex items-center gap-3 pt-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(77,142,30,0.15)", border: "1px solid rgba(77,142,30,0.25)" }}>
            <Images className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white leading-tight">Galería web</h1>
            <p className="text-xs text-gray-500">Elige qué fotos de Drive se publican en earthpark-web</p>
          </div>
          <Link
            to="/marketing"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-400 transition px-3 py-1.5 rounded-lg border border-gray-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Marketing
          </Link>
        </div>

        {errorAprobadas && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)", color: "#f87171" }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>No se pudo cargar el estado de aprobación: {errorAprobadas}</span>
          </div>
        )}

        {loadingCarpetas && (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando categorías de Drive...
          </div>
        )}

        {errorCarpetas && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)", color: "#f87171" }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>No se pudieron cargar las categorías: {errorCarpetas}</span>
          </div>
        )}

        {!loadingCarpetas && !errorCarpetas && carpetas.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">No hay subcarpetas en la carpeta raíz de Drive.</p>
        )}

        {carpetas.length > 0 && (
          <>
            {/* Pestañas de categorías */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {carpetas.map((c) => {
                const activa = c.id === carpetaActiva;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCarpetaActiva(c.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                      activa
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "text-gray-400 border border-gray-700 hover:bg-gray-800/50 hover:text-gray-200"
                    }`}
                  >
                    {c.nombre}
                  </button>
                );
              })}
            </div>

            {toggleError && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)", color: "#f87171" }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>No se pudo guardar el cambio: {toggleError}</span>
              </div>
            )}

            {/* Grid de fotos */}
            {loadingFotos || loadingAprobadas ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm py-8 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando fotos...
              </div>
            ) : errorFotos ? (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)", color: "#f87171" }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorFotos}</span>
              </div>
            ) : fotos.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">Esta categoría no tiene fotos.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {fotos.map((foto) => (
                  <FotoCard
                    key={foto.id}
                    foto={foto}
                    aprobada={aprobadas.has(foto.id)}
                    procesando={togglingId === foto.id}
                    onToggle={() => handleToggle(foto)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
