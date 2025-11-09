// generadorFlutter/zipFlutter.js
import JSZip from "jszip";
import { saveAs } from "file-saver";

/**
 * Genera y descarga un archivo ZIP con el proyecto Flutter
 * @param {Object} filesMap - Mapa de archivos { "ruta/archivo": "contenido" }
 * @param {string} zipName - Nombre del archivo ZIP
 */
export async function downloadFlutterAsZip(filesMap, zipName = "flutter-app.zip") {
  const zip = new JSZip();
  
  for (const [relPath, content] of Object.entries(filesMap)) {
    zip.file(relPath, content);
  }
  
  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, zipName);
}

export default downloadFlutterAsZip;
