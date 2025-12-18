// src/views/proyectos/Diagramador/services/apiGemine.js
// Única API para Gemini: generación de código y delta del diagrama.
// - Generador robusto: intenta JSON nativo; si viene truncado, rescata pares "ruta":"contenido"
//   y DES-ESCAPA correctamente (sin duplicar backslashes) para que no queden \n literales.
// - Parser local extendido: CRUD de entidades/atributos + 5 tipos de relación + clear_attrs/only id.
// ⭐ SISTEMA DE GESTIÓN DE API KEYS: Agregar, eliminar, editar y seleccionar keys desde UI

/* ===================== CONSTANTES DE STORAGE ===================== */
const STORAGE_KEYS = {
  API_KEYS: 'gemini_api_keys',      // Lista de API keys [{id, name, key, active}]
  SELECTED_KEY: 'gemini_selected_key', // ID de la key seleccionada
  FAILED_KEYS: 'gemini_failed_keys',   // Keys que han fallado temporalmente
};

// API Key estática por defecto (funciona con gemini-2.5-flash)
const DEFAULT_API_KEY = {
  id: 'default-key-001',
  name: 'Key Principal (Por defecto)',
  key: 'AIzaSyDhOiOFs_Y-UIyvCx2-41nWsDpfDXS5_p8',
  active: true,
  isDefault: true,
  createdAt: Date.now(),
};

/* ===================== SISTEMA DE GESTIÓN DE API KEYS ===================== */

/**
 * Obtiene todas las API keys guardadas
 * @returns {Array} Lista de API keys
 */
export function getApiKeys() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.API_KEYS);
    if (stored) {
      const keys = JSON.parse(stored);
      // Asegurar que la key por defecto esté siempre presente
      const hasDefault = keys.some(k => k.isDefault);
      if (!hasDefault) {
        keys.unshift(DEFAULT_API_KEY);
        localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
      }
      return keys;
    }
  } catch (e) {
    console.error('[API] Error leyendo keys:', e);
  }
  // Si no hay keys, crear con la por defecto
  const defaultKeys = [DEFAULT_API_KEY];
  localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(defaultKeys));
  return defaultKeys;
}

/**
 * Obtiene la API key seleccionada actualmente
 * @returns {Object|null} API key seleccionada
 */
export function getSelectedApiKey() {
  const keys = getApiKeys();
  const selectedId = localStorage.getItem(STORAGE_KEYS.SELECTED_KEY);

  // Buscar la key seleccionada
  if (selectedId) {
    const selected = keys.find(k => k.id === selectedId && k.active);
    if (selected) return selected;
  }

  // Si no hay selección, usar la primera activa
  const firstActive = keys.find(k => k.active);
  if (firstActive) {
    localStorage.setItem(STORAGE_KEYS.SELECTED_KEY, firstActive.id);
    return firstActive;
  }

  return null;
}

/**
 * Selecciona una API key para usar
 * @param {string} keyId - ID de la key a seleccionar
 */
export function selectApiKey(keyId) {
  const keys = getApiKeys();
  const key = keys.find(k => k.id === keyId);
  if (key && key.active) {
    localStorage.setItem(STORAGE_KEYS.SELECTED_KEY, keyId);
    // Limpiar keys fallidas al cambiar
    clearFailedKeys();
    console.log(`[API] ✅ Key seleccionada: ${key.name}`);
    return true;
  }
  return false;
}

/**
 * Agrega una nueva API key
 * @param {Object} keyData - {name, key}
 * @returns {Object} Nueva key creada
 */
