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
        const { prompt, aspectRatio = "4:5" } = await request.json();
        if (!prompt || String(prompt).length > 2000) throw new Error("Prompt vacío o demasiado largo");

        const model = env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
            body: JSON.stringify({
              contents: [{ parts: [{ text: String(prompt) }] }],
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
