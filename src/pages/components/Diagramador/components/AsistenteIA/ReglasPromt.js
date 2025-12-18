// src/pages/components/Diagramador/components/AsistenteIA/ReglasPromt.js
// ═══════════════════════════════════════════════════════════════════════════════
// 📜 REGLAS Y PROMPTS PARA EL ASISTENTE IA DE DIAGRAMAS UML
// ═══════════════════════════════════════════════════════════════════════════════
// Este módulo contiene todas las reglas, prompts y configuraciones para que
// la IA interprete comandos en lenguaje natural y los convierta en acciones
// sobre el diagrama UML.

/* ═══════════════════════════════════════════════════════════════════════════════
   📊 TIPOS DE DATOS DISPONIBLES EN JAVA/SPRING BOOT
   ═══════════════════════════════════════════════════════════════════════════════ */
export const TIPOS_DATOS = {
  // Tipos primitivos y wrappers
  primitivos: [
    { nombre: "Integer", descripcion: "Número entero (32 bits)", ejemplo: "1, 100, -50" },
    { nombre: "Long", descripcion: "Número entero largo (64 bits)", ejemplo: "1L, 999999999L" },
    { nombre: "Double", descripcion: "Número decimal (64 bits)", ejemplo: "3.14, -0.001" },
    { nombre: "Float", descripcion: "Número decimal (32 bits)", ejemplo: "3.14f, -0.001f" },
    { nombre: "Boolean", descripcion: "Verdadero o falso", ejemplo: "true, false" },
    { nombre: "String", descripcion: "Cadena de texto", ejemplo: '"Hola", "Texto"' },
    { nombre: "Character", descripcion: "Un solo carácter", ejemplo: "'A', 'Z'" },
    { nombre: "Byte", descripcion: "Número muy pequeño (-128 a 127)", ejemplo: "127, -128" },
    { nombre: "Short", descripcion: "Número entero corto", ejemplo: "32767, -32768" },
  ],
  
  // Tipos de fecha y tiempo
  fechas: [
    { nombre: "Date", descripcion: "Fecha y hora", ejemplo: "new Date()" },
    { nombre: "LocalDate", descripcion: "Solo fecha (sin hora)", ejemplo: "2024-01-15" },
    { nombre: "LocalDateTime", descripcion: "Fecha con hora", ejemplo: "2024-01-15T10:30:00" },
    { nombre: "LocalTime", descripcion: "Solo hora", ejemplo: "10:30:00" },
    { nombre: "Instant", descripcion: "Momento en el tiempo (UTC)", ejemplo: "Instant.now()" },
    { nombre: "ZonedDateTime", descripcion: "Fecha con zona horaria", ejemplo: "2024-01-15T10:30:00-04:00" },
  ],
  
  // Tipos numéricos especiales
  numericos: [
    { nombre: "BigDecimal", descripcion: "Decimal preciso (para dinero)", ejemplo: "new BigDecimal('99.99')" },
    { nombre: "BigInteger", descripcion: "Entero de precisión arbitraria", ejemplo: "new BigInteger('99999999999')" },
  ],
  
  // Colecciones y estructuras
  colecciones: [
    { nombre: "List<T>", descripcion: "Lista ordenada de elementos", ejemplo: "List<String>" },
    { nombre: "Set<T>", descripcion: "Conjunto sin duplicados", ejemplo: "Set<Integer>" },
    { nombre: "Map<K,V>", descripcion: "Diccionario clave-valor", ejemplo: "Map<String, Object>" },
    { nombre: "ArrayList<T>", descripcion: "Lista basada en array", ejemplo: "ArrayList<Producto>" },
  ],
  
  // Tipos especiales JPA
  jpa: [
    { nombre: "UUID", descripcion: "Identificador único universal", ejemplo: "UUID.randomUUID()" },
    { nombre: "Blob", descripcion: "Datos binarios grandes", ejemplo: "Imágenes, archivos" },
    { nombre: "Clob", descripcion: "Texto muy largo", ejemplo: "Descripciones largas" },
  ],
};