export function addApiKey(keyData) {
  const keys = getApiKeys();
  const newKey = {
    id: `key-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: keyData.name || `Key ${keys.length + 1}`,
    key: keyData.key.trim(),
    active: true,
    isDefault: false,
    createdAt: Date.now(),
  };
  keys.push(newKey);
  localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
  console.log(`[API] ✅ Nueva key agregada: ${newKey.name}`);
  return newKey;
}

/**
 * Edita una API key existente
 * @param {string} keyId - ID de la key
 * @param {Object} updates - Campos a actualizar
 */
export function updateApiKey(keyId, updates) {
  const keys = getApiKeys();
  const index = keys.findIndex(k => k.id === keyId);
  if (index !== -1) {
    // No permitir editar la key por defecto (solo activar/desactivar)
    if (keys[index].isDefault && (updates.key || updates.name)) {
      console.warn('[API] ⚠️ No se puede editar la key por defecto');
      if (updates.active !== undefined) {
        keys[index].active = updates.active;
      }
    } else {
      keys[index] = { ...keys[index], ...updates, updatedAt: Date.now() };
    }
    localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
    console.log(`[API] ✅ Key actualizada: ${keys[index].name}`);
    return keys[index];
  }
  return null;
}

/**
 * Elimina una API key
 * @param {string} keyId - ID de la key a eliminar
 */
export function deleteApiKey(keyId) {
  let keys = getApiKeys();
  const keyToDelete = keys.find(k => k.id === keyId);

  // No permitir eliminar la key por defecto
  if (keyToDelete?.isDefault) {
    console.warn('[API] ⚠️ No se puede eliminar la key por defecto');
    return false;
  }

  keys = keys.filter(k => k.id !== keyId);
  localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));

  // Si era la key seleccionada, seleccionar otra
  const selectedId = localStorage.getItem(STORAGE_KEYS.SELECTED_KEY);
  if (selectedId === keyId) {
    const nextKey = keys.find(k => k.active);
    if (nextKey) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_KEY, nextKey.id);
    }
  }

  console.log(`[API] 🗑️ Key eliminada: ${keyToDelete?.name}`);
  return true;
}

/* ===================== SISTEMA DE FALLBACK ===================== */

let failedKeysSet = new Set();

/**
 * Obtiene las keys fallidas
 */
function getFailedKeys() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.FAILED_KEYS);
    if (stored) {
      const data = JSON.parse(stored);
      // Limpiar keys fallidas después de 5 minutos
      const now = Date.now();
      const validFailures = data.filter(f => now - f.timestamp < 5 * 60 * 1000);
      if (validFailures.length !== data.length) {
        localStorage.setItem(STORAGE_KEYS.FAILED_KEYS, JSON.stringify(validFailures));
      }
      return new Set(validFailures.map(f => f.keyId));
    }
  } catch {
    // Ignorar errores
  }
  return new Set();
}

/**
 * Marca una key como fallida temporalmente
 * @param {string} keyOrId - Puede ser el ID de la key o el valor de la key
 * @param {string} reason - Razón del fallo
 */
function markKeyAsFailed(keyOrId, reason) {
  if (!keyOrId) return;

  try {
    // Buscar el ID de la key si se pasó el valor
    const allKeys = getApiKeys();
    let keyId = keyOrId;

    // Si el parámetro parece ser una API key (no un ID), buscar el ID correspondiente
    if (keyOrId.startsWith('AIza') || keyOrId.length > 30) {
      const keyObj = allKeys.find(k => k.key === keyOrId);
      keyId = keyObj?.id || keyOrId;
    }

    const stored = localStorage.getItem(STORAGE_KEYS.FAILED_KEYS);
    const failures = stored ? JSON.parse(stored) : [];

    // No duplicar
    if (!failures.some(f => f.keyId === keyId)) {
      failures.push({ keyId, reason, timestamp: Date.now() });
      localStorage.setItem(STORAGE_KEYS.FAILED_KEYS, JSON.stringify(failures));
    }

    failedKeysSet.add(keyId);
    console.warn(`[API] 🔴 Key marcada como fallida: ${keyId.slice(0, 15)}...`);
    console.warn(`[API] Razón: ${reason}`);
  } catch {
    // Ignorar errores
  }
}

/**
 * Limpia las keys fallidas
 */
export function clearFailedKeys() {
  localStorage.removeItem(STORAGE_KEYS.FAILED_KEYS);
  failedKeysSet.clear();
  console.log('[API] ✅ Keys fallidas limpiadas');
}

/**
 * Obtiene la próxima API key válida para usar
 * Si la seleccionada falla, busca otra activa que no haya fallado
 */
export function getApiKey() {
  const failedIds = getFailedKeys();
  const allKeys = getApiKeys().filter(k => k.active);

  // Primero intentar la key seleccionada
  const selected = getSelectedApiKey();
  if (selected && !failedIds.has(selected.id)) {
    return selected.key;
  }

  // Buscar una key que no haya fallado
  for (const k of allKeys) {
    if (!failedIds.has(k.id)) {
      console.log(`[API] 🔄 Usando key alternativa: ${k.name}`);
      return k.key;
    }
  }

  // Si todas fallaron, reiniciar y usar la primera
  console.warn('[API] ⚠️ Todas las keys han fallado, reiniciando...');
  clearFailedKeys();
  return allKeys[0]?.key || DEFAULT_API_KEY.key;
}

/**
 * Obtiene el estado del sistema de API keys
 */
export function getApiStatus() {
  const allKeys = getApiKeys();
  const activeKeys = allKeys.filter(k => k.active);
  const failedIds = getFailedKeys();
  const availableKeys = activeKeys.filter(k => !failedIds.has(k.id));
  const selected = getSelectedApiKey();

  return {
    totalKeys: allKeys.length,
    activeKeys: activeKeys.length,
    availableKeys: availableKeys.length,
    failedKeys: failedIds.size,
    selectedKey: selected ? { id: selected.id, name: selected.name } : null,
  };
}

/**
 * Reinicia el sistema de API keys
 */
export function resetApiKeySystem() {
  clearFailedKeys();
  console.log('[API] 🔄 Sistema de API keys reiniciado');
}

// Funciones legacy para compatibilidad
export function setGeminiApiKey(key) {
  // Agregar como nueva key si no existe
  const keys = getApiKeys();
  const existing = keys.find(k => k.key === key);
  if (!existing) {
    const newKey = addApiKey({ name: 'Key Manual', key });
    selectApiKey(newKey.id);
  }
}

export function addApiKeyToPool(key) {
  const keys = getApiKeys();
  if (!keys.some(k => k.key === key)) {
    addApiKey({ name: `Key Agregada ${Date.now()}`, key });
  }
}

// Estado global para tracking
const apiState = {
  lastError: null,
  retryCount: 0,
  maxRetries: 3,
  lastSuccessfulKey: null,
};

/**
 * Marca una key como exitosa
 */
function markKeyAsSuccessful(key) {
  if (!key) return;
  apiState.lastSuccessfulKey = key;
  apiState.retryCount = 0;
}

/**
 * Verifica si un error es recuperable (puede reintentarse con otra key)
 */
function isRecoverableError(error) {
  const errorStr = String(error?.message || error || "").toLowerCase();
  const recoverablePatterns = [
    "api_key_invalid",
    "api key expired",
    "api key not valid",
    "invalid api key",
    "quota exceeded",
    "rate limit",
    "429",
    "401",
    "403",
    "resource_exhausted",
  ];
  return recoverablePatterns.some(p => errorStr.includes(p));
}

// ⚡ MODELOS OPTIMIZADOS - Usar modelos capaces de manejar prompts largos y código
// gemini-2.5-flash es OBLIGATORIO para generación de código (soporta JSON estructurado)
const MODEL_CODE = "gemini-2.5-flash";            // CÓDIGO: Spring Boot, Flutter (JSON complejo)
const MODEL_VISION = "gemini-2.5-flash";          // IMÁGENES: Procesamiento de diagramas
const MODEL_DIAGRAM = "gemini-2.5-flash";         // DIAGRAMAS: Modificaciones simples (ACTUALIZADO a 2.5)
const MODEL_DEFAULT = "gemini-2.5-flash";         // DEFAULT: Tareas rutinarias (ACTUALIZADO a 2.5)

// Modelos de fallback para código (ordenados por capacidad de generar JSON válido)
// ⚠️ ACTUALIZADO: Solo modelos disponibles en Gemini API (dic 2024)
const CODE_FALLBACK_MODELS = [
  "gemini-2.5-flash",         // Mejor para código - JSON estructurado
  "gemini-2.0-flash-exp",     // Experimental pero rápido
  "gemini-1.5-flash",         // Estable y rápido
  "gemini-1.5-pro",           // Más capacidad pero más lento
];

// Modelos de fallback para visión (ordenados por capacidad)
const VISION_FALLBACK_MODELS = [
  "gemini-2.5-flash",         // Mejor calidad
  "gemini-2.0-flash-exp",     // Experimental
  "gemini-1.5-flash",         // Estable
  "gemini-1.5-pro",           // Mayor capacidad
];

// Modelos de fallback generales
const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash-exp",
  "gemini-1.5-flash",
];

// Variables de compatibilidad para el resto del código
// Estas crean arrays dinámicos basados en localStorage
let RUNTIME_API_KEY = "";
let RUNTIME_MODEL = "";
let failedKeys = failedKeysSet; // Alias para compatibilidad

// Getter dinámico para API_KEYS_POOL basado en localStorage
const API_KEYS_POOL = new Proxy([], {
  get(target, prop) {
    const keys = getApiKeys().filter(k => k.active).map(k => k.key);
    if (prop === 'length') return keys.length;
    if (prop === 'filter') return (fn) => keys.filter(fn);
    if (prop === 'includes') return (val) => keys.includes(val);
    if (prop === 'unshift') return (val) => {
      addApiKey({ name: `Key Manual ${Date.now()}`, key: val });
      return keys.length + 1;
    };
    if (prop === Symbol.iterator) return keys[Symbol.iterator].bind(keys);
    if (typeof prop === 'string' && !isNaN(parseInt(prop))) {
      return keys[parseInt(prop)];
    }
    return keys[prop];
  }
});

export function getModel(taskType = "default") {
  // Si hay modelo configurado manualmente, usarlo
  if (RUNTIME_MODEL) return RUNTIME_MODEL;
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_MODEL) {
    return import.meta.env.VITE_GEMINI_MODEL;
  }

  // Selección inteligente según tipo de tarea
  switch (taskType) {
    case "code":      // Generación de código Spring Boot/Flutter - REQUIERE gemini-2.5-flash
      return MODEL_CODE;
    case "vision":    // Procesamiento de imágenes
    case "image":     // Análisis de imágenes desde cámara/archivo
      return MODEL_VISION;
    case "diagram":   // Modificaciones de diagrama
    case "parse":     // Parsing de texto natural
      return MODEL_DIAGRAM;
    case "default":   // Tareas rutinarias
    default:
      return MODEL_DEFAULT;
  }
}

export function getModelForTask(taskType) { return getModel(taskType); }
export function getVisionModel() { return MODEL_VISION; }
export function getPremiumModel() { return MODEL_CODE; }
export function getDefaultModel() { return MODEL_DEFAULT; }
export function setGeminiModel(m) { RUNTIME_MODEL = (m || "").trim(); }

/* ===================== Recomendaciones de modelos (CPDIG) ===================== */
export const CPDIG = {
  "gemini-2.5-flash-lite": {
    category: "Modelos de texto de salida",
    rpm: [200, 400],
    tpm: [100000, 250000],
    rpd: [10000, 50000],
    graphics: false,
    notes: "rápido y económico; ideal para completions cortos"
  },
  "gemini-2.5-flash-tts": {
    category: "Modelos generativos multimodales",
    rpm: [50, 150],
    tpm: [10000, 50000],
    rpd: [2000, 10000],
    graphics: false,
    notes: "optimizado para TTS y generación de audio"
  },
  "gemini-2.5-flash": {
    category: "Modelos de texto de salida",
    rpm: [50, 150],
    tpm: [150000, 250000],
    rpd: [2000, 10000],
    graphics: true,
    notes: "alto rendimiento; buen equilibrio para código y análisis"
  },
  "gemini-robotics-er-1.5-preview": {
    category: "Otros modelos",
    rpm: [10, 50],
    tpm: [50000, 250000],
    rpd: [500, 2000],
    graphics: false,
    notes: "especializado en robótica y simulación"
  },
  "gemma-3-12b": {
    category: "Otros modelos",
    rpm: [20, 60],
    tpm: [5000, 15000],
    rpd: [1000, 5000],
    graphics: false,
    notes: "buena relación capacidad/coste"
  },
  "gemma-3-1b": {
    category: "Otros modelos",
    rpm: [200, 400],
    tpm: [5000, 15000],
    rpd: [10000, 50000],
    graphics: false,
    notes: "ligero y económico para inferencias masivas"
  },
  "gemma-3-27b": {
    category: "Otros modelos",
    rpm: [5, 20],
    tpm: [10000, 15000],
    rpd: [500, 2000],
    graphics: false,
    notes: "alto rendimiento para tareas complejas"
  },
  "gemma-3-27b-it": {
    category: "Modelos de texto de salida",
    rpm: [30, 60],
    tpm: [10000, 15000],
    rpd: [1000, 5000],
    graphics: false,
    notes: "⭐ RECOMENDADO - Instruction-tuned, excelente para diagramas UML y parsing"
  },
  "gemma-3-2b": {
    category: "Otros modelos",
    rpm: [100, 300],
    tpm: [5000, 15000],
    rpd: [5000, 20000],
    graphics: false,
    notes: "compromiso entre coste y velocidad"
  },
  "gemma-3-4b": {
    category: "Otros modelos",
    rpm: [60, 200],
    tpm: [5000, 15000],
    rpd: [2000, 10000],
    graphics: false,
    notes: "versátil para uso general"
  },
  "gemini-2.5-flash-native-audio-dialog": {
    category: "API en vivo",
    rpm: [5, 50],
    tpm: [1000000, 1000000],
    rpd: "unlimited",
    graphics: true,
    notes: "diálogo y audio en tiempo real; requiere streaming"
  }
};

export function getModelRecommendations() { return CPDIG; }

/* ===================== Core HTTP con REINTENTOS ROBUSTOS ===================== */

/**
 * Llamada única a Gemini (sin reintentos)
 */
async function _callOnce(apiKey, model, promptText, { maxOutputTokens = 24000 } = {}) {
  if (!apiKey) throw new Error("Falta la API key de Gemini.");

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=` +
    encodeURIComponent(apiKey);

  const body = {
    contents: [{ role: "user", parts: [{ text: promptText }] }],
    generationConfig: {
      temperature: 0.2,
      topP: 0.9,
      topK: 32,
      maxOutputTokens
    }
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`Gemini error ${res.status}: ${text || res.statusText}`);
    err.status = res.status;
    err.payload = text;
    throw err;
  }

  const data = await res.json();
  const raw =
    data?.candidates?.[0]?.content?.parts?.map(p => p?.text ?? "").join("\n") ?? "";

  return raw;
}

/**
 * Llamada a Gemini con sistema robusto de reintentos
 * ⭐ Intenta múltiples keys y modelos automáticamente
 */
async function callGemini(promptText, { maxOutputTokens = 24000, taskType = "default" } = {}) {
  const preferredModel = getModel(taskType);
  const models = [preferredModel, ...FALLBACK_MODELS.filter(m => m !== preferredModel)];
  let lastError = null;
  let attemptCount = 0;

  console.log(`[AI] 🚀 Iniciando llamada (tarea: ${taskType})...`);

  for (const model of models) {
    const availableKeys = API_KEYS_POOL.filter(k => !failedKeys.has(k));

    if (availableKeys.length === 0) {
      console.warn("[AI] ⚠️ Reiniciando pool de keys...");
      failedKeys.clear();
      availableKeys.push(...API_KEYS_POOL);
    }

    for (const apiKey of availableKeys) {
      attemptCount++;

      try {
        console.log(`[AI] 🔄 Intento ${attemptCount}: Modelo=${model}`);
        const result = await _callOnce(apiKey, model, promptText, { maxOutputTokens });

        markKeyAsSuccessful(apiKey);
        console.log(`[AI] ✅ Éxito con modelo ${model}`);
        return result;

      } catch (err) {
        lastError = err;
        const errorMsg = err?.message || String(err);

        if (isRecoverableError(err)) {
          markKeyAsFailed(apiKey, errorMsg);
          continue;
        }

        const is404 = err?.status === 404 || /NOT_FOUND|model/i.test(err?.payload || "");
        if (is404) {
          console.warn(`[AI] ⚠️ Modelo ${model} no disponible, probando siguiente...`);
          break;
        }
      }
    }
  }

  throw lastError || new Error("Todos los intentos de llamada a Gemini fallaron");
}

/**
 * Llamada a Gemini con respuesta JSON y sistema de reintentos
 * OPTIMIZADO: Configuración específica para generación de código según prompts del usuario
 */
