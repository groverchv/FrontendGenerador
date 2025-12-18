// src/views/proyectos/Diagramador/SubDiagrama/useGeneracionCodigo.js
import { useCallback, useMemo, useState } from "react";
import { buildPrompt } from "../generador/promt";

// Import robusto: soporta export nombrado y/o default de skeleton.js
import makeSkeletonDefault, { makeSkeleton as makeSkeletonNamed } from "../generador/skeleton";
const makeSkeleton = makeSkeletonNamed || makeSkeletonDefault;

import { generateSpringBootCode } from "../services/apiGemine";
import { downloadAsZip } from "../generador/zip";

/* ============== Helpers de nombre ============== */
const toSnake = (s = "") =>
  s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

const toPascal = (s = "") =>
  s
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");

const normMult = (m) => {
  if (!m) return "1";
  const v = ("" + m).trim();
  if (v === "N") return "*";
  if (v === "0..N") return "0..*";
  return v;
};
const isMany = (m) => ["1..*", "0..*", "*"].includes(normMult(m));

const suggestJoinNames = (aName, bName) => {
  const A = toPascal(aName),
    B = toPascal(bName);
  const [p1, p2] = [A, B].sort();
  const joinEntity = `${p1}${p2}`;
  const joinTable = `${toSnake(p1)}_${toSnake(p2)}`;
  return { joinEntity, joinTable, aField: toSnake(A), bField: toSnake(B) };
};

/* ============== Normalizador de modelo desde nodes/edges ============== */
function normalizeModel({ projectName, packageBase, nodes, edges }) {
  const idToName = new Map(
    nodes.map((n) => [n.id, (n.data?.label || "").trim() || n.id])
  );

  const entities = nodes.map((n) => {
    const name = idToName.get(n.id);
    const attrs = Array.isArray(n.data?.attrs) ? n.data.attrs : [];
    const idAttr = attrs.find((a) => /^id$/i.test(a?.name || ""));
    const idType = idAttr?.type || "Long";
    return { name, idType, attrs };
  });

  const relations = [];
  const joins = [];

  edges.forEach((e) => {
    const a = idToName.get(e.source);
    const b = idToName.get(e.target);
    if (!a || !b) return;

    const mA = normMult(e.data?.mA || "1");
    const mB = normMult(e.data?.mB || "1");
    const verb = (e.data?.verb || "").trim() || undefined;

    const relKind = (e.data?.relKind || "ASSOC").toUpperCase(); // ASSOC | INHERIT | AGGR | COMP | DEPEND
    const owning = (e.data?.owning || "A").toUpperCase(); // dueño para 1-1/AGGR/COMP
    const direction = e.data?.direction || undefined; // DEPEND
    const inheritStrategy = e.data?.inheritStrategy || "JOINED";
    const cascade = e.data?.cascade || (relKind === "COMP" ? "ALL" : undefined);
    const orphanRemoval =
      e.data?.orphanRemoval ?? (relKind === "COMP" ? true : undefined);

    // Herencia y dependencia
    if (relKind === "INHERIT") {
      relations.push({ a, b, kind: "INHERIT", inheritStrategy });
      return;
    }
    if (relKind === "DEPEND") {
      relations.push({ a, b, kind: "DEPEND", direction: direction || "A->B" });
      return;
    }

    // Muchos-a-muchos -> entidad intermedia
    if (isMany(mA) && isMany(mB)) {
      const { joinEntity, joinTable, aField, bField } = suggestJoinNames(a, b);
      joins.push({ name: joinEntity, table: joinTable, a, b, aField, bField });
      relations.push({ a, b, mA, mB, kind: "NM_JOIN", verb });
      return;
    }

    // Asociación / Agregación / Composición / 1-1
    relations.push({
      a,
      b,
      mA,
      mB,
      verb,
      kind:
        relKind === "AGGR" ? "AGGR" : relKind === "COMP" ? "COMP" : "ASSOC",
      owning,
      cascade,
      orphanRemoval,
    });
  });

  return {
    projectName,
    packageBase,
    entities,
    relations,
    joins,
  };
}

/* ============== Hook principal ============== */
export default function useGeneracionCodigo({
  projectName,
  packageBase = "com.example.app",
  nodes,
  edges,
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState("");
  const [lastError, setLastError] = useState(null);

  const model = useMemo(
    () => normalizeModel({ projectName, packageBase, nodes, edges }),
    [projectName, packageBase, nodes, edges]
  );

  const handleGenerate = useCallback(
    async (skipPaths = []) => {
      // Validación previa
      if (!nodes || nodes.length === 0) {
        const error = new Error("No hay entidades en el diagrama. Agrega al menos una entidad.");
        setLastError(error.message);
        throw error;
      }

      setIsGenerating(true);
      setLastError(null);
      setGenerationProgress("🏗️ Generando estructura base...");

      try {
        // Esqueleto base (pom, Application, CORS, properties)
        const skeleton = makeSkeleton(projectName, packageBase);
        console.log("[useGeneracionCodigo] ✅ Skeleton generado:", Object.keys(skeleton).length, "archivos");

        // Prompt para generar archivos de Model/Repository/Service/Controller
        setGenerationProgress("📝 Construyendo prompt para IA...");
        const promptText = buildPrompt(model, skipPaths);

        // Llamada al generador (con rescate/ordenado ya manejado en apiGemine)
        setGenerationProgress("🤖 Generando código con IA (esto puede tardar)...");
        const deltaFiles = await generateSpringBootCode(promptText);
        
        // Validar respuesta de IA
        if (!deltaFiles || typeof deltaFiles !== "object") {
          throw new Error("La IA no devolvió archivos válidos");
        }
        
        const deltaCount = Object.keys(deltaFiles).length;
        console.log("[useGeneracionCodigo] ✅ IA generó:", deltaCount, "archivos");
        
        if (deltaCount === 0) {
          console.warn("[useGeneracionCodigo] ⚠️ La IA no generó archivos, usando solo skeleton");
        }

        // Unimos y descargamos
        setGenerationProgress("📦 Comprimiendo archivos...");
        const files = { ...skeleton, ...deltaFiles };
        const totalFiles = Object.keys(files).length;
        console.log("[useGeneracionCodigo] 📦 Total de archivos a comprimir:", totalFiles);
        
        const zipName = `${projectName.replace(/[^\w.-]+/g, "_")}.zip`;
        await downloadAsZip(files, zipName);
        
        setGenerationProgress(`✅ ¡Listo! ${totalFiles} archivos generados`);
        console.log("[useGeneracionCodigo] ✅ ZIP descargado exitosamente");
        
        return { success: true, filesCount: totalFiles };
        
      } catch (error) {
        console.error("[useGeneracionCodigo] ❌ Error:", error);
        setLastError(error.message);
        setGenerationProgress(`❌ Error: ${error.message}`);
        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    [model, projectName, packageBase, nodes]
  );

  return { 
    model, 
    handleGenerate,
    isGenerating,
    generationProgress,
    lastError,
    clearError: () => setLastError(null)
  };
}
