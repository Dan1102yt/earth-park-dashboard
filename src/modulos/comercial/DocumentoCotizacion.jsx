// La propuesta que recibe el cliente (diseño aprobado). Se dibuja en hojas A4 y de aquí sale el PDF.
// Las fotos llegan ya recortadas (data URL) porque html2canvas no entiende object-fit.
import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import { completarEmpresa, CANALES, hayPagos } from "./empresa";
import { pesos, plural, quienesVienen, tituloDia, fechasTexto, duracionTexto, saludo } from "./calculo";

export const TAM_FOTOS = { portada: [1240, 662], portadaCompacta: [1240, 484], dia: [540, 540], tira: [600, 300] };

const CSS = `
.cz *{box-sizing:border-box}
.cz{font-family:Outfit,Arial,sans-serif;color:#1f2a1f;line-height:1.3}
.cz-p{width:210mm;height:297mm;position:relative;overflow:hidden;background:#fbfaf5}
.cz-hero{position:relative;overflow:hidden}
.cz-hero>img.bg{position:absolute;inset:0;width:100%;height:100%}
.cz-hero:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 35%,rgba(20,40,12,.88))}
.cz-logo{position:absolute;top:9mm;left:10mm;width:29mm;height:29mm;border-radius:50%;background:#fff;padding:1mm;z-index:2}
.cz-num{position:absolute;top:11mm;right:10mm;z-index:2;background:#fff;border-radius:3mm;padding:2mm 4mm;font-weight:700;color:#2f5a1a;font-size:11pt}
.cz-ht{position:absolute;left:12mm;right:12mm;bottom:8mm;z-index:2;color:#fff}
.cz-ht small{font-size:10.5pt;color:#d9f99d;letter-spacing:.08em;text-transform:uppercase}
.cz-ht h1{font-family:'Bree Serif',serif;font-size:27pt;margin:1mm 0 0;line-height:1.1;font-weight:400}
.cz-ht p{margin:2mm 0 0;font-size:11pt}
.cz-mar{position:absolute;z-index:3}
.cz-sec{padding:6mm 12mm 0}
.cz-datos{display:grid;gap:3mm}
.cz-dato{background:#fff;border:1px solid #e3ead9;border-radius:3mm;padding:2.5mm 3mm}
.cz-dato b{display:block;font-size:11pt;color:#2f5a1a}
.cz-dato span{font-size:7.5pt;color:#6b7a63;text-transform:uppercase;letter-spacing:.05em}
.cz-msg{font-family:'Bree Serif',serif;color:#2f5a1a;font-size:12pt;line-height:1.4;margin:5mm 0 2mm}
.cz h2{font-family:'Bree Serif',serif;color:#2f5a1a;font-size:15pt;margin:4mm 0 3mm;font-weight:400}
.cz-dcard{display:flex;gap:4mm;background:#fff;border-radius:4mm;overflow:hidden;border:1px solid #e3ead9;margin-bottom:3.5mm}
.cz-dcard img{width:44mm;height:44mm;flex-shrink:0;display:block}
.cz-dcard h3{margin:3mm 0 1mm;font-size:11.5pt;color:#c0461f}
.cz-dcard ul{margin:0 0 3mm;padding-left:4.5mm;font-size:9.5pt;line-height:1.45}
.cz-dcard ul.dos{columns:2;column-gap:6mm;font-size:9pt}
.cz-dcard li{break-inside:avoid}
.cz table{width:100%;border-collapse:collapse;font-size:9.3pt;background:#fff}
.cz th{background:#2f5a1a;color:#fff;text-align:left;padding:2mm 3mm;font-weight:600}
.cz td{padding:1.5mm 3mm;border-bottom:1px solid #eef2ea}
.cz.apretado td{padding:1.1mm 3mm;font-size:8.8pt}
.cz tr.dia td{background:#e9f4dc;color:#2f5a1a;font-weight:700}
.cz .c{text-align:center}.cz .r{text-align:right}
.cz-tot{margin-top:4mm;display:grid;grid-template-columns:1fr 74mm;gap:5mm}
.cz-tbox{background:#2f5a1a;color:#fff;border-radius:4mm;padding:4mm 5mm;font-size:9.8pt}
.cz-tbox div{display:flex;justify-content:space-between;padding:.7mm 0}
.cz-tbox .big{font-size:15pt;font-weight:700;color:#d9f99d;border-top:1px solid rgba(255,255,255,.3);margin-top:1.5mm;padding-top:2mm}
.cz-tbox .nota{display:block;font-size:8pt;color:#e7f5d0;border-top:1px dashed rgba(255,255,255,.3);margin-top:2mm;padding-top:2mm;line-height:1.35}
.cz-info{font-size:8.8pt;line-height:1.45}
.cz-info h4{margin:0 0 1mm;color:#2f5a1a;font-size:10pt}
.cz-pie{position:absolute;bottom:0;left:0;right:0;background:#2f5a1a;color:#fff;font-size:8.5pt;padding:3mm 12mm;display:flex;justify-content:space-between}
.cz-fotos{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;margin-top:4mm}
.cz-fotos img{width:100%;height:30mm;border-radius:3mm;display:block}
.cz-pagos{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin-top:4mm}
.cz-pago{display:flex;align-items:center;gap:3mm;background:#fff;border:1px solid #e3ead9;border-radius:3mm;padding:2.5mm 3mm}
.cz-pago img{width:11mm;height:11mm;object-fit:contain;flex-shrink:0}
.cz-pago span{display:block;font-size:7.5pt;color:#6b7a63;text-transform:uppercase;letter-spacing:.05em}
.cz-pago b{display:block;font-size:11.5pt;color:#2f5a1a;letter-spacing:.02em}
.cz-pago small{display:block;font-size:8pt;color:#4b5a43}
.cz-redes{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm 3mm;margin-top:3mm}
.cz-red{display:flex;align-items:center;gap:2mm;font-size:9pt;color:#1f2a1f;min-width:0}
.cz-red img{width:6mm;height:6mm;flex-shrink:0}
.cz-red div{min-width:0}
.cz-red span{display:block;font-size:6.8pt;color:#6b7a63;text-transform:uppercase;letter-spacing:.05em}
.cz-red b{display:block;font-weight:600;white-space:nowrap;line-height:1.35}
.cz h4.sub{margin:4mm 0 0;color:#2f5a1a;font-size:10pt;display:flex;align-items:center;gap:2mm}
.cz-ani{display:inline-block;flex-shrink:0}
.cz h2.con-ani{display:flex;align-items:center;gap:3mm}
`;

