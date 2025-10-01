// components/generador/zip.js
import JSZip from "jszip";
import { saveAs } from "file-saver";

/** filesMap: { "ruta/archivo": "contenido" } */
export async function downloadAsZip(filesMap, zipName = "spring-app.zip") {
  const zip = new JSZip();
  for (const [relPath, content] of Object.entries(filesMap)) {
    zip.file(relPath, content);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, zipName);
}
