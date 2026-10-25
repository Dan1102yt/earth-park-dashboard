// Efectos de sonido sintetizados (sin archivos ni costo): whoosh, golpes, brillos, glitch, risers y ambientes.
// Todos se dibujan sobre un OfflineAudioContext y salen hacia "destino" (el bus de efectos).

let ruidoCache = null;
function ruido(ctx, seg = 3) {
  if (ruidoCache && ruidoCache.sampleRate === ctx.sampleRate && ruidoCache.duration >= seg) return ruidoCache;
  const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seg), ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  ruidoCache = b;
  return b;
}

function envolvente(ctx, t, ataque, caida, pico) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(pico, t + ataque);
  g.gain.exponentialRampToValueAtTime(0.0001, t + ataque + caida);
  return g;
}

function fuenteRuido(ctx, t, dur) {
  const s = ctx.createBufferSource();
  s.buffer = ruido(ctx, Math.max(3, dur + 0.6));
  s.start(t, Math.random() * 0.5, dur + 0.05);
  return s;
}

/** Whoosh: ruido con filtro que barre (rápido para barridos, largo para zoom). */
export function whoosh(ctx, destino, t, { dur = 0.45, desde = 300, hasta = 4000, vol = 0.22, q = 1.2 } = {}) {
  t = Math.max(0, t);
  const s = fuenteRuido(ctx, t, dur);
  const f = ctx.createBiquadFilter();
  f.type = "bandpass"; f.Q.value = q;
  f.frequency.setValueAtTime(desde, t);
  f.frequency.exponentialRampToValueAtTime(hasta, t + dur * 0.7);
  f.frequency.exponentialRampToValueAtTime(desde * 1.5, t + dur);
  const g = envolvente(ctx, t, dur * 0.6, dur * 0.4, vol);
  const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (pan) {
    pan.pan.setValueAtTime(-0.6, t); pan.pan.linearRampToValueAtTime(0.6, t + dur);
    s.connect(f).connect(g).connect(pan).connect(destino);
  } else s.connect(f).connect(g).connect(destino);
}

/** Swish suave (fundidos, desenfoques). */
export function swish(ctx, destino, t, { dur = 0.8, vol = 0.12 } = {}) {
  t = Math.max(0, t);
  const s = fuenteRuido(ctx, t, dur);
  const f = ctx.createBiquadFilter();
  f.type = "lowpass"; f.frequency.setValueAtTime(600, t); f.frequency.linearRampToValueAtTime(2200, t + dur * 0.5);
  f.frequency.linearRampToValueAtTime(500, t + dur);
  s.connect(f).connect(envolvente(ctx, t, dur * 0.5, dur * 0.5, vol)).connect(destino);
}

/** Golpe grave (impacto cinematográfico): seno que cae + clic de ruido. */
export function impacto(ctx, destino, t, { vol = 0.5, grave = true } = {}) {
  t = Math.max(0, t);
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(grave ? 110 : 160, t);
  o.frequency.exponentialRampToValueAtTime(grave ? 32 : 60, t + 0.6);
  o.connect(envolvente(ctx, t, 0.008, grave ? 1.1 : 0.35, vol)).connect(destino);
  o.start(t); o.stop(t + 1.3);
  const s = fuenteRuido(ctx, t, 0.12);
  const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 2500;
  s.connect(f).connect(envolvente(ctx, t, 0.003, 0.1, vol * 0.4)).connect(destino);
}

/** Golpe corto y suave para cortes secos. */
export function golpe(ctx, destino, t, vol = 0.18) {
  impacto(ctx, destino, t, { vol, grave: false });
}

/** Brillo: campanitas agudas que se apagan (revelaciones, luz, iris). */
export function brillo(ctx, destino, t, { vol = 0.08, notas = [1568, 2093, 2637, 3136] } = {}) {
  t = Math.max(0, t);
  notas.forEach((fr, i) => {
    const o = ctx.createOscillator();
    o.type = "sine"; o.frequency.value = fr;
    const ti = t + i * 0.05;
    o.connect(envolvente(ctx, ti, 0.01, 0.9, vol / (1 + i * 0.3))).connect(destino);
    o.start(ti); o.stop(ti + 1);
  });
}

/** Glitch: ráfagas digitales cortas. */
export function glitch(ctx, destino, t, vol = 0.1) {
  t = Math.max(0, t);
  for (let i = 0; i < 6; i++) {
    const ti = t + i * 0.045 + Math.random() * 0.02;
    const o = ctx.createOscillator();
    o.type = "square"; o.frequency.value = 180 + Math.random() * 1600;
    o.connect(envolvente(ctx, ti, 0.002, 0.03, vol)).connect(destino);
    o.start(ti); o.stop(ti + 0.05);
  }
}

