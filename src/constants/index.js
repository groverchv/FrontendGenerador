/**
 * Constantes centralizadas para toda la aplicación
 * Mejora la mantenibilidad y evita magic strings
 */

// ============== HANDLES DE REACTFLOW ==============
export const SOURCE_HANDLES = [
  "tl", "l1", "l2", "bl", 
  "t1", "t2", "t3", "t4", 
  "tr", "r1", "r2", "br", 
  "b1", "b2", "b3", "b4"
];

export const TARGET_HANDLES = [
  "tl-t", "l1-t", "l2-t", "bl-t", 
  "t1-t", "t2-t", "t3-t", "t4-t", 
  "tr-t", "r1-t", "r2-t", "br-t", 
  "b1-t", "b2-t", "b3-t", "b4-t"
];

// ============== MULTIPLICIDADES ==============
export const MULTIPLICITIES = {
  ONE: "1",
  ZERO_ONE: "0..1",
  ZERO_MANY: "0..*",
  ONE_MANY: "1..*",
  MANY: "*"
};

// ============== TIPOS DE RELACIÓN ==============
export const RELATION_TYPES = {
  ONE_TO_ONE: "1-1",
  ONE_TO_MANY: "1-N",
  MANY_TO_ONE: "N-1",
  MANY_TO_MANY: "NM",
  ZERO_TO_ONE: "0-1",
  ONE_TO_ZERO: "1-0",
  ZERO_TO_MANY: "0-N",
  MANY_TO_ZERO: "N-0"
};

// ============== TIPOS DE RELACIÓN UML ==============
export const RELATION_KINDS = {
  ASSOCIATION: "ASSOC",
  AGGREGATION: "AGGR",
  COMPOSITION: "COMP",
  INHERITANCE: "INHERIT",
  DEPENDENCY: "DEPEND",
  NM_JOIN: "NM_JOIN"
};

// ============== DIRECCIONES DE RELACIÓN ==============
export const RELATION_DIRECTIONS = {
  A_TO_B: "A->B",
  B_TO_A: "B->A",
  BIDIRECTIONAL: "BIDI"
};

// ============== OWNERSHIP ==============
export const OWNERSHIP = {
  SIDE_A: "A",
  SIDE_B: "B"
};

// ============== ESTRATEGIAS DE HERENCIA ==============
export const INHERITANCE_STRATEGIES = {
  JOINED: "JOINED",
  SINGLE_TABLE: "SINGLE_TABLE",
  TABLE_PER_CLASS: "TABLE_PER_CLASS"
};

// ============== CASCADE TYPES ==============
export const CASCADE_TYPES = {
  ALL: "ALL",
  PERSIST: "PERSIST",
  MERGE: "MERGE",
  REMOVE: "REMOVE",
  REFRESH: "REFRESH",
  DETACH: "DETACH"
};

// ============== TIPOS DE DATOS COMUNES ==============
export const DATA_TYPES = {
  STRING: "String",
  INTEGER: "Integer",
  LONG: "Long",
  DOUBLE: "Double",
  FLOAT: "Float",
  BOOLEAN: "Boolean",
  DATE: "Date",
  TIMESTAMP: "Timestamp",
  BIG_DECIMAL: "BigDecimal"
};

// ============== TIPOS DE NODOS REACTFLOW ==============
export const NODE_TYPES = {
  CLASS: "classNode",
  DEFAULT: "default"
};

// ============== TIPOS DE EDGES REACTFLOW ==============
export const EDGE_TYPES = {
  UML: "uml",
  CUSTOM: "custom",
  DEFAULT: "default"
};

// ============== CONFIGURACIÓN DE LAYOUT ==============
export const LAYOUT_CONFIG = {
  GRID_X: 260,
  GRID_Y: 160,
  COLUMNS: 4,
  DEFAULT_X: 60,
  DEFAULT_Y: 60,
  SPACING_X: 40,
  SPACING_Y: 30
};