// Alias comunes que los usuarios pueden usar
export const ALIAS_TIPOS = {
  // Español a tipo Java
  "entero": "Integer",
  "numero": "Integer",
  "número": "Integer",
  "int": "Integer",
  "texto": "String",
  "cadena": "String",
  "palabra": "String",
  "decimal": "Double",
  "flotante": "Float",
  "dinero": "BigDecimal",
  "precio": "BigDecimal",
  "monto": "BigDecimal",
  "moneda": "BigDecimal",
  "fecha": "Date",
  "hora": "LocalTime",
  "fechahora": "LocalDateTime",
  "booleano": "Boolean",
  "sino": "Boolean",
  "verdaderofalso": "Boolean",
  "largo": "Long",
  "id": "Integer",
  "identificador": "Integer",
  "uuid": "UUID",
  "lista": "List",
  "arreglo": "List",
  "conjunto": "Set",
  "mapa": "Map",
  "diccionario": "Map",
};

/* ═══════════════════════════════════════════════════════════════════════════════
   🔗 TIPOS DE RELACIONES UML
   ═══════════════════════════════════════════════════════════════════════════════ */
export const TIPOS_RELACIONES = {
  ASSOC: {
    nombre: "Asociación",
    simbolo: "—",
    descripcion: "Conexión simple entre dos clases",
    ejemplos: [
      "Usuario tiene Pedidos",
      "Cliente realiza Compras",
      "Empleado trabaja en Departamento"
    ],
    usoTipico: "Cuando una clase usa o conoce a otra"
  },
  AGGR: {
    nombre: "Agregación",
    simbolo: "◇—",
    descripcion: "Relación 'tiene-un' donde las partes pueden existir independientemente",
    ejemplos: [
      "Universidad tiene Profesores (el profesor puede existir sin la universidad)",
      "Equipo tiene Jugadores",
      "Biblioteca tiene Libros"
    ],
    usoTipico: "Cuando el todo contiene partes, pero las partes viven independientemente"
  },
  COMP: {
    nombre: "Composición",
    simbolo: "◆—",
    descripcion: "Relación 'tiene-un' fuerte donde las partes no pueden existir sin el todo",
    ejemplos: [
      "Pedido tiene DetallesPedido (el detalle no existe sin el pedido)",
      "Casa tiene Habitaciones",
      "Factura tiene LineasFactura"
    ],
    usoTipico: "Cuando las partes son creadas y destruidas junto con el todo"
  },
  INHERIT: {
    nombre: "Herencia",
    simbolo: "△—",
    descripcion: "Relación 'es-un' donde una clase hereda de otra",
    ejemplos: [
      "Empleado extiende Persona",
      "ProductoDigital hereda de Producto",
      "Admin es un Usuario"
    ],
    usoTipico: "Cuando una clase es una especialización de otra"
  },
  DEPEND: {
    nombre: "Dependencia",
    simbolo: "- - ->",
    descripcion: "Una clase usa temporalmente a otra",
    ejemplos: [
      "Controlador depende de Servicio",
      "Vista usa Modelo",
      "Factory crea Producto"
    ],
    usoTipico: "Cuando una clase usa a otra como parámetro o variable local"
  },
};

// Alias para tipos de relaciones
export const ALIAS_RELACIONES = {
  // Asociación
  "asociacion": "ASSOC",
  "asociación": "ASSOC",
  "relacion": "ASSOC",
  "relación": "ASSOC",
  "conexion": "ASSOC",
  "conexión": "ASSOC",
  "vinculo": "ASSOC",
  "vínculo": "ASSOC",
  "tiene": "ASSOC",
  "usa": "ASSOC",
  "conoce": "ASSOC",
  
  // Agregación
  "agregacion": "AGGR",
  "agregación": "AGGR",
  "contiene": "AGGR",
  "agrupa": "AGGR",
  "coleccion": "AGGR",
  "colección": "AGGR",
  
  // Composición
  "composicion": "COMP",
  "composición": "COMP",
  "compuesto": "COMP",
  "parte de": "COMP",
  "pertenece": "COMP",
  "forma parte": "COMP",
  
  // Herencia
  "herencia": "INHERIT",
  "extiende": "INHERIT",
  "hereda": "INHERIT",
  "es un": "INHERIT",
  "es una": "INHERIT",
  "especializa": "INHERIT",
  "deriva": "INHERIT",
  
  // Dependencia
  "dependencia": "DEPEND",
  "depende": "DEPEND",
  "necesita": "DEPEND",
  "requiere": "DEPEND",
  "utiliza": "DEPEND",
};

