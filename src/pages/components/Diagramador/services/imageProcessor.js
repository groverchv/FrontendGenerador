// src/pages/components/Diagramador/services/imageProcessor.js
// Servicio para procesar imágenes de clases UML usando Gemini Vision API

// Obtener las funciones de configuración de Gemini desde apiGemine.js
let RUNTIME_API_KEY = "";
let RUNTIME_MODEL = "";

function getApiKey() {
  return (
    RUNTIME_API_KEY ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_API_KEY) ||
    (typeof window !== "undefined" && window.GEMINI_API_KEY) ||
    "AIzaSyDRGJ3UXInnuy1Yu3OEw5Y6uMqeBMWLl3M" // fallback key
  );
}

function getModel() {
  return (
    RUNTIME_MODEL ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_MODEL) ||
    "gemini-2.0-flash"
  );
}

export function setGeminiApiKey(k) { RUNTIME_API_KEY = (k || "").trim(); }
export function setGeminiModel(m)  { RUNTIME_MODEL  = (m || "").trim(); }

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
  const API_KEY = getApiKey();
  const model = getModel();
  
  if (!API_KEY) {
    throw new Error("Falta la API key de Gemini para procesar la imagen.");
  }

  try {
    // Convertir imagen a base64
    const base64Image = await fileToBase64(imageFile);
    const mimeType = getImageMimeType(imageFile);

    // Prompt específico para extraer múltiples clases y relaciones
    const prompt = `
Analiza esta imagen que contiene un diagrama UML con múltiples clases y sus relaciones.

Por favor, devuelve un JSON con la siguiente estructura exacta:
{
  "classes": [
    {
      "className": "NombreDeLaClase",
      "position": {
        "x": "posición horizontal relativa (0-100, donde 0 es izquierda y 100 es derecha)",
        "y": "posición vertical relativa (0-100, donde 0 es arriba y 100 es abajo)"
      },
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
  ],
  "relations": [
    {
      "from": "ClaseOrigen",
      "to": "ClaseDestino",
      "type": "association|aggregation|composition|inheritance|dependency",
      "multiplicityFrom": "1|*|0..1|1..*|0..*",
      "multiplicityTo": "1|*|0..1|1..*|0..*",
      "label": "nombre de la relación (opcional)",
      "requiresJoinTable": false,
      "suggestedJoinTableName": "NombreTablaIntermedia (solo si requiresJoinTable=true)"
    }
  ]
}

Instrucciones específicas:
1. Identifica TODAS las clases en el diagrama
2. Para cada clase, DETERMINA SU POSICIÓN RELATIVA en la imagen:
   - Si la clase está en la parte izquierda de la imagen, x debe ser cercano a 0-30
   - Si está en el centro, x debe ser cercano a 40-60
   - Si está en la derecha, x debe ser cercano a 70-100
   - Si está arriba, y debe ser cercano a 0-30
   - Si está en el medio verticalmente, y debe ser 40-60
   - Si está abajo, y debe ser 70-100
3. Para cada clase, extrae el nombre, atributos y métodos
4. Si no puedes determinar la visibilidad, usa "public" por defecto
5. Para los tipos de datos, mapea a tipos de Java estándar (String, Integer, Boolean, Double, Date, BigDecimal, etc.)
6. Símbolos UML de visibilidad: + = public, - = private, # = protected, ~ = package
7. Si hay métodos getters/setters, inclúyelos también
8. Si no hay métodos visibles, deja el array "methods" vacío
9. Si no hay atributos visibles, deja el array "attributes" vacío
10. Los nombres deben estar en formato apropiado (PascalCase para clases, camelCase para atributos/métodos)

Para las relaciones:
1. Identifica todas las líneas que conectan las clases
2. Tipos de relación (IMPORTANTE - identifica correctamente):
   - "association": línea simple (puede tener flecha simple en un extremo o ninguna)
   - "aggregation": línea con rombo VACÍO/BLANCO en un extremo (representa "tiene un")
   - "composition": línea con rombo LLENO/NEGRO en un extremo (representa "es parte de")
   - "inheritance": línea con triángulo VACÍO/flecha grande en un extremo (representa "es un" / herencia)
   - "dependency": línea PUNTEADA/DISCONTINUA con flecha (representa dependencia débil)
3. Detecta las multiplicidades en AMBOS extremos:
   - "1": uno exactamente
   - "*": muchos (cero o más)
   - "0..1": opcional (cero o uno)
   - "1..*": uno o más
   - "0..*": cero o más (equivalente a *)
   - Si no hay multiplicidad visible, usa "1" por defecto
4. Para relaciones N-M (muchos a muchos):
   - Si AMBOS extremos tienen "*" o "0..*" o "1..*", es una relación N-M
   - Marca estas relaciones especialmente para crear tabla intermedia
5. Captura el texto de la etiqueta de la relación si existe
6. Identifica la dirección:
   - Si la flecha apunta de A hacia B: from=A, to=B
   - Si es un rombo en A conectado a B: from=A, to=B (el rombo está en el lado "contenedor")
   - Si es herencia, el triángulo apunta a la clase padre: from=ClaseHija, to=ClasePadre

CRÍTICO para relaciones N-M:
- Si detectas "*" en ambos lados, agrega un campo adicional: "requiresJoinTable": true
- Sugiere un nombre para la tabla intermedia en "suggestedJoinTableName"

IMPORTANTE: Devuelve SOLO el JSON válido, sin texto adicional ni formato markdown.
`;

    // Llamada a Gemini Vision API
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(API_KEY)}`;
    
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt
            },
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
        temperature: 0.1,
        topP: 0.8,
        topK: 32,
        maxOutputTokens: 8000,
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Error de Gemini API ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.map(p => p?.text ?? "").join("\n") ?? "";

    if (!rawText) {
      throw new Error("No se recibió respuesta válida de Gemini Vision API");
    }

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
  const API_KEY = getApiKey();
  const model = getModel();
  
  if (!API_KEY) {
    throw new Error("Falta la API key de Gemini para procesar la imagen.");
  }

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

    // Llamada a Gemini Vision API
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(API_KEY)}`;
    
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt
            },
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
        temperature: 0.1,
        topP: 0.8,
        topK: 32,
        maxOutputTokens: 4000,
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Error de Gemini API ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.map(p => p?.text ?? "").join("\n") ?? "";

    if (!rawText) {
      throw new Error("No se recibió respuesta válida de Gemini Vision API");
    }

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
 * Convierte múltiples clases y relaciones al formato del diagramador
 * @param {Object} diagramInfo - Información del diagrama extraída por Gemini
 * @param {Object} canvasSize - Tamaño del canvas disponible {width, height}
 * @returns {Object} - Objeto con nodos y aristas para el diagramador
 */