const Pie = ({ izq, der }) => <div className="cz-pie"><span>{izq}</span><span>{der}</span></div>;

const DocumentoCotizacion = forwardRef(function DocumentoCotizacion({ cot, plan, totales: t, imgs = {}, logo, animales = {}, empresa: empresaGuardada, logosEmpresa = {} }, ref) {
  const empresa = completarEmpresa(empresaGuardada || {});
  const conPagos = hayPagos(empresa);
  const { banco, nequi } = empresa.pagos;
  const dias = t.dias;
  const compacto = dias >= 3;
  const nombre = cot.cliente?.nombre?.trim() || "familia";
  const origen = cot.cliente?.origen?.trim();
  const filasTabla = t.porDia.reduce((s, d) => s + d.lineas.length + 1, 0) + t.extras.length;
  const apretado = filasTabla > 16;
  // Si el cierre (totales, pagos, redes) no cabe en la hoja 2: primero se quitan las 3 fotos finales,
  // y si aún no cabe, el cierre pasa a una hoja 3 (con fotos). Se mide de verdad en pantalla.
  const [ajuste, setAjuste] = useState(filasTabla > 21 ? 2 : 0); // 0 normal · 1 sin fotos · 2 hoja aparte
  const cierreAparte = ajuste === 2;
  const conTira = ajuste !== 1;
  const hoja2 = useRef(null);
  useLayoutEffect(() => {
    const h = hoja2.current;
    if (!h || ajuste === 2) return;
    const sec = h.querySelector(".cz-sec");
    const pie = h.querySelector(".cz-pie");
    if (sec && pie && sec.getBoundingClientRect().bottom > pie.getBoundingClientRect().top - 2) setAjuste((a) => a + 1);
  });

  const cierre = (
    <>
      <div className="cz-tot">
        <div className="cz-info">
          <h4>Incluye</h4>
          Todo lo de la tabla y la asistencia al viajero{t.guia ? ", y un guía profesional que los acompaña en el recorrido" : ""}.<br />
          <h4 style={{ marginTop: "2.5mm" }}>No incluye</h4>
          Transporte. Los menores de 5 años no pagan; desde los 5 años pagan tarifa normal.<br />
          <h4 style={{ marginTop: "2.5mm" }}>Para separar su fecha</h4>
          50 % de anticipo para reservar y el otro 50 % al llegar a Earth Park.<br />
          Si necesitan cambiar la fecha con más de 7 días de anticipación, la movemos sin costo. Con menos de 72 horas se retiene el anticipo.<br />
          {!conPagos && (<><h4 style={{ marginTop: "2.5mm" }}>Pagos</h4>Bancolombia o Nequi. Les enviamos los datos cuando confirmen.</>)}
        </div>
        <div className="cz-tbox">
          <div><span>Actividades</span><span>{pesos(t.subtotal)}</span></div>
          {t.descuentoValor > 0 && <div><span>Descuento ({Math.round(t.descuento * 100)} %)</span><span>−{pesos(t.descuentoValor)}</span></div>}
          {t.guia > 0 && <div><span>Guía profesional ({plural(t.diasGuia, "día", "días")})</span><span>{pesos(t.guia)}</span></div>}
          <div className="big"><span>Total</span><span>{pesos(t.total)}</span></div>
          <div><span>Por persona que paga</span><span>{pesos(t.porPersona)}</span></div>
          <div><span>Anticipo 50 %</span><span>{pesos(t.anticipo)}</span></div>
          {t.guia > 0 ? (
            <span className="nota">El guía es opcional. Si prefieren recorrer por su cuenta, lo quitamos: el total queda en <b>{pesos(t.totalSinGuia)}</b> ({pesos(t.porPersonaSinGuia)} por persona).</span>
          ) : t.guiaPorDia > 0 ? (
            <span className="nota">¿Quieren que un guía profesional los acompañe? Lo sumamos por {pesos(t.guiaPorDia)} el día para todo el grupo.</span>
          ) : null}
        </div>
      </div>
      {conPagos && (
        <>
          <h4 className="sub">Medios de pago{animales.cometa && <img className="cz-ani" src={animales.cometa} alt="" style={{ height: "6.5mm", transform: "rotate(-12deg)" }} />}</h4>
          <div className="cz-pagos">
            {banco.numero && (
              <div className="cz-pago"><img src={logosEmpresa.bancolombia} alt="" />
                <div><span>{banco.nombre} · {banco.tipo}</span><b>{banco.numero}</b>{banco.titular && <small>A nombre de {banco.titular}</small>}</div></div>
            )}
            {nequi.numero && (
              <div className="cz-pago"><img src={logosEmpresa.nequi} alt="" />
                <div><span>{nequi.nombre}</span><b>{nequi.numero}</b>{nequi.titular && <small>A nombre de {nequi.titular}</small>}</div></div>
            )}
          </div>
        </>
      )}
      {conTira && imgs.tira?.some(Boolean) && <div className="cz-fotos">{imgs.tira.filter(Boolean).map((src, i) => <img key={i} src={src} alt="" />)}</div>}
      <p className="cz-msg" style={{ textAlign: "center", marginTop: "5mm" }}>¿Les gusta? Escríbannos por WhatsApp y con gusto les separamos la fecha o ajustamos lo que necesiten.</p>
      <p style={{ textAlign: "center", fontSize: "9pt", color: "#6b7a63", margin: 0 }}>Con cariño, Oscar Martín Roa C. y la familia Earth Park</p>
      <h4 className="sub">Encuéntrennos en{animales.colibriFlor && <img className="cz-ani" src={animales.colibriFlor} alt="" style={{ height: "9mm" }} />}</h4>
      <div className="cz-redes">
        {CANALES.filter((c) => empresa.contacto[c.clave]).map((c) => (
          <div key={c.clave} className="cz-red"><img src={logosEmpresa[c.clave]} alt="" /><div><span>{c.nombre}</span><b>{empresa.contacto[c.clave]}</b></div></div>
        ))}
      </div>
    </>
  );

  const datos = [
    ["Para", nombre],
    ["Fechas", fechasTexto(cot.llegada, dias)],
    ["Quiénes vienen", quienesVienen(cot)],
    ...(origen ? [["Desde", origen]] : []),
  ];

  return (
    <div ref={ref} className={`cz${apretado ? " apretado" : ""}`}>
      <style>{CSS}</style>

      <div className="cz-p" data-hoja>
        <div className="cz-hero" style={{ height: compacto ? "82mm" : "112mm" }}>
          {imgs.portada && <img className="bg" src={imgs.portada} alt="" />}
          {logo && <img className="cz-logo" src={logo} alt="Earth Park" />}
          <div className="cz-num">{cot.numero ? `Cotización N° ${cot.numero}` : "Propuesta"}</div>
          <div className="cz-ht">
            <small>{plan?.subtitulo || "Earth Park"}</small>
            <h1>{plan?.nombre || "Su plan en Earth Park"}</h1>
            <p>{duracionTexto(plan)} · Earth Park, Macanal (Boyacá)</p>
          </div>
        </div>
        {animales.mariposaAzul && <img className="cz-mar" src={animales.mariposaAzul} alt="" style={{ top: compacto ? "70mm" : "99mm", right: "16mm", width: "20mm", transform: "rotate(12deg)" }} />}
        <div className="cz-sec">
          <div className="cz-datos" style={{ gridTemplateColumns: origen ? "1.1fr 1fr 1.7fr .8fr" : "1.2fr 1fr 1.8fr" }}>
            {datos.map(([k, v]) => <div key={k} className="cz-dato"><span>{k}</span><b>{v}</b></div>)}
          </div>
          <p className="cz-msg" style={compacto ? { fontSize: "11pt", margin: "4mm 0 1mm" } : undefined}>{saludo(cot.mensaje, nombre)}</p>
          <h2 className="con-ani" style={compacto ? { margin: "2mm 0 2.5mm" } : undefined}>Su plan, día a día{animales.colibri && <img className="cz-ani" src={animales.colibri} alt="" style={{ height: "11mm", transform: "rotate(-8deg)" }} />}</h2>
          {t.porDia.map((d, i) => {
            const nombres = [...d.lineas.map((l) => l.actividad)];
            return (
              <div key={i} className="cz-dcard" style={compacto ? { marginBottom: "2.5mm" } : undefined}>
                {imgs.dias?.[i] && <img src={imgs.dias[i]} alt="" style={compacto ? { width: "38mm", height: "38mm" } : undefined} />}
                <div>
                  <h3>{tituloDia(cot.llegada, i)}</h3>
                  <ul className={nombres.length > 6 ? "dos" : ""}>{nombres.map((x, k) => <li key={k}>{x}</li>)}</ul>
                </div>
              </div>
            );
          })}
        </div>
        <Pie izq="Earth Park · Ecoturismo en Macanal, Valle de Tenza" der={[empresa.contacto.whatsapp && `WhatsApp ${empresa.contacto.whatsapp}`, empresa.contacto.web].filter(Boolean).join(" · ")} />
      </div>

      <div className="cz-p" data-hoja ref={hoja2}>
        {animales.ave && <img className="cz-mar" src={animales.ave} alt="" style={{ top: "7mm", right: "12mm", width: "22mm" }} />}
        <div className="cz-sec" style={{ paddingTop: "12mm" }}>
          <h2 className="con-ani">Valores de su plan{animales.abeja && <img className="cz-ani" src={animales.abeja} alt="" style={{ height: "8mm", transform: "rotate(10deg)" }} />}</h2>
          <p className="cz-msg" style={{ fontSize: "10.5pt", margin: "-1mm 0 2mm" }}>
            Esta es nuestra propuesta para ustedes. Si quieren cambiar alguna actividad, con toda tranquilidad nos dicen y la ajustamos a su gusto.
          </p>
          <p style={{ fontSize: "9pt", margin: "0 0 3mm", color: "#4b5a43" }}>
            Calculado para {plural(t.pagan, "persona que paga", "personas que pagan")}
            {cot.menores5 > 0 ? ` (${plural(Number(cot.menores5), "menor de 5 años va", "menores de 5 años van")} sin costo)` : ""}.
          </p>
          <table>
            <thead><tr><th>Actividad</th><th className="c">Personas</th><th className="r">Valor unitario</th><th className="r">Total</th></tr></thead>
            <tbody>
              {t.porDia.map((d, i) => [
                <tr key={`d${i}`} className="dia"><td colSpan={4}>{tituloDia(cot.llegada, i)}</td></tr>,
                ...d.lineas.map((l, k) => (
                  <tr key={`${i}-${k}`}>
                    <td>{l.actividad}</td>
                    <td className="c">{l.unidad === "grupo_dia" ? "Grupo" : t.pagan}</td>
                    <td className="r">{l.precio ? pesos(l.precio) : "Incluido"}</td>
                    <td className="r">{l.precio ? pesos(l.total) : "—"}</td>
                  </tr>
                )),
              ])}
              {t.extras.map((x) => (
                <tr key={x.codigo}><td>{x.actividad}</td><td className="c">{x.personas}</td><td className="r">{pesos(x.precio)}</td><td className="r">{pesos(x.total)}</td></tr>
              ))}
            </tbody>
          </table>
          {!cierreAparte && cierre}
        </div>
        <Pie izq="Vereda El Dátil, Macanal, Boyacá" der={[empresa.contacto.whatsapp && `WhatsApp ${empresa.contacto.whatsapp}`, empresa.contacto.instagram].filter(Boolean).join(" · ")} />
      </div>

      {cierreAparte && (
        <div className="cz-p" data-hoja>
          {animales.monarca && <img className="cz-mar" src={animales.monarca} alt="" style={{ top: "7mm", right: "12mm", width: "18mm", transform: "rotate(8deg)" }} />}
          <div className="cz-sec" style={{ paddingTop: "12mm" }}>
            <h2>Su inversión y cómo reservar</h2>
            {cierre}
          </div>
          <Pie izq="Vereda El Dátil, Macanal, Boyacá" der={[empresa.contacto.whatsapp && `WhatsApp ${empresa.contacto.whatsapp}`, empresa.contacto.instagram].filter(Boolean).join(" · ")} />
        </div>
      )}
    </div>
  );
});

export default DocumentoCotizacion;
