// generadorFlutter/generadorFlutter.js
import { buildFlutterPrompt } from "./promptFlutter";
import { makeFlutterSkeleton } from "./skeletonFlutter";
import { downloadFlutterAsZip } from "./zipFlutter";
import { buildModelFromDiagram } from "../SubDiagrama/modelUtils";
import { generateSpringBootCode } from "../services/apiGemine";
import { API_BASE_URL } from "../../../../api/api";

/**
 * Genera un proyecto Flutter completo a partir del diagrama UML
 * OPTIMIZADO: Mejor manejo de errores, validación robusta, progreso detallado
 * @param {Object} params
 * @param {string} params.projectName - Nombre del proyecto
 * @param {string} params.backendUrl - URL del backend (default: http://localhost:8080)
 * @param {Array} params.nodes - Nodos del diagrama (clases/entidades)
 * @param {Array} params.edges - Aristas del diagrama (relaciones)
 * @param {Function} params.onProgress - Callback para reportar progreso
 * @returns {Promise<{success: boolean, filesCount: number}>}
 */
export async function generateFlutterApp({
  projectName,
  backendUrl = API_BASE_URL,
  nodes,
  edges,
  onProgress = () => { },
}) {
  const startTime = Date.now();

  try {
    onProgress({ step: "init", message: "🚀 Iniciando generación de Flutter..." });
    console.log("[Flutter] 🚀 Iniciando generación...");

    // Validar que haya al menos una entidad
    if (!nodes || nodes.length === 0) {
      throw new Error("No hay entidades en el diagrama. Agrega al menos una entidad para generar código.");
    }

    // 1. Construir el modelo desde el diagrama
    onProgress({ step: "model", message: "📊 Construyendo modelo desde diagrama..." });
    const model = buildModelFromDiagram(nodes, edges);
    console.log(`[Flutter] 📊 Modelo construido: ${model.entities?.length || 0} entidades, ${model.relations?.length || 0} relaciones`);

    // 2. Generar estructura base (skeleton)
    onProgress({ step: "skeleton", message: "🏗️ Generando estructura base del proyecto..." });
    const skeleton = makeFlutterSkeleton(projectName, backendUrl);
    const skeletonCount = Object.keys(skeleton).length;
    console.log(`[Flutter] 🏗️ Skeleton generado: ${skeletonCount} archivos`);

    // 3. Construir prompt para IA
    onProgress({ step: "prompt", message: "📝 Construyendo prompt para IA..." });
    const prompt = buildFlutterPrompt(model, projectName, backendUrl);

    // 4. Llamar a la IA para generar código específico
    onProgress({ step: "ai", message: "🤖 Generando código con IA (esto puede tomar un momento)..." });
    const aiResponse = await callAIForFlutterCode(prompt);

    // Validar respuesta de IA
    if (!aiResponse?.files || typeof aiResponse.files !== "object") {
      console.warn("[Flutter] ⚠️ IA no devolvió archivos, usando solo skeleton");
    }

    const aiFilesCount = aiResponse?.files ? Object.keys(aiResponse.files).length : 0;
    console.log(`[Flutter] 🤖 IA generó: ${aiFilesCount} archivos`);

    // 5. Combinar skeleton + código generado por IA
    onProgress({ step: "merge", message: "🔗 Combinando archivos generados..." });
    const allFiles = { ...skeleton, ...(aiResponse?.files || {}) };
    const totalFiles = Object.keys(allFiles).length;
    console.log(`[Flutter] 🔗 Total combinado: ${totalFiles} archivos`);

    // 6. Generar y descargar ZIP
    onProgress({ step: "download", message: "📦 Creando archivo ZIP..." });
    const zipName = `${projectName.toLowerCase().replace(/\s+/g, "_")}_flutter.zip`;
    await downloadFlutterAsZip(allFiles, zipName);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    onProgress({ step: "done", message: `✅ ¡Proyecto Flutter generado exitosamente! (${totalFiles} archivos en ${duration}s)` });
    console.log(`[Flutter] ✅ Completado: ${totalFiles} archivos en ${duration}s`);

    return { success: true, filesCount: totalFiles };
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[Flutter] ❌ Error después de ${duration}s:`, error);
    onProgress({ step: "error", message: `❌ Error: ${error.message}` });
    throw error;
  }
}

/**
 * Llama a la IA (Gemini) para generar código Flutter usando la API centralizada
 * MEJORADO: Validación de respuesta y manejo de errores
 * @param {string} prompt - Prompt construido
 * @returns {Promise<{files: Object}>}
 */
async function callAIForFlutterCode(prompt) {
  try {
    console.log("[Flutter] 📤 Enviando prompt a Gemini...");

    // Usar la API centralizada de apiGemine.js
    const files = await generateSpringBootCode(prompt);

    // Validar que se recibieron archivos
    if (!files || typeof files !== "object") {
      console.warn("[Flutter] ⚠️ Respuesta inválida de IA, retornando objeto vacío");
      return { files: {} };
    }

    const filesCount = Object.keys(files).length;
    console.log(`[Flutter] 📥 Recibidos ${filesCount} archivos de IA`);

    // Filtrar archivos inválidos
    const validFiles = {};
    for (const [path, content] of Object.entries(files)) {
      if (path && typeof path === "string" && content !== null && content !== undefined) {
        // Asegurar que el contenido sea string
        validFiles[path] = typeof content === "string" ? content : String(content);
      } else {
        console.warn(`[Flutter] ⚠️ Archivo inválido ignorado: ${path}`);
      }
    }

    return { files: validFiles };
  } catch (error) {
    console.error("[Flutter] ❌ Error llamando a la IA:", error);
    throw new Error(`Error generando código Flutter con IA: ${error.message}`);
  }
}

/**
 * Vista previa del proyecto (sin descargar)
 * @param {Object} params - Mismos parámetros que generateFlutterApp
 * @returns {Promise<Object>} Lista de archivos que se generarían
 */
export async function previewFlutterApp(params) {
  if (!params.nodes || params.nodes.length === 0) {
    return {
      skeleton: [],
      model: { entities: [], relations: [], joins: [] },
      entitiesCount: 0,
      relationsCount: 0,
      error: "No hay entidades en el diagrama"
    };
  }

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