// ============== TIEMPOS DE DEBOUNCE/THROTTLE ==============
export const TIMING = {
  DEBOUNCE_DEFAULT: 250,
  THROTTLE_DEFAULT: 60,
  THROTTLE_CURSOR: 60,
  SNAPSHOT_DELAY: 100,
  LAYOUT_DELAY: 150
};

// ============== MENSAJES DE ERROR COMUNES ==============
export const ERROR_MESSAGES = {
  LOAD_DIAGRAM_FAILED: "No se pudo cargar el diagrama. Revisa tu conexión.",
  SAVE_DIAGRAM_FAILED: "Error guardando cambios en el diagrama.",
  INVALID_DIAGRAM: "No se puede guardar: diagrama inválido",
  IMPORT_PUML_FAILED: "No se pudo importar el .puml",
  IMPORT_JSON_FAILED: "No se pudo importar el JSON",
  UNSUPPORTED_FORMAT: "Formato no soportado. Usa .puml/.uml o .json exportados por la app.",
  ENTITY_NOT_FOUND: "Entidad no encontrada",
  DUPLICATE_RELATION: "Relación duplicada ignorada",
  TOAST_PROVIDER_ERROR: "useToast debe usarse dentro de <ToastProvider>"
};

// ============== MENSAJES DE ÉXITO ==============
export const SUCCESS_MESSAGES = {
  DIAGRAM_SAVED: "Diagrama guardado correctamente.",
  PUML_IMPORTED: "PUML importado y guardado.",
  JSON_IMPORTED: "Diagrama importado y guardado.",
  RELATION_CREATED: "Relación creada",
  ENTITY_CREATED: "Entidad creada"
};

// ============== VALIDACIONES ==============
export const VALIDATION = {
  MIN_ENTITY_NAME_LENGTH: 1,
  MAX_ENTITY_NAME_LENGTH: 50,
  MIN_ATTR_NAME_LENGTH: 1,
  MAX_ATTR_NAME_LENGTH: 50,
  GENERIC_ATTR_PATTERN: /^((atribu|propi|campo)[a-z]*)\d+$/i
};

// ============== CONFIGURACIÓN DE API ==============
export const API_CONFIG = {
  BASE_PATH: "/api",
  PROJECTS_PATH: "/api/projects",
  DIAGRAMS_PATH: "/api/diagrams",
  TIMEOUT: 30000
};

// ============== WEBSOCKET PATHS ==============
export const WS_PATHS = {
  UPDATES_TOPIC: (projectId) => `/topic/projects/${projectId}`,
  CURSORS_TOPIC: (projectId) => `/topic/projects/${projectId}/cursors`,
  UPDATE_DEST: (projectId) => `/app/projects/${projectId}/update`,
  CURSOR_DEST: (projectId) => `/app/projects/${projectId}/cursor`
};

// ============== FILE EXTENSIONS ==============
export const FILE_EXTENSIONS = {
  JSON: ".json",
  PUML: ".puml",
  UML: ".uml",
  ZIP: ".zip"
};

// ============== REGEX PATTERNS ==============
export const PATTERNS = {
  ALPHANUMERIC: /^[a-zA-Z0-9_]+$/,
  ENTITY_NAME: /^[A-Z][a-zA-Z0-9]*$/,
  ATTR_NAME: /^[a-z][a-zA-Z0-9]*$/,
  MULTIPLICITY: /^(\d+|\*|\d+\.\.\*|N)$/
};

export default {
  SOURCE_HANDLES,
  TARGET_HANDLES,
  MULTIPLICITIES,
  RELATION_TYPES,
  RELATION_KINDS,
  RELATION_DIRECTIONS,
  OWNERSHIP,
  INHERITANCE_STRATEGIES,
  CASCADE_TYPES,
  DATA_TYPES,
  NODE_TYPES,
  EDGE_TYPES,
  LAYOUT_CONFIG,
  TIMING,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  VALIDATION,
  API_CONFIG,
  WS_PATHS,
  FILE_EXTENSIONS,
  PATTERNS
};
