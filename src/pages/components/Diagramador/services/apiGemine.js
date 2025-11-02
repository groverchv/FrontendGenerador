// services/apiGemine.js
// Única API para Gemini: generación de código y delta del diagrama.

// ===== Config =====
const EMBEDDED_FALLBACK_KEY = "AIzaSyAvkL6_qae6rjW9gZy3zckgvCq9_nBkVt8"; // último recurso
let RUNTIME_API_KEY = "";   // settable en runtime con setGeminiApiKey()
let RUNTIME_MODEL  = "";    // settable en runtime con setGeminiModel()

function getApiKey() {
  return (
    RUNTIME_API_KEY ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_API_KEY) ||
    (typeof window !== "undefined" && window.GEMINI_API_KEY) ||
    EMBEDDED_FALLBACK_KEY
  );
}

function getModel() {
  return (
    RUNTIME_MODEL ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_MODEL) ||
    "gemini-2.0-flash"
  );
}

// Si el modelo no existe en la región del usuario, probamos con estos:
const FALLBACK_MODELS = ["gemini-2.0-pro", "gemini-1.5-flash-latest"];

// ===== Core HTTP =====
async function _callOnce(model, promptText, { maxOutputTokens = 24000 } = {}) {
  const API_KEY = getApiKey();
  if (!API_KEY) throw new Error("Falta la API key de Gemini.");

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=` +
    encodeURIComponent(API_KEY);

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
  const model = getModel();

  try {
    return await _callOnce(model, promptText, { maxOutputTokens });
  } catch (err) {
    // Reintento sólo si el error sugiere "modelo no encontrado/soportado"
    const is404 = err?.status === 404 || /NOT_FOUND|model/i.test(err?.payload || "");
    if (!is404) throw err;

    for (const m of FALLBACK_MODELS) {
      try {
        return await _callOnce(m, promptText, { maxOutputTokens });
      } catch {
        /* probar siguiente */
      }
    }
    throw err;
  }
}

// Respuesta JSON directa (cuando el prompt exige "SOLO JSON")
async function callGeminiJSON(promptText, { maxOutputTokens = 8000 } = {}) {
  const API_KEY = getApiKey();
  const model = getModel();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(API_KEY)}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: promptText }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
      topK: 32,
      topP: 0.95,
      maxOutputTokens
    },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Gemini HTTP ${resp.status}: ${t}`);
  }
  const json = await resp.json();
  const txt = json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  return JSON.parse(txt);
}

// ===== Helpers JSON =====
function parseJsonLoose(text) {
  const cleaned = (text || "").replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(cleaned.slice(first, last + 1));
    throw new Error("No se pudo parsear la respuesta de Gemini como JSON.");
  }
}

// ===== API: Código Spring Boot =====
/**
 * Espera JSON:
 * { "files": { "pom.xml": "...", "src/main/java/.../App.java": "..." } }
 * Devuelve parsed.files
 */
export async function generateSpringBootCode(promptText) {
  const raw = await callGemini(promptText, { maxOutputTokens: 24000 });
  const parsed = parseJsonLoose(raw);
  if (!parsed?.files || typeof parsed.files !== "object") {
    throw new Error("La respuesta de Gemini no contiene 'files'.");
  }
  return parsed.files;
}

// ===== API: Delta del Diagrama =====
/** Devuelve { actions: [...] } */
export async function generateDiagramDelta(promptText) {
  const parsed = await callGeminiJSON(promptText, { maxOutputTokens: 8000 });
  if (!Array.isArray(parsed?.actions)) {
    throw new Error("La respuesta de Gemini no contiene 'actions'.");
  }
  return parsed;
}

// ===== Texto libre → Delta =====
/**
 * Si el usuario pegó JSON válido con { actions: [...] }, lo usa directo.
 * Si hay API key, llama a Gemini con promptBuilder(model, text).
 * Si todo falla, usa parser local para comandos básicos.
 */
export async function getDeltaFromUserText({ text, promptBuilder, currentModel }) {
  // 1) JSON directo
  try {
    const asJson = JSON.parse(text);
    if (asJson && typeof asJson === "object" && Array.isArray(asJson.actions)) {
      return asJson;
    }
  } catch {}

  // 2) Gemini (si hay key)
  if (getApiKey()) {
    const prompt = promptBuilder(currentModel, text);
    try {
      const out = await callGeminiJSON(prompt, { maxOutputTokens: 8000 });
      if (out && Array.isArray(out.actions)) return out;
    } catch (e) {
      console.warn("Gemini falló; uso parser local. Detalle:", e?.message);
    }
  }

  // 3) Parser local
  const naive = naiveParse(text);
  return { actions: naive };
}

/* ===== Parser mínimo local =====
   Soporta instrucciones:
   - crea entidad Usuario(id Integer, nombre String)
   - relación Usuario 1..* - 1 Perfil (verbo: tiene)
   - n-m Usuario y Rol [join Usuario_Rol]
*/
function naiveParse(textRaw) {
  const actions = [];

  // crea entidad X(...)
  const reEntity = /crea(?:r)?\s+entidad\s+([a-zA-Z_][\w]*)\s*\(([^)]*)\)/gi;
  let m;
  while ((m = reEntity.exec(textRaw)) !== null) {
    const name = m[1].trim();
    const attrsStr = m[2].trim();
    const attrs = attrsStr
      ? attrsStr.split(",").map((p) => {
          const [n, t] = p.split(/\s+/).map((s) => s.trim());
          return { name: n.replace(/[:,]/g, ""), type: (t || "String").replace(/[:,]/g, "") };
        })
      : [];
    actions.push({ op: "add_entity", name, attrs });
  }

  // relación A 1..* - 1 B (verbo: x)
  const reRel = /relaci[oó]n\s+([A-Za-z_]\w*)\s+([01]\.\.\*|0\.\.1|1\.\.\*|\*|n|1)\s*[-–]\s*([01]\.\.\*|0\.\.1|1\.\.\*|\*|n|1)\s+([A-Za-z_]\w*)(?:\s*\(verbo:\s*([^)]+)\))?/gi;
  let r;
  while ((r = reRel.exec(textRaw)) !== null) {
    const a = r[1]; const mA = r[2]; const mB = r[3]; const b = r[4]; const verb = (r[5] || "").trim();
    actions.push({ op: "add_relation", a, b, mA, mB, verb });
  }

  // n-m A y B [join X]
  const reNM = /n[-–\s]*m\s+([A-Za-z_]\w*)\s+(?:y|con)\s+([A-Za-z_]\w*)(?:.*?\bjoin\b\s+([A-Za-z_]\w*))?/gi;
  let nmm;
  while ((nmm = reNM.exec(textRaw)) !== null) {
    const a = nmm[1]; const b = nmm[2]; const joinName = nmm[3];
    actions.push({ op: "add_relation_nm", a, b, joinName });
  }

  return actions;
}

// ===== Runtime setters =====
export function setGeminiApiKey(k) { RUNTIME_API_KEY = (k || "").trim(); }
export function setGeminiModel(m)  { RUNTIME_MODEL  = (m || "").trim(); }
