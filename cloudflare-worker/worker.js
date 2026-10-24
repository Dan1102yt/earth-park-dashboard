export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // ── Ruta: Google Sheets lectura ──────────────────────
    if (path === "/sheets/read") {
      try {
        const token = await getGoogleToken(env);
        const sheetId = "1JQMrjOLf7cEq3cTOU2nzV_DtfV6Kna-Daid1YkP0N0g";

        // Leer hoja INGRESOS
        const ingUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/INGRESOS!A:Z`;
        const egUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/EGRESOS!A:Z`;

        const [ingRes, egRes] = await Promise.all([
          fetch(ingUrl, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(egUrl, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const [ingData, egData] = await Promise.all([
          ingRes.json(),
          egRes.json(),
        ]);

        return new Response(JSON.stringify({
          ingresos: ingData.values || [],
          egresos: egData.values || [],
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Ruta: Google Sheets escritura ────────────────────
    if (path === "/sheets/write") {
      try {
        const body = await request.json();
        const token = await getGoogleToken(env);
        const sheetId = "1JQMrjOLf7cEq3cTOU2nzV_DtfV6Kna-Daid1YkP0N0g";
        const range = body.range || "INGRESOS!A:Z";

        const res = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              values: body.values,
            }),
          }
        );

        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Ruta: Google Sheets lectura Corp R&R (solo lectura) ──
    if (path === "/sheets/read-corprr") {
      try {
        const token = await getGoogleToken(env);
        const sheetId = "1DGC8u3zE1McsgVhRaid2k6eVuitt4l5QiAY7P1nCK8Q";
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent("FLUJO DE CAJA!A:J")}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        return new Response(JSON.stringify({
          values: data.values || [],
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Ruta: Google Drive - listar archivos de una carpeta ──
    if (path === "/drive/list") {
      try {
        const folderId = url.searchParams.get("folderId");
        if (!folderId) throw new Error("Falta el parámetro folderId");

        const token = await getGoogleToken(env, "drive");
        const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
        const fields = encodeURIComponent("files(id,name,thumbnailLink,webContentLink,mimeType)");
        const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=1000`;

        const res = await fetch(driveUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.error) throw new Error(JSON.stringify(data.error));

        return new Response(JSON.stringify({ files: data.files || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Ruta: Google Drive - servir una imagen con CORS (para dibujarla en canvas) ──
    if (path === "/drive/image") {
      try {
        const id = url.searchParams.get("id") || "";
        if (!/^[\w-]{10,}$/.test(id)) throw new Error("id inválido");
        const token = await getGoogleToken(env, "drive");
        const auth = { headers: { Authorization: `Bearer ${token}` } };

        // Primero una versión reducida (miniatura grande, ~1600 px); si no hay, el archivo original.
        const meta = await (await fetch(
          `https://www.googleapis.com/drive/v3/files/${id}?fields=mimeType,thumbnailLink`, auth)).json();
        if (meta.error) throw new Error(meta.error.message);
        if (!String(meta.mimeType || "").startsWith("image/")) throw new Error("No es una imagen");

        let img = null;
        if (meta.thumbnailLink) {
          const r = await fetch(meta.thumbnailLink.replace(/=s\d+$/, "=s1600"));
          if (r.ok) img = r;
        }
        if (!img) {
          const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, auth);
          if (!r.ok) throw new Error(`Drive ${r.status}`);
          img = r;
        }
        return new Response(img.body, {
          headers: {
            ...corsHeaders,
            "Content-Type": img.headers.get("Content-Type") || meta.mimeType,
            "Cache-Control": "public, max-age=86400",
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Ruta: generar imagen con IA (Gemini) para fondos de carrusel ──
    // Requiere el secreto GEMINI_API_KEY. Modelo opcional en la variable GEMINI_IMAGE_MODEL.
    if (path === "/image/generate") {
      try {
        if (request.method !== "POST") throw new Error("Usa POST");
        if (!env.GEMINI_API_KEY) throw new Error("Falta el secreto GEMINI_API_KEY en el Worker");
        const { prompt, aspectRatio = "4:5", referencia, referenciaMime = "image/jpeg" } = await request.json();
        if (!prompt || String(prompt).length > 3000) throw new Error("Prompt vacío o demasiado largo");
        // referencia (opcional): imagen base64 para mantener el mismo estilo entre escenas
        const partes = referencia
          ? [{ inlineData: { mimeType: referenciaMime, data: referencia } }, { text: String(prompt) }]
          : [{ text: String(prompt) }];

        const model = env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
            body: JSON.stringify({
              contents: [{ parts: partes }],
              generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio } },
            }),
          }
        );
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);

        const parte = (data.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData || p.inline_data);
        const inline = parte?.inlineData || parte?.inline_data;
        if (!inline?.data) throw new Error("El modelo no devolvió imagen");

        const bytes = Uint8Array.from(atob(inline.data), (c) => c.charCodeAt(0));
        return new Response(bytes, {
          headers: { ...corsHeaders, "Content-Type": inline.mimeType || inline.mime_type || "image/png" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Ruta: animar una imagen como clip de video (Gemini Omni Flash) ──
    // Requiere GEMINI_API_KEY. Modelo opcional: GEMINI_VIDEO_MODEL. Resolución: GEMINI_VIDEO_RES (por defecto 720p).
    if (path === "/visual/video") {
      try {
        if (request.method !== "POST") throw new Error("Usa POST");
        if (!env.GEMINI_API_KEY) throw new Error("Falta el secreto GEMINI_API_KEY en el Worker");
        const { imagen, mime = "image/jpeg", prompt } = await request.json();
        if (!prompt || String(prompt).length > 3000) throw new Error("Prompt vacío o demasiado largo");
        const input = imagen
          ? [{ type: "image", data: imagen, mime_type: mime }, { type: "text", text: String(prompt) }]
          : String(prompt);
        const base = "https://generativelanguage.googleapis.com/v1beta";
        const auth = { "x-goog-api-key": env.GEMINI_API_KEY };
        const res = await fetch(`${base}/interactions`, {
          method: "POST",
          headers: { ...auth, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: env.GEMINI_VIDEO_MODEL || "gemini-omni-1.1-flash",
            input,
            response_format: { type: "video", aspect_ratio: "9:16", resolution: env.GEMINI_VIDEO_RES || "720p", delivery: "uri" },
            ...(imagen ? { generation_config: { video_config: { task: "image_to_video" } } } : {}),
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

        // Buscar el bloque de video dentro de la respuesta
        const buscar = (o) => {
          if (!o || typeof o !== "object") return null;
          if (o.type === "video" && (o.data || o.uri)) return o;
          for (const v of Object.values(o)) { const r = buscar(v); if (r) return r; }
          return null;
        };
        const video = buscar(data);
        if (!video) throw new Error("El modelo no devolvió video: " + JSON.stringify(data).slice(0, 300));

        if (video.data) {
          const bytes = Uint8Array.from(atob(video.data), (c) => c.charCodeAt(0));
          return new Response(bytes, { headers: { ...corsHeaders, "Content-Type": "video/mp4" } });
        }

        // Entregado como archivo: esperar a que esté listo y descargarlo
        let uri = video.uri;
        const m = uri.match(/files\/([^/:?]+)/);
        if (m) {
          for (let i = 0; i < 60; i++) {
            const st = await (await fetch(`${base}/files/${m[1]}`, { headers: auth })).json();
            if (st.state === "ACTIVE" || !st.state) break;
            if (st.state === "FAILED") throw new Error("La generación del video falló");
            await new Promise((r) => setTimeout(r, 4000));
          }
          uri = `${base}/files/${m[1]}:download?alt=media`;
        }
        const archivo = await fetch(uri, { headers: auth });
        if (!archivo.ok) throw new Error(`No se pudo descargar el video (${archivo.status})`);
        return new Response(archivo.body, { headers: { ...corsHeaders, "Content-Type": "video/mp4" } });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Rutas: narrador con ElevenLabs ───────────────────
    // Requiere el secreto ELEVENLABS_API_KEY. Voz por defecto opcional: variable ELEVENLABS_VOICE_ID.
    if (path === "/tts/voices") {
      try {
        if (!env.ELEVENLABS_API_KEY) throw new Error("Falta el secreto ELEVENLABS_API_KEY en el Worker");
        const res = await fetch("https://api.elevenlabs.io/v1/voices", {
          headers: { "xi-api-key": env.ELEVENLABS_API_KEY },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail?.message || data?.detail || `ElevenLabs ${res.status}`);
        const voces = (data.voices || []).map((v) => ({
          id: v.voice_id, nombre: v.name, categoria: v.category, etiquetas: v.labels || {}, muestra: v.preview_url,
        }));
        return new Response(JSON.stringify({ voces, porDefecto: env.ELEVENLABS_VOICE_ID || null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (path === "/tts") {
      try {
        if (request.method !== "POST") throw new Error("Usa POST");
        if (!env.ELEVENLABS_API_KEY) throw new Error("Falta el secreto ELEVENLABS_API_KEY en el Worker");
        const { text, voiceId, previousText, nextText } = await request.json();
        const voz = voiceId || env.ELEVENLABS_VOICE_ID;
        if (!voz) throw new Error("Elige una voz");
        if (!text || String(text).length > 1200) throw new Error("Texto vacío o demasiado largo");
        const res = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voz)}/with-timestamps?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({
              text: String(text),
              model_id: env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
              previous_text: previousText || undefined,
              next_text: nextText || undefined,
              voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true },
            }),
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail?.message || JSON.stringify(data?.detail || data).slice(0, 300));
        return new Response(JSON.stringify({ audio: data.audio_base64, alineacion: data.alignment || data.normalized_alignment }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Ruta: Anthropic (default) ────────────────────────
    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders
      });
    }

    const body = await request.text();
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body,
    });

    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  },
};

// ── Helper: JWT para Google OAuth2 ──────────────────────
async function getGoogleToken(env, scopeType = "sheets") {
  const scopes = {
    sheets: "https://www.googleapis.com/auth/spreadsheets",
    drive: "https://www.googleapis.com/auth/drive.readonly",
  };

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: env.GOOGLE_CLIENT_EMAIL,
    scope: scopes[scopeType],
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encode = obj =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  // Importar la private key PEM
  const pemKey = env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");
  const pemBody = pemKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const keyBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(signingInput)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  const jwt = `${signingInput}.${sigB64}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(`Google auth failed: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}