/* ═══════════════════════════════════════════════════════════════════════════════
   📐 MULTIPLICIDADES UML
   ═══════════════════════════════════════════════════════════════════════════════ */
export const MULTIPLICIDADES = {
  "1": { simbolo: "1", descripcion: "Exactamente uno" },
  "0..1": { simbolo: "0..1", descripcion: "Cero o uno (opcional)" },
  "*": { simbolo: "*", descripcion: "Cero o muchos" },
  "1..*": { simbolo: "1..*", descripcion: "Uno o muchos (al menos uno)" },
  "0..*": { simbolo: "0..*", descripcion: "Cero o muchos (igual que *)" },
  "n": { simbolo: "n", descripcion: "Muchos (igual que *)" },
};

// Alias para multiplicidades
export const ALIAS_MULTIPLICIDADES = {
  "uno": "1",
  "un": "1",
  "una": "1",
  "cero o uno": "0..1",
  "opcional": "0..1",
  "puede tener": "0..1",
  "muchos": "*",
  "varios": "*",
  "multiple": "*",
  "múltiple": "*",
  "n": "*",
  "muchos a muchos": "*",
  "al menos uno": "1..*",
  "uno o mas": "1..*",
  "uno o más": "1..*",
};

/* ═══════════════════════════════════════════════════════════════════════════════
   🎯 PROMPTS PARA LA IA
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Prompt principal para interpretar comandos del usuario
 */
export function buildInterpretPrompt(currentModel, userText) {
  const entidadesActuales = currentModel?.entities?.map(e => e.name).join(", ") || "ninguna";
  
  return `Eres un asistente experto en diagramas UML de clases para aplicaciones Java/Spring Boot.
Tu tarea es interpretar el comando del usuario y generar las acciones necesarias.

=== MODELO ACTUAL ===
Entidades existentes: ${entidadesActuales}

=== TIPOS DE DATOS PERMITIDOS ===
Primitivos: Integer, Long, Double, Float, Boolean, String, Character, Byte, Short
Fechas: Date, LocalDate, LocalDateTime, LocalTime, Instant, ZonedDateTime
Numéricos especiales: BigDecimal (para dinero), BigInteger
Colecciones: List<T>, Set<T>, Map<K,V>

=== TIPOS DE RELACIONES ===
- ASSOC: Asociación simple (una clase conoce/usa otra)
- AGGR: Agregación (tiene-un, partes independientes) - diamante vacío ◇
- COMP: Composición (tiene-un fuerte, partes dependientes) - diamante lleno ◆
- INHERIT: Herencia (es-un) - triángulo △
- DEPEND: Dependencia (usa temporalmente) - línea punteada

=== MULTIPLICIDADES ===
- "1": exactamente uno
- "0..1": cero o uno (opcional)
- "*": cero o muchos
- "1..*": uno o muchos (al menos uno)

=== OPERACIONES DISPONIBLES ===

1. ENTIDADES:
   - add_entity: Crear nueva entidad
   - update_entity: Modificar entidad existente (atributos)
   - remove_entity: Eliminar entidad
   - rename_entity: Renombrar entidad

2. ATRIBUTOS:
   - add_attr: Agregar atributo a entidad
   - remove_attr: Eliminar atributo de entidad
   - update_attr: Modificar nombre o tipo de atributo
   - clear_attrs: Eliminar todos los atributos (excepto id)

3. RELACIONES:
   - add_relation: Crear relación entre entidades
   - remove_relation: Eliminar relación
   - update_relation: Modificar tipo o multiplicidad de relación

4. N-M ESPECIAL:
   - add_relation_nm: Crear relación muchos a muchos con tabla intermedia
   - add_relation_associative: Crear entidad asociativa

=== COMANDO DEL USUARIO ===
"${userText}"

=== INSTRUCCIONES ===
1. Interpreta el comando del usuario
2. Genera un JSON con las acciones necesarias
3. Si creas entidades, SIEMPRE incluye atributo "id" de tipo "Integer"
4. Si el usuario menciona tipos en español, tradúcelos (ej: "texto" -> "String", "precio" -> "BigDecimal")
5. Para relaciones, determina la multiplicidad correcta según el contexto
6. Para composición/agregación, identifica cuál es el "todo" (owning)

=== FORMATO DE RESPUESTA ===
Responde SOLO con un JSON válido en este formato:
{
  "actions": [
    { "op": "...", ...parámetros específicos de la operación }
  ],
  "explanation": "Breve explicación de lo que se hará"
}

=== EJEMPLOS DE ACCIONES ===

Crear entidad:
{ "op": "add_entity", "name": "Usuario", "attrs": [{"name": "id", "type": "Integer"}, {"name": "nombre", "type": "String"}] }

Agregar atributo:
{ "op": "add_attr", "entity": "Usuario", "attr": {"name": "email", "type": "String"} }

Eliminar atributo:
{ "op": "remove_attr", "entity": "Usuario", "name": "telefono" }

Crear relación:
{ "op": "add_relation", "a": "Usuario", "b": "Pedido", "mA": "1", "mB": "*", "relKind": "ASSOC", "verb": "realiza" }

Composición:
{ "op": "add_relation", "a": "Pedido", "b": "DetallePedido", "mA": "1", "mB": "*", "relKind": "COMP", "owning": "A" }

Herencia:
{ "op": "add_relation", "a": "Empleado", "b": "Persona", "relKind": "INHERIT" }

N-M:
{ "op": "add_relation_nm", "a": "Estudiante", "b": "Curso", "joinName": "Inscripcion" }`;
}

