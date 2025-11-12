// src/views/proyectos/Diagramador/SubDiagrama/utils.js
import { 
  SOURCE_HANDLES, 
  TARGET_HANDLES, 
  MULTIPLICITIES,
  RELATION_TYPES,
  TIMING
} from "../../../../constants";

/* ---------- Helpers de tiempo ---------- */

/**
 * Limita la frecuencia de ejecución de una función
 * @param {Function} fn - Función a throttlear
 * @param {number} wait - Tiempo mínimo entre ejecuciones (ms)
 * @returns {Function} Función throttleada
 */
export function throttle(fn, wait = TIMING.THROTTLE_DEFAULT) {
  if (typeof fn !== 'function') {
    throw new Error('[throttle] El primer argumento debe ser una función');
  }
  
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

/**
 * Retrasa la ejecución de una función hasta que haya pasado un tiempo sin llamadas
 * @param {Function} fn - Función a debounce
 * @param {number} wait - Tiempo de espera (ms)
 * @returns {Function} Función debounceda
 */
export function debounce(fn, wait = TIMING.DEBOUNCE_DEFAULT) {
  if (typeof fn !== 'function') {
    throw new Error('[debounce] El primer argumento debe ser una función');
  }
  
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/* ---------- IO / archivos ---------- */

/**
 * Descarga un texto como archivo
 * @param {string} filename - Nombre del archivo
 * @param {string} text - Contenido del archivo
 * @throws {Error} Si los parámetros son inválidos
 */
export function downloadText(filename, text) {
  if (!filename || typeof filename !== 'string') {
    throw new Error('[downloadText] Nombre de archivo inválido');
  }
  if (typeof text !== 'string') {
    throw new Error('[downloadText] El contenido debe ser un string');
  }
  
  try {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('[downloadText] Error descargando archivo:', error);
    throw new Error(`No se pudo descargar el archivo: ${error.message}`);
  }
}

/* ---------- Strings/posiciones ---------- */

/**
 * Convierte un string a formato snake_case
 * @param {string} s - String a convertir
 * @returns {string} String en snake_case
 */
export const toSnake = (s = "") => {
  if (s == null) return "";
  return String(s)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase();
};

/**
 * Infiere el tipo de ID de un nodo basándose en sus atributos
 * @param {Object} node - Nodo del diagrama
 * @returns {string} Tipo de ID (por defecto "Integer")
 */
export const inferIdType = (node) => {
  if (!node || !node.data) return "Integer";
  
  const attrs = Array.isArray(node.data.attrs) ? node.data.attrs : [];
  const idAttr = attrs.find(a => a.name?.toLowerCase() === "id");
  return idAttr?.type || "Integer";
};

/**
 * Calcula el punto medio entre dos nodos
 * @param {Object} a - Primer nodo
 * @param {Object} b - Segundo nodo
 * @returns {Object} Coordenadas {x, y} del punto medio
 */
export const midpoint = (a, b) => {
  const ax = a?.position?.x ?? 100;
  const ay = a?.position?.y ?? 100;
  const bx = b?.position?.x ?? 100;
  const by = b?.position?.y ?? 100;
  
  return {
    x: (ax + bx) / 2,
    y: (ay + by) / 2,
  };
};

/* ---------- Multiplicidades/relaciones ---------- */

/**
 * Normaliza una multiplicidad a formato estándar
 * @param {string|number} m - Multiplicidad a normalizar
 * @returns {string} Multiplicidad normalizada
 */
export const normalizeMult = (m) => {
  if (m == null || m === "") return MULTIPLICITIES.ONE;
  
  const v = String(m).trim().replace(/\s/g, "");
  if (!v) return MULTIPLICITIES.ONE;
  
  // Mapeo de variaciones comunes
  const mappings = {
    "N": MULTIPLICITIES.MANY,
    "*": MULTIPLICITIES.MANY,
    "n": MULTIPLICITIES.MANY,
    "1..*": MULTIPLICITIES.ONE_MANY,
    "1.*": MULTIPLICITIES.ONE_MANY,
    "0..*": MULTIPLICITIES.ZERO_MANY,
    "0.*": MULTIPLICITIES.ZERO_MANY,
    "0..1": MULTIPLICITIES.ZERO_ONE,
    "0.1": MULTIPLICITIES.ZERO_ONE,
    "1": MULTIPLICITIES.ONE,
  };
  
  if (mappings[v]) return mappings[v];
  
  // Para formatos como "2..*", normalizar a "1..*"
  if (/^\d+\.\.\*$/.test(v)) return MULTIPLICITIES.ONE_MANY;
  
  return v;
};

/**
 * Determina el tipo de relación basándose en las multiplicidades
 * @param {string} mA - Multiplicidad del lado A
 * @param {string} mB - Multiplicidad del lado B
 * @returns {string} Tipo de relación (1-1, 1-N, N-1, NM, etc.)
 */
export const decideRelType = (mA, mB) => {
  const A = normalizeMult(mA);
  const B = normalizeMult(mB);
  
  const isMany = (x) => [
    MULTIPLICITIES.ONE_MANY,
    MULTIPLICITIES.ZERO_MANY,
    MULTIPLICITIES.MANY
  ].includes(x);
  
  // 1-1 o variaciones
  if (!isMany(A) && !isMany(B)) {
    if (A === MULTIPLICITIES.ZERO_ONE && B === MULTIPLICITIES.ONE) return RELATION_TYPES.ZERO_TO_ONE;
    if (A === MULTIPLICITIES.ONE && B === MULTIPLICITIES.ZERO_ONE) return RELATION_TYPES.ONE_TO_ZERO;
    return RELATION_TYPES.ONE_TO_ONE;
  }
  
  // 1-N o variaciones
  if (!isMany(A) && isMany(B)) {
    if (A === MULTIPLICITIES.ZERO_ONE) return RELATION_TYPES.ZERO_TO_MANY;
    return RELATION_TYPES.ONE_TO_MANY;
  }
  
  // N-1 o variaciones
  if (isMany(A) && !isMany(B)) {
    if (B === MULTIPLICITIES.ZERO_ONE) return RELATION_TYPES.MANY_TO_ZERO;
    return RELATION_TYPES.MANY_TO_ONE;
  }
  
  // N-M
  return RELATION_TYPES.MANY_TO_MANY;
};

/* ---------- Manejo de handles ---------- */

/**
 * Calcula el uso actual de handles basándose en las conexiones existentes
 * @param {string} nodeId - ID del nodo
 * @param {Array} edges - Array de aristas
 * @returns {Object} Objeto con contadores de uso {target: {}, source: {}}
 */
export const calculateHandleUsage = (nodeId, edges) => {
  if (!nodeId || !Array.isArray(edges)) {
    return {
      target: {},
      source: {},
    };
  }
  
  const usage = {
    target: {},
    source: {},
  };

  // Inicializar contadores para todos los handles
  TARGET_HANDLES.forEach(h => { usage.target[h] = 0; });
  SOURCE_HANDLES.forEach(h => { usage.source[h] = 0; });

  edges.forEach(edge => {
    if (!edge) return;
    
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
 * @param {string} nodeId - ID del nodo
 * @param {Array} edges - Array de aristas
 * @param {boolean} isSource - true si es handle source, false si es target
 * @returns {string} ID del mejor handle disponible
 */
export const findBestHandle = (nodeId, edges, isSource) => {
  if (!nodeId || !Array.isArray(edges)) {
    return isSource ? SOURCE_HANDLES[0] : TARGET_HANDLES[0];
  }
  
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
 * @param {Array} nodes - Array de nodos
 * @param {Array} edges - Array de aristas
 * @returns {Array} Nodos actualizados con información de uso de handles
 */
export const updateNodesWithHandleUsage = (nodes, edges) => {
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    return nodes || [];
  }
  
  return nodes.map(node => {
    if (!node || !node.id) return node;
    
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
