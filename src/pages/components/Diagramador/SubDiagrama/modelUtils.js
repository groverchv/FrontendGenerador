// src/diagram/utils/modelUtils.js
export const toSnake = (s = "") =>
  (s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase();

export const inferIdType = (node) =>
  (node?.data?.attrs || []).find((a) => a.name?.toLowerCase() === "id")?.type ||
  "Integer";

export const midpoint = (a, b) => ({
  x: ((a?.position?.x ?? 100) + (b?.position?.x ?? 100)) / 2,
  y: ((a?.position?.y ?? 100) + (b?.position?.y ?? 100)) / 2,
});

export const normalizeMult = (m) => {
  if (m == null) return "1";
  const v = String(m).trim().replace(/\s/g, "");
  if (!v) return "1";
  if (["N", "*", "n"].includes(v)) return "*";
  if (v === "1..*" || v === "1.*" || /^\d+\.\.\*$/.test(v)) return "1..*";
  if (v === "0..*" || v === "0.*") return "0..*";
  if (v === "0..1" || v === "0.1") return "0..1";
  if (v === "1") return "1";
  return v;
};

export const decideRelType = (mA, mB) => {
  const A = normalizeMult(mA), B = normalizeMult(mB);
  const isMany = (x) => x === "1..*" || x === "0..*" || x === "*";
  if (!isMany(A) && !isMany(B)) return "1-1";
  if (!isMany(A) && isMany(B)) return "1-N";
  if (isMany(A) && !isMany(B)) return "N-1";
  if (A === "0..1" && !isMany(B)) return "0-1";
  if (!isMany(A) && A === "1" && B === "0..1") return "1-0";
  if (A === "0..1" && isMany(B)) return "0-N";
  if (isMany(A) && B === "0..1") return "N-0";
  return "NM";
};

/**
 * Construye el modelo completo desde el diagrama (nodos y aristas)
 * para ser usado por los generadores de código
 * @param {Array} nodes - Nodos del diagrama (entidades/clases)
 * @param {Array} edges - Aristas del diagrama (relaciones)
 * @returns {Object} Modelo estructurado con entidades y relaciones
 */
export const buildModelFromDiagram = (nodes, edges) => {
  // Construir entidades
  const entities = nodes.map((node) => ({
    id: node.id,
    name: node.data?.label || "Entity",
    tableName: toSnake(node.data?.label || "entity"),
    idType: inferIdType(node),
    attrs: (node.data?.attrs || []).map((attr) => ({
      name: attr.name || "field",
      type: attr.type || "String",
      visibility: attr.visibility || "private",
    })),
  }));

  // Construir relaciones
  const relations = edges.map((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);

    return {
      id: edge.id,
      sourceId: edge.source,
      targetId: edge.target,
      sourceName: sourceNode?.data?.label || "Source",
      targetName: targetNode?.data?.label || "Target",
      mA: normalizeMult(edge.data?.mA || "1"),
      mB: normalizeMult(edge.data?.mB || "1"),
      verb: edge.data?.verb || edge.label || "",
      relType: edge.data?.relType || decideRelType(edge.data?.mA, edge.data?.mB),
      kind: edge.data?.relKind || "ASSOC",
      direction: edge.data?.direction || "NONE",
      owning: edge.data?.owning || null,
      cascade: edge.data?.cascade || null,
      orphanRemoval: edge.data?.orphanRemoval || false,
      inheritStrategy: edge.data?.inheritStrategy || null,
    };
  });

  // Detectar joins (entidades intermedias para N-M)
  const joins = [];
  relations.forEach((rel) => {
    if (rel.kind === "NM_JOIN" || rel.relType === "NM") {
      // Buscar si ya existe una entidad intermedia
      const intermediateName = `${rel.sourceName}_${rel.targetName}`;
      if (!joins.find((j) => j.name === intermediateName)) {
        joins.push({
          name: intermediateName,
          tableName: toSnake(intermediateName),
          entityA: rel.sourceName,
          entityB: rel.targetName,
        });
      }
    }
  });

  return {
    entities,
    relations,
    joins,
  };
};
