// src/views/proyectos/Diagramador/services/apiGemine.js
// Única API para Gemini: generación de código y delta del diagrama.
// - Generador robusto: intenta JSON nativo; si viene truncado, rescata pares "ruta":"contenido"
//   y DES-ESCAPA correctamente (sin duplicar backslashes) para que no queden \n literales.
// - Parser local extendido: CRUD de entidades/atributos + 5 tipos de relación + clear_attrs/only id.

const EMBEDDED_FALLBACK_KEY = "AIzaSyBGBFvsYUMQAkbWFdZ4eEVHrpyboKxA0xw";
let RUNTIME_API_KEY = "";
let RUNTIME_MODEL  = "";

/* ===================== Helpers de runtime ===================== */
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
export function setGeminiApiKey(k) { RUNTIME_API_KEY = (k || "").trim(); }
export function setGeminiModel(m)  { RUNTIME_MODEL  = (m || "").trim(); }

const FALLBACK_MODELS = ["gemini-2.0-pro", "gemini-1.5-flash-latest"];

/* ===================== Core HTTP ===================== */
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
    const is404 = err?.status === 404 || /NOT_FOUND|model/i.test(err?.payload || "");
    if (!is404) throw err;
    for (const m of FALLBACK_MODELS) {
      try { return await _callOnce(m, promptText, { maxOutputTokens }); } catch {}
    }
    throw err;
  }
}

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

/* ===================== Parse helpers ===================== */
function parseJsonLoose(text) {
  const cleaned = (text || "").replace(/```json|```/g, "").trim();
  try { return JSON.parse(cleaned); }
  catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(cleaned.slice(first, last + 1));
    throw new Error("No se pudo parsear la respuesta de Gemini como JSON.");
  }
}

/** DES-ESCAPA una cadena JSON leída cruda entre comillas.
 *  Importante: NO duplicar backslashes. Sólo escapamos comillas para poder JSON.parse().
 */
function jsonUnescape(val) {
  try {
    return JSON.parse(`"${String(val).replace(/"/g, '\\"')}"`);
  } catch {
    // Respaldo: reemplazos comunes por si viene roto
    return String(val)
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
}

/** Normaliza el mapa de archivos: fuerza saltos de línea reales y limpia espacios BOM/CRLF. */
function normalizeFilesMap(map) {
  const out = {};
  for (const [k, v] of Object.entries(map || {})) {
    if (typeof v !== "string") { out[k] = v; continue; }
    let s = v;
    // Si vienen literales "\n", conviértelos a saltos reales.
    if (/\\n/.test(s) && !/\n/.test(s)) s = s.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\r/g, "\r");
    // Normaliza saltos y elimina BOM accidental
    s = s.replace(/\r\n/g, "\n").replace(/^\uFEFF/, "");
    out[k] = s;
  }
  return out;
}

/**
 * Rescate para respuestas truncadas:
 * extrae pares "ruta":"contenido" dentro de la sección "files" aun cuando falte
 * la última comilla/llave. Omite el último archivo si está incompleto y
 * DES-ESCAPA el contenido para que no queden \n literales.
 */
function salvageFilesFromText(txt) {
  const s = (txt || "").replace(/```json|```/g, "");
  const filesIdx = s.indexOf('"files"');
  if (filesIdx < 0) return null;

  let i = s.indexOf("{", filesIdx);
  if (i < 0) return null;
  i++; // entramos al objeto de files

  const files = {};
  const skipWs = () => { while (i < s.length && /[\s,]/.test(s[i])) i++; };

  const readJSONString = () => {
    if (s[i] !== '"') return null;
    i++;
    let out = "";
    let esc = false;
    while (i < s.length) {
      const ch = s[i++];
      if (esc) { out += ch; esc = false; continue; }
      if (ch === "\\") { esc = true; out += ch; continue; }
      if (ch === '"') return out; // devuelve sin comillas
      out += ch;
    }
    return null; // string truncada
  };

  while (i < s.length) {
    skipWs();
    if (s[i] === "}") break; // fin files
    const keyRaw = readJSONString();
    if (!keyRaw) break;
    skipWs();
    if (s[i] !== ":") break;
    i++;
    skipWs();
    const valRaw = readJSONString();
    if (!valRaw) break; // truncado -> paramos

    const key = jsonUnescape(keyRaw);
    const val = jsonUnescape(valRaw);
    files[key] = val;

    skipWs();
    if (s[i] === ",") { i++; continue; }
  }

  return Object.keys(files).length ? files : null;
}

