// services/gemini.js
// Consume la API de Gemini y devuelve:
// 1) Archivos de código Spring Boot ({ [ruta]: contenido })
// 2) Un "delta" para autocompletar el diagrama ({ actions: [...] })
//
// ⚠️ Recomendado: usa una API key desde variables de entorno.
//    Vite: define VITE_GEMINI_API_KEY en .env.local
//    Si no existe, usa window.GEMINI_API_KEY o el literal de fallback.

const GEMINI_API_KEY =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_API_KEY) ||
  (typeof window !== "undefined" && window.GEMINI_API_KEY) ||
  "AIzaSyA2GflIktQZgODfQT5w-ZNGGMxIg60VsTU"; // <-- tu API key (si decides hardcodear)

const MODEL = "gemini-1.5-flash"; // o "gemini-1.5-pro"

/** Llama a Gemini y devuelve el texto “tal cual” (concatenación de parts). */
async function callGemini(promptText, { maxOutputTokens = 24000 } = {}) {
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=` +
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
    throw new Error(`Gemini error ${res.status}: ${text || res.statusText}`);
  }

  const data = await res.json();
  const raw =
    data?.candidates?.[0]?.content?.parts?.map(p => p?.text ?? "").join("\n") ?? "";

  return raw;
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