async function callGeminiJSON(promptText, { maxOutputTokens = 8000, taskType = "default" } = {}) {
  // Para generación de código, usar modelos específicos para JSON estructurado
  const preferredModel = getModel(taskType);
  const modelsToTry = taskType === "code"
    ? CODE_FALLBACK_MODELS
    : [preferredModel, ...FALLBACK_MODELS.filter(m => m !== preferredModel)];

  let lastError = null;

  console.log(`[AI-JSON] 🚀 Iniciando llamada JSON (tarea: ${taskType}, modelo preferido: ${preferredModel})...`);
  console.log(`[AI-JSON] 📝 Tokens máximos: ${maxOutputTokens}`);

  for (const model of modelsToTry) {
    const availableKeys = API_KEYS_POOL.filter(k => !failedKeys.has(k));

    if (availableKeys.length === 0) {
      console.warn("[AI-JSON] ⚠️ Reiniciando pool de keys...");
      failedKeys.clear();
      availableKeys.push(...API_KEYS_POOL);
    }

    for (const apiKey of availableKeys) {
      try {
        console.log(`[AI-JSON] 🔄 Intentando: modelo=${model}, key=${apiKey?.slice(0, 10)}...`);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

        // Configuración optimizada para prompts de generación de código
        const body = {
          contents: [{ role: "user", parts: [{ text: promptText }] }],
          generationConfig: {
            responseMimeType: "application/json",
            // Temperatura baja para código estructurado
            temperature: taskType === "code" ? 0.1 : 0.2,
            topK: 40,
            topP: 0.95,
            maxOutputTokens,
            // Evitar truncamiento en respuestas largas
            candidateCount: 1,
          },
        };

        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!resp.ok) {
          const t = await resp.text();
          const err = new Error(`Gemini HTTP ${resp.status}: ${t}`);
          err.status = resp.status;
          err.payload = t;
          throw err;
        }

        const json = await resp.json();

        // Verificar si la respuesta fue truncada
        const finishReason = json?.candidates?.[0]?.finishReason;
        if (finishReason === "MAX_TOKENS") {
          console.warn(`[AI-JSON] ⚠️ Respuesta truncada por MAX_TOKENS`);
        }

        const txt = json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";

        if (!txt || txt.trim() === "") {
          throw new Error("Respuesta vacía de Gemini");
        }

        markKeyAsSuccessful(apiKey);
        console.log(`[AI-JSON] ✅ Éxito con modelo ${model} (${txt.length} caracteres)`);

        // Intentar parsear JSON con múltiples estrategias de limpieza
        try {
          return JSON.parse(txt);
        } catch (parseErr) {
          console.warn(`[AI-JSON] ⚠️ JSON malformado: ${parseErr.message}`);

          // Estrategia 1: Limpiar marcadores de código
          let cleaned = txt.replace(/```json|```/g, "").trim();

          try {
            return JSON.parse(cleaned);
          } catch {
            // Estrategia 2: Arreglar caracteres escapados problemáticos
            console.log(`[AI-JSON] 🔧 Aplicando limpieza de caracteres escapados...`);
            cleaned = cleaned
              // Arreglar escapes de backslash mal formados
              .replace(/\\([^"\\\/bfnrtu])/g, '\\\\$1')
              // Arreglar tabs y newlines literales dentro de strings
              .replace(/\t/g, '\\t')
              .replace(/\r\n/g, '\\n')
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '\\r');

            try {
              return JSON.parse(cleaned);
            } catch {
              // Estrategia 3: Extraer solo el objeto JSON principal
              console.log(`[AI-JSON] 🔧 Extrayendo objeto JSON principal...`);
              const first = cleaned.indexOf("{");
              const last = cleaned.lastIndexOf("}");
              if (first >= 0 && last > first) {
                const jsonOnly = cleaned.slice(first, last + 1);
                return JSON.parse(jsonOnly);
              }
              throw parseErr; // Re-lanzar error original si nada funciona
            }
          }
        }

      } catch (err) {
        lastError = err;
        console.error(`[AI-JSON] ❌ Error: ${err.message}`);

        if (isRecoverableError(err)) {
          markKeyAsFailed(apiKey, err?.message);
          continue;
        }

        // Si es error de modelo no encontrado, probar siguiente modelo
        const is404 = err?.status === 404 || /NOT_FOUND|model/i.test(err?.payload || "");
        if (is404) {
          console.warn(`[AI-JSON] ⚠️ Modelo ${model} no disponible`);
          break;
        }
      }
    }
  }

  throw lastError || new Error("No se pudo obtener respuesta JSON de Gemini");
}

/* ===================== Parse helpers ===================== */
function parseJsonLoose(text) {
  const cleaned = (text || "").replace(/```json|```/g, "").trim();
  try { return JSON.parse(cleaned); }
  catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(cleaned.slice(first, last + 1));
    throw new Error("No se pudo parsear la respuesta de Gemini como JSON.");
  }
}

/** DES-ESCAPA una cadena JSON leída cruda entre comillas.
 *  Importante: NO duplicar backslashes. Sólo escapamos comillas para poder JSON.parse().
 */
function jsonUnescape(val) {
  try {
    return JSON.parse(`"${String(val).replace(/"/g, '\\"')}"`);
  } catch {
    // Respaldo: reemplazos comunes por si viene roto
    return String(val)
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
}

/** 
 * Normaliza el mapa de archivos: fuerza saltos de línea reales y limpia espacios BOM/CRLF.
 * MEJORADO: Valida contenido para evitar errores de JSZip
 */
function normalizeFilesMap(map) {
  const out = {};
  let validCount = 0;
  let invalidCount = 0;

  for (const [k, v] of Object.entries(map || {})) {
    // Validar que la clave sea una ruta válida
    if (!k || typeof k !== "string" || k.trim() === "") {
      console.warn(`[normalizeFilesMap] ⚠️ Clave inválida ignorada:`, k);
      invalidCount++;
      continue;
    }

    // Manejar valores no-string
    if (v === null || v === undefined) {
      console.warn(`[normalizeFilesMap] ⚠️ Valor null/undefined para ${k}, usando string vacío`);
      out[k] = "";
      validCount++;
      continue;
    }

    if (typeof v === "number") {
      console.warn(`[normalizeFilesMap] ⚠️ Valor numérico ${v} para ${k}, convirtiendo a string`);
      out[k] = v === 0 ? "" : String(v);
      validCount++;
      continue;
    }

    if (typeof v === "boolean") {
      console.warn(`[normalizeFilesMap] ⚠️ Valor boolean para ${k}, convirtiendo a string`);
      out[k] = String(v);
      validCount++;
      continue;
    }

    if (typeof v === "object") {
      console.warn(`[normalizeFilesMap] ⚠️ Valor objeto para ${k}, convirtiendo a JSON`);
      try {
        out[k] = JSON.stringify(v, null, 2);
        validCount++;
      } catch {
        console.error(`[normalizeFilesMap] ❌ No se pudo serializar objeto para ${k}`);
        invalidCount++;
      }
      continue;
    }

    if (typeof v !== "string") {
      console.warn(`[normalizeFilesMap] ⚠️ Tipo desconocido ${typeof v} para ${k}, ignorando`);
      invalidCount++;
      continue;
    }

    let s = v;
    // Si vienen literales "\n", conviértelos a saltos reales.
    if (/\\n/.test(s) && !/\n/.test(s)) s = s.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\r/g, "\r");
    // Normaliza saltos y elimina BOM accidental
    s = s.replace(/\r\n/g, "\n").replace(/^\uFEFF/, "");
    out[k] = s;
    validCount++;
  }

  console.log(`[normalizeFilesMap] ✅ ${validCount} archivos válidos, ${invalidCount} ignorados`);
  return out;
}

/**
 * Rescate para respuestas truncadas:
 * extrae pares "ruta":"contenido" dentro de la sección "files" aun cuando falte
 * la última comilla/llave. Omite el último archivo si está incompleto y
 * DES-ESCAPA el contenido para que no queden \n literales.
 */
function salvageFilesFromText(txt) {
  const s = (txt || "").replace(/```json|```/g, "");
  const filesIdx = s.indexOf('"files"');
  if (filesIdx < 0) return null;

  let i = s.indexOf("{", filesIdx);
  if (i < 0) return null;
  i++; // entramos al objeto de files

  const files = {};
  const skipWs = () => { while (i < s.length && /[\s,]/.test(s[i])) i++; };

  const readJSONString = () => {
    if (s[i] !== '"') return null;
    i++;
    let out = "";
    let esc = false;
    while (i < s.length) {
      const ch = s[i++];
      if (esc) { out += ch; esc = false; continue; }
      if (ch === "\\") { esc = true; out += ch; continue; }
      if (ch === '"') return out; // devuelve sin comillas
      out += ch;
    }
    return null; // string truncada
  };

  while (i < s.length) {
    skipWs();
    if (s[i] === "}") break; // fin files
    const keyRaw = readJSONString();
    if (!keyRaw) break;
    skipWs();
    if (s[i] !== ":") break;
    i++;
    skipWs();
    const valRaw = readJSONString();
    if (!valRaw) break; // truncado -> paramos

    const key = jsonUnescape(keyRaw);
    const val = jsonUnescape(valRaw);
    files[key] = val;

    skipWs();
    if (s[i] === ",") { i++; continue; }
  }

  return Object.keys(files).length ? files : null;
}

/* ===================== APIs públicas ===================== */

/**
 * Genera código Spring Boot desde un prompt
 * OPTIMIZADO: Tokens reducidos para mayor velocidad, validación robusta
 * @param {string} promptText - Prompt con el modelo del diagrama
 * @returns {Promise<Object>} Mapa de archivos { ruta: contenido }
 */