/* ===================== APIs públicas ===================== */
export async function generateSpringBootCode(promptText) {
  // 1) JSON nativo (ideal)
  try {
    const parsed = await callGeminiJSON(promptText, { maxOutputTokens: 24000 });
    if (parsed?.files && typeof parsed.files === "object") {
      return normalizeFilesMap(parsed.files);
    }
    throw new Error("Respuesta sin 'files'.");
  } catch {
    // 2) Texto normal
    const raw = await callGemini(promptText, { maxOutputTokens: 24000 });

    // 2a) Intento parseo laxo
    try {
      const parsed = parseJsonLoose(raw);
      if (parsed?.files && typeof parsed.files === "object") {
        return normalizeFilesMap(parsed.files);
      }
    } catch {}

    // 2b) Rescate manual de pares "ruta":"contenido"
    const rescued = salvageFilesFromText(raw);
    if (rescued) {
      const norm = normalizeFilesMap(rescued);
      console.warn("[generator] JSON incompleto — usando archivos rescatados:", Object.keys(norm));
      return norm;
    }

    // 2c) Sin salvación
    throw new Error("No se pudo parsear JSON devuelto por Gemini. Fragmento: " + raw.slice(0, 1000));
  }
}

export async function generateDiagramDelta(promptText) {
  const parsed = await callGeminiJSON(promptText, { maxOutputTokens: 8000 });
  if (!Array.isArray(parsed?.actions)) {
    throw new Error("La respuesta de Gemini no contiene 'actions'.");
  }
  return parsed;
}

