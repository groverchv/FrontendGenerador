// generadorFlutter/zipFlutter.js
import JSZip from "jszip";
import { saveAs } from "file-saver";

/**
 * Valida y normaliza el contenido de un archivo para JSZip
 * @param {any} content - Contenido del archivo
 * @param {string} path - Ruta del archivo (para logging)
 * @returns {string|null} - Contenido válido o null si es inválido
 */
function validateContent(content, path) {
  // JSZip acepta: String, Blob, ArrayBuffer, Uint8Array, Buffer, base64 string
  if (content === null || content === undefined) {
    console.warn(`[ZIP-Flutter] ⚠️ Contenido null/undefined para: ${path}`);
    return null;
  }
  
  if (typeof content === "number") {
    console.warn(`[ZIP-Flutter] ⚠️ Contenido numérico convertido a string para: ${path}`);
    return content === 0 ? "" : String(content);
  }
  
  if (typeof content === "boolean") {
    console.warn(`[ZIP-Flutter] ⚠️ Contenido boolean convertido a string para: ${path}`);
    return String(content);
  }
  
  if (typeof content === "object" && !(content instanceof Blob) && !(content instanceof ArrayBuffer) && !(content instanceof Uint8Array)) {
    console.warn(`[ZIP-Flutter] ⚠️ Objeto convertido a JSON para: ${path}`);
    try {
      return JSON.stringify(content, null, 2);
    } catch {
      return null;
    }
  }
  
  if (typeof content === "string") {
    // Normalizar saltos de línea y limpiar contenido
    return content
      .replace(/\r\n/g, "\n")
      .replace(/^\uFEFF/, ""); // Eliminar BOM
  }
  
  return content; // Blob, ArrayBuffer, Uint8Array - pasar tal cual
}

/**
 * Genera y descarga un archivo ZIP con el proyecto Flutter
 * @param {Object} filesMap - Mapa de archivos { "ruta/archivo": "contenido" }
 * @param {string} zipName - Nombre del archivo ZIP
 * @throws {Error} Si no hay archivos válidos para comprimir
 */
export async function downloadFlutterAsZip(filesMap, zipName = "flutter-app.zip") {
  if (!filesMap || typeof filesMap !== "object") {
    throw new Error("filesMap debe ser un objeto con rutas y contenidos");
  }

  const zip = new JSZip();
  let validFilesCount = 0;
  let skippedFiles = [];

  for (const [relPath, content] of Object.entries(filesMap)) {
    // Validar que la ruta sea válida
    if (!relPath || typeof relPath !== "string") {
      console.warn(`[ZIP-Flutter] ⚠️ Ruta inválida ignorada:`, relPath);
      continue;
    }

    // Validar y normalizar contenido
    const validContent = validateContent(content, relPath);
    
    if (validContent === null) {
      skippedFiles.push(relPath);
      continue;
    }

    zip.file(relPath, validContent);
    validFilesCount++;
  }

  if (validFilesCount === 0) {
    throw new Error(`No hay archivos válidos para comprimir. Archivos saltados: ${skippedFiles.join(", ")}`);
  }

  console.log(`[ZIP-Flutter] ✅ Comprimiendo ${validFilesCount} archivos...`);
  if (skippedFiles.length > 0) {
    console.warn(`[ZIP-Flutter] ⚠️ ${skippedFiles.length} archivos saltados:`, skippedFiles);
  }

  const blob = await zip.generateAsync({ 
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
  
  saveAs(blob, zipName);
  console.log(`[ZIP-Flutter] ✅ ${zipName} descargado exitosamente`);
}

export default downloadFlutterAsZip;