export function convertMultipleClassesToDiagramFormat(diagramInfo, canvasSize = { width: 1200, height: 800 }) {
  const nodes = [];
  const edges = [];
  const classNameToId = {};

  // Convertir clases a nodos
  diagramInfo.classes.forEach((classInfo, index) => {
    const nodeId = `node-${Date.now()}-${index}`;
    classNameToId[classInfo.className] = nodeId;

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
  diagramInfo.relations?.forEach((relation, index) => {
    const sourceId = classNameToId[relation.from];
    const targetId = classNameToId[relation.to];

    if (!sourceId || !targetId) {
      console.warn(`Relación ignorada: no se encontró la clase ${relation.from} o ${relation.to}`);
      return;
    }

    // Mapear tipo de relación a formato del diagramador
    let relKind = "ASSOC";
    let relType = "1-1";
    let direction = "NONE";

    switch (relation.type?.toLowerCase()) {
      case "inheritance":
        relKind = "INHERIT";
        direction = "a->b"; // La flecha apunta de hijo a padre
        break;
      case "composition":
        relKind = "COMP";
        break;
      case "aggregation":
        relKind = "AGGR";
        break;
      case "dependency":
        relKind = "DEPEND";
        direction = "a->b";
        break;
      default:
        relKind = "ASSOC";
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
        // Crear tabla intermedia
        const joinTableName = relation.suggestedJoinTableName || 
                             `${relation.from}_${relation.to}`;
        const joinNodeId = `node-join-${Date.now()}-${index}`;
        
        classNameToId[joinTableName] = joinNodeId;

        // Calcular posición de la tabla intermedia (punto medio entre las dos clases)
        const sourceNode = nodes.find(n => classNameToId[relation.from] === n.id);
        const targetNode = nodes.find(n => classNameToId[relation.to] === n.id);
        
        let joinPosition = { x: 300, y: 300 };
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

        // Crear dos relaciones 1-N en lugar de una N-M
        // Relación 1: from -> joinTable (1 a N)
        edges.push({
          id: `edge-${Date.now()}-${index}-1`,
          source: sourceId,
          target: joinNodeId,
          label: relation.label ? `${relation.label} (1)` : "",
          mA: "1",
          mB: "*",
          relKind: "ASSOC",
          relType: "1-N",
          direction: "NONE",
          verb: relation.label || ""
        });

        // Relación 2: to -> joinTable (1 a N)
        edges.push({
          id: `edge-${Date.now()}-${index}-2`,
          source: targetId,
          target: joinNodeId,
          label: relation.label ? `${relation.label} (2)` : "",
          mA: "1",
          mB: "*",
          relKind: "ASSOC",
          relType: "1-N",
          direction: "NONE",
          verb: relation.label || ""
        });

        // No creamos la relación N-M directa, solo las dos 1-N
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
      label: relation.label || "",
      mA: mFrom,
      mB: mTo,
      relKind: relKind,
      relType: relType,
      direction: direction,
      verb: relation.label || ""
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