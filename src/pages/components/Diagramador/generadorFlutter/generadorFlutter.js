// generadorFlutter/generadorFlutter.js
import { buildFlutterPrompt } from "./promptFlutter";
import { makeFlutterSkeleton } from "./skeletonFlutter";
import { downloadFlutterAsZip } from "./zipFlutter";
import { buildModelFromDiagram } from "../SubDiagrama/modelUtils";

/**
 * Genera un proyecto Flutter completo a partir del diagrama UML
 * @param {Object} params
 * @param {string} params.projectName - Nombre del proyecto
 * @param {string} params.backendUrl - URL del backend (default: http://localhost:8080)
 * @param {Array} params.nodes - Nodos del diagrama (clases/entidades)
 * @param {Array} params.edges - Aristas del diagrama (relaciones)
 * @param {Function} params.onProgress - Callback para reportar progreso
 * @returns {Promise<void>}
 */
export async function generateFlutterApp({
  projectName,
  backendUrl = "http://localhost:8080",
  nodes,
  edges,
  onProgress = () => {},
}) {
  try {
    onProgress({ step: "init", message: "🚀 Iniciando generación de Flutter..." });

    // Validar que haya al menos una entidad
    if (!nodes || nodes.length === 0) {
      throw new Error("No hay entidades en el diagrama. Agrega al menos una entidad para generar código.");
    }

    // 1. Construir el modelo desde el diagrama
    onProgress({ step: "model", message: "📊 Construyendo modelo desde diagrama..." });
    const model = buildModelFromDiagram(nodes, edges);

    // 2. Generar estructura base (skeleton)
    onProgress({ step: "skeleton", message: "🏗️ Generando estructura base del proyecto..." });
    const skeleton = makeFlutterSkeleton(projectName, backendUrl);

    // 3. Construir prompt para IA
    onProgress({ step: "prompt", message: "📝 Construyendo prompt para IA..." });
    const prompt = buildFlutterPrompt(model, projectName, backendUrl);

    // 4. Llamar a la IA para generar código específico
    onProgress({ step: "ai", message: "🤖 Generando código con IA (esto puede tomar un momento)..." });
    const aiResponse = await callAIForFlutterCode(prompt);

    // 5. Combinar skeleton + código generado por IA
    onProgress({ step: "merge", message: "🔗 Combinando archivos generados..." });
    const allFiles = { ...skeleton, ...aiResponse.files };

    // 6. Generar y descargar ZIP
    onProgress({ step: "download", message: "📦 Creando archivo ZIP..." });
    const zipName = `${projectName.toLowerCase().replace(/\s+/g, "_")}_flutter.zip`;
    await downloadFlutterAsZip(allFiles, zipName);

    onProgress({ step: "done", message: "✅ ¡Proyecto Flutter generado exitosamente!" });
    return { success: true, filesCount: Object.keys(allFiles).length };
  } catch (error) {
    console.error("Error generando proyecto Flutter:", error);
    onProgress({ step: "error", message: `❌ Error: ${error.message}` });
    throw error;
  }
}

/**
 * Llama a la IA (Gemini) para generar código Flutter
 * @param {string} prompt - Prompt construido
 * @returns {Promise<{files: Object}>}
 */
async function callAIForFlutterCode(prompt) {
  try {
    // Llamar directamente a la API de Gemini
    const response = await fetchGeminiAPI(prompt);
    
    return parseGeminiResponse(response);
  } catch (error) {
    console.error("Error llamando a la IA:", error);
    throw new Error(`Error generando código con IA: ${error.message}`);
  }
}

/**
 * Llama directamente a la API de Gemini
 */