/** Riser: tensión que sube antes de un momento importante. */
export function riser(ctx, destino, t, { dur = 1.4, vol = 0.14 } = {}) {
  t = Math.max(0, t);
  const s = fuenteRuido(ctx, t, dur);
  const f = ctx.createBiquadFilter();
  f.type = "bandpass"; f.Q.value = 4;
  f.frequency.setValueAtTime(200, t); f.frequency.exponentialRampToValueAtTime(6000, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05);
  s.connect(f).connect(g).connect(destino);
  const o = ctx.createOscillator();
  o.type = "sawtooth"; o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(420, t + dur);
  const fo = ctx.createBiquadFilter(); fo.type = "lowpass"; fo.frequency.value = 900;
  const go = ctx.createGain();
  go.gain.setValueAtTime(0.0001, t); go.gain.exponentialRampToValueAtTime(vol * 0.35, t + dur); go.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05);
  o.connect(fo).connect(go).connect(destino);
  o.start(t); o.stop(t + dur + 0.1);
}

/** Tic suave para palabras clave. */
export function tic(ctx, destino, t, vol = 0.05) {
  t = Math.max(0, t);
  const o = ctx.createOscillator();
  o.type = "triangle"; o.frequency.setValueAtTime(1300, t); o.frequency.exponentialRampToValueAtTime(700, t + 0.06);
  o.connect(envolvente(ctx, t, 0.003, 0.08, vol)).connect(destino);
  o.start(t); o.stop(t + 0.12);
}

/** Ambientes por escena según el clima: lluvia, viento (niebla), grillos (luciérnagas), aire (polvo). */
export function ambiente(ctx, destino, tipo, ini, dur) {
  if (!tipo || tipo === "ninguno" || dur <= 0) return;
  const fin = ini + dur;
  const fundir = (g, vol) => {
    g.gain.setValueAtTime(0.0001, ini);
    g.gain.linearRampToValueAtTime(vol, ini + 0.4);
    g.gain.setValueAtTime(vol, Math.max(ini + 0.4, fin - 0.4));
    g.gain.linearRampToValueAtTime(0.0001, fin);
  };
  if (tipo === "lluvia" || tipo === "niebla" || tipo === "polvo") {
    const s = ctx.createBufferSource();
    s.buffer = ruido(ctx, 2); s.loop = true;
    const f = ctx.createBiquadFilter();
    if (tipo === "lluvia") { f.type = "highpass"; f.frequency.value = 1200; }
    else { f.type = "lowpass"; f.frequency.value = tipo === "niebla" ? 500 : 900; }
    const g = ctx.createGain(); fundir(g, tipo === "lluvia" ? 0.06 : 0.05);
    s.connect(f).connect(g).connect(destino);
    s.start(ini); s.stop(fin + 0.05);
  } else if (tipo === "luciernagas") {
    // Grillos: chirridos agudos intermitentes
    for (let t = ini + 0.2; t < fin - 0.2; t += 0.35 + Math.random() * 0.4) {
      for (let k = 0; k < 3; k++) {
        const o = ctx.createOscillator();
        o.type = "sine"; o.frequency.value = 4200 + Math.random() * 400;
        const ti = t + k * 0.05;
        o.connect(envolvente(ctx, ti, 0.005, 0.03, 0.025)).connect(destino);
        o.start(ti); o.stop(ti + 0.05);
      }
    }
  }
}

/** Sonido de cada transición de escena. */
export function sonidoTransicion(ctx, destino, tipo, t, dur = 0.4) {
  switch (tipo) {
    case "corte": golpe(ctx, destino, t, 0.14); break;
    case "fundido": swish(ctx, destino, t - 0.1, { dur: Math.max(0.6, dur + 0.2), vol: 0.07 }); break;
    case "desenfoque": swish(ctx, destino, t - 0.1, { dur: Math.max(0.6, dur + 0.2), vol: 0.1 }); break;
    case "negro": swish(ctx, destino, t - 0.2, { dur: 0.6, vol: 0.06 }); impacto(ctx, destino, t + dur * 0.5, { vol: 0.4 }); break;
    case "blanco": impacto(ctx, destino, t, { vol: 0.45 }); brillo(ctx, destino, t + 0.05, { vol: 0.06 }); break;
    case "zoom": whoosh(ctx, destino, t - 0.3, { dur: 0.55, desde: 200, hasta: 5000, vol: 0.24 }); break;
    case "empuje":
    case "deslizar": whoosh(ctx, destino, t - 0.15, { dur: 0.45, vol: 0.2 }); break;
    case "barrido": whoosh(ctx, destino, t - 0.12, { dur: 0.32, desde: 500, hasta: 6000, vol: 0.28, q: 0.8 }); break;
    case "iris": brillo(ctx, destino, t, { vol: 0.07 }); swish(ctx, destino, t, { dur: 0.5, vol: 0.06 }); break;
    case "cortina": whoosh(ctx, destino, t - 0.1, { dur: 0.5, vol: 0.18 }); brillo(ctx, destino, t + dur * 0.5, { vol: 0.04, notas: [2637, 3520] }); break;
    case "glitch": glitch(ctx, destino, t - 0.05, 0.1); break;
    case "luz": swish(ctx, destino, t - 0.1, { dur: 0.9, vol: 0.08 }); brillo(ctx, destino, t + 0.2, { vol: 0.07, notas: [1047, 1568, 2093] }); break;
    case "tinta": swish(ctx, destino, t - 0.05, { dur: 0.8, vol: 0.09 }); tic(ctx, destino, t + 0.15, 0.05); break;
    default: whoosh(ctx, destino, t - 0.25, { dur: 0.5, vol: 0.12 });
  }
}
