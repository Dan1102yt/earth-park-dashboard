// Datos de Earth Park que salen en la propuesta: medios de pago y redes.
// Se guardan en Supabase (tabla datos_empresa) y se editan en Precios → Empresa.
// Los números de cuenta NO van en el código (el repo es público): vienen de privado/09_datos_empresa.sql.
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { Mail, Globe, MessageCircle, Landmark, Wallet, Users } from "lucide-react";

export const CANALES = [
  { clave: "whatsapp", nombre: "WhatsApp" },
  { clave: "instagram", nombre: "Instagram" },
  { clave: "tiktok", nombre: "TikTok" },
  { clave: "facebook", nombre: "Facebook" },
  { clave: "correo", nombre: "Correo" },
  { clave: "web", nombre: "Página web" },
];

export const EMPRESA_INICIAL = {
  pagos: {
    banco: { nombre: "Bancolombia", tipo: "Cuenta de ahorros", numero: "", titular: "" },
    nequi: { nombre: "Nequi", numero: "", titular: "" },
  },
  contacto: {
    whatsapp: "322 869 7438",
    instagram: "@earthpark.co",
    tiktok: "@earthpark.co",
    facebook: "@earthpark",
    correo: "",
    web: "earthpark.com.co",
  },
  logos: {}, // { bancolombia, nequi, whatsapp, instagram, tiktok, facebook, correo, web } → URL de la imagen subida
};

/** Une lo guardado con los valores iniciales (por si faltan campos). */
export function completarEmpresa(d = {}) {
  const b = EMPRESA_INICIAL;
  return {
    pagos: {
      banco: { ...b.pagos.banco, ...(d.pagos?.banco || {}) },
      nequi: { ...b.pagos.nequi, ...(d.pagos?.nequi || {}) },
    },
    contacto: { ...b.contacto, ...(d.contacto || {}) },
    logos: { ...(d.logos || {}) },
  };
}

// Íconos genéricos (no son los logos de las marcas): se usan mientras no se suba el logo oficial.
const GENERICOS = { whatsapp: MessageCircle, instagram: Users, tiktok: Users, facebook: Users, correo: Mail, web: Globe, bancolombia: Landmark, nequi: Wallet };

export function iconoGenerico(clave, color = "#2f5a1a") {
  const Icono = GENERICOS[clave] || Globe;
  const svg = renderToStaticMarkup(createElement(Icono, { size: 48, color, strokeWidth: 2 }));
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const hayPagos = (e) => !!(e?.pagos?.banco?.numero || e?.pagos?.nequi?.numero);