async function fetchGeminiAPI(promptText) {
  const API_KEY = 
    import.meta.env?.VITE_GEMINI_API_KEY || 
    window.GEMINI_API_KEY || 
    "AIzaSyDRGJ3UXInnuy1Yu3OEw5Y6uMqeBMWLl3M";
    
  const MODEL = import.meta.env?.VITE_GEMINI_MODEL || "gemini-2.0-flash";

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(API_KEY)}`;

  const body = {
    contents: [{ role: "user", parts: [{ text: promptText }] }],
    generationConfig: {
      temperature: 0.2,
      topP: 0.9,
      topK: 32,
      maxOutputTokens: 24000
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
  const raw = data?.candidates?.[0]?.content?.parts?.map(p => p?.text ?? "").join("\n") ?? "";

  return raw;
}

/**
 * Parsea la respuesta de Gemini con rescate robusto
 */
function parseGeminiResponse(response) {
  // Limpiar la respuesta de bloques markdown
  let cleanedResponse = (response || "").replace(/```json|```/g, "").trim();
  
  // Intentar parseo normal primero
  try {
    const parsed = JSON.parse(cleanedResponse);
    if (parsed?.files && typeof parsed.files === "object") {
      return { files: normalizeFilesMap(parsed.files) };
    }
  } catch (parseError) {
    console.warn("Parseo JSON normal falló, intentando rescate:", parseError.message);
  }

  // Intentar rescate manual de archivos
  const rescued = salvageFilesFromText(response);
  if (rescued) {
    console.warn("[Flutter] JSON incompleto — usando archivos rescatados:", Object.keys(rescued));
    return { files: normalizeFilesMap(rescued) };
  }

  // Si todo falla, mostrar error con contexto
  console.error("Error parseando respuesta de IA");
  console.log("Respuesta original (primeros 1000 chars):", response.substring(0, 1000));
  throw new Error("La IA no devolvió un JSON válido. Por favor intenta de nuevo.");
}

/**
 * Normaliza el mapa de archivos: fuerza saltos de línea reales
 */
function normalizeFilesMap(map) {
  const out = {};
  for (const [k, v] of Object.entries(map || {})) {
    if (typeof v !== "string") { 
      out[k] = v; 
      continue; 
    }
    let s = v;
    // Si vienen literales "\n", conviértelos a saltos reales
    if (/\\n/.test(s) && !/\n/.test(s)) {
      s = s.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\r/g, "\r");
    }
    // Normaliza saltos y elimina BOM
    s = s.replace(/\r\n/g, "\n").replace(/^\uFEFF/, "");
    out[k] = s;
  }
  return out;
}

/**
 * Rescate para respuestas truncadas: extrae pares "ruta":"contenido"
 */
function salvageFilesFromText(txt) {
  const s = (txt || "").replace(/```json|```/g, "");
  const filesIdx = s.indexOf('"files"');
  if (filesIdx < 0) return null;

  let i = s.indexOf("{", filesIdx);
  if (i < 0) return null;
  i++; // entramos al objeto de files

  const files = {};
  const skipWs = () => { 
    while (i < s.length && /[\s,]/.test(s[i])) i++; 
  };

  const readJSONString = () => {
    if (s[i] !== '"') return null;
    i++;
    let out = "";
    let esc = false;
    while (i < s.length) {
      const ch = s[i++];
      if (esc) { 
        out += ch; 
        esc = false; 
        continue; 
      }
      if (ch === "\\") { 
        esc = true; 
        out += ch; 
        continue; 
      }
      if (ch === '"') return out;
      out += ch;
    }
    return null; // string truncada
  };

  while (i < s.length) {
    skipWs();
    if (s[i] === "}") break;
    const keyRaw = readJSONString();
    if (!keyRaw) break;
    skipWs();
    if (s[i] !== ":") break;
    i++;
    skipWs();
    const valRaw = readJSONString();
    if (!valRaw) break;

    const key = jsonUnescape(keyRaw);
    const val = jsonUnescape(valRaw);
    files[key] = val;

    skipWs();
    if (s[i] === ",") { i++; continue; }
  }

  return Object.keys(files).length ? files : null;
}

/**
 * Des-escapa secuencias JSON (\n → salto real, etc.)
 */
function jsonUnescape(str) {
  return str
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

/**
 * Vista previa del proyecto (sin descargar)
 * @param {Object} params - Mismos parámetros que generateFlutterApp
 * @returns {Promise<Object>} Lista de archivos que se generarían
 */
export async function previewFlutterApp(params) {
  const model = buildModelFromDiagram(params.nodes, params.edges);
  const skeleton = makeFlutterSkeleton(params.projectName, params.backendUrl);

  return {
    skeleton: Object.keys(skeleton),
    model,
    entitiesCount: model.entities?.length || 0,
    relationsCount: model.relations?.length || 0,
  };
}

export default generateFlutterApp;
