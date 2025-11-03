// src/views/proyectos/Diagramador/SubDiagrama/useGeneracionCodigo.js
import { useCallback } from "react";

// Mantengo las mismas rutas que usas en tu Diagramador.jsx actual
import { buildPrompt } from "../generador/promt";
import { makeSkeleton } from "../generador/skeleton";
import { generateSpringBootCode } from "../services/gemine";
import { downloadAsZip } from "../generador/zip";

/**
 * useGeneracionCodigo
 * Encapsula la generación de proyecto Spring Boot a partir del diagrama.
 *
 * Params:
 *  - projectName: string (obligatorio)
 *  - nodes, edges: arrays de React Flow (obligatorios)
 *  - packageBase: base del paquete Java (opcional, default "com.example.app")
 *
 * Retorna:
 *  - handleGenerate(): Promise<void>
 */
export default function useGeneracionCodigo({
  projectName,
  nodes,
  edges,
  packageBase = "com.example.app",
}) {
  const handleGenerate = useCallback(async () => {
    try {
      const model = {
        projectName,
        packageBase,
        entities: (nodes || []).map((n) => ({
          name: n?.data?.label,
          attrs: n?.data?.attrs || [],
        })),
        relations: (edges || []).map((e) => ({
          source: e.source,
          target: e.target,
          verb: e.data?.verb || "",
          mA: e.data?.mA,
          mB: e.data?.mB,
          relType: e.data?.relType,
          meta: {
            relKind: e.data?.relKind,
            direction: e.data?.direction,
            roleA: e.data?.roleA,
            roleB: e.data?.roleB,
            owning: e.data?.owning,
            optionalA: e.data?.optionalA,
            optionalB: e.data?.optionalB,
            orphanRemoval: e.data?.orphanRemoval,
            fetch: e.data?.fetch,
            cascade: e.data?.cascade,
            join: e.data?.join,
            inheritStrategy: e.data?.inheritStrategy,
          },
        })),
      };

      const skeleton = makeSkeleton(projectName, packageBase);
      const promptText = buildPrompt(model, []);
      const delta = await generateSpringBootCode(promptText);
      const files = { ...skeleton, ...delta };

      const root = String(projectName || "proyecto").replace(/[^\w.-]+/g, "_");
      await downloadAsZip(files, `${root}.zip`, root);
      alert("📦 Proyecto generado y descargado.");
    } catch (err) {
      console.error(err);
      alert("Error al generar: " + (err?.message || "desconocido"));
    }
  }, [projectName, packageBase, nodes, edges]);

  return { handleGenerate };
}