export async function generateSpringBootCode(promptText) {
  console.log("[generator] 🚀 Iniciando generación de código...");
  console.log("[generator] 📝 Longitud del prompt:", promptText.length, "caracteres");
  const startTime = Date.now();

  // TOKENS ALTOS: Tus prompts son muy detallados y requieren respuestas completas
  // Spring Boot necesita generar: Entity, Repository, Service, Controller, Config
  // Flutter necesita generar: models, services, controllers, pages, widgets, routes
  // 32000 tokens permiten respuestas completas sin truncamiento
  const MAX_TOKENS = 32000;

  // 1) Intentar JSON nativo (más rápido y confiable)
  try {
    console.log("[generator] 📝 Intento 1: JSON nativo con gemini-2.5-flash...");
    const parsed = await callGeminiJSON(promptText, {
      maxOutputTokens: MAX_TOKENS,
      taskType: "code"
    });

    if (parsed?.files && typeof parsed.files === "object") {
      const filesCount = Object.keys(parsed.files).length;
      if (filesCount > 0) {
        const normalized = normalizeFilesMap(parsed.files);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[generator] ✅ Éxito JSON nativo: ${filesCount} archivos en ${duration}s`);
        console.log("[generator] 📁 Archivos generados:", Object.keys(normalized).join(", "));
        return normalized;
      }
    }
    throw new Error("Respuesta sin archivos válidos en 'files'.");

  } catch (jsonError) {
    console.warn("[generator] ⚠️ JSON nativo falló:", jsonError.message);

    // 2) Intentar con texto normal
    try {
      console.log("[generator] 📝 Intento 2: Texto normal...");
      const raw = await callGemini(promptText, {
        maxOutputTokens: MAX_TOKENS,
        taskType: "code"
      });

      // 2a) Intento parseo laxo
      try {
        const parsed = parseJsonLoose(raw);
        if (parsed?.files && typeof parsed.files === "object") {
          const filesCount = Object.keys(parsed.files).length;
          if (filesCount > 0) {
            const normalized = normalizeFilesMap(parsed.files);
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`[generator] ✅ Éxito parseo laxo: ${filesCount} archivos en ${duration}s`);
            return normalized;
          }
        }
      } catch {
        // Parseo laxo falló, continuar con rescate
      }

      // 2b) Rescate manual de pares "ruta":"contenido"
      console.log("[generator] 📝 Intento 3: Rescate de archivos truncados...");
      const rescued = salvageFilesFromText(raw);
      if (rescued) {
        const norm = normalizeFilesMap(rescued);
        const filesCount = Object.keys(norm).length;
        if (filesCount > 0) {
          const duration = ((Date.now() - startTime) / 1000).toFixed(2);
          console.warn(`[generator] ⚠️ JSON incompleto — ${filesCount} archivos rescatados en ${duration}s`);
          return norm;
        }
      }

      // 2c) Sin salvación - proporcionar más contexto del error
      const fragment = raw?.slice(0, 500) || "(vacío)";
      throw new Error(`No se pudo parsear respuesta de Gemini. Primeros 500 caracteres: ${fragment}`);

    } catch (textError) {
      console.error("[generator] ❌ Todos los intentos fallaron:", textError.message);
      throw new Error(`Error generando código: ${textError.message}`);
    }
  }
}

export async function generateDiagramDelta(promptText) {
  // Usar modelo DEFAULT para modificaciones de diagrama (tarea rutinaria)
  const parsed = await callGeminiJSON(promptText, { maxOutputTokens: 8000, taskType: "diagram" });
  if (!Array.isArray(parsed?.actions)) {
    throw new Error("La respuesta de Gemini no contiene 'actions'.");
  }
  return parsed;
}

/**
 * Llama a Gemini Vision API con una imagen
 * ⭐ Sistema ULTRA-ROBUSTO: Múltiples keys + múltiples modelos + reintentos automáticos
 * @param {string} prompt - Texto del prompt
 * @param {string} base64Image - Imagen en base64
 * @param {string} mimeType - Tipo MIME de la imagen (ej: 'image/jpeg')
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<string>} - Respuesta de Gemini
 */
export async function callGeminiVision(prompt, base64Image, mimeType, options = {}) {
  const {
    maxOutputTokens = 8000,
    temperature = 0.1,
    topP = 0.8,
    topK = 32,
    responseMimeType = "application/json"
  } = options;

  const allModels = [...VISION_FALLBACK_MODELS];
  const maxAttempts = allModels.length * Math.max(API_KEYS_POOL.filter(k => !failedKeys.has(k)).length, 1);
  let lastError = null;
  let attemptCount = 0;

  console.log(`[AI-Vision] 🚀 Iniciando procesamiento de imagen...`);
  console.log(`[AI-Vision] Modelos disponibles: ${allModels.length}`);
  console.log(`[AI-Vision] Keys disponibles: ${API_KEYS_POOL.filter(k => !failedKeys.has(k)).length}`);

  // Intentar con cada modelo y cada key disponible
  for (const model of allModels) {
    // Obtener keys no fallidas para este intento
    const availableKeys = API_KEYS_POOL.filter(k => !failedKeys.has(k));

    // Si no hay keys disponibles, reiniciar el pool
    if (availableKeys.length === 0) {
      console.warn("[AI-Vision] ⚠️ Reiniciando pool de keys...");
      failedKeys.clear();
      availableKeys.push(...API_KEYS_POOL);
    }

    for (const apiKey of availableKeys) {
      attemptCount++;

      try {
        console.log(`[AI-Vision] 🔄 Intento ${attemptCount}/${maxAttempts}: Modelo=${model}, Key=${apiKey?.slice(0, 10)}...`);

        const result = await _callGeminiVisionOnce(
          apiKey, model, prompt, base64Image, mimeType,
          { maxOutputTokens, temperature, topP, topK, responseMimeType }
        );

        // ¡Éxito! Marcar key como válida
        markKeyAsSuccessful(apiKey);
        console.log(`[AI-Vision] ✅ Éxito con modelo ${model}`);
        return result;

      } catch (error) {
        lastError = error;
        const errorMsg = error?.message || String(error);
        console.warn(`[AI-Vision] ❌ Error en intento ${attemptCount}: ${errorMsg.slice(0, 100)}`);

        // Verificar si el error es por API key inválida/expirada
        if (isRecoverableError(error)) {
          markKeyAsFailed(apiKey, errorMsg);
          // Continuar con la siguiente key/modelo
          continue;
        }

        // Error 404 (modelo no disponible) - probar siguiente modelo
        if (error?.status === 404 || /not.?found|model/i.test(errorMsg)) {
          console.warn(`[AI-Vision] ⚠️ Modelo ${model} no disponible, probando siguiente...`);
          break; // Salir del loop de keys, ir al siguiente modelo
        }

        // Otros errores - intentar con siguiente key
      }
    }
  }

  // Si llegamos aquí, todos los intentos fallaron
  apiState.lastError = lastError;

  // Mensaje de error amigable para el usuario
  const userFriendlyError = _createUserFriendlyError(lastError);
  throw new Error(userFriendlyError);
}

/**
 * Ejecuta una llamada única a Gemini Vision (sin reintentos)
 */
async function _callGeminiVisionOnce(apiKey, model, prompt, base64Image, mimeType, config) {
  if (!apiKey) {
    throw new Error("No hay API key disponible");
  }

  const { maxOutputTokens, temperature, topP, topK, responseMimeType } = config;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Image
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature,
      topP,
      topK,
      maxOutputTokens,
      responseMimeType
    }
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    const error = new Error(`Gemini API ${response.status}: ${errorText || response.statusText}`);
    error.status = response.status;
    error.payload = errorText;
    throw error;
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.map(p => p?.text ?? "").join("\n") ?? "";

  if (!rawText) {
    throw new Error("No se recibió respuesta válida de Gemini Vision API");
  }

  return rawText;
}

/**
 * Crea un mensaje de error amigable para el usuario
 */
function _createUserFriendlyError(originalError) {
  const errorMsg = String(originalError?.message || originalError || "");

  if (/api.?key.?(expired|invalid)/i.test(errorMsg)) {
    return "⚠️ Error de configuración de IA. Por favor, contacta al administrador para actualizar las API keys de Gemini.";
  }

  if (/quota|rate.?limit|resource.?exhausted/i.test(errorMsg)) {
    return "⚠️ Se ha alcanzado el límite de uso de la IA. Por favor, intenta de nuevo en unos minutos.";
  }

  if (/network|fetch|connection|timeout/i.test(errorMsg)) {
    return "⚠️ Error de conexión. Verifica tu conexión a internet e intenta de nuevo.";
  }

  if (/not.?found|model/i.test(errorMsg)) {
    return "⚠️ El modelo de IA no está disponible temporalmente. El sistema intentó con alternativas sin éxito.";
  }

  // Error genérico
  return `⚠️ Error al procesar la imagen con IA: ${errorMsg.slice(0, 150)}`;
}

export async function getDeltaFromUserText({ text, promptBuilder, currentModel }) {
  // 1) JSON directo del usuario
  try {
    const asJson = JSON.parse(text);
    if (asJson && typeof asJson === "object" && Array.isArray(asJson.actions)) {
      return asJson;
    }
  } catch {
    // No es JSON válido, continuar con Gemini o parser local
  }

  // 2) Gemini (si hay key) - usar modelo DEFAULT para parsing
  if (getApiKey()) {
    const prompt = promptBuilder(currentModel, text);
    try {
      const out = await callGeminiJSON(prompt, { maxOutputTokens: 8000, taskType: "parse" });
      if (out && Array.isArray(out.actions)) return out;
    } catch (e) {
      console.warn("Gemini falló; uso parser local. Detalle:", e?.message);
    }
  }

  // 3) Parser local con templates
  const naive = naiveParse(text);
  return { actions: naive };
}

/* ===================== TEMPLATES DE SISTEMAS COMPLETOS ===================== */
const SYSTEM_TEMPLATES = {
  ventas: [
    // Primero todas las entidades
    { op: "add_entity", name: "Usuario", attrs: [{ name: "id", type: "Integer" }, { name: "username", type: "String" }, { name: "password", type: "String" }, { name: "email", type: "String" }, { name: "rol", type: "String" }, { name: "telefono", type: "String" }, { name: "activo", type: "Boolean" }, { name: "createdAt", type: "Date" }, { name: "updatedAt", type: "Date" }] },
    { op: "add_entity", name: "Cliente", attrs: [{ name: "id", type: "Integer" }, { name: "nombre", type: "String" }, { name: "apellido", type: "String" }, { name: "email", type: "String" }, { name: "telefono", type: "String" }, { name: "direccion", type: "String" }, { name: "ciudad", type: "String" }, { name: "nit", type: "String" }, { name: "createdAt", type: "Date" }, { name: "updatedAt", type: "Date" }] },
    { op: "add_entity", name: "Categoria", attrs: [{ name: "id", type: "Integer" }, { name: "nombre", type: "String" }, { name: "descripcion", type: "String" }, { name: "activo", type: "Boolean" }, { name: "createdAt", type: "Date" }, { name: "updatedAt", type: "Date" }] },
    { op: "add_entity", name: "Producto", attrs: [{ name: "id", type: "Integer" }, { name: "nombre", type: "String" }, { name: "descripcion", type: "String" }, { name: "precio", type: "BigDecimal" }, { name: "stock", type: "Integer" }, { name: "stockMinimo", type: "Integer" }, { name: "categoriaId", type: "Integer" }, { name: "activo", type: "Boolean" }, { name: "createdAt", type: "Date" }, { name: "updatedAt", type: "Date" }] },
    { op: "add_entity", name: "Venta", attrs: [{ name: "id", type: "Integer" }, { name: "numeroFactura", type: "String" }, { name: "fecha", type: "Date" }, { name: "total", type: "BigDecimal" }, { name: "descuento", type: "BigDecimal" }, { name: "subtotal", type: "BigDecimal" }, { name: "clienteId", type: "Integer" }, { name: "usuarioId", type: "Integer" }, { name: "metodoPago", type: "String" }, { name: "estado", type: "String" }, { name: "createdAt", type: "Date" }, { name: "updatedAt", type: "Date" }] },
    { op: "add_entity", name: "DetalleVenta", attrs: [{ name: "id", type: "Integer" }, { name: "cantidad", type: "Integer" }, { name: "precioUnitario", type: "BigDecimal" }, { name: "subtotal", type: "BigDecimal" }, { name: "descuento", type: "BigDecimal" }, { name: "total", type: "BigDecimal" }, { name: "ventaId", type: "Integer" }, { name: "productoId", type: "Integer" }, { name: "createdAt", type: "Date" }, { name: "updatedAt", type: "Date" }] },
    // Luego todas las relaciones (muchos a uno)
    { op: "add_relation", a: "Producto", b: "Categoria", mA: "*", mB: "1", relKind: "ASSOC", verb: "pertenece a", relType: "N-1", direction: "a->b" },
    { op: "add_relation", a: "Venta", b: "Cliente", mA: "*", mB: "1", relKind: "ASSOC", verb: "realizada por", relType: "N-1", direction: "a->b" },
    { op: "add_relation", a: "Venta", b: "Usuario", mA: "*", mB: "1", relKind: "ASSOC", verb: "registrada por", relType: "N-1", direction: "a->b" },
    { op: "add_relation", a: "DetalleVenta", b: "Venta", mA: "*", mB: "1", relKind: "COMP", verb: "detalle de", relType: "N-1", direction: "a->b" },
    { op: "add_relation", a: "DetalleVenta", b: "Producto", mA: "*", mB: "1", relKind: "ASSOC", verb: "contiene", relType: "N-1", direction: "a->b" }
  ],
  biblioteca: [
    { op: "add_entity", name: "Usuario", attrs: [{ name: "id", type: "Integer" }, { name: "nombre", type: "String" }, { name: "apellido", type: "String" }, { name: "email", type: "String" }, { name: "telefono", type: "String" }, { name: "direccion", type: "String" }, { name: "tipoUsuario", type: "String" }, { name: "activo", type: "Boolean" }, { name: "createdAt", type: "Date" }, { name: "updatedAt", type: "Date" }] },
    { op: "add_entity", name: "Autor", attrs: [{ name: "id", type: "Integer" }, { name: "nombre", type: "String" }, { name: "apellido", type: "String" }, { name: "nacionalidad", type: "String" }, { name: "biografia", type: "String" }, { name: "createdAt", type: "Date" }, { name: "updatedAt", type: "Date" }] },
    { op: "add_entity", name: "Editorial", attrs: [{ name: "id", type: "Integer" }, { name: "nombre", type: "String" }, { name: "pais", type: "String" }, { name: "email", type: "String" }, { name: "telefono", type: "String" }, { name: "createdAt", type: "Date" }, { name: "updatedAt", type: "Date" }] },
    { op: "add_entity", name: "Libro", attrs: [{ name: "id", type: "Integer" }, { name: "titulo", type: "String" }, { name: "isbn", type: "String" }, { name: "anioPublicacion", type: "Integer" }, { name: "numPaginas", type: "Integer" }, { name: "idioma", type: "String" }, { name: "stock", type: "Integer" }, { name: "autorId", type: "Integer" }, { name: "editorialId", type: "Integer" }, { name: "createdAt", type: "Date" }, { name: "updatedAt", type: "Date" }] },
    { op: "add_entity", name: "Prestamo", attrs: [{ name: "id", type: "Integer" }, { name: "fechaPrestamo", type: "Date" }, { name: "fechaDevolucion", type: "Date" }, { name: "fechaDevolucionReal", type: "Date" }, { name: "estado", type: "String" }, { name: "multa", type: "BigDecimal" }, { name: "usuarioId", type: "Integer" }, { name: "libroId", type: "Integer" }, { name: "createdAt", type: "Date" }, { name: "updatedAt", type: "Date" }] },
    { op: "add_relation", a: "Libro", b: "Autor", mA: "*", mB: "1", relKind: "ASSOC", verb: "escrito por", relType: "N-1", direction: "a->b" },
    { op: "add_relation", a: "Libro", b: "Editorial", mA: "*", mB: "1", relKind: "ASSOC", verb: "publicado por", relType: "N-1", direction: "a->b" },
    { op: "add_relation", a: "Prestamo", b: "Usuario", mA: "*", mB: "1", relKind: "ASSOC", verb: "solicitado por", relType: "N-1", direction: "a->b" },
    { op: "add_relation", a: "Prestamo", b: "Libro", mA: "*", mB: "1", relKind: "ASSOC", verb: "préstamo de", relType: "N-1", direction: "a->b" }
  ],
  hospital: [
    { op: "add_entity", name: "Paciente", attrs: [{ name: "id", type: "Integer" }, { name: "nombre", type: "String" }, { name: "apellido", type: "String" }, { name: "fechaNacimiento", type: "Date" }, { name: "genero", type: "String" }, { name: "direccion", type: "String" }, { name: "telefono", type: "String" }, { name: "email", type: "String" }, { name: "grupoSanguineo", type: "String" }, { name: "createdAt", type: "Date" }, { name: "updatedAt", type: "Date" }] },
    { op: "add_entity", name: "Doctor", attrs: [{ name: "id", type: "Integer" }, { name: "nombre", type: "String" }, { name: "apellido", type: "String" }, { name: "especialidad", type: "String" }, { name: "licencia", type: "String" }, { name: "telefono", type: "String" }, { name: "email", type: "String" }, { name: "activo", type: "Boolean" }, { name: "createdAt", type: "Date" }, { name: "updatedAt", type: "Date" }] },
    { op: "add_entity", name: "Cita", attrs: [{ name: "id", type: "Integer" }, { name: "fecha", type: "Date" }, { name: "hora", type: "String" }, { name: "motivo", type: "String" }, { name: "estado", type: "String" }, { name: "pacienteId", type: "Integer" }, { name: "doctorId", type: "Integer" }, { name: "createdAt", type: "Date" }, { name: "updatedAt", type: "Date" }] },
    { op: "add_entity", name: "HistorialMedico", attrs: [{ name: "id", type: "Integer" }, { name: "fecha", type: "Date" }, { name: "diagnostico", type: "String" }, { name: "tratamiento", type: "String" }, { name: "observaciones", type: "String" }, { name: "pacienteId", type: "Integer" }, { name: "doctorId", type: "Integer" }, { name: "citaId", type: "Integer" }, { name: "createdAt", type: "Date" }, { name: "updatedAt", type: "Date" }] },
    { op: "add_relation", a: "Cita", b: "Paciente", mA: "*", mB: "1", relKind: "ASSOC", verb: "agendada para", relType: "N-1", direction: "a->b" },
    { op: "add_relation", a: "Cita", b: "Doctor", mA: "*", mB: "1", relKind: "ASSOC", verb: "atendida por", relType: "N-1", direction: "a->b" },
    { op: "add_relation", a: "HistorialMedico", b: "Paciente", mA: "*", mB: "1", relKind: "ASSOC", verb: "historial de", relType: "N-1", direction: "a->b" },
    { op: "add_relation", a: "HistorialMedico", b: "Doctor", mA: "*", mB: "1", relKind: "ASSOC", verb: "registrado por", relType: "N-1", direction: "a->b" },
    { op: "add_relation", a: "HistorialMedico", b: "Cita", mA: "*", mB: "0..1", relKind: "ASSOC", verb: "derivado de", relType: "N-1", direction: "a->b" }
  ],
  ecommerce: [
    { op: "add_entity", name: "Usuario", attrs: [{ name: "id", type: "Integer" }, { name: "username", type: "String" }, { name: "email", type: "String" }, { name: "password", type: "String" }, { name: "rol", type: "String" }, { name: "activo", type: "Boolean" }, { name: "createdAt", type: "Date" }, { name: "updatedAt", type: "Date" }] },
    { op: "add_entity", name: "Cliente", attrs: [{ name: "id", type: "Integer" }, { name: "nombre", type: "String" }, { name: "apellido", type: "String" }, { name: "email", type: "String" }, { name: "telefono", type: "String" }, { name: "usuarioId", type: "Integer" }, { name: "createdAt", type: "Date" }, { name: "updatedAt", type: "Date" }] },
    { op: "add_entity", name: "Direccion", attrs: [{ name: "id", type: "Integer" }, { name: "calle", type: "String" }, { name: "ciudad", type: "String" }, { name: "estado", type: "String" }, { name: "codigoPostal", type: "String" }, { name: "pais", type: "String" }, { name: "clienteId", type: "Integer" }, { name: "createdAt", type: "Date" }] },
    { op: "add_entity", name: "Categoria", attrs: [{ name: "id", type: "Integer" }, { name: "nombre", type: "String" }, { name: "descripcion", type: "String" }, { name: "activo", type: "Boolean" }] },
    { op: "add_entity", name: "Producto", attrs: [{ name: "id", type: "Integer" }, { name: "nombre", type: "String" }, { name: "descripcion", type: "String" }, { name: "precio", type: "BigDecimal" }, { name: "stock", type: "Integer" }, { name: "imagen", type: "String" }, { name: "categoriaId", type: "Integer" }, { name: "activo", type: "Boolean" }, { name: "createdAt", type: "Date" }] },
    { op: "add_entity", name: "Carrito", attrs: [{ name: "id", type: "Integer" }, { name: "clienteId", type: "Integer" }, { name: "createdAt", type: "Date" }, { name: "updatedAt", type: "Date" }] },
    { op: "add_entity", name: "ItemCarrito", attrs: [{ name: "id", type: "Integer" }, { name: "cantidad", type: "Integer" }, { name: "carritoId", type: "Integer" }, { name: "productoId", type: "Integer" }] },
    { op: "add_entity", name: "Pedido", attrs: [{ name: "id", type: "Integer" }, { name: "numero", type: "String" }, { name: "fecha", type: "Date" }, { name: "estado", type: "String" }, { name: "total", type: "BigDecimal" }, { name: "clienteId", type: "Integer" }, { name: "direccionId", type: "Integer" }, { name: "createdAt", type: "Date" }] },
    { op: "add_entity", name: "DetallePedido", attrs: [{ name: "id", type: "Integer" }, { name: "cantidad", type: "Integer" }, { name: "precio", type: "BigDecimal" }, { name: "subtotal", type: "BigDecimal" }, { name: "pedidoId", type: "Integer" }, { name: "productoId", type: "Integer" }] },
    { op: "add_relation", a: "Cliente", b: "Usuario", mA: "1", mB: "1", relKind: "ASSOC", verb: "pertenece a" },
    { op: "add_relation", a: "Direccion", b: "Cliente", mA: "*", mB: "1", relKind: "ASSOC", verb: "de" },
    { op: "add_relation", a: "Producto", b: "Categoria", mA: "*", mB: "1", relKind: "ASSOC", verb: "pertenece a" },
    { op: "add_relation", a: "Carrito", b: "Cliente", mA: "1", mB: "1", relKind: "ASSOC", verb: "de" },
    { op: "add_relation", a: "ItemCarrito", b: "Carrito", mA: "*", mB: "1", relKind: "COMP", verb: "en" },
    { op: "add_relation", a: "ItemCarrito", b: "Producto", mA: "*", mB: "1", relKind: "ASSOC", verb: "contiene" },
    { op: "add_relation", a: "Pedido", b: "Cliente", mA: "*", mB: "1", relKind: "ASSOC", verb: "realizado por" },
    { op: "add_relation", a: "Pedido", b: "Direccion", mA: "*", mB: "1", relKind: "ASSOC", verb: "enviado a" },
    { op: "add_relation", a: "DetallePedido", b: "Pedido", mA: "*", mB: "1", relKind: "COMP", verb: "de" },
    { op: "add_relation", a: "DetallePedido", b: "Producto", mA: "*", mB: "1", relKind: "ASSOC", verb: "incluye" }
  ],
  escuela: [
    { op: "add_entity", name: "Estudiante", attrs: [{ name: "id", type: "Integer" }, { name: "nombre", type: "String" }, { name: "apellido", type: "String" }, { name: "fechaNacimiento", type: "Date" }, { name: "email", type: "String" }, { name: "telefono", type: "String" }, { name: "direccion", type: "String" }, { name: "activo", type: "Boolean" }, { name: "createdAt", type: "Date" }] },
    { op: "add_entity", name: "Profesor", attrs: [{ name: "id", type: "Integer" }, { name: "nombre", type: "String" }, { name: "apellido", type: "String" }, { name: "especialidad", type: "String" }, { name: "email", type: "String" }, { name: "telefono", type: "String" }, { name: "activo", type: "Boolean" }, { name: "createdAt", type: "Date" }] },
    { op: "add_entity", name: "Materia", attrs: [{ name: "id", type: "Integer" }, { name: "nombre", type: "String" }, { name: "codigo", type: "String" }, { name: "creditos", type: "Integer" }, { name: "descripcion", type: "String" }, { name: "activo", type: "Boolean" }] },
    { op: "add_entity", name: "Curso", attrs: [{ name: "id", type: "Integer" }, { name: "nombre", type: "String" }, { name: "gestion", type: "Integer" }, { name: "periodo", type: "String" }, { name: "horario", type: "String" }, { name: "materiaId", type: "Integer" }, { name: "profesorId", type: "Integer" }, { name: "createdAt", type: "Date" }] },
    { op: "add_entity", name: "Inscripcion", attrs: [{ name: "id", type: "Integer" }, { name: "fecha", type: "Date" }, { name: "estado", type: "String" }, { name: "estudianteId", type: "Integer" }, { name: "cursoId", type: "Integer" }] },
    { op: "add_entity", name: "Calificacion", attrs: [{ name: "id", type: "Integer" }, { name: "nota", type: "Double" }, { name: "fecha", type: "Date" }, { name: "tipo", type: "String" }, { name: "inscripcionId", type: "Integer" }] },
    { op: "add_relation", a: "Curso", b: "Materia", mA: "*", mB: "1", relKind: "ASSOC", verb: "de" },
    { op: "add_relation", a: "Curso", b: "Profesor", mA: "*", mB: "1", relKind: "ASSOC", verb: "impartido por" },
    { op: "add_relation", a: "Inscripcion", b: "Estudiante", mA: "*", mB: "1", relKind: "ASSOC", verb: "de" },
    { op: "add_relation", a: "Inscripcion", b: "Curso", mA: "*", mB: "1", relKind: "ASSOC", verb: "en" },
    { op: "add_relation", a: "Calificacion", b: "Inscripcion", mA: "*", mB: "1", relKind: "COMP", verb: "de" }
  ],
  restaurante: [
    { op: "add_entity", name: "Cliente", attrs: [{ name: "id", type: "Integer" }, { name: "nombre", type: "String" }, { name: "telefono", type: "String" }, { name: "email", type: "String" }, { name: "direccion", type: "String" }, { name: "createdAt", type: "Date" }] },
    { op: "add_entity", name: "Mesa", attrs: [{ name: "id", type: "Integer" }, { name: "numero", type: "Integer" }, { name: "capacidad", type: "Integer" }, { name: "ubicacion", type: "String" }, { name: "estado", type: "String" }] },
    { op: "add_entity", name: "Categoria", attrs: [{ name: "id", type: "Integer" }, { name: "nombre", type: "String" }, { name: "descripcion", type: "String" }] },
    { op: "add_entity", name: "Plato", attrs: [{ name: "id", type: "Integer" }, { name: "nombre", type: "String" }, { name: "descripcion", type: "String" }, { name: "precio", type: "BigDecimal" }, { name: "disponible", type: "Boolean" }, { name: "categoriaId", type: "Integer" }] },
    { op: "add_entity", name: "Pedido", attrs: [{ name: "id", type: "Integer" }, { name: "numero", type: "String" }, { name: "fecha", type: "Date" }, { name: "hora", type: "String" }, { name: "estado", type: "String" }, { name: "total", type: "BigDecimal" }, { name: "clienteId", type: "Integer" }, { name: "mesaId", type: "Integer" }] },
    { op: "add_entity", name: "DetallePedido", attrs: [{ name: "id", type: "Integer" }, { name: "cantidad", type: "Integer" }, { name: "precio", type: "BigDecimal" }, { name: "observaciones", type: "String" }, { name: "pedidoId", type: "Integer" }, { name: "platoId", type: "Integer" }] },
    { op: "add_entity", name: "Pago", attrs: [{ name: "id", type: "Integer" }, { name: "fecha", type: "Date" }, { name: "monto", type: "BigDecimal" }, { name: "metodo", type: "String" }, { name: "pedidoId", type: "Integer" }] },
    { op: "add_relation", a: "Plato", b: "Categoria", mA: "*", mB: "1", relKind: "ASSOC", verb: "pertenece a" },
    { op: "add_relation", a: "Pedido", b: "Cliente", mA: "*", mB: "1", relKind: "ASSOC", verb: "realizado por" },
    { op: "add_relation", a: "Pedido", b: "Mesa", mA: "*", mB: "1", relKind: "ASSOC", verb: "en" },
    { op: "add_relation", a: "DetallePedido", b: "Pedido", mA: "*", mB: "1", relKind: "COMP", verb: "de" },
    { op: "add_relation", a: "DetallePedido", b: "Plato", mA: "*", mB: "1", relKind: "ASSOC", verb: "incluye" },
    { op: "add_relation", a: "Pago", b: "Pedido", mA: "1", mB: "1", relKind: "ASSOC", verb: "de" }
  ]
};

/* ===================== Parser local EXTENDIDO =====================

   Soporta instrucciones como:
   - crear/definir/actualizar entidad: "crear entidad Usuario(id Integer, nombre String)"
   - crear entidad sin paréntesis: "crear entidad Producto"
   - atributos:
     * "agrega atributo telefono Integer a Usuario"
     * "quita atributo telefono de Usuario"
     * "renombrar atributo telefono de Usuario a celular"
     * "cambia tipo de atributo telefono de Usuario a Long"
     * "elimina los atributos de Usuario" | "deja solo id en Usuario"
   - relaciones (5 tipos):
     * Asociación:    "relación Usuario 1..* - 1 Perfil (verbo: tiene)"
     * N–M:           "n-m Usuario y Rol [join Usuario_Rol]"
     * Asociativa:    "asociativa Usuario y Producto [join Usuario_Producto]"
     * Herencia:      "Empleado -> Persona" | "Empleado extiende Persona"
     * Dependencia:   "dependencia A -> B" | "A depende de B"
     * Agreg/Comp:    "agregación A 1..* - 1 B [lado A]" | "composición A 1..* - 1 B [lado B]"
*/
function naiveParse(textRaw) {
  const T = (s) => (s || "").trim();
  const SRC = textRaw || "";
  const actions = [];

  // Detectar templates de sistemas completos SOLO si se pide explícitamente
  const lowerText = SRC.toLowerCase();

  // Solo genera el sistema completo si se pide explícitamente "sistema de X" o "crear sistema X"
  if (/(?:crea(?:r)?|genera(?:r)?|quiero|necesito|haz)\s+(?:un\s+)?sistema\s+(?:completo\s+)?(?:de\s+)?ventas?/i.test(lowerText) ||
    /(?:crea(?:r)?|genera(?:r)?)\s+(?:un\s+)?(?:sistema\s+)?(?:de\s+)?punto\s+de\s+venta/i.test(lowerText)) {
    return SYSTEM_TEMPLATES.ventas;
  }
  if (/(?:crea(?:r)?|genera(?:r)?|quiero|necesito|haz)\s+(?:un\s+)?sistema\s+(?:completo\s+)?(?:de\s+)?biblioteca/i.test(lowerText)) {
    return SYSTEM_TEMPLATES.biblioteca;
  }
  if (/(?:crea(?:r)?|genera(?:r)?|quiero|necesito|haz)\s+(?:un\s+)?sistema\s+(?:completo\s+)?(?:de\s+)?(?:hospital|clinica)/i.test(lowerText)) {
    return SYSTEM_TEMPLATES.hospital;
  }
  if (/(?:crea(?:r)?|genera(?:r)?|quiero|necesito|haz)\s+(?:un\s+)?sistema\s+(?:completo\s+)?(?:de\s+)?(?:ecommerce|e-commerce|tienda\s+online|comercio\s+electronico)/i.test(lowerText)) {
    return SYSTEM_TEMPLATES.ecommerce;
  }
  if (/(?:crea(?:r)?|genera(?:r)?|quiero|necesito|haz)\s+(?:un\s+)?sistema\s+(?:completo\s+)?(?:de\s+)?(?:escuela|colegio|educacion|educativo)/i.test(lowerText)) {
    return SYSTEM_TEMPLATES.escuela;
  }
  if (/(?:crea(?:r)?|genera(?:r)?|quiero|necesito|haz)\s+(?:un\s+)?sistema\s+(?:completo\s+)?(?:de\s+)?restaurante/i.test(lowerText)) {
    return SYSTEM_TEMPLATES.restaurante;
  }

  // Upsert entidad con atributos - Lenguaje natural fluido
  // Acepta: "crear entidad Usuario(...)", "quiero un Usuario con...", "necesito una clase Usuario(...)"
  const reUpsertEntity = /(?:crea(?:r)?|haz(?:me)?|genera(?:r)?|define|actualiza|modifica|quiero|necesito|dame)(?:\s+(?:un|una|la|el))?\s+(?:entidad|clase|tabla)?\s*([A-Za-z_]\w*)(?:\s+(?:con|que\s+tenga|teniendo))?\s*\(([^)]*)\)/gi;
  let m;
  while ((m = reUpsertEntity.exec(SRC)) !== null) {
    const name = T(m[1]);
    const attrsStr = T(m[2]);
    const attrs = attrsStr
      ? attrsStr.split(",").map((p) => {
        const [n, t] = p.split(/\s+/).map(T);
        return { name: n.replace(/[:,]/g, ""), type: (t || "String").replace(/[:,]/g, "") };
      })
      : [];
    if (!attrs.some(a => a.name.toLowerCase() === "id")) {
      attrs.unshift({ name: "id", type: "Integer" });
    }
    actions.push({ op: "update_entity", name, attrs });
  }

  // Crear entidad sin paréntesis - Lenguaje natural
  // Acepta: "crear Usuario", "quiero un Usuario", "necesito una clase Usuario", "hazme un Usuario"
  const reCreateSimple = /(?:crea(?:r)?|haz(?:me)?|genera(?:r)?|define|quiero|necesito|dame)(?:\s+(?:un|una|la|el))?\s+(?:entidad|clase|tabla)?\s*([A-Za-z_]\w*)\b(?!\s*\()/gi;
  let cs;
  while ((cs = reCreateSimple.exec(SRC)) !== null) {
    actions.push({ op: "add_entity", name: T(cs[1]), attrs: [{ name: "id", type: "Integer" }] });
  }

  // Atributos: add - Lenguaje natural fluido
  // Acepta: "agrega telefono", "quiero agregar telefono", "ponle un telefono", "que tenga telefono"
  const reAddAttr = /(?:agrega(?:r)?|añade|añadir|pon(?:le)?|que\s+tenga|con)(?:\s+(?:un|una|el|la))?\s+(?:atributo|campo|propiedad)?\s*([A-Za-z_]\w*)\s+(?:de\s+tipo\s+)?([A-Za-z_][\w[\]]*)\s+(?:a|en|para)\s+(?:la\s+)?(?:entidad\s+)?([A-Za-z_]\w*)/gi;
  let aa;
  while ((aa = reAddAttr.exec(SRC)) !== null) {
    actions.push({ op: "add_attr", entity: T(aa[3]), attr: { name: T(aa[1]), type: T(aa[2]) || "String" } });
  }

  // Atributos: remove uno - Lenguaje natural
  // Acepta: "quita telefono", "elimina el email", "saca telefono de Usuario", "borra el telefono"
  const reDelAttr = /(?:quita(?:r)?|elimina(?:r)?|borra(?:r)?|saca(?:r)?|remueve)(?:\s+(?:el|la))?\s+(?:atributo|campo|propiedad)?\s*([A-Za-z_]\w*)\s+(?:de|en)\s+(?:la\s+)?(?:entidad\s+)?([A-Za-z_]\w*)/gi;
  let da;
  while ((da = reDelAttr.exec(SRC)) !== null) {
    actions.push({ op: "remove_attr", entity: T(da[2]), name: T(da[1]) });
  }
  // Atributos: eliminar todos - Lenguaje natural
  // Acepta: "quita todos los atributos", "borra los campos de Usuario", "limpia los atributos"
  const reClearAttrs = /(?:quita(?:r)?|elimina(?:r)?|borra(?:r)?|limpia(?:r)?)\s+(?:todos\s+)?(?:los\s+)?(?:atributos|campos|propiedades)\s+(?:de|del)\s+(?:la\s+)?(?:entidad\s+)?([A-Za-z_]\w*)/gi;
  let ca;
  while ((ca = reClearAttrs.exec(SRC)) !== null) {
    actions.push({ op: "clear_attrs", entity: T(ca[1]) });
  }
  // Atributos: dejar solo id - Lenguaje natural
  // Acepta: "deja solo id en Usuario", "que Usuario tenga solo id", "limpia todo menos el id"
  const reOnlyId = /(?:deja(?:r)?|que\s+tenga|limpia(?:r)?\s+todo\s+menos)\s+solo\s+(?:el\s+)?id\s+(?:en|de)\s+(?:la\s+)?(?:entidad\s+)?([A-Za-z_]\w*)/gi;
  let oid;
  while ((oid = reOnlyId.exec(SRC)) !== null) {
    actions.push({ op: "update_entity", name: T(oid[1]), attrs: [{ name: "id", type: "Integer" }] });
  }
  // Renombrar entidad - Lenguaje natural
  // Acepta: "renombra Usuario a Cliente", "cambia el nombre de Usuario por Cliente", "que Usuario se llame Cliente"
  const reRenEntity = /(?:renombra(?:r)?(?:\s+entidad)?|cambia(?:r)?(?:\s+(?:el\s+)?nombre\s+de)?|que)\s+(?:la\s+)?(?:entidad\s+)?([A-Za-z_]\w*)\s+(?:a|por|se\s+llame)\s+([A-Za-z_]\w*)/gi;
  let re;
  while ((re = reRenEntity.exec(SRC)) !== null) {
    actions.push({ op: "rename_entity", old: T(re[1]), name: T(re[2]) });
  }

  // Eliminar entidad - Lenguaje natural
  // Acepta: "elimina Usuario", "borra la entidad Cliente", "quita Producto", "saca el Usuario"
  const reDelEntity = /(?:elimina(?:r)?|borra(?:r)?|quita(?:r)?|saca(?:r)?)\s+(?:la|el)?\s+(?:entidad|clase|tabla)?\s*([A-Za-z_]\w*)/gi;
  let de;
  while ((de = reDelEntity.exec(SRC)) !== null) {
    actions.push({ op: "remove_entity", name: T(de[1]) });
  }

  // Renombrar atributo - Lenguaje natural
  // Acepta: "renombra telefono a celular en Usuario", "cambia el nombre de telefono por celular"
  const reRenAttr = /(?:renombra(?:r)?|cambia(?:r)?(?:\s+(?:el\s+)?nombre\s+de)?)\s+(?:atributo|campo|propiedad)?\s*([A-Za-z_]\w*)\s+(?:de|en)\s+(?:la\s+)?(?:entidad\s+)?([A-Za-z_]\w*)\s+(?:a|por)\s+([A-Za-z_]\w*)/gi;
  let ra;
  while ((ra = reRenAttr.exec(SRC)) !== null) {
    actions.push({ op: "update_attr", entity: T(ra[2]), old: T(ra[1]), attr: { name: T(ra[3]) } });
  }
  // Cambiar tipo de atributo - Lenguaje natural
  // Acepta: "cambia tipo de telefono a Integer en Usuario", "que telefono sea Long", "el precio debe ser Double"
  const reTypeAttr = /(?:cambia(?:r)?|modifica(?:r)?|que)\s+(?:(?:el\s+)?tipo\s+de\s+)?(?:atributo|campo|propiedad)?\s*([A-Za-z_]\w*)\s+(?:de|en)\s+(?:la\s+)?(?:entidad\s+)?([A-Za-z_]\w*)\s+(?:a|sea(?:\s+tipo)?|debe\s+ser)\s+([A-Za-z_][\w[\]]*)/gi;
  let ta;
  while ((ta = reTypeAttr.exec(SRC)) !== null) {
    actions.push({ op: "update_attr", entity: T(ta[2]), old: T(ta[1]), attr: { name: T(ta[1]), type: T(ta[3]) } });
  }

  // Asociación - Lenguaje natural MEJORADO
  // Acepta: "relación Usuario 1..* - 0..1 Pedido", "conecta Usuario con Pedido", "asociación entre Ropa y Categoria"
  const reRel = /(?:relaci[oó]n|asociaci[oó]n|conecta(?:r)?|vincular|que)(?:\s+entre)?\s+([A-Za-z_]\w*)\s+(?:(?:tenga|con|y)\s+)?([01]\.\.\*|0\.\.1|1\.\.\*|\*|n|1)?\s*[-–]?\s*([01]\.\.\*|0\.\.1|1\.\.\*|\*|n|1)?\s+([A-Za-z_]\w*)(?:\s*(?:\(verbo:?\s*|verbo:?\s*)([^)]+)\))?(?:\s+(?:verbo:?|con)\s*["']?([^"')\n]+)["']?)?/gi;
  let r;
  while ((r = reRel.exec(SRC)) !== null) {
    const a = T(r[1]), mA = T(r[2]) || "1", mB = T(r[3]) || "1", b = T(r[4]);
    const verb = T(r[5] || r[6] || "");
    actions.push({ op: "add_relation", a, b, mA, mB, verb, relKind: "ASSOC", direction: "A->B" });
  }

  // N-M - Lenguaje natural
  // Acepta: "n-m Usuario y Pedido", "muchos a muchos entre Estudiante con Curso", "relación n m Producto Proveedor join ProductoProveedor"
  const reNM = /(?:n[-–\s]*m|muchos\s+a\s+muchos)(?:\s+entre)?\s+([A-Za-z_]\w*)\s+(?:y|con)\s+([A-Za-z_]\w*)(?:.*?\bjoin\b\s+([A-Za-z_]\w*))?/gi;
  let nmm;
  while ((nmm = reNM.exec(SRC)) !== null) {
    actions.push({ op: "add_relation_nm", a: T(nmm[1]), b: T(nmm[2]), joinName: T(nmm[3] || "") || undefined });
  }

  // Entidad asociativa explícita (alias) - Lenguaje natural
  // Acepta: "asociativa Usuario y Pedido join UsuarioPedido", "entidad asociativa entre Cliente con Producto"
  const reAssocEnt = /(?:asociativa|entidad\s+asociativa)(?:\s+entre)?(?:\s+|.*?\s)([A-Za-z_]\w*)\s+(?:y|con)\s+([A-Za-z_]\w*)(?:.*?\bjoin\b\s+([A-Za-z_]\w*))?/gi;
  let ae;
  while ((ae = reAssocEnt.exec(SRC)) !== null) {
    actions.push({ op: "add_relation_associative", a: T(ae[1]), b: T(ae[2]), name: T(ae[3] || "") || undefined });
  }

  // Herencia - Lenguaje natural MEJORADO
  // Acepta: "herencia Empleado -> Persona", "que Empleado herede de Persona", "Empleado extiende Persona"
  // NUEVO: "herencia entre Empleado y Persona"
  const reInhArrow = /(?:herencia|que)(?:\s+entre)?\s+([A-Za-z_]\w*)\s+(?:->|y|con|herede\s+de|extiende(?:r)?)\s+([A-Za-z_]\w*)/gi;
  let hi;
  while ((hi = reInhArrow.exec(SRC)) !== null) {
    actions.push({ op: "add_relation", a: T(hi[1]), b: T(hi[2]), relKind: "INHERIT", direction: "A->B" });
  }

  // Dependencia - Lenguaje natural MEJORADO
  // Acepta: "dependencia Usuario -> Pedido", "que Usuario dependa de Pedido", "Usuario usa Pedido"
  // NUEVO: "dependencia entre Ropa y Categoria", "dependencia ropa categoria"
  const reDepArrow = /(?:dependencia|que)\s+(?:entre\s+)?([A-Za-z_]\w*)\s+(?:->|y|con|dependa\s+de|usa(?:r)?|use)\s+([A-Za-z_]\w*)(?:\s+(?:verbo:?|con)\s*["']?([^"')\n]+)["']?)?/gi;
  let dep;
  while ((dep = reDepArrow.exec(SRC)) !== null) {
    const verb = T(dep[3] || "");
    actions.push({
      op: "add_relation",
      a: T(dep[1]),
      b: T(dep[2]),
      relKind: "DEPEND",
      direction: "A->B",
      verb: verb || "depende de"
    });
  }

  // Agregación / Composición - Lenguaje natural MEJORADO
  // Acepta: "agregación Usuario 1 - * Pedido", "composición Carro con Rueda", "agregación entre A y B"
  const reAggComp = /(?:agregaci[oó]n|composici[oó]n)(?:\s+entre)?\s+([A-Za-z_]\w*)\s+(?:contenga|tenga|con|y)?\s*([01]\.\.\*|0\.\.1|1\.\.\*|\*|1)?\s*[-–]?\s*([01]\.\.\*|0\.\.1|1\.\.\*|\*|1)?\s+([A-Za-z_]\w*)(?:.*?\b(?:lado|diamante|owning)\b\s*(A|B))?/gi;
  let ac;
  while ((ac = reAggComp.exec(SRC)) !== null) {
    const kind = /agregaci/i.test(ac[0]) ? "AGGR" : "COMP";
    const a = T(ac[1]), mA = T(ac[2]) || "1", mB = T(ac[3]) || "1", b = T(ac[4]);
    const owning = T(ac[5] || "A");
    actions.push({ op: "add_relation", a, b, mA, mB, relKind: kind, owning, direction: "A->B" });
  }

  // Eliminar relación - Lenguaje natural
  // Acepta: "elimina relación entre Usuario y Pedido", "quita la conexión Usuario con Cliente", "borra relación Usuario Pedido"
  const reDelRel = /(?:elimina(?:r)?|quita(?:r)?|borra(?:r)?|saca(?:r)?)\s+(?:la\s+)?(?:relaci[oó]n|conexi[oó]n|v[ií]nculo)?\s+(?:entre\s+)?([A-Za-z_]\w*)\s+(?:y|con)\s+([A-Za-z_]\w*)/gi;
  let dr;
  while ((dr = reDelRel.exec(SRC)) !== null) {
    actions.push({ op: "remove_relation", a: T(dr[1]), b: T(dr[2]) });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ⭐ PATRONES ESPECÍFICOS DE COMANDOS CORTOS - PRIORIDAD ALTA
  // ⭐ SOPORTA: "clase 1", "Class1", "entidad_1", "Usuario", etc.
  // ═══════════════════════════════════════════════════════════════════════════

  // Helper para capturar nombres de entidad flexibles (con espacios, números, etc.)
  const ENTITY_PATTERN = "([A-Za-z_][A-Za-z0-9_]*(?:\\s*\\d+)?)";

  // 🔹 HERENCIA: "Herencia de clase 1 a clase 7" o "herencia A B" → A hereda de B
  // Acepta: "herencia de clase 1 a clase 7", "herencia Class1 Class7", "herencia Usuario Admin"
  const reHerenciaDe = new RegExp(
    `herencia\\s+(?:de\\s+)?(?:clase\\s+|class\\s+|entidad\\s+)?${ENTITY_PATTERN}\\s+(?:a|hacia|de|y)\\s+(?:clase\\s+|class\\s+|entidad\\s+)?${ENTITY_PATTERN}`,
    "gi"
  );
  let herDe;
  while ((herDe = reHerenciaDe.exec(SRC)) !== null) {
    const entityA = T(herDe[1]).replace(/\s+/g, ""); // "clase 1" → "clase1"
    const entityB = T(herDe[2]).replace(/\s+/g, "");
    console.log(`[Parser] Detectada HERENCIA: ${entityA} hereda de ${entityB}`);
    actions.push({ op: "add_relation", a: entityA, b: entityB, relKind: "INHERIT", direction: "A->B" });
  }

  // 🔹 COMPOSICIÓN: "Composición de clase 1 a clase 2" o "Componente de A a B" → A es componente de B
  const reComposicionDe = new RegExp(
    `(?:composici[oó]n|componente|comp)\\s+(?:de\\s+)?(?:clase\\s+|class\\s+|entidad\\s+)?${ENTITY_PATTERN}\\s+(?:a|hacia|en|de|y)\\s+(?:clase\\s+|class\\s+|entidad\\s+)?${ENTITY_PATTERN}`,
    "gi"
  );
  let compDe;
  while ((compDe = reComposicionDe.exec(SRC)) !== null) {
    const entityA = T(compDe[1]).replace(/\s+/g, "");
    const entityB = T(compDe[2]).replace(/\s+/g, "");
    console.log(`[Parser] Detectada COMPOSICIÓN: ${entityA} es componente de ${entityB}`);
    console.log(`[Parser] Detectada COMPOSICIÓN: ${entityA} es componente de ${entityB}`);
    actions.push({
      op: "add_relation",
      a: entityA,
      b: entityB,
      mA: "*",
      mB: "1",
      relKind: "COMP",
      owning: "B",
      direction: "A->B"
    });
  }

  // 🔹 AGREGACIÓN: "Agregación de clase 1 a clase 2" o "Agregar A en B" → A agregado en B
  const reAgregacionDe = new RegExp(
    `(?:agregaci[oó]n|agreg)\\s+(?:de\\s+)?(?:clase\\s+|class\\s+|entidad\\s+)?${ENTITY_PATTERN}\\s+(?:a|hacia|en|de|y)\\s+(?:clase\\s+|class\\s+|entidad\\s+)?${ENTITY_PATTERN}`,
    "gi"
  );
  let agrDe;
  while ((agrDe = reAgregacionDe.exec(SRC)) !== null) {
    const entityA = T(agrDe[1]).replace(/\s+/g, "");
    const entityB = T(agrDe[2]).replace(/\s+/g, "");
    console.log(`[Parser] Detectada AGREGACIÓN: ${entityA} agregado en ${entityB}`);
    console.log(`[Parser] Detectada AGREGACIÓN: ${entityA} agregado en ${entityB}`);
    actions.push({
      op: "add_relation",
      a: entityA,
      b: entityB,
      mA: "*",
      mB: "1",
      relKind: "AGGR",
      owning: "B",
      direction: "A->B"
    });
  }

  // 🔹 ASOCIACIÓN/RELACIÓN: "Relacionar clase 1 con clase 2" o "Relacionar de A a B" → Asociación A-B
  const reRelacionarDe = new RegExp(
    `(?:relacionar?|asociar?|relaci[oó]n)\\s+(?:de\\s+)?(?:clase\\s+|class\\s+|entidad\\s+)?${ENTITY_PATTERN}\\s+(?:a|con|hacia|y)\\s+(?:clase\\s+|class\\s+|entidad\\s+)?${ENTITY_PATTERN}`,
    "gi"
  );
  let relDe;
  while ((relDe = reRelacionarDe.exec(SRC)) !== null) {
    const entityA = T(relDe[1]).replace(/\s+/g, "");
    const entityB = T(relDe[2]).replace(/\s+/g, "");
    console.log(`[Parser] Detectada ASOCIACIÓN: ${entityA} con ${entityB}`);
    console.log(`[Parser] Detectada ASOCIACIÓN: ${entityA} con ${entityB}`);
    actions.push({
      op: "add_relation",
      a: entityA,
      b: entityB,
      mA: "1",
      mB: "*",
      relKind: "ASSOC",
      verb: "tiene",
      direction: "A->B"
    });
  }

  // 🔹 DEPENDENCIA: "Dependencia de clase 1 a clase 2" → A depende de B
  const reDependenciaDe = new RegExp(
    `dependencia\\s+(?:de\\s+)?(?:clase\\s+|class\\s+|entidad\\s+)?${ENTITY_PATTERN}\\s+(?:a|hacia|de|y)\\s+(?:clase\\s+|class\\s+|entidad\\s+)?${ENTITY_PATTERN}`,
    "gi"
  );
  let depDe;
  while ((depDe = reDependenciaDe.exec(SRC)) !== null) {
    const entityA = T(depDe[1]).replace(/\s+/g, "");
    const entityB = T(depDe[2]).replace(/\s+/g, "");
    console.log(`[Parser] Detectada DEPENDENCIA: ${entityA} depende de ${entityB}`);
    console.log(`[Parser] Detectada DEPENDENCIA: ${entityA} depende de ${entityB}`);
    actions.push({
      op: "add_relation",
      a: entityA,
      b: entityB,
      relKind: "DEPEND",
      verb: "usa",
      direction: "A->B"
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════

  // ⭐ PATRÓN COMODÍN GENÉRICO - Captura cualquier relación no específica
  // Acepta: "composición de ropa y categoría", "relación usuario pedido", "A de B", "A con B"
  // Este patrón se ejecuta AL FINAL para capturar todo lo que no se haya procesado antes
  const reGeneric = /(?:^|\n)\s*([A-Za-z_]\w*)\s+(?:de|con|y|entre|->)\s+([A-Za-z_]\w*)(?:\s|$)/gi;
  let gen;
  const processedPairs = new Set();

  while ((gen = reGeneric.exec(SRC)) !== null) {
    const a = T(gen[1]);
    const b = T(gen[2]);
    const pair = `${a.toLowerCase()}-${b.toLowerCase()}`;

    // Evitar duplicados
    if (processedPairs.has(pair)) continue;
    processedPairs.add(pair);

    // Detectar el tipo de relación por palabras clave en el texto
    const textBefore = SRC.substring(Math.max(0, gen.index - 30), gen.index).toLowerCase();

    let relKind = "ASSOC"; // Por defecto asociación
    let owning = "A";
    let mA = "1";
    let mB = "1";

    // Detectar tipo por palabras clave cercanas
    if (/composici[oó]n/.test(textBefore)) {
      relKind = "COMP";
      owning = "B"; // El segundo (B) es el contenedor
    } else if (/agregaci[oó]n/.test(textBefore)) {
      relKind = "AGGR";
      owning = "B";
    } else if (/herencia|extiende|hereda/.test(textBefore)) {
      relKind = "INHERIT";
    } else if (/dependencia|depende/.test(textBefore)) {
      relKind = "DEPEND";
    }

    // Crear la relación con el tipo detectado
    const relAction = {
      op: "add_relation",
      a,
      b,
      relKind,
      direction: "A->B"
    };

    // Solo agregar multiplicidades y owning si no es herencia o dependencia
    if (relKind !== "INHERIT" && relKind !== "DEPEND") {
      relAction.mA = mA;
      relAction.mB = mB;
      if (relKind === "AGGR" || relKind === "COMP") {
        relAction.owning = owning;
      }
    }

    actions.push(relAction);
  }

  return actions;
}