export async function getDeltaFromUserText({ text, promptBuilder, currentModel }) {
  // 1) JSON directo del usuario
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

/* ===================== Parser local EXTENDIDO =====================

   Soporta instrucciones como:
   - crear/definir/actualizar entidad: "crear entidad Usuario(id Integer, nombre String)"
   - crear entidad sin paréntesis: "crear entidad Producto"
   - atributos:
     * "agrega atributo telefono Integer a Usuario"
     * "quita atributo telefono de Usuario"
     * "renombrar atributo telefono de Usuario a celular"
     * "cambia tipo de atributo telefono de Usuario a Long"
     * "elimina los atributos de Usuario" | "deja solo id en Usuario"
   - relaciones (5 tipos):
     * Asociación:    "relación Usuario 1..* - 1 Perfil (verbo: tiene)"
     * N–M:           "n-m Usuario y Rol [join Usuario_Rol]"
     * Asociativa:    "asociativa Usuario y Producto [join Usuario_Producto]"
     * Herencia:      "Empleado -> Persona" | "Empleado extiende Persona"
     * Dependencia:   "dependencia A -> B" | "A depende de B"
     * Agreg/Comp:    "agregación A 1..* - 1 B [lado A]" | "composición A 1..* - 1 B [lado B]"
*/
function naiveParse(textRaw) {
  const T = (s) => (s || "").trim();
  const SRC = textRaw || "";
  const actions = [];

  // Upsert entidad con atributos
  const reUpsertEntity = /(?:crea(?:r)?|define|actualiza|modifica)\s+entidad\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/gi;
  let m;
  while ((m = reUpsertEntity.exec(SRC)) !== null) {
    const name = T(m[1]);
    const attrsStr = T(m[2]);
    const attrs = attrsStr
      ? attrsStr.split(",").map((p) => {
          const [n, t] = p.split(/\s+/).map(T);
          return { name: n.replace(/[:,]/g, ""), type: (t || "String").replace(/[:,]/g, "") };
        })
      : [];
    if (!attrs.some(a => a.name.toLowerCase() === "id")) {
      attrs.unshift({ name: "id", type: "Integer" });
    }
    actions.push({ op: "update_entity", name, attrs });
  }

  // Crear entidad sin paréntesis
  const reCreateSimple = /(?:crea(?:r)?|define)\s+entidad\s+([A-Za-z_]\w*)\b(?!\s*\()/gi;
  let cs;
  while ((cs = reCreateSimple.exec(SRC)) !== null) {
    actions.push({ op: "add_entity", name: T(cs[1]), attrs: [{ name: "id", type: "Integer" }] });
  }

  // Atributos: add
  const reAddAttr = /(agrega|añade)\s+atributo\s+([A-Za-z_]\w*)\s+([A-Za-z_][\w\[\]]*)\s+a\s+([A-Za-z_]\w*)/gi;
  let aa;
  while ((aa = reAddAttr.exec(SRC)) !== null) {
    actions.push({ op: "add_attr", entity: T(aa[4]), attr: { name: T(aa[2]), type: T(aa[3]) || "String" } });
  }
  // Atributos: remove uno
  const reDelAttr = /(quita|elimina|borra)\s+atributo\s+([A-Za-z_]\w*)\s+de\s+([A-Za-z_]\w*)/gi;
  let da;
  while ((da = reDelAttr.exec(SRC)) !== null) {
    actions.push({ op: "remove_attr", entity: T(da[3]), name: T(da[2]) });
  }
  // Atributos: eliminar todos
  const reClearAttrs = /(quita|elimina|borra)\s+(?:todos\s+los\s+|los\s+)?atributos\s+(?:de|del)\s+([A-Za-z_]\w*)/gi;
  let ca;
  while ((ca = reClearAttrs.exec(SRC)) !== null) {
    actions.push({ op: "clear_attrs", entity: T(ca[2]) });
  }
  // Atributos: dejar solo id
  const reOnlyId = /deja\s+solo\s+id\s+(?:en|de)\s+([A-Za-z_]\w*)/gi;
  let oid;
  while ((oid = reOnlyId.exec(SRC)) !== null) {
    actions.push({ op: "update_entity", name: T(oid[1]), attrs: [{ name: "id", type: "Integer" }] });
  }
  // Renombrar entidad
  const reRenEntity = /(renombra(?:r)?\s+entidad|cambia\s+nombre\s+de\s+entidad)\s+([A-Za-z_]\w*)\s+a\s+([A-Za-z_]\w*)/gi;
  let re;
  while ((re = reRenEntity.exec(SRC)) !== null) {
    actions.push({ op: "rename_entity", old: T(re[2]), name: T(re[3]) });
  }
  // Renombrar atributo
  const reRenAttr = /(renombra(?:r)?)\s+atributo\s+([A-Za-z_]\w*)\s+de\s+([A-Za-z_]\w*)\s+a\s+([A-Za-z_]\w*)/gi;
  let ra;
  while ((ra = reRenAttr.exec(SRC)) !== null) {
    actions.push({ op: "update_attr", entity: T(ra[3]), old: T(ra[2]), attr: { name: T(ra[4]) } });
  }
  // Cambiar tipo de atributo
  const reTypeAttr = /(cambia|modifica)\s+tipo\s+de\s+atributo\s+([A-Za-z_]\w*)\s+de\s+([A-Za-z_]\w*)\s+a\s+([A-Za-z_][\w\[\]]*)/gi;
  let ta;
  while ((ta = reTypeAttr.exec(SRC)) !== null) {
    actions.push({ op: "update_attr", entity: T(ta[3]), old: T(ta[2]), attr: { name: T(ta[2]), type: T(ta[4]) } });
  }

  // Asociación
  const reRel = /relaci[oó]n\s+([A-Za-z_]\w*)\s+([01]\.\.\*|0\.\.1|1\.\.\*|\*|n|1)\s*[-–]\s*([01]\.\.\*|0\.\.1|1\.\.\*|\*|n|1)\s+([A-Za-z_]\w*)(?:\s*\(verbo:\s*([^)]+)\))?/gi;
  let r;
  while ((r = reRel.exec(SRC)) !== null) {
    const a = T(r[1]), mA = T(r[2]), mB = T(r[3]), b = T(r[4]), verb = T(r[5] || "");
    actions.push({ op: "add_relation", a, b, mA, mB, verb, relKind: "ASSOC" });
  }

  // N-M
  const reNM = /n[-–\s]*m\s+([A-Za-z_]\w*)\s+(?:y|con)\s+([A-Za-z_]\w*)(?:.*?\bjoin\b\s+([A-Za-z_]\w*))?/gi;
  let nmm;
  while ((nmm = reNM.exec(SRC)) !== null) {
    actions.push({ op: "add_relation_nm", a: T(nmm[1]), b: T(nmm[2]), joinName: T(nmm[3] || "") || undefined });
  }

  // Entidad asociativa explícita (alias)
  const reAssocEnt = /asociativa(?:\s+|.*?\s)([A-Za-z_]\w*)\s+(?:y|con)\s+([A-Za-z_]\w*)(?:.*?\bjoin\b\s+([A-Za-z_]\w*))?/gi;
  let ae;
  while ((ae = reAssocEnt.exec(SRC)) !== null) {
    actions.push({ op: "add_relation_associative", a: T(ae[1]), b: T(ae[2]), name: T(ae[3] || "") || undefined });
  }

  // Herencia
  const reInhArrow = /herencia\s+([A-Za-z_]\w*)\s*->\s*([A-Za-z_]\w*)/gi;
  let hi;
  while ((hi = reInhArrow.exec(SRC)) !== null) {
    actions.push({ op: "add_relation", a: T(hi[1]), b: T(hi[2]), relKind: "INHERIT" });
  }
  const reInhWords = /([A-Za-z_]\w*)\s+(?:extiende|hereda\s+de)\s+([A-Za-z_]\w*)/gi;
  while ((hi = reInhWords.exec(SRC)) !== null) {
    actions.push({ op: "add_relation", a: T(hi[1]), b: T(hi[2]), relKind: "INHERIT" });
  }

  // Dependencia
  const reDepArrow = /dependencia\s+([A-Za-z_]\w*)\s*->\s*([A-Za-z_]\w*)/gi;
  let dep;
  while ((dep = reDepArrow.exec(SRC)) !== null) {
    actions.push({ op: "add_relation", a: T(dep[1]), b: T(dep[2]), relKind: "DEPEND", direction: "A->B" });
  }
  const reDepWords = /([A-Za-z_]\w*)\s+depende\s+de\s+([A-Za-z_]\w*)/gi;
  while ((dep = reDepWords.exec(SRC)) !== null) {
    actions.push({ op: "add_relation", a: T(dep[1]), b: T(dep[2]), relKind: "DEPEND", direction: "A->B" });
  }

  // Agregación / Composición
  const reAggComp = /(agregaci[oó]n|composici[oó]n)\s+([A-Za-z_]\w*)\s+([01]\.\.\*|0\.\.1|1\.\.\*|\*|1)\s*[-–]\s*([01]\.\.\*|0\.\.1|1\.\.\*|\*|1)\s+([A-Za-z_]\w*)(?:.*?\b(?:lado|diamante)\b\s*(A|B))?/gi;
  let ac;
  while ((ac = reAggComp.exec(SRC)) !== null) {
    const kind = ac[1].toLowerCase().startsWith("agreg") ? "AGGR" : "COMP";
    const a = T(ac[2]), mA = T(ac[3]), mB = T(ac[4]), b = T(ac[5]);
    const owning = T(ac[6] || "A");
    actions.push({ op: "add_relation", a, b, mA, mB, relKind: kind, owning });
  }

  return actions;
}
