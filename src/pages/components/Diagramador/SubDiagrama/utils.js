// src/views/proyectos/Diagramador/SubDiagrama/utils.js

/* ---------- Helpers de tiempo ---------- */
export function throttle(fn, wait = 60) {
  let last = 0;
  let t = null;
  let lastArgs = null;
  return (...args) => {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn(...args);
    } else {
      lastArgs = args;
      clearTimeout(t);
      t = setTimeout(() => {
        last = Date.now();
        fn(...lastArgs);
      }, wait - (now - last));
    }
  };
}

export function debounce(fn, wait = 250) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/* ---------- IO / archivos ---------- */
export function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---------- Strings/posiciones ---------- */
export const toSnake = (s = "") =>
  (s || "")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .trim().replace(/\s+/g, "_")
    .toLowerCase();

export const inferIdType = (node) => {
  const idAttr = (node?.data?.attrs || []).find(a => a.name?.toLowerCase() === "id");
  return idAttr?.type || "Integer";
};

export const midpoint = (a, b) => ({
  x: ((a?.position?.x ?? 100) + (b?.position?.x ?? 100)) / 2,
  y: ((a?.position?.y ?? 100) + (b?.position?.y ?? 100)) / 2,
});

/* ---------- Multiplicidades/relaciones ---------- */
export const normalizeMult = (m) => {
  if (m == null) return "1";
  const v = String(m).trim().replace(/\s/g, "");
  if (!v) return "1";
  if (v === "N" || v === "*" || v === "n") return "*";
  if (v === "1..*" || v === "1.*") return "1..*";
  if (v === "0..*" || v === "0.*") return "0..*";
  if (v === "0..1" || v === "0.1") return "0..1";
  if (v === "1") return "1";
  if (/^\d+\.\.\*$/.test(v)) return "1..*";
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

/* ---------- Manejo de handles ---------- */
// Handles bidireccionales: cada punto físico tiene un handle source Y un handle target
// SOURCE: todos los puntos sin sufijo
const SOURCE_HANDLES = ["tl", "l1", "l2", "bl", "t1", "t2", "t3", "t4", "tr", "r1", "r2", "br", "b1", "b2", "b3", "b4"];
// TARGET: los mismos puntos con sufijo "-t"
const TARGET_HANDLES = ["tl-t", "l1-t", "l2-t", "bl-t", "t1-t", "t2-t", "t3-t", "t4-t", "tr-t", "r1-t", "r2-t", "br-t", "b1-t", "b2-t", "b3-t", "b4-t"];

/**
 * Calcula el uso actual de handles basándose en las conexiones existentes
 */
export const calculateHandleUsage = (nodeId, edges) => {
  const usage = {
    target: {},
    source: {},
  };

  // Inicializar contadores para todos los handles
  TARGET_HANDLES.forEach(h => { usage.target[h] = 0; });
  SOURCE_HANDLES.forEach(h => { usage.source[h] = 0; });

  edges.forEach(edge => {
    if (edge.target === nodeId && edge.targetHandle) {
      usage.target[edge.targetHandle] = (usage.target[edge.targetHandle] || 0) + 1;
    }
    if (edge.source === nodeId && edge.sourceHandle) {
      usage.source[edge.sourceHandle] = (usage.source[edge.sourceHandle] || 0) + 1;
    }
  });

  return usage;
};

/**
 * Encuentra el mejor handle disponible (el menos usado)
 */
export const findBestHandle = (nodeId, edges, isSource) => {
  const usage = calculateHandleUsage(nodeId, edges);
  const handleList = isSource ? SOURCE_HANDLES : TARGET_HANDLES;
  const usageMap = isSource ? usage.source : usage.target;

  // Busca el handle con menor uso
  let bestHandle = handleList[0];
  let minUsage = usageMap[bestHandle] || 0;

  handleList.forEach(handle => {
    const currentUsage = usageMap[handle] || 0;
    if (currentUsage < minUsage) {
      minUsage = currentUsage;
      bestHandle = handle;
    }
  });

  return bestHandle;
};

/**
 * Actualiza los datos de uso en todos los nodos
 */
export const updateNodesWithHandleUsage = (nodes, edges) => {
  return nodes.map(node => {
    const usage = calculateHandleUsage(node.id, edges);
    return {
      ...node,
      data: {
        ...node.data,
        usage,
      },
    };
  });
};
