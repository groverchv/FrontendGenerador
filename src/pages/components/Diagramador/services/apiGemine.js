// src/views/proyectos/Diagramador/services/apiGemine.js
// Única API para Gemini: generación de código y delta del diagrama.
// - Generador robusto: intenta JSON nativo; si viene truncado, rescata pares "ruta":"contenido"
//   y DES-ESCAPA correctamente (sin duplicar backslashes) para que no queden \n literales.
// - Parser local extendido: CRUD de entidades/atributos + 5 tipos de relación + clear_attrs/only id.

const EMBEDDED_FALLBACK_KEY = "AIzaSyDRGJ3UXInnuy1Yu3OEw5Y6uMqeBMWLl3M";
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

  // 3) Parser local con templates
  const naive = naiveParse(text);
  return { actions: naive };
}

/* ===================== TEMPLATES DE SISTEMAS COMPLETOS ===================== */
const SYSTEM_TEMPLATES = {
  ventas: [
    // Primero todas las entidades
    {op:"add_entity",name:"Usuario",attrs:[{name:"id",type:"Integer"},{name:"username",type:"String"},{name:"password",type:"String"},{name:"email",type:"String"},{name:"rol",type:"String"},{name:"telefono",type:"String"},{name:"activo",type:"Boolean"},{name:"createdAt",type:"Date"},{name:"updatedAt",type:"Date"}]},
    {op:"add_entity",name:"Cliente",attrs:[{name:"id",type:"Integer"},{name:"nombre",type:"String"},{name:"apellido",type:"String"},{name:"email",type:"String"},{name:"telefono",type:"String"},{name:"direccion",type:"String"},{name:"ciudad",type:"String"},{name:"nit",type:"String"},{name:"createdAt",type:"Date"},{name:"updatedAt",type:"Date"}]},
    {op:"add_entity",name:"Categoria",attrs:[{name:"id",type:"Integer"},{name:"nombre",type:"String"},{name:"descripcion",type:"String"},{name:"activo",type:"Boolean"},{name:"createdAt",type:"Date"},{name:"updatedAt",type:"Date"}]},
    {op:"add_entity",name:"Producto",attrs:[{name:"id",type:"Integer"},{name:"nombre",type:"String"},{name:"descripcion",type:"String"},{name:"precio",type:"BigDecimal"},{name:"stock",type:"Integer"},{name:"stockMinimo",type:"Integer"},{name:"categoriaId",type:"Integer"},{name:"activo",type:"Boolean"},{name:"createdAt",type:"Date"},{name:"updatedAt",type:"Date"}]},
    {op:"add_entity",name:"Venta",attrs:[{name:"id",type:"Integer"},{name:"numeroFactura",type:"String"},{name:"fecha",type:"Date"},{name:"total",type:"BigDecimal"},{name:"descuento",type:"BigDecimal"},{name:"subtotal",type:"BigDecimal"},{name:"clienteId",type:"Integer"},{name:"usuarioId",type:"Integer"},{name:"metodoPago",type:"String"},{name:"estado",type:"String"},{name:"createdAt",type:"Date"},{name:"updatedAt",type:"Date"}]},
    {op:"add_entity",name:"DetalleVenta",attrs:[{name:"id",type:"Integer"},{name:"cantidad",type:"Integer"},{name:"precioUnitario",type:"BigDecimal"},{name:"subtotal",type:"BigDecimal"},{name:"descuento",type:"BigDecimal"},{name:"total",type:"BigDecimal"},{name:"ventaId",type:"Integer"},{name:"productoId",type:"Integer"},{name:"createdAt",type:"Date"},{name:"updatedAt",type:"Date"}]},
    // Luego todas las relaciones (muchos a uno)
    {op:"add_relation",a:"Producto",b:"Categoria",mA:"*",mB:"1",relKind:"ASSOC",verb:"pertenece a",relType:"N-1",direction:"a->b"},
    {op:"add_relation",a:"Venta",b:"Cliente",mA:"*",mB:"1",relKind:"ASSOC",verb:"realizada por",relType:"N-1",direction:"a->b"},
    {op:"add_relation",a:"Venta",b:"Usuario",mA:"*",mB:"1",relKind:"ASSOC",verb:"registrada por",relType:"N-1",direction:"a->b"},
    {op:"add_relation",a:"DetalleVenta",b:"Venta",mA:"*",mB:"1",relKind:"COMP",verb:"detalle de",relType:"N-1",direction:"a->b"},
    {op:"add_relation",a:"DetalleVenta",b:"Producto",mA:"*",mB:"1",relKind:"ASSOC",verb:"contiene",relType:"N-1",direction:"a->b"}
  ],
  biblioteca: [
    {op:"add_entity",name:"Usuario",attrs:[{name:"id",type:"Integer"},{name:"nombre",type:"String"},{name:"apellido",type:"String"},{name:"email",type:"String"},{name:"telefono",type:"String"},{name:"direccion",type:"String"},{name:"tipoUsuario",type:"String"},{name:"activo",type:"Boolean"},{name:"createdAt",type:"Date"},{name:"updatedAt",type:"Date"}]},
    {op:"add_entity",name:"Autor",attrs:[{name:"id",type:"Integer"},{name:"nombre",type:"String"},{name:"apellido",type:"String"},{name:"nacionalidad",type:"String"},{name:"biografia",type:"String"},{name:"createdAt",type:"Date"},{name:"updatedAt",type:"Date"}]},
    {op:"add_entity",name:"Editorial",attrs:[{name:"id",type:"Integer"},{name:"nombre",type:"String"},{name:"pais",type:"String"},{name:"email",type:"String"},{name:"telefono",type:"String"},{name:"createdAt",type:"Date"},{name:"updatedAt",type:"Date"}]},
    {op:"add_entity",name:"Libro",attrs:[{name:"id",type:"Integer"},{name:"titulo",type:"String"},{name:"isbn",type:"String"},{name:"anioPublicacion",type:"Integer"},{name:"numPaginas",type:"Integer"},{name:"idioma",type:"String"},{name:"stock",type:"Integer"},{name:"autorId",type:"Integer"},{name:"editorialId",type:"Integer"},{name:"createdAt",type:"Date"},{name:"updatedAt",type:"Date"}]},
    {op:"add_entity",name:"Prestamo",attrs:[{name:"id",type:"Integer"},{name:"fechaPrestamo",type:"Date"},{name:"fechaDevolucion",type:"Date"},{name:"fechaDevolucionReal",type:"Date"},{name:"estado",type:"String"},{name:"multa",type:"BigDecimal"},{name:"usuarioId",type:"Integer"},{name:"libroId",type:"Integer"},{name:"createdAt",type:"Date"},{name:"updatedAt",type:"Date"}]},
    {op:"add_relation",a:"Libro",b:"Autor",mA:"*",mB:"1",relKind:"ASSOC",verb:"escrito por",relType:"N-1",direction:"a->b"},
    {op:"add_relation",a:"Libro",b:"Editorial",mA:"*",mB:"1",relKind:"ASSOC",verb:"publicado por",relType:"N-1",direction:"a->b"},
    {op:"add_relation",a:"Prestamo",b:"Usuario",mA:"*",mB:"1",relKind:"ASSOC",verb:"solicitado por",relType:"N-1",direction:"a->b"},
    {op:"add_relation",a:"Prestamo",b:"Libro",mA:"*",mB:"1",relKind:"ASSOC",verb:"préstamo de",relType:"N-1",direction:"a->b"}
  ],
  hospital: [
    {op:"add_entity",name:"Paciente",attrs:[{name:"id",type:"Integer"},{name:"nombre",type:"String"},{name:"apellido",type:"String"},{name:"fechaNacimiento",type:"Date"},{name:"genero",type:"String"},{name:"direccion",type:"String"},{name:"telefono",type:"String"},{name:"email",type:"String"},{name:"grupoSanguineo",type:"String"},{name:"createdAt",type:"Date"},{name:"updatedAt",type:"Date"}]},
    {op:"add_entity",name:"Doctor",attrs:[{name:"id",type:"Integer"},{name:"nombre",type:"String"},{name:"apellido",type:"String"},{name:"especialidad",type:"String"},{name:"licencia",type:"String"},{name:"telefono",type:"String"},{name:"email",type:"String"},{name:"activo",type:"Boolean"},{name:"createdAt",type:"Date"},{name:"updatedAt",type:"Date"}]},
    {op:"add_entity",name:"Cita",attrs:[{name:"id",type:"Integer"},{name:"fecha",type:"Date"},{name:"hora",type:"String"},{name:"motivo",type:"String"},{name:"estado",type:"String"},{name:"pacienteId",type:"Integer"},{name:"doctorId",type:"Integer"},{name:"createdAt",type:"Date"},{name:"updatedAt",type:"Date"}]},
    {op:"add_entity",name:"HistorialMedico",attrs:[{name:"id",type:"Integer"},{name:"fecha",type:"Date"},{name:"diagnostico",type:"String"},{name:"tratamiento",type:"String"},{name:"observaciones",type:"String"},{name:"pacienteId",type:"Integer"},{name:"doctorId",type:"Integer"},{name:"citaId",type:"Integer"},{name:"createdAt",type:"Date"},{name:"updatedAt",type:"Date"}]},
    {op:"add_relation",a:"Cita",b:"Paciente",mA:"*",mB:"1",relKind:"ASSOC",verb:"agendada para",relType:"N-1",direction:"a->b"},
    {op:"add_relation",a:"Cita",b:"Doctor",mA:"*",mB:"1",relKind:"ASSOC",verb:"atendida por",relType:"N-1",direction:"a->b"},
    {op:"add_relation",a:"HistorialMedico",b:"Paciente",mA:"*",mB:"1",relKind:"ASSOC",verb:"historial de",relType:"N-1",direction:"a->b"},
    {op:"add_relation",a:"HistorialMedico",b:"Doctor",mA:"*",mB:"1",relKind:"ASSOC",verb:"registrado por",relType:"N-1",direction:"a->b"},
    {op:"add_relation",a:"HistorialMedico",b:"Cita",mA:"*",mB:"0..1",relKind:"ASSOC",verb:"derivado de",relType:"N-1",direction:"a->b"}
  ],
  ecommerce: [
    {op:"add_entity",name:"Usuario",attrs:[{name:"id",type:"Integer"},{name:"username",type:"String"},{name:"email",type:"String"},{name:"password",type:"String"},{name:"rol",type:"String"},{name:"activo",type:"Boolean"},{name:"createdAt",type:"Date"},{name:"updatedAt",type:"Date"}]},
    {op:"add_entity",name:"Cliente",attrs:[{name:"id",type:"Integer"},{name:"nombre",type:"String"},{name:"apellido",type:"String"},{name:"email",type:"String"},{name:"telefono",type:"String"},{name:"usuarioId",type:"Integer"},{name:"createdAt",type:"Date"},{name:"updatedAt",type:"Date"}]},
    {op:"add_entity",name:"Direccion",attrs:[{name:"id",type:"Integer"},{name:"calle",type:"String"},{name:"ciudad",type:"String"},{name:"estado",type:"String"},{name:"codigoPostal",type:"String"},{name:"pais",type:"String"},{name:"clienteId",type:"Integer"},{name:"createdAt",type:"Date"}]},
    {op:"add_entity",name:"Categoria",attrs:[{name:"id",type:"Integer"},{name:"nombre",type:"String"},{name:"descripcion",type:"String"},{name:"activo",type:"Boolean"}]},
    {op:"add_entity",name:"Producto",attrs:[{name:"id",type:"Integer"},{name:"nombre",type:"String"},{name:"descripcion",type:"String"},{name:"precio",type:"BigDecimal"},{name:"stock",type:"Integer"},{name:"imagen",type:"String"},{name:"categoriaId",type:"Integer"},{name:"activo",type:"Boolean"},{name:"createdAt",type:"Date"}]},
    {op:"add_entity",name:"Carrito",attrs:[{name:"id",type:"Integer"},{name:"clienteId",type:"Integer"},{name:"createdAt",type:"Date"},{name:"updatedAt",type:"Date"}]},
    {op:"add_entity",name:"ItemCarrito",attrs:[{name:"id",type:"Integer"},{name:"cantidad",type:"Integer"},{name:"carritoId",type:"Integer"},{name:"productoId",type:"Integer"}]},
    {op:"add_entity",name:"Pedido",attrs:[{name:"id",type:"Integer"},{name:"numero",type:"String"},{name:"fecha",type:"Date"},{name:"estado",type:"String"},{name:"total",type:"BigDecimal"},{name:"clienteId",type:"Integer"},{name:"direccionId",type:"Integer"},{name:"createdAt",type:"Date"}]},
    {op:"add_entity",name:"DetallePedido",attrs:[{name:"id",type:"Integer"},{name:"cantidad",type:"Integer"},{name:"precio",type:"BigDecimal"},{name:"subtotal",type:"BigDecimal"},{name:"pedidoId",type:"Integer"},{name:"productoId",type:"Integer"}]},
    {op:"add_relation",a:"Cliente",b:"Usuario",mA:"1",mB:"1",relKind:"ASSOC",verb:"pertenece a"},
    {op:"add_relation",a:"Direccion",b:"Cliente",mA:"*",mB:"1",relKind:"ASSOC",verb:"de"},
    {op:"add_relation",a:"Producto",b:"Categoria",mA:"*",mB:"1",relKind:"ASSOC",verb:"pertenece a"},
    {op:"add_relation",a:"Carrito",b:"Cliente",mA:"1",mB:"1",relKind:"ASSOC",verb:"de"},
    {op:"add_relation",a:"ItemCarrito",b:"Carrito",mA:"*",mB:"1",relKind:"COMP",verb:"en"},
    {op:"add_relation",a:"ItemCarrito",b:"Producto",mA:"*",mB:"1",relKind:"ASSOC",verb:"contiene"},
    {op:"add_relation",a:"Pedido",b:"Cliente",mA:"*",mB:"1",relKind:"ASSOC",verb:"realizado por"},
    {op:"add_relation",a:"Pedido",b:"Direccion",mA:"*",mB:"1",relKind:"ASSOC",verb:"enviado a"},
    {op:"add_relation",a:"DetallePedido",b:"Pedido",mA:"*",mB:"1",relKind:"COMP",verb:"de"},
    {op:"add_relation",a:"DetallePedido",b:"Producto",mA:"*",mB:"1",relKind:"ASSOC",verb:"incluye"}
  ],
  escuela: [
    {op:"add_entity",name:"Estudiante",attrs:[{name:"id",type:"Integer"},{name:"nombre",type:"String"},{name:"apellido",type:"String"},{name:"fechaNacimiento",type:"Date"},{name:"email",type:"String"},{name:"telefono",type:"String"},{name:"direccion",type:"String"},{name:"activo",type:"Boolean"},{name:"createdAt",type:"Date"}]},
    {op:"add_entity",name:"Profesor",attrs:[{name:"id",type:"Integer"},{name:"nombre",type:"String"},{name:"apellido",type:"String"},{name:"especialidad",type:"String"},{name:"email",type:"String"},{name:"telefono",type:"String"},{name:"activo",type:"Boolean"},{name:"createdAt",type:"Date"}]},
    {op:"add_entity",name:"Materia",attrs:[{name:"id",type:"Integer"},{name:"nombre",type:"String"},{name:"codigo",type:"String"},{name:"creditos",type:"Integer"},{name:"descripcion",type:"String"},{name:"activo",type:"Boolean"}]},
    {op:"add_entity",name:"Curso",attrs:[{name:"id",type:"Integer"},{name:"nombre",type:"String"},{name:"gestion",type:"Integer"},{name:"periodo",type:"String"},{name:"horario",type:"String"},{name:"materiaId",type:"Integer"},{name:"profesorId",type:"Integer"},{name:"createdAt",type:"Date"}]},
    {op:"add_entity",name:"Inscripcion",attrs:[{name:"id",type:"Integer"},{name:"fecha",type:"Date"},{name:"estado",type:"String"},{name:"estudianteId",type:"Integer"},{name:"cursoId",type:"Integer"}]},
    {op:"add_entity",name:"Calificacion",attrs:[{name:"id",type:"Integer"},{name:"nota",type:"Double"},{name:"fecha",type:"Date"},{name:"tipo",type:"String"},{name:"inscripcionId",type:"Integer"}]},
    {op:"add_relation",a:"Curso",b:"Materia",mA:"*",mB:"1",relKind:"ASSOC",verb:"de"},
    {op:"add_relation",a:"Curso",b:"Profesor",mA:"*",mB:"1",relKind:"ASSOC",verb:"impartido por"},
    {op:"add_relation",a:"Inscripcion",b:"Estudiante",mA:"*",mB:"1",relKind:"ASSOC",verb:"de"},
    {op:"add_relation",a:"Inscripcion",b:"Curso",mA:"*",mB:"1",relKind:"ASSOC",verb:"en"},
    {op:"add_relation",a:"Calificacion",b:"Inscripcion",mA:"*",mB:"1",relKind:"COMP",verb:"de"}
  ],
  restaurante: [
    {op:"add_entity",name:"Cliente",attrs:[{name:"id",type:"Integer"},{name:"nombre",type:"String"},{name:"telefono",type:"String"},{name:"email",type:"String"},{name:"direccion",type:"String"},{name:"createdAt",type:"Date"}]},
    {op:"add_entity",name:"Mesa",attrs:[{name:"id",type:"Integer"},{name:"numero",type:"Integer"},{name:"capacidad",type:"Integer"},{name:"ubicacion",type:"String"},{name:"estado",type:"String"}]},
    {op:"add_entity",name:"Categoria",attrs:[{name:"id",type:"Integer"},{name:"nombre",type:"String"},{name:"descripcion",type:"String"}]},
    {op:"add_entity",name:"Plato",attrs:[{name:"id",type:"Integer"},{name:"nombre",type:"String"},{name:"descripcion",type:"String"},{name:"precio",type:"BigDecimal"},{name:"disponible",type:"Boolean"},{name:"categoriaId",type:"Integer"}]},
    {op:"add_entity",name:"Pedido",attrs:[{name:"id",type:"Integer"},{name:"numero",type:"String"},{name:"fecha",type:"Date"},{name:"hora",type:"String"},{name:"estado",type:"String"},{name:"total",type:"BigDecimal"},{name:"clienteId",type:"Integer"},{name:"mesaId",type:"Integer"}]},
    {op:"add_entity",name:"DetallePedido",attrs:[{name:"id",type:"Integer"},{name:"cantidad",type:"Integer"},{name:"precio",type:"BigDecimal"},{name:"observaciones",type:"String"},{name:"pedidoId",type:"Integer"},{name:"platoId",type:"Integer"}]},
    {op:"add_entity",name:"Pago",attrs:[{name:"id",type:"Integer"},{name:"fecha",type:"Date"},{name:"monto",type:"BigDecimal"},{name:"metodo",type:"String"},{name:"pedidoId",type:"Integer"}]},
    {op:"add_relation",a:"Plato",b:"Categoria",mA:"*",mB:"1",relKind:"ASSOC",verb:"pertenece a"},
    {op:"add_relation",a:"Pedido",b:"Cliente",mA:"*",mB:"1",relKind:"ASSOC",verb:"realizado por"},
    {op:"add_relation",a:"Pedido",b:"Mesa",mA:"*",mB:"1",relKind:"ASSOC",verb:"en"},
    {op:"add_relation",a:"DetallePedido",b:"Pedido",mA:"*",mB:"1",relKind:"COMP",verb:"de"},
    {op:"add_relation",a:"DetallePedido",b:"Plato",mA:"*",mB:"1",relKind:"ASSOC",verb:"incluye"},
    {op:"add_relation",a:"Pago",b:"Pedido",mA:"1",mB:"1",relKind:"ASSOC",verb:"de"}
  ]
};

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
  
  // Detectar templates de sistemas completos SOLO si se pide explícitamente
  const lowerText = SRC.toLowerCase();
  
  // Solo genera el sistema completo si se pide explícitamente "sistema de X" o "crear sistema X"
  if (/(?:crea(?:r)?|genera(?:r)?|quiero|necesito|haz)\s+(?:un\s+)?sistema\s+(?:completo\s+)?(?:de\s+)?ventas?/i.test(lowerText) ||
      /(?:crea(?:r)?|genera(?:r)?)\s+(?:un\s+)?(?:sistema\s+)?(?:de\s+)?punto\s+de\s+venta/i.test(lowerText)) {
    return SYSTEM_TEMPLATES.ventas;
  }
  if (/(?:crea(?:r)?|genera(?:r)?|quiero|necesito|haz)\s+(?:un\s+)?sistema\s+(?:completo\s+)?(?:de\s+)?biblioteca/i.test(lowerText)) {
    return SYSTEM_TEMPLATES.biblioteca;
  }
  if (/(?:crea(?:r)?|genera(?:r)?|quiero|necesito|haz)\s+(?:un\s+)?sistema\s+(?:completo\s+)?(?:de\s+)?(?:hospital|clinica)/i.test(lowerText)) {
    return SYSTEM_TEMPLATES.hospital;
  }
  if (/(?:crea(?:r)?|genera(?:r)?|quiero|necesito|haz)\s+(?:un\s+)?sistema\s+(?:completo\s+)?(?:de\s+)?(?:ecommerce|e-commerce|tienda\s+online|comercio\s+electronico)/i.test(lowerText)) {
    return SYSTEM_TEMPLATES.ecommerce;
  }
  if (/(?:crea(?:r)?|genera(?:r)?|quiero|necesito|haz)\s+(?:un\s+)?sistema\s+(?:completo\s+)?(?:de\s+)?(?:escuela|colegio|educacion|educativo)/i.test(lowerText)) {
    return SYSTEM_TEMPLATES.escuela;
  }
  if (/(?:crea(?:r)?|genera(?:r)?|quiero|necesito|haz)\s+(?:un\s+)?sistema\s+(?:completo\s+)?(?:de\s+)?restaurante/i.test(lowerText)) {
    return SYSTEM_TEMPLATES.restaurante;
  }

  // Upsert entidad con atributos - Lenguaje natural fluido
  // Acepta: "crear entidad Usuario(...)", "quiero un Usuario con...", "necesito una clase Usuario(...)"
  const reUpsertEntity = /(?:crea(?:r)?|haz(?:me)?|genera(?:r)?|define|actualiza|modifica|quiero|necesito|dame)(?:\s+(?:un|una|la|el))?\s+(?:entidad|clase|tabla)?\s*([A-Za-z_]\w*)(?:\s+(?:con|que\s+tenga|teniendo))?\s*\(([^)]*)\)/gi;
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

  // Crear entidad sin paréntesis - Lenguaje natural
  // Acepta: "crear Usuario", "quiero un Usuario", "necesito una clase Usuario", "hazme un Usuario"
  const reCreateSimple = /(?:crea(?:r)?|haz(?:me)?|genera(?:r)?|define|quiero|necesito|dame)(?:\s+(?:un|una|la|el))?\s+(?:entidad|clase|tabla)?\s*([A-Za-z_]\w*)\b(?!\s*\()/gi;
  let cs;
  while ((cs = reCreateSimple.exec(SRC)) !== null) {
    actions.push({ op: "add_entity", name: T(cs[1]), attrs: [{ name: "id", type: "Integer" }] });
  }

  // Atributos: add - Lenguaje natural fluido
  // Acepta: "agrega telefono", "quiero agregar telefono", "ponle un telefono", "que tenga telefono"
  const reAddAttr = /(?:agrega(?:r)?|añade|añadir|pon(?:le)?|que\s+tenga|con)(?:\s+(?:un|una|el|la))?\s+(?:atributo|campo|propiedad)?\s*([A-Za-z_]\w*)\s+(?:de\s+tipo\s+)?([A-Za-z_][\w\[\]]*)\s+(?:a|en|para)\s+(?:la\s+)?(?:entidad\s+)?([A-Za-z_]\w*)/gi;
  let aa;
  while ((aa = reAddAttr.exec(SRC)) !== null) {
    actions.push({ op: "add_attr", entity: T(aa[3]), attr: { name: T(aa[1]), type: T(aa[2]) || "String" } });
  }
  
  // Atributos: remove uno - Lenguaje natural
  // Acepta: "quita telefono", "elimina el email", "saca telefono de Usuario", "borra el telefono"
  const reDelAttr = /(?:quita(?:r)?|elimina(?:r)?|borra(?:r)?|saca(?:r)?|remueve)(?:\s+(?:el|la))?\s+(?:atributo|campo|propiedad)?\s*([A-Za-z_]\w*)\s+(?:de|en)\s+(?:la\s+)?(?:entidad\s+)?([A-Za-z_]\w*)/gi;
  let da;
  while ((da = reDelAttr.exec(SRC)) !== null) {
    actions.push({ op: "remove_attr", entity: T(da[2]), name: T(da[1]) });
  }
  // Atributos: eliminar todos - Lenguaje natural
  // Acepta: "quita todos los atributos", "borra los campos de Usuario", "limpia los atributos"
  const reClearAttrs = /(?:quita(?:r)?|elimina(?:r)?|borra(?:r)?|limpia(?:r)?)\s+(?:todos\s+)?(?:los\s+)?(?:atributos|campos|propiedades)\s+(?:de|del)\s+(?:la\s+)?(?:entidad\s+)?([A-Za-z_]\w*)/gi;
  let ca;
  while ((ca = reClearAttrs.exec(SRC)) !== null) {
    actions.push({ op: "clear_attrs", entity: T(ca[1]) });
  }
  // Atributos: dejar solo id - Lenguaje natural
  // Acepta: "deja solo id en Usuario", "que Usuario tenga solo id", "limpia todo menos el id"
  const reOnlyId = /(?:deja(?:r)?|que\s+tenga|limpia(?:r)?\s+todo\s+menos)\s+solo\s+(?:el\s+)?id\s+(?:en|de)\s+(?:la\s+)?(?:entidad\s+)?([A-Za-z_]\w*)/gi;
  let oid;
  while ((oid = reOnlyId.exec(SRC)) !== null) {
    actions.push({ op: "update_entity", name: T(oid[1]), attrs: [{ name: "id", type: "Integer" }] });
  }
  // Renombrar entidad - Lenguaje natural
  // Acepta: "renombra Usuario a Cliente", "cambia el nombre de Usuario por Cliente", "que Usuario se llame Cliente"
  const reRenEntity = /(?:renombra(?:r)?(?:\s+entidad)?|cambia(?:r)?(?:\s+(?:el\s+)?nombre\s+de)?|que)\s+(?:la\s+)?(?:entidad\s+)?([A-Za-z_]\w*)\s+(?:a|por|se\s+llame)\s+([A-Za-z_]\w*)/gi;
  let re;
  while ((re = reRenEntity.exec(SRC)) !== null) {
    actions.push({ op: "rename_entity", old: T(re[1]), name: T(re[2]) });
  }
  
  // Eliminar entidad - Lenguaje natural
  // Acepta: "elimina Usuario", "borra la entidad Cliente", "quita Producto", "saca el Usuario"
  const reDelEntity = /(?:elimina(?:r)?|borra(?:r)?|quita(?:r)?|saca(?:r)?)\s+(?:la|el)?\s+(?:entidad|clase|tabla)?\s*([A-Za-z_]\w*)/gi;
  let de;
  while ((de = reDelEntity.exec(SRC)) !== null) {
    actions.push({ op: "remove_entity", name: T(de[1]) });
  }
  
  // Renombrar atributo - Lenguaje natural
  // Acepta: "renombra telefono a celular en Usuario", "cambia el nombre de telefono por celular"
  const reRenAttr = /(?:renombra(?:r)?|cambia(?:r)?(?:\s+(?:el\s+)?nombre\s+de)?)\s+(?:atributo|campo|propiedad)?\s*([A-Za-z_]\w*)\s+(?:de|en)\s+(?:la\s+)?(?:entidad\s+)?([A-Za-z_]\w*)\s+(?:a|por)\s+([A-Za-z_]\w*)/gi;
  let ra;
  while ((ra = reRenAttr.exec(SRC)) !== null) {
    actions.push({ op: "update_attr", entity: T(ra[2]), old: T(ra[1]), attr: { name: T(ra[3]) } });
  }
  // Cambiar tipo de atributo - Lenguaje natural
  // Acepta: "cambia tipo de telefono a Integer en Usuario", "que telefono sea Long", "el precio debe ser Double"
  const reTypeAttr = /(?:cambia(?:r)?|modifica(?:r)?|que)\s+(?:(?:el\s+)?tipo\s+de\s+)?(?:atributo|campo|propiedad)?\s*([A-Za-z_]\w*)\s+(?:de|en)\s+(?:la\s+)?(?:entidad\s+)?([A-Za-z_]\w*)\s+(?:a|sea(?:\s+tipo)?|debe\s+ser)\s+([A-Za-z_][\w[\]]*)/gi;
  let ta;
  while ((ta = reTypeAttr.exec(SRC)) !== null) {
    actions.push({ op: "update_attr", entity: T(ta[2]), old: T(ta[1]), attr: { name: T(ta[1]), type: T(ta[3]) } });
  }

  // Asociación - Lenguaje natural
  // Acepta: "relación Usuario 1..* - 0..1 Pedido", también: "conecta Usuario con Pedido", "que Usuario tenga Pedido"
  const reRel = /(?:relaci[oó]n|conecta(?:r)?|vincular|que)\s+([A-Za-z_]\w*)\s+(?:(?:tenga|con)\s+)?([01]\.\.\*|0\.\.1|1\.\.\*|\*|n|1)?\s*[-–]?\s*([01]\.\.\*|0\.\.1|1\.\.\*|\*|n|1)?\s+([A-Za-z_]\w*)(?:\s*\(verbo:\s*([^)]+)\))?/gi;
  let r;
  while ((r = reRel.exec(SRC)) !== null) {
    const a = T(r[1]), mA = T(r[2]) || "1", mB = T(r[3]) || "1", b = T(r[4]), verb = T(r[5] || "");
    actions.push({ op: "add_relation", a, b, mA, mB, verb, relKind: "ASSOC" });
  }

  // N-M - Lenguaje natural
  // Acepta: "n-m Usuario y Pedido", "muchos a muchos entre Estudiante con Curso", "relación n m Producto Proveedor join ProductoProveedor"
  const reNM = /(?:n[-–\s]*m|muchos\s+a\s+muchos)(?:\s+entre)?\s+([A-Za-z_]\w*)\s+(?:y|con)\s+([A-Za-z_]\w*)(?:.*?\bjoin\b\s+([A-Za-z_]\w*))?/gi;
  let nmm;
  while ((nmm = reNM.exec(SRC)) !== null) {
    actions.push({ op: "add_relation_nm", a: T(nmm[1]), b: T(nmm[2]), joinName: T(nmm[3] || "") || undefined });
  }

  // Entidad asociativa explícita (alias) - Lenguaje natural
  // Acepta: "asociativa Usuario y Pedido join UsuarioPedido", "entidad asociativa entre Cliente con Producto"
  const reAssocEnt = /(?:asociativa|entidad\s+asociativa)(?:\s+entre)?(?:\s+|.*?\s)([A-Za-z_]\w*)\s+(?:y|con)\s+([A-Za-z_]\w*)(?:.*?\bjoin\b\s+([A-Za-z_]\w*))?/gi;
  let ae;
  while ((ae = reAssocEnt.exec(SRC)) !== null) {
    actions.push({ op: "add_relation_associative", a: T(ae[1]), b: T(ae[2]), name: T(ae[3] || "") || undefined });
  }

  // Herencia - Lenguaje natural
  // Acepta: "herencia Empleado -> Persona", "que Empleado herede de Persona", "Empleado extiende Persona"
  const reInhArrow = /(?:herencia|que)\s+([A-Za-z_]\w*)\s+(?:->|herede\s+de|extiende(?:r)?)\s+([A-Za-z_]\w*)/gi;
  let hi;
  while ((hi = reInhArrow.exec(SRC)) !== null) {
    actions.push({ op: "add_relation", a: T(hi[1]), b: T(hi[2]), relKind: "INHERIT" });
  }
  // Herencia con palabras - Ya cubierto arriba en la versión mejorada

  // Dependencia - Lenguaje natural
  // Acepta: "dependencia Usuario -> Pedido", "que Usuario dependa de Pedido", "Usuario usa Pedido"
  const reDepArrow = /(?:dependencia|que)\s+([A-Za-z_]\w*)\s+(?:->|dependa\s+de|usa|use)\s+([A-Za-z_]\w*)/gi;
  let dep;
  while ((dep = reDepArrow.exec(SRC)) !== null) {
    actions.push({ op: "add_relation", a: T(dep[1]), b: T(dep[2]), relKind: "DEPEND", direction: "A->B" });
  }

  // Agregación / Composición - Lenguaje natural
  // Acepta: "agregación Usuario 1 - * Pedido", "composición Carro con Rueda", "que Carro contenga Rueda"
  const reAggComp = /(?:agregaci[oó]n|composici[oó]n|que)\s+([A-Za-z_]\w*)\s+(?:contenga|tenga|con)?\s*([01]\.\.\*|0\.\.1|1\.\.\*|\*|1)?\s*[-–]?\s*([01]\.\.\*|0\.\.1|1\.\.\*|\*|1)?\s+([A-Za-z_]\w*)(?:.*?\b(?:lado|diamante)\b\s*(A|B))?/gi;
  let ac;
  while ((ac = reAggComp.exec(SRC)) !== null) {
    const kind = ac[1].toLowerCase().startsWith("agreg") ? "AGGR" : "COMP";
    const a = T(ac[1]), mA = T(ac[2]) || "1", mB = T(ac[3]) || "1", b = T(ac[4]);
    const owning = T(ac[5] || "A");
    actions.push({ op: "add_relation", a, b, mA, mB, relKind: kind, owning });
  }

  // Eliminar relación - Lenguaje natural
  // Acepta: "elimina relación entre Usuario y Pedido", "quita la conexión Usuario con Cliente", "borra relación Usuario Pedido"
  const reDelRel = /(?:elimina(?:r)?|quita(?:r)?|borra(?:r)?|saca(?:r)?)\s+(?:la\s+)?(?:relaci[oó]n|conexi[oó]n|v[ií]nculo)?\s+(?:entre\s+)?([A-Za-z_]\w*)\s+(?:y|con)\s+([A-Za-z_]\w*)/gi;
  let dr;
  while ((dr = reDelRel.exec(SRC)) !== null) {
    actions.push({ op: "remove_relation", a: T(dr[1]), b: T(dr[2]) });
  }

  return actions;
}