/**
 * Prompt para sugerir atributos basados en el nombre de la entidad
 */
export function buildSuggestAttrsPrompt(entityName) {
  return `Eres un experto en modelado de bases de datos para aplicaciones Java/Spring Boot.
Sugiere atributos típicos para una entidad llamada "${entityName}".

REGLAS:
1. Siempre incluir "id" de tipo Integer como primer atributo
2. Usar tipos Java apropiados: String, Integer, Long, Double, BigDecimal (para dinero), Boolean, Date, LocalDateTime, etc.
3. Incluir timestamps: createdAt (Date), updatedAt (Date) si es apropiado
4. Para entidades de negocio, incluir campo "activo" (Boolean) para soft delete
5. Máximo 10-12 atributos relevantes

FORMATO DE RESPUESTA (JSON):
{
  "entityName": "${entityName}",
  "suggestedAttrs": [
    {"name": "id", "type": "Integer"},
    {"name": "nombreAtributo", "type": "TipoJava"},
    ...
  ],
  "explanation": "Breve explicación de por qué estos atributos"
}`;
}

/**
 * Prompt para sugerir relaciones entre entidades
 */
export function buildSuggestRelationsPrompt(entities) {
  const entityNames = entities.map(e => e.name).join(", ");
  
  return `Eres un experto en modelado de bases de datos y diagramas UML.
Analiza las siguientes entidades y sugiere relaciones apropiadas entre ellas.

ENTIDADES DISPONIBLES: ${entityNames}

TIPOS DE RELACIONES:
- ASSOC: Asociación simple (una clase usa/conoce otra)
- AGGR: Agregación (todo-parte, partes independientes)
- COMP: Composición (todo-parte, partes dependientes del todo)
- INHERIT: Herencia (es-un/es-una)
- DEPEND: Dependencia (usa temporalmente)

MULTIPLICIDADES:
- "1": exactamente uno
- "0..1": opcional
- "*": muchos
- "1..*": al menos uno

REGLAS:
1. Busca patrones comunes (Usuario-Pedido, Producto-Categoría, etc.)
2. Considera si hay jerarquías de herencia
3. Identifica composiciones (Pedido-DetallePedido, Factura-LineaFactura)
4. No crees relaciones redundantes o circulares

FORMATO DE RESPUESTA (JSON):
{
  "suggestedRelations": [
    {
      "a": "EntidadA",
      "b": "EntidadB",
      "relKind": "ASSOC|AGGR|COMP|INHERIT|DEPEND",
      "mA": "1",
      "mB": "*",
      "verb": "descripción de la relación",
      "reason": "Por qué se sugiere esta relación"
    }
  ]
}`;
}

/**
 * Prompt para validar coherencia del diagrama
 */
