// services/gemini.js
// Consume la API de Gemini y devuelve:
// 1) Archivos de código Spring Boot ({ [ruta]: contenido })
// 2) Un "delta" para autocompletar el diagrama ({ actions: [...] })

// ✅ API key embebida como último fallback.
// Recomendado: primero .env (VITE_GEMINI_API_KEY) o window.GEMINI_API_KEY; si no existen, usamos la embebida.
const EMBEDDED_GEMINI_API_KEY = "AIzaSyA2GflIktQZgODfQT5w-ZNGGMxIg60VsTU";

const GEMINI_API_KEY =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_API_KEY) ||
  (typeof window !== "undefined" && window.GEMINI_API_KEY) ||
  EMBEDDED_GEMINI_API_KEY;

const DEFAULT_MODEL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_MODEL) ||
  "gemini-2.0-flash";

// Si falla con 404 (model not found / not supported), probamos estos:
const FALLBACK_MODELS = ["gemini-2.0-pro", "gemini-1.5-flash-latest"];

/** Llama a Gemini y devuelve el texto “tal cual” (concatenación de parts). */
async function _callOnce(model, promptText, { maxOutputTokens = 24000 } = {}) {
  if (!GEMINI_API_KEY) {
    throw new Error("Falta la API key de Gemini (no se encontró ninguna fuente).");
  }

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=` +
    encodeURIComponent(GEMINI_API_KEY);

  const body = {
    contents: [{ role: "user", parts: [{ text: promptText }]}],
    generationConfig: {
      temperature: 0.2,
      topP: 0.9,
      topK: 32,
      maxOutputTokens
    }
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`Gemini error ${res.status}: ${text || res.statusText}`);
    err.status = res.status;
    err.payload = text;
    throw err;
  }

  const data = await res.json();
  const raw =
    data?.candidates?.[0]?.content?.parts?.map(p => p?.text ?? "").join("\n") ?? "";

  return raw;
}

async function callGemini(promptText, { maxOutputTokens = 24000 } = {}) {
  if (!GEMINI_API_KEY) {
    throw new Error("Falta la API key de Gemini (VITE_GEMINI_API_KEY / window.GEMINI_API_KEY / embebida).");
  }

  // Intento principal
  try {
    return await _callOnce(DEFAULT_MODEL, promptText, { maxOutputTokens });
  } catch (err) {
    // Sólo hacemos fallback si es un 404 de modelo
    const is404 = err?.status === 404 || /NOT_FOUND|model/i.test(err?.payload || "");
    if (!is404) throw err;

    for (const m of FALLBACK_MODELS) {
      try {
        return await _callOnce(m, promptText, { maxOutputTokens });
      } catch {
        // probar siguiente
      }
    }
    throw err; // si todos fallan, relanzar el primero
  }
}

/** Intenta extraer un JSON de un texto (quita fences, busca primer/último { ... }). */
function parseJsonLoose(text) {
  const cleaned = (text || "").replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) {
      return JSON.parse(cleaned.slice(first, last + 1));
    }
    throw new Error("No se pudo parsear la respuesta de Gemini como JSON.");
  }
}

/**
 * Envía un prompt de generación de CÓDIGO y espera un JSON con forma:
 * { "files": { "pom.xml": "...", "src/main/java/.../App.java": "..." } }
 * Devuelve directamente el objeto "files".
 */
export async function generateSpringBootCode(promptText) {
  const raw = await callGemini(promptText, { maxOutputTokens: 24000 });
  const parsed = parseJsonLoose(raw);

  if (!parsed?.files || typeof parsed.files !== "object") {
    throw new Error("La respuesta de Gemini no contiene 'files'.");
  }
  return parsed.files; // { "ruta": "contenido", ... }
}

/**
 * Envía un prompt para COMPLETAR/AUTOCONSTRUIR el DIAGRAMA y espera:
 * { "actions": [ { op: "add_entity" | "update_entity" | "remove_entity" | "add_relation" | "add_relation_nm" | "remove_relation", ... } ] }
 * Devuelve el objeto completo (p.ej. { actions: [...] }).
 */
export async function generateDiagramDelta(promptText) {
  const raw = await callGemini(promptText, { maxOutputTokens: 8000 });
  const parsed = parseJsonLoose(raw);

  if (!Array.isArray(parsed?.actions)) {
    throw new Error("La respuesta de Gemini no contiene 'actions'.");
  }
  return parsed; // { actions: [...] }
}

// (Opcional) Permite cambiar la API key en runtime (por ejemplo, leerla desde un input admin)
export function setGeminiApiKey(k) {
  if (typeof k === "string" && k.trim()) {
    // Nota: esto no persiste, sólo vive en memoria de la SPA.
    // eslint-disable-next-line no-global-assign
    EMBEDDED_GEMINI_API_KEY = k.trim(); // no re-deploy necesario si usas esta función antes de llamar a Gemini
  }
}
