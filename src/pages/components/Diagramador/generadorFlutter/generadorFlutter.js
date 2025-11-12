// generadorFlutter/generadorFlutter.js
import { buildFlutterPrompt } from "./promptFlutter";
import { makeFlutterSkeleton } from "./skeletonFlutter";
import { downloadFlutterAsZip } from "./zipFlutter";
import { buildModelFromDiagram } from "../SubDiagrama/modelUtils";
import { generateSpringBootCode } from "../services/apiGemine";

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
 * Llama a la IA (Gemini) para generar código Flutter usando la API centralizada
 * @param {string} prompt - Prompt construido
 * @returns {Promise<{files: Object}>}
 */
async function callAIForFlutterCode(prompt) {
  try {
    // Usar la API centralizada de apiGemine.js
    const files = await generateSpringBootCode(prompt);
    return { files };
  } catch (error) {
    console.error("Error llamando a la IA:", error);
    throw new Error(`Error generando código con IA: ${error.message}`);
  }
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