export function buildValidatePrompt(model) {
  return `Eres un experto en diseño de software y diagramas UML.
Analiza el siguiente modelo y encuentra posibles problemas o mejoras.

MODELO ACTUAL:
${JSON.stringify(model, null, 2)}

ASPECTOS A VERIFICAR:
1. Entidades sin atributos (además de id)
2. Entidades huérfanas (sin relaciones)
3. Relaciones circulares problemáticas
4. Nombres de entidades/atributos con problemas (espacios, caracteres especiales)
5. Tipos de datos inapropiados
6. Multiplicidades incorrectas o inconsistentes
7. Falta de timestamps (createdAt, updatedAt)
8. Patrones comunes faltantes

FORMATO DE RESPUESTA (JSON):
{
  "isValid": true/false,
  "issues": [
    {
      "severity": "error|warning|info",
      "type": "missing_attr|orphan_entity|circular_ref|naming|type|multiplicity",
      "entity": "nombre de entidad afectada (si aplica)",
      "message": "Descripción del problema",
      "suggestion": "Cómo solucionarlo"
    }
  ],
  "suggestions": [
    "Sugerencias generales de mejora"
  ]
}`;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   📝 EJEMPLOS DE COMANDOS NATURALES
   ═══════════════════════════════════════════════════════════════════════════════ */
export const EJEMPLOS_COMANDOS = {
  // Crear entidades
  crearEntidad: [
    "Crear entidad Usuario con id Integer, nombre String, email String",
    "Hazme una clase Producto con nombre, precio BigDecimal y stock Integer",
    "Quiero un Usuario con id, nombre, apellido, email y telefono",
    "Crea la entidad Cliente",
    "Nueva clase Pedido con fecha Date y total BigDecimal",
  ],
  
  // Modificar atributos
  atributos: [
    "Agrega atributo direccion String a Cliente",
    "Elimina el atributo telefono de Usuario",
    "Renombra atributo telefono a celular en Usuario",
    "Cambia el tipo de precio a BigDecimal en Producto",
    "Agrega createdAt Date y updatedAt Date a todas las entidades",
  ],
  
  // Relaciones
  relaciones: [
    "Relación Usuario 1 - * Pedido (verbo: realiza)",
    "Usuario tiene muchos Pedidos",
    "Pedido pertenece a un Cliente",
    "Composición Pedido 1 - * DetallePedido",
    "Producto pertenece a Categoria (muchos a uno)",
    "Herencia Empleado -> Persona",
    "Admin extiende Usuario",
    "N-M Estudiante y Curso con tabla Inscripcion",
  ],
  
  // Sistemas completos
  sistemas: [
    "Crear sistema de ventas",
    "Genera un sistema de biblioteca",
    "Quiero un sistema de hospital con pacientes, doctores y citas",
    "Sistema de e-commerce con usuarios, productos y pedidos",
  ],
  
  // Eliminar
  eliminar: [
    "Elimina la entidad Temporal",
    "Quita la relación entre Usuario y Perfil",
    "Borra el atributo obsoleto de Producto",
  ],
};

/* ═══════════════════════════════════════════════════════════════════════════════
   🛠️ FUNCIONES HELPER
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Normaliza un tipo de dato del español/alias a Java
 */
export function normalizarTipo(tipo) {
  if (!tipo) return "String";
  const tipoLower = tipo.toLowerCase().trim();
  return ALIAS_TIPOS[tipoLower] || tipo;
}

/**
 * Normaliza un tipo de relación del español/alias a UML
 */
export function normalizarRelacion(tipo) {
  if (!tipo) return "ASSOC";
  const tipoLower = tipo.toLowerCase().trim();
  return ALIAS_RELACIONES[tipoLower] || tipo.toUpperCase();
}

/**
 * Normaliza una multiplicidad del español/alias a UML
 */
export function normalizarMultiplicidad(mult) {
  if (!mult) return "1";
  const multLower = mult.toLowerCase().trim();
  return ALIAS_MULTIPLICIDADES[multLower] || mult;
}

/**
 * Genera el texto de ayuda contextual
 */
export function getAyudaContextual(contexto) {
  switch (contexto) {
    case "entidad":
      return {
        titulo: "Crear/Editar Entidad",
        ejemplos: EJEMPLOS_COMANDOS.crearEntidad,
        tip: "Puedes especificar atributos entre paréntesis: Usuario(nombre String, email String)"
      };
    case "atributo":
      return {
        titulo: "Gestionar Atributos",
        ejemplos: EJEMPLOS_COMANDOS.atributos,
        tip: "Los tipos pueden ser en español: texto=String, numero=Integer, precio=BigDecimal"
      };
    case "relacion":
      return {
        titulo: "Crear Relaciones",
        ejemplos: EJEMPLOS_COMANDOS.relaciones,
        tip: "Usa 1, *, 0..1, 1..* para multiplicidades"
      };
    default:
      return {
        titulo: "Asistente de Diagramas UML",
        ejemplos: [
          ...EJEMPLOS_COMANDOS.crearEntidad.slice(0, 2),
          ...EJEMPLOS_COMANDOS.relaciones.slice(0, 2),
          ...EJEMPLOS_COMANDOS.sistemas.slice(0, 2),
        ],
        tip: "Habla de forma natural, el asistente interpretará tu intención"
      };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   🤖 PROMPT AVANZADO PARA PROCESAMIENTO IA
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Construye el prompt para la IA con el modelo actual y la instrucción del usuario
 * Incluye patrones de comandos en español y reglas específicas
 */
export const buildPrompt2 = (currentModel, userInstruction) => {
  const context = currentModel?.entities?.length
    ? `Contexto del diagrama actual: ${currentModel.entities.map((e) => e.name).join(", ")}`
    : "Diagrama vacío (sin entidades existentes)";

  const isCompleteSystem = /(?:crea(?:r)?|genera(?:r)?|quiero|necesito|haz)\s+(?:un\s+)?sistema\s+(?:completo\s+)?(?:de\s+)?/i.test(userInstruction);

  // Pre-procesar la instrucción para detectar nombres con espacios
  // "clase 1" → "Clase1", "class 7" → "Class7"
  const normalizedInstruction = userInstruction
    .replace(/\b(clase|class|entidad)\s+(\d+)/gi, (_, prefix, num) => {
      const normalized = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase() + num;
      return normalized;
    });

  const commandPatterns = `
PATRONES DE COMANDOS EN ESPAÑOL (INTERPRETA EXACTAMENTE):

⚠️ IMPORTANTE: Los nombres de entidad pueden ser:
- "Class1", "Class7", "Usuario", "Producto"
- "clase 1" (convertir a "Clase1")
- "class 7" (convertir a "Class7")
- Siempre normaliza nombres removiendo espacios entre palabras y números

🔹 HERENCIA (INHERIT) - PRIORIDAD MÁXIMA:
   DETECTA ESTAS FRASES:
   - "herencia de A a B" → A hereda de B
   - "herencia de clase 1 a clase 7" → Clase1 hereda de Clase7
   - "A hereda de B" → A hereda de B
   - "A extiende B" → A hereda de B
   - "A es un tipo de B" → A hereda de B
   Genera: {"op":"add_relation","a":"A","b":"B","relKind":"INHERIT"}
   
   EJEMPLOS:
   - "herencia de clase 1 a clase 7" → {"op":"add_relation","a":"Clase1","b":"Clase7","relKind":"INHERIT"}
   - "herencia Class1 Class7" → {"op":"add_relation","a":"Class1","b":"Class7","relKind":"INHERIT"}
   - "Admin hereda de Usuario" → {"op":"add_relation","a":"Admin","b":"Usuario","relKind":"INHERIT"}

🔹 COMPOSICIÓN (COMP):
   DETECTA ESTAS FRASES:
   - "composición de A a B" → A se compone en B
   - "componente de A a B" → A es componente de B
   - "A es parte de B" → Composición A-B
   Genera: {"op":"add_relation","a":"A","b":"B","mA":"*","mB":"1","relKind":"COMP","owning":"B"}

🔹 AGREGACIÓN (AGGR):
   DETECTA ESTAS FRASES:
   - "agregación de A a B" → B agrega/contiene A
   - "A contiene B" → A agrega B
   Genera: {"op":"add_relation","a":"A","b":"B","mA":"*","mB":"1","relKind":"AGGR","owning":"B"}

🔹 ASOCIACIÓN/RELACIÓN (ASSOC):
   DETECTA ESTAS FRASES:
   - "relacionar A con B" → Asociación A-B
   - "A tiene B" → Asociación A tiene B
   - "relación de A a B" → Asociación A-B
   Genera: {"op":"add_relation","a":"A","b":"B","mA":"1","mB":"*","relKind":"ASSOC","verb":"tiene"}

🔹 DEPENDENCIA (DEPEND):
   DETECTA ESTAS FRASES:
   - "dependencia de A a B" → A depende de B
   - "A usa B" → A depende de B
   Genera: {"op":"add_relation","a":"A","b":"B","relKind":"DEPEND","verb":"usa"}
`;

  const systemInstructions = isCompleteSystem ? `
Eres un EXPERTO en DISEÑO DE BASES DE DATOS y DIAGRAMAS UML. El usuario solicita un SISTEMA COMPLETO.

REGLAS PARA SISTEMAS COMPLETOS:
1. SIEMPRE incluir: id (Integer/Long), createdAt (Date), updatedAt (Date)
2. Agregar TODOS los atributos necesarios (mínimo 5-8 por entidad)
3. Incluir claves foráneas cuando hay relaciones
4. TODAS las entidades deben estar relacionadas coherentemente

TIPOS DE RELACIÓN UML (relKind):
- "ASSOC" (Asociación): Relación básica
- "AGGR" (Agregación): Todo-parte débil (rombo vacío ◇)
- "COMP" (Composición): Todo-parte fuerte (rombo lleno ◆)
- "INHERIT" (Herencia): Es-un tipo-de (triángulo)
- "DEPEND" (Dependencia): Usa o depende de (línea punteada)` 
  : `
Eres un asistente para DIAGRAMAS UML. El usuario solicita una tarea ESPECÍFICA.

${commandPatterns}

REGLAS:
1. RESPETA LA INSTRUCCIÓN DEL USUARIO - No agregues nada extra
2. Si el usuario especifica atributos → Usa SOLO esos atributos
3. Si NO especifica atributos → Agrega id, createdAt, updatedAt como mínimo
4. SOLO crea relaciones si el usuario las solicita explícitamente
5. NORMALIZA los nombres de entidad: "clase 1" → "Clase1", "class 7" → "Class7"

TIPOS DE DATOS: String, Integer, Long, Double, BigDecimal, Boolean, Date, LocalDateTime`;

  return `${context}

INSTRUCCIÓN DEL USUARIO (ORIGINAL): ${userInstruction}
INSTRUCCIÓN NORMALIZADA: ${normalizedInstruction}

${systemInstructions}

FORMATO DE RESPUESTA (JSON válido):
{
  "actions": [
    {"op":"add_entity","name":"NombreEntidad","attrs":[{"name":"id","type":"Integer"},{"name":"atributo1","type":"String"}]},
    {"op":"add_relation","a":"Entidad1","b":"Entidad2","mA":"1..*","mB":"1","relKind":"ASSOC","verb":"gestiona"},
    {"op":"add_relation","a":"Subclase","b":"Superclase","relKind":"INHERIT"}
  ]
}

OPERACIONES DISPONIBLES:
- add_entity: Crear nueva entidad con atributos
- update_entity: Actualizar entidad existente
- add_attr: Agregar atributo a entidad
- remove_attr: Eliminar atributo
- add_relation: Crear relación (ASSOC, AGGR, COMP, INHERIT, DEPEND)
- add_relation_nm: Relación muchos a muchos

⚠️ CRÍTICO - DETECCIÓN DE TIPO DE RELACIÓN:
Si la instrucción contiene "herencia" → relKind DEBE ser "INHERIT"
Si la instrucción contiene "composición" o "componente" → relKind DEBE ser "COMP"
Si la instrucción contiene "agregación" → relKind DEBE ser "AGGR"
Si la instrucción contiene "dependencia" o "depende" → relKind DEBE ser "DEPEND"
Si la instrucción contiene "relación" o "asociación" → relKind DEBE ser "ASSOC"

IMPORTANTE: Genera EXACTAMENTE lo que el usuario solicita, ni más ni menos.
SOLO responde con JSON válido, sin texto adicional.`;
};

export default {
  TIPOS_DATOS,
  ALIAS_TIPOS,
  TIPOS_RELACIONES,
  ALIAS_RELACIONES,
  MULTIPLICIDADES,
  ALIAS_MULTIPLICIDADES,
  EJEMPLOS_COMANDOS,
  buildInterpretPrompt,
  buildSuggestAttrsPrompt,
  buildSuggestRelationsPrompt,
  buildValidatePrompt,
  buildPrompt2,
  normalizarTipo,
  normalizarRelacion,
  normalizarMultiplicidad,
  getAyudaContextual,
};
