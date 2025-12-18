// src/pages/components/Diagramador/services/imageProcessor.js
// Servicio para procesar imágenes de clases UML usando Gemini Vision API
// ⭐ Sistema robusto con reintentos automáticos y múltiples API keys

// Importar funciones de la API centralizada
import {
  callGeminiVision,
  setGeminiApiKey,
  setGeminiModel,
  addApiKeyToPool,
  resetApiKeySystem,
  getApiStatus
} from "./apiGemine";

// Re-exportar para compatibilidad con código existente
export {
  setGeminiApiKey,
  setGeminiModel,
  addApiKeyToPool,
  resetApiKeySystem,
  getApiStatus
};

/**
 * Convierte un archivo de imagen a base64
 * @param {File|Blob} file - Archivo de imagen
 * @returns {Promise<string>} - String en base64
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]; // Remover el prefijo data:image/...;base64,
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Determina el tipo MIME de la imagen basado en el archivo
 * @param {File|Blob} file - Archivo de imagen
 * @returns {string} - Tipo MIME
 */
function getImageMimeType(file) {
  if (file.type) {
    return file.type;
  }

  // Fallback si no hay tipo definido
  if (file.name && file.name.toLowerCase().endsWith('.png')) {
    return 'image/png';
  } else if (file.name && (file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg'))) {
    return 'image/jpeg';
  } else if (file.name && file.name.toLowerCase().endsWith('.gif')) {
    return 'image/gif';
  } else if (file.name && file.name.toLowerCase().endsWith('.webp')) {
    return 'image/webp';
  }

  return 'image/jpeg'; // Default fallback
}

/**
 * Procesa una imagen con múltiples clases UML y sus relaciones
 * @param {File|Blob} imageFile - Archivo de imagen que contiene múltiples clases UML
 * @returns {Promise<Object>} - Objeto con las clases y relaciones extraídas
 */
export async function processMultipleUMLClassesImage(imageFile) {
  try {
    // Convertir imagen a base64
    const base64Image = await fileToBase64(imageFile);
    const mimeType = getImageMimeType(imageFile);

    // Prompt OPTIMIZADO para escaneo 100% preciso del diagrama
    const prompt = `
INSTRUCCIÓN CRÍTICA: Debes extraer EXACTAMENTE lo que ves en el diagrama UML de esta imagen.
NO modifiques, NO interpretes, NO inventes nada. Tu trabajo es COPIAR con precisión lo que ves.

RESPUESTA REQUERIDA - JSON con esta estructura EXACTA:
{
  "classes": [
    {
      "className": "NOMBRE_EXACTO_COMO_APARECE_EN_LA_IMAGEN",
      "position": {
        "x": número_0_a_100_posición_horizontal,
        "y": número_0_a_100_posición_vertical
      },
      "attributes": [
        {
          "name": "NOMBRE_EXACTO_DEL_ATRIBUTO",
          "type": "TIPO_EXACTO_COMO_APARECE",
          "visibility": "public|private|protected|package"
        }
      ],
      "methods": [
        {
          "name": "NOMBRE_EXACTO_DEL_METODO",
          "returnType": "TIPO_RETORNO_EXACTO",
          "parameters": [
            {"name": "NOMBRE_PARAM", "type": "TIPO_PARAM"}
          ],
          "visibility": "public|private|protected|package"
        }
      ]
    }
  ],
  "relations": [
    {
      "from": "CLASE_ORIGEN_EXACTA",
      "to": "CLASE_DESTINO_EXACTA",
      "type": "association|aggregation|composition|inheritance|dependency",
      "multiplicityFrom": "MULTIPLICIDAD_EXACTA_ORIGEN",
      "multiplicityTo": "MULTIPLICIDAD_EXACTA_DESTINO",
      "label": "TEXTO_DE_LA_LINEA_SI_EXISTE",
      "sourcePosition": "left|right|top|bottom",
      "targetPosition": "left|right|top|bottom",
      "requiresJoinTable": boolean
    }
  ]
}

═══════════════════════════════════════════════════════════════════════
REGLAS DE EXTRACCIÓN - COPIA EXACTA
═══════════════════════════════════════════════════════════════════════

📋 CLASES - EXTRACCIÓN LITERAL:
1. NOMBRE: Copia el texto EXACTO del título de cada caja/rectángulo
2. POSICIÓN: Mide la posición relativa en la imagen:
   - x=0 significa pegado al borde izquierdo
   - x=50 significa en el centro horizontal
   - x=100 significa pegado al borde derecho
   - y=0 significa pegado al borde superior
   - y=50 significa en el centro vertical
   - y=100 significa pegado al borde inferior
3. ATRIBUTOS: Copia CADA línea que veas en la sección de atributos
   - Copia el nombre EXACTO como aparece (no cambies mayúsculas/minúsculas)
   - Copia el tipo EXACTO como aparece (String, int, Integer, Long, etc.)
   - Si ves "+" es public, "-" es private, "#" es protected, "~" es package
   - Si no hay símbolo, asume "private"
4. MÉTODOS: Copia CADA método que veas en la sección de métodos
   - Incluye paréntesis y parámetros EXACTAMENTE como aparecen

🔗 RELACIONES - IDENTIFICACIÓN PRECISA:
1. MIRA CADA LÍNEA que conecta dos clases
2. IDENTIFICA EL TIPO por el símbolo en los extremos:
   - Línea simple → "association"
   - Rombo VACÍO (◇) → "aggregation"
   - Rombo LLENO (◆) → "composition"
   - Triángulo vacío (△) / flecha grande → "inheritance"
   - Línea PUNTEADA (- - -) → "dependency"
3. DETECTA MULTIPLICIDADES - busca números/texto cerca de CADA extremo:
   - "1" = exactamente uno
   - "*" = muchos
   - "0..1" = cero o uno
   - "1..*" = uno o más
   - "0..*" = cero o más
   - "n" = muchos (trátalo como "*")
   - Si NO ves multiplicidad, usa "1"
4. POSICIÓN DE CONEXIÓN - indica DÓNDE la línea toca cada clase:
   - "left" = la línea entra por el lado izquierdo de la clase
   - "right" = la línea entra por el lado derecho
   - "top" = la línea entra por arriba
   - "bottom" = la línea entra por abajo
5. DIRECCIÓN:
   - Si hay flecha (→): from=origen, to=destino (donde apunta la flecha)
   - Si hay rombo (◇ o ◆): el rombo está en el lado "contenedor" (from)
   - Si hay triángulo: from=clase hija, to=clase padre
   - Si no hay símbolos: from=la clase de la izquierda/arriba

🔷 CLASE DE ASOCIACIÓN (N-M) - DETECCIÓN ESPECIAL:
1. Si ves una línea SÓLIDA entre dos clases Y una línea PUNTEADA que sale del CENTRO de esa línea hacia una tercera clase:
   - Esto es una CLASE DE ASOCIACIÓN (relación muchos-a-muchos)
   - Identifica las DOS clases conectadas por la línea sólida
   - Identifica la TERCERA clase conectada por la línea punteada (tabla intermedia)
   - Crea UNA relación con:
     - from = primera clase de la línea sólida
     - to = segunda clase de la línea sólida  
     - type = "association"
     - multiplicityFrom = "0..*"
     - multiplicityTo = "0..*"
     - requiresJoinTable = true
     - suggestedJoinTableName = nombre de la tercera clase (la conectada con línea punteada)

⚠️ ERRORES A EVITAR:
- NO cambies los nombres (si dice "Usuario" no lo cambies a "User")
- NO cambies los tipos (si dice "int" no lo cambies a "Integer")
- NO omitas atributos o métodos
- NO inventes relaciones que no existen
- NO asumas multiplicidades que no ves
- CUENTA todas las clases y verifica que las incluiste todas
- CUENTA todas las líneas y verifica que las incluiste todas

📊 VERIFICACIÓN FINAL:
- ¿Incluiste TODAS las cajas/rectángulos como clases?
- ¿Copiaste TODOS los atributos de CADA clase?
- ¿Identificaste TODAS las líneas entre clases?
- ¿Las posiciones x,y reflejan dónde está cada clase en la imagen?

IMPORTANTE: Devuelve SOLO el JSON válido, sin texto adicional ni markdown.
`;

    // Llamar a la API centralizada de Gemini Vision
    const rawText = await callGeminiVision(prompt, base64Image, mimeType, {
      maxOutputTokens: 8000,
      temperature: 0.1,
      topP: 0.8,
      topK: 32,
      responseMimeType: "application/json"
    });

    // Parsear el JSON de respuesta
    let diagramInfo;
    try {
      diagramInfo = JSON.parse(rawText);
    } catch {
      // Intentar limpiar la respuesta si tiene formato markdown o texto extra
      const cleanedText = rawText.replace(/```json|```/g, "").trim();
      try {
        diagramInfo = JSON.parse(cleanedText);
      } catch {
        console.error("Error parsing Gemini response:", rawText);
        throw new Error("No se pudo interpretar la respuesta de la IA. La imagen podría no contener clases UML válidas.");
      }
    }

    // Validar estructura básica
    if (!Array.isArray(diagramInfo.classes) || diagramInfo.classes.length === 0) {
      throw new Error("No se pudieron identificar clases en la imagen");
    }

    // Asegurar que arrays existan
    if (!Array.isArray(diagramInfo.relations)) {
      diagramInfo.relations = [];
    }

    // Validar cada clase
    diagramInfo.classes.forEach((cls, index) => {
      if (!cls.className) {
        throw new Error(`La clase en posición ${index + 1} no tiene nombre`);
      }
      if (!Array.isArray(cls.attributes)) {
        cls.attributes = [];
      }
      if (!Array.isArray(cls.methods)) {
        cls.methods = [];
      }
    });

    return diagramInfo;

  } catch (error) {
    console.error("Error procesando diagrama UML completo:", error);
    throw error;
  }
}

/**
 * Procesa una imagen de clase UML usando Gemini Vision API
 * @param {File|Blob} imageFile - Archivo de imagen que contiene una clase UML
 * @returns {Promise<Object>} - Objeto con la información de la clase extraída
 */
export async function processUMLClassImage(imageFile) {
  try {
    // Convertir imagen a base64
    const base64Image = await fileToBase64(imageFile);
    const mimeType = getImageMimeType(imageFile);

    // Prompt específico para extraer información de clases UML
    const prompt = `
Analiza esta imagen que contiene un diagrama de clase UML y extrae la información de la clase mostrada.

Por favor, devuelve un JSON con la siguiente estructura exacta:
{
  "className": "NombreDeLaClase",
  "attributes": [
    {
      "name": "nombreAtributo",
      "type": "TipoDelAtributo",
      "visibility": "public|private|protected|package"
    }
  ],
  "methods": [
    {
      "name": "nombreMetodo",
      "returnType": "TipoDeRetorno",
      "parameters": [
        {
          "name": "nombreParametro",
          "type": "TipoParametro"
        }
      ],
      "visibility": "public|private|protected|package"
    }
  ]
}

Instrucciones específicas:
1. Si no puedes determinar la visibilidad, usa "public" por defecto
2. Para los tipos de datos, mapea a tipos de Java estándar (String, Integer, Boolean, Double, Date, etc.)
3. Si ves símbolos UML de visibilidad: + = public, - = private, # = protected, ~ = package
4. Si hay métodos getters/setters, inclúyelos también
5. Si no hay métodos visibles, deja el array "methods" vacío
6. Si no hay atributos visibles, deja el array "attributes" vacío
7. El nombre de la clase debe estar en PascalCase
8. Los nombres de atributos y métodos deben estar en camelCase

IMPORTANTE: Devuelve SOLO el JSON válido, sin texto adicional ni formato markdown.
`;

    // Llamar a la API centralizada de Gemini Vision
    const rawText = await callGeminiVision(prompt, base64Image, mimeType, {
      maxOutputTokens: 4000,
      temperature: 0.1,
      topP: 0.8,
      topK: 32,
      responseMimeType: "application/json"
    });

    // Parsear el JSON de respuesta
    let classInfo;
    try {
      classInfo = JSON.parse(rawText);
    } catch {
      // Intentar limpiar la respuesta si tiene formato markdown o texto extra
      const cleanedText = rawText.replace(/```json|```/g, "").trim();
      try {
        classInfo = JSON.parse(cleanedText);
      } catch {
        console.error("Error parsing Gemini response:", rawText);
        throw new Error("No se pudo interpretar la respuesta de la IA. La imagen podría no contener una clase UML válida.");
      }
    }

    // Validar estructura básica
    if (!classInfo.className) {
      throw new Error("No se pudo identificar el nombre de la clase en la imagen");
    }

    // Asegurar que arrays existan
    if (!Array.isArray(classInfo.attributes)) {
      classInfo.attributes = [];
    }
    if (!Array.isArray(classInfo.methods)) {
      classInfo.methods = [];
    }

    return classInfo;

  } catch (error) {
    console.error("Error procesando imagen UML:", error);
    throw error;
  }
}

/**
 * Convierte la información de la clase extraída a formato compatible con el diagramador
 * @param {Object} classInfo - Información de la clase extraída por Gemini
 * @returns {Object} - Objeto en formato compatible con el diagramador
 */
export function convertTodiagramFormat(classInfo) {
  // Combinar atributos y métodos en un solo array de "attrs" como usa el diagramador
  const attrs = [];

  // Agregar ID por defecto si no existe
  const hasId = classInfo.attributes.some(attr =>
    attr.name.toLowerCase() === 'id'
  );

  if (!hasId) {
    attrs.push({
      name: "id",
      type: "Integer"
    });
  }

  // Convertir atributos
  classInfo.attributes.forEach(attr => {
    attrs.push({
      name: attr.name,
      type: attr.type || "String"
    });
  });

  // Convertir métodos (opcional, algunos diagramadores solo muestran atributos)
  classInfo.methods.forEach(method => {
    const paramStr = method.parameters
      ? method.parameters.map(p => `${p.name}: ${p.type}`).join(", ")
      : "";

    attrs.push({
      name: `${method.name}(${paramStr})`,
      type: method.returnType || "void",
      isMethod: true
    });
  });

  return {
    label: classInfo.className,
    attrs: attrs
  };
}

/**
 * Determina el mejor handle para conectar dos nodos basándose en sus posiciones
 * MEJORADO: Evita usar el mismo handle para múltiples relaciones excepto cuando todos están ocupados
 * @param {Object} sourcePos - Posición del nodo origen {x, y}
 * @param {Object} targetPos - Posición del nodo destino {x, y}
 * @param {boolean} isSource - true si es el handle de origen, false si es de destino
 * @param {Set} usedHandles - Set de handles ya ocupados para este nodo
 * @returns {string} - ID del handle óptimo
 */
function getBestHandleForConnection(sourcePos, targetPos, isSource, usedHandles = new Set()) {
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;

  // Calcular ángulo de la conexión
  const angle = Math.atan2(dy, dx) * 180 / Math.PI; // -180 a 180

  // Normalizar ángulo a 0-360
  const normalizedAngle = angle < 0 ? angle + 360 : angle;

  // Handles disponibles según la dirección (ordenados por prioridad de uso)
  // Se distribuyen los handles para evitar cruces
  // Handles fuente (sin sufijo -t)
  const sourceHandles = {
    right: ['r1', 'r2', 'tr', 'br'],     // 0° ± 45° (derecha)
    bottom: ['b1', 'b2', 'b3', 'b4', 'br', 'bl'],    // 90° ± 45° (abajo)
    left: ['l1', 'l2', 'tl', 'bl'],      // 180° ± 45° (izquierda)
    top: ['t1', 't2', 't3', 't4', 'tl', 'tr'],       // 270° ± 45° (arriba)
  };

  // Handles destino (con sufijo -t)
  const targetHandles = {
    right: ['r1-t', 'r2-t', 'tr-t', 'br-t'],
    bottom: ['b1-t', 'b2-t', 'b3-t', 'b4-t', 'br-t', 'bl-t'],
    left: ['l1-t', 'l2-t', 'tl-t', 'bl-t'],
    top: ['t1-t', 't2-t', 't3-t', 't4-t', 'tl-t', 'tr-t'],
  };

  const handles = isSource ? sourceHandles : targetHandles;

  // Seleccionar handles primarios y secundarios basados en el ángulo
  let primaryHandles, secondaryHandles;

  // Determinar dirección principal basándose en el ángulo
  // Usamos márgenes más amplios para mejor distribución
  if (normalizedAngle >= 315 || normalizedAngle < 45) {
    // Hacia la derecha (0°)
    primaryHandles = handles.right;
    secondaryHandles = normalizedAngle >= 315 ? handles.top : handles.bottom;
  } else if (normalizedAngle >= 45 && normalizedAngle < 135) {
    // Hacia abajo (90°)
    primaryHandles = handles.bottom;
    secondaryHandles = normalizedAngle < 90 ? handles.right : handles.left;
  } else if (normalizedAngle >= 135 && normalizedAngle < 225) {
    // Hacia la izquierda (180°)
    primaryHandles = handles.left;
    secondaryHandles = normalizedAngle < 180 ? handles.bottom : handles.top;
  } else {
    // Hacia arriba (270°)
    primaryHandles = handles.top;
    secondaryHandles = normalizedAngle < 270 ? handles.left : handles.right;
  }

  // PASO 1: Buscar handle libre en la dirección primaria
  for (const handle of primaryHandles) {
    if (!usedHandles.has(handle)) {
      return handle;
    }
  }

  // PASO 2: Si todos los primarios están ocupados, buscar en secundarios
  for (const handle of secondaryHandles) {
    if (!usedHandles.has(handle)) {
      return handle;
    }
  }

  // PASO 3: Buscar en cualquier dirección que tenga un handle libre
  const allDirections = ['right', 'bottom', 'left', 'top'];
  for (const direction of allDirections) {
    for (const handle of handles[direction]) {
      if (!usedHandles.has(handle)) {
        return handle;
      }
    }
  }

  // PASO 4: Si todos están ocupados, permitir reutilización del primario (múltiples relaciones)
  // pero intentar distribuir entre los disponibles
  const allPrimaryHandles = primaryHandles.length;
  const usedPrimaryCount = primaryHandles.filter(h => usedHandles.has(h)).length;

  // Elegir el handle con menos usos (circular entre los disponibles)
  return primaryHandles[usedPrimaryCount % allPrimaryHandles];
}

/**
 * Convierte una posición de conexión (left, right, top, bottom) a un handle del diagramador
 * @param {string} position - Posición: "left", "right", "top", "bottom"
 * @param {boolean} isSource - true si es handle de origen, false si es destino
 * @param {Set} usedHandles - Set de handles ya ocupados para este nodo
 * @returns {string} - ID del handle correspondiente
 */
function getHandleFromPosition(position, isSource, usedHandles = new Set()) {
  // Mapeo de posiciones a handles disponibles
  const handleMap = {
    source: {
      left: ['l1', 'l2', 'tl', 'bl'],
      right: ['r1', 'r2', 'tr', 'br'],
      top: ['t1', 't2', 't3', 't4', 'tl', 'tr'],
      bottom: ['b1', 'b2', 'b3', 'b4', 'bl', 'br']
    },
    target: {
      left: ['l1-t', 'l2-t', 'tl-t', 'bl-t'],
      right: ['r1-t', 'r2-t', 'tr-t', 'br-t'],
      top: ['t1-t', 't2-t', 't3-t', 't4-t', 'tl-t', 'tr-t'],
      bottom: ['b1-t', 'b2-t', 'b3-t', 'b4-t', 'bl-t', 'br-t']
    }
  };

  const handles = isSource ? handleMap.source : handleMap.target;
  const pos = position?.toLowerCase() || 'right';
  const positionHandles = handles[pos] || handles.right;

  // Buscar el primer handle libre
  for (const handle of positionHandles) {
    if (!usedHandles.has(handle)) {
      return handle;
    }
  }

  // Si todos están ocupados, usar el primero
  return positionHandles[0];
}

/**
 * Convierte múltiples clases y relaciones al formato del diagramador
 * @param {Object} diagramInfo - Información del diagrama extraída por Gemini
 * @param {Object} canvasSize - Tamaño del canvas disponible {width, height}
 * @returns {Object} - Objeto con nodos y aristas para el diagramador
 */
export function convertMultipleClassesToDiagramFormat(diagramInfo, canvasSize = { width: 1200, height: 800 }) {
  const nodes = [];
  const edges = [];
  const classNameToId = {};

  // Registro de handles ocupados por nodo: { nodeId: { source: Set, target: Set } }
  const handleUsage = {};

  // Convertir clases a nodos
  diagramInfo.classes.forEach((classInfo, index) => {
    const nodeId = `node-${Date.now()}-${index}`;
    classNameToId[classInfo.className] = nodeId;

    // Inicializar registro de handles para este nodo
    handleUsage[nodeId] = {
      source: new Set(),
      target: new Set()
    };

    // Calcular posición real basada en la posición relativa detectada
    let position = { x: 100, y: 100 };

    if (classInfo.position) {
      // Convertir posición relativa (0-100) a coordenadas absolutas
      const relX = parseFloat(classInfo.position.x) || 50;
      const relY = parseFloat(classInfo.position.y) || 50;

      // Mapear a coordenadas del canvas con márgenes
      const marginX = 100;
      const marginY = 100;
      const usableWidth = canvasSize.width - (marginX * 2);
      const usableHeight = canvasSize.height - (marginY * 2);

      position = {
        x: marginX + (relX / 100) * usableWidth,
        y: marginY + (relY / 100) * usableHeight
      };
    } else {
      // Fallback: posicionar en cuadrícula
      const cols = Math.ceil(Math.sqrt(diagramInfo.classes.length));
      const row = Math.floor(index / cols);
      const col = index % cols;
      position = {
        x: 100 + col * 350,
        y: 100 + row * 250
      };
    }

    // Combinar atributos y métodos
    const attrs = [];

    // Agregar ID por defecto si no existe
    const hasId = classInfo.attributes.some(attr =>
      attr.name.toLowerCase() === 'id'
    );

    if (!hasId) {
      attrs.push({
        name: "id",
        type: "Integer"
      });
    }

    // Convertir atributos
    classInfo.attributes.forEach(attr => {
      attrs.push({
        name: attr.name,
        type: attr.type || "String"
      });
    });

    // Convertir métodos (opcional)
    classInfo.methods?.forEach(method => {
      const paramStr = method.parameters
        ? method.parameters.map(p => `${p.name}: ${p.type}`).join(", ")
        : "";

      attrs.push({
        name: `${method.name}(${paramStr})`,
        type: method.returnType || "void",
        isMethod: true
      });
    });

    nodes.push({
      id: nodeId,
      label: classInfo.className,
      attrs: attrs,
      position: position
    });
  });

  // Convertir relaciones a aristas
  console.log("Procesando relaciones:", diagramInfo.relations?.length || 0);

  diagramInfo.relations?.forEach((relation, index) => {
    console.log(`Relación ${index + 1}:`, {
      from: relation.from,
      to: relation.to,
      type: relation.type,
      multiplicityFrom: relation.multiplicityFrom,
      multiplicityTo: relation.multiplicityTo,
      label: relation.label
    });

    const sourceId = classNameToId[relation.from];
    const targetId = classNameToId[relation.to];

    if (!sourceId || !targetId) {
      console.warn(`Relación ignorada: no se encontró la clase ${relation.from} o ${relation.to}`);
      return;
    }

    // Obtener nodos para calcular handles
    const sourceNode = nodes.find(n => n.id === sourceId);
    const targetNode = nodes.find(n => n.id === targetId);

    if (!sourceNode || !targetNode) {
      console.warn(`No se encontraron nodos para la relación ${relation.from} -> ${relation.to}`);
      return;
    }

    // Calcular handles basados en las posiciones de conexión detectadas por la IA
    // Si la IA detectó sourcePosition/targetPosition, usarlos directamente
    let sourceHandle, targetHandle;

    if (relation.sourcePosition) {
      // Usar la posición detectada por la IA
      sourceHandle = getHandleFromPosition(relation.sourcePosition, true, handleUsage[sourceId]?.source);
    } else {
      // Fallback: calcular basado en posiciones de nodos
      sourceHandle = getBestHandleForConnection(
        sourceNode.position,
        targetNode.position,
        true,
        handleUsage[sourceId]?.source
      );
    }

    if (relation.targetPosition) {
      // Usar la posición detectada por la IA
      targetHandle = getHandleFromPosition(relation.targetPosition, false, handleUsage[targetId]?.target);
    } else {
      // Fallback: calcular basado en posiciones de nodos
      targetHandle = getBestHandleForConnection(
        sourceNode.position,
        targetNode.position,
        false,
        handleUsage[targetId]?.target
      );
    }

    // Marcar handles como ocupados
    handleUsage[sourceId]?.source.add(sourceHandle);
    handleUsage[targetId]?.target.add(targetHandle);

    // Mapear tipo de relación a formato del diagramador
    let relKind = "ASSOC";
    let relType = "1-1";
    let direction = "NONE";
    let owning = "A"; // Lado dueño (para AGGR y COMP)

    switch (relation.type?.toLowerCase()) {
      case "inheritance":
        relKind = "INHERIT";
        direction = "A->B"; // La flecha apunta de hijo a padre
        break;
      case "composition":
        relKind = "COMP";
        direction = "NONE";
        owning = "A"; // El rombo está en el lado contenedor
        break;
      case "aggregation":
        relKind = "AGGR";
        direction = "NONE";
        owning = "A"; // El rombo está en el lado contenedor
        break;
      case "dependency":
        relKind = "DEPEND";
        direction = "A->B";
        break;
      default:
        relKind = "ASSOC";
        direction = "NONE"; // Asociación sin flechas
    }

    // Normalizar multiplicidades
    const normalizeMult = (mult) => {
      if (!mult) return "1";
      const m = String(mult).toLowerCase().trim();
      if (m === "0..*" || m === "*") return "*";
      if (m === "1..*") return "1..*";
      if (m === "0..1") return "0..1";
      return "1";
    };

    const mFrom = normalizeMult(relation.multiplicityFrom);
    const mTo = normalizeMult(relation.multiplicityTo);

    // Determinar tipo de relación basado en multiplicidades
    const isMany = (m) => m === "*" || m.includes("*");
    const isOne = (m) => m === "1" || m === "0..1";

    if (isMany(mFrom) && isMany(mTo)) {
      // Relación N-M: requiere tabla intermedia
      relType = "N-M";

      // Verificar si la IA detectó que necesita tabla intermedia
      if (relation.requiresJoinTable !== false) {
        // PRIMERO: Buscar si ya existe una tabla intermedia en las clases escaneadas
        // Puede ser: "A_B", "B_A", "AB", "BA" o el nombre sugerido por la IA
        const possibleJoinNames = [
          relation.suggestedJoinTableName,
          `${relation.from}_${relation.to}`,
          `${relation.to}_${relation.from}`,
          `${relation.from}${relation.to}`,
          `${relation.to}${relation.from}`,
        ].filter(Boolean).map(n => n.toLowerCase());

        // Buscar en los nodos existentes
        let existingJoinNode = null;
        let existingJoinNodeId = null;

        for (const node of nodes) {
          const nodeLabelLower = (node.label || "").toLowerCase().replace(/[_\s]/g, "");
          for (const possibleName of possibleJoinNames) {
            const cleanPossibleName = possibleName.replace(/[_\s]/g, "");
            if (nodeLabelLower === cleanPossibleName || nodeLabelLower.includes(cleanPossibleName)) {
              existingJoinNode = node;
              existingJoinNodeId = node.id;
              console.log(`[imageProcessor] Tabla intermedia existente encontrada: ${node.label}`);
              break;
            }
          }
          if (existingJoinNode) break;
        }

        let joinNodeId, joinPosition;

        if (existingJoinNode) {
          // Usar la tabla intermedia existente
          joinNodeId = existingJoinNodeId;
          joinPosition = existingJoinNode.position;
          console.log(`[imageProcessor] Usando tabla intermedia existente: ${existingJoinNode.label}`);
        } else {
          // Crear nueva tabla intermedia solo si no existe
          const joinTableName = relation.suggestedJoinTableName ||
            `${relation.from}_${relation.to}`;
          joinNodeId = `node-join-${Date.now()}-${index}`;

          classNameToId[joinTableName] = joinNodeId;

          // Calcular posición de la tabla intermedia (punto medio entre las dos clases)
          const sourceNode = nodes.find(n => classNameToId[relation.from] === n.id);
          const targetNode = nodes.find(n => classNameToId[relation.to] === n.id);

          joinPosition = { x: 300, y: 300 };
          if (sourceNode?.position && targetNode?.position) {
            joinPosition = {
              x: (sourceNode.position.x + targetNode.position.x) / 2,
              y: (sourceNode.position.y + targetNode.position.y) / 2 + 150 // Offset hacia abajo
            };
          }

          // Crear nodo para tabla intermedia
          nodes.push({
            id: joinNodeId,
            label: joinTableName,
            attrs: [
              { name: "id", type: "Integer" },
              { name: `${relation.from.toLowerCase()}Id`, type: "Integer" },
              { name: `${relation.to.toLowerCase()}Id`, type: "Integer" }
            ],
            position: joinPosition,
            isJoinTable: true
          });

          // Inicializar registro de handles para la tabla intermedia (solo si es nueva)
          handleUsage[joinNodeId] = handleUsage[joinNodeId] || {
            source: new Set(),
            target: new Set()
          };
        }  // FIN del else (crear tabla nueva)

        // Crear UN SOLO edge nmAssoc (funciona tanto si la tabla existe como si se creó)
        edges.push({
          id: `edge-nm-${Date.now()}-${index}`,
          source: sourceId,
          target: targetId,
          sourceHandle: sourceHandle,
          targetHandle: targetHandle,
          type: "nmAssoc",  // Tipo especial que dibuja línea + punteada al centro
          label: relation.label || "",
          data: {
            mA: "0..*",
            mB: "0..*",
            relKind: "NM_ASSOC",
            relType: "N-M",
            joinTableId: joinNodeId,
            joinTablePosition: joinPosition,
            verb: relation.label || ""
          }
        });

        // No creamos edges adicionales, el nmAssoc dibuja todo
        return;
      }
    } else if (isMany(mFrom) && isOne(mTo)) {
      relType = "N-1";
    } else if (isOne(mFrom) && isMany(mTo)) {
      relType = "1-N";
    } else {
      relType = "1-1";
    }

    // Crear la relación
    edges.push({
      id: `edge-${Date.now()}-${index}`,
      source: sourceId,
      target: targetId,
      sourceHandle: sourceHandle,
      targetHandle: targetHandle,
      type: "uml",
      label: relation.label || "",
      data: {
        mA: mFrom,
        mB: mTo,
        relKind: relKind,
        relType: relType,
        direction: direction,
        owning: owning,
        verb: relation.label || ""
      }
    });
  });

  return {
    nodes,
    edges
  };
}

/**
 * Función principal para procesar diagrama completo con múltiples clases
 * @param {File|Blob} imageFile - Archivo de imagen
 * @param {Function} onSuccess - Callback con la información procesada
 * @param {Function} onError - Callback de error
 */
export async function processImageAndCreateDiagram(imageFile, onSuccess, onError) {
  try {
    console.log("Procesando diagrama UML completo...");

    // Procesar imagen con Gemini Vision
    const diagramInfo = await processMultipleUMLClassesImage(imageFile);

    console.log("Información extraída:", diagramInfo);

    // Convertir a formato del diagramador
    const diagramData = convertMultipleClassesToDiagramFormat(diagramInfo);

    console.log("Datos del diagrama:", diagramData);

    // Llamar al callback de éxito
    if (onSuccess) {
      onSuccess({
        originalDiagramInfo: diagramInfo,
        diagramData: diagramData
      });
    }

    return {
      originalDiagramInfo: diagramInfo,
      diagramData: diagramData
    };

  } catch (error) {
    console.error("Error procesando diagrama completo:", error);

    // Llamar al callback de error
    if (onError) {
      onError(error);
    }

    throw error;
  }
}

/**
 * Función principal para procesar imagen y crear entidad en el diagrama
 * @param {File|Blob} imageFile - Archivo de imagen
 * @param {Function} onSuccess - Callback con la información procesada
 * @param {Function} onError - Callback de error
 */
export async function processImageAndCreateEntity(imageFile, onSuccess, onError) {
  try {
    console.log("Procesando imagen UML...");

    // Procesar imagen con Gemini Vision
    const classInfo = await processUMLClassImage(imageFile);

    console.log("Información extraída:", classInfo);

    // Convertir a formato del diagramador
    const entityData = convertTodiagramFormat(classInfo);

    console.log("Datos de entidad:", entityData);

    // Llamar al callback de éxito
    if (onSuccess) {
      onSuccess({
        originalClassInfo: classInfo,
        entityData: entityData
      });
    }

    return {
      originalClassInfo: classInfo,
      entityData: entityData
    };

  } catch (error) {
    console.error("Error procesando imagen:", error);

    // Llamar al callback de error
    if (onError) {
      onError(error);
    }

    throw error;
  }
}