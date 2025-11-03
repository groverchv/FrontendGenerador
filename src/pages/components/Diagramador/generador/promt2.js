export const buildPrompt2 = (currentModel, userInstruction) => {
  const context = currentModel?.entities?.length
    ? `Contexto del diagrama actual: ${currentModel.entities.map((e) => e.name).join(", ")}`
    : "Diagrama vacío (sin entidades existentes)";

  // Detectar si el usuario pide un sistema completo o solo una entidad/cambio simple
  const isCompleteSystem = /(?:crea(?:r)?|genera(?:r)?|quiero|necesito|haz)\s+(?:un\s+)?sistema\s+(?:completo\s+)?(?:de\s+)?/i.test(userInstruction);

  const systemInstructions = isCompleteSystem ? `
Eres un EXPERTO en DISEÑO DE BASES DE DATOS y DIAGRAMAS UML. El usuario solicita un SISTEMA COMPLETO.

REGLAS PARA SISTEMAS COMPLETOS:

1. ATRIBUTOS PROFESIONALES:
   - SIEMPRE incluir: id (Integer/Long), createdAt (Date), updatedAt (Date)
   - Agregar TODOS los atributos necesarios (mínimo 5-8 por entidad)
   - Incluir claves foráneas cuando hay relaciones: nombreEntidad_id (Integer)
   - Tipos precisos: String, Integer, Long, Boolean, Date, BigDecimal, Double

2. RELACIONES COMPLETAS:
   - TODAS las entidades deben estar relacionadas coherentemente
   - Usar multiplicidades correctas: "1", "0..1", "1..*", "0..*"
   - relKind: "ASSOC" (asociación), "COMP" (composición), "AGGR" (agregación), "INHERIT" (herencia)
   - Agregar nombre/verbo descriptivo a cada relación

3. Genera TODAS las entidades y relaciones necesarias para el sistema solicitado` 
  : `
Eres un asistente para DIAGRAMAS UML. El usuario solicita una tarea ESPECÍFICA.

REGLAS PARA TAREAS ESPECÍFICAS:

1. RESPETA LA INSTRUCCIÓN DEL USUARIO:
   - Si pide crear UNA entidad → Crea SOLO esa entidad
   - Si pide agregar un atributo → Agrega SOLO ese atributo
   - Si pide crear varias entidades → Crea SOLO las mencionadas
   - NO agregues entidades ni relaciones no solicitadas

2. ATRIBUTOS:
   - Si el usuario especifica atributos → Usa SOLO esos atributos
   - Si NO especifica atributos → Agrega id (Integer), createdAt (Date), updatedAt (Date) como mínimo
   - Si la entidad ya existe y se agregan atributos → NO elimines los existentes

3. RELACIONES:
   - SOLO crea relaciones si el usuario las solicita explícitamente
   - NO asumas relaciones automáticamente

4. TIPOS DE DATOS COMUNES:
   - String: textos (nombre, email, descripción)
   - Integer/Long: números enteros (id, cantidad, edad)
   - BigDecimal: valores monetarios (precio, total)
   - Boolean: verdadero/falso (activo, visible)
   - Date: fechas (createdAt, fechaNacimiento)`;

  return `${context}

INSTRUCCIÓN DEL USUARIO: ${userInstruction}

${systemInstructions}

FORMATO DE RESPUESTA (JSON válido):
{
  "actions": [
    {"op":"add_entity","name":"NombreEntidad","attrs":[{"name":"id","type":"Integer"},{"name":"atributo1","type":"String"},{"name":"createdAt","type":"Date"}]},
    {"op":"add_relation","a":"Entidad1","b":"Entidad2","mA":"1..*","mB":"1","relKind":"ASSOC","verb":"verbo descriptivo"}
  ]
}

OPERACIONES DISPONIBLES:
- add_entity: Crear nueva entidad
- update_entity: Actualizar entidad existente
- add_attr: Agregar atributo a entidad existente
- remove_attr: Eliminar atributo
- add_relation: Crear relación entre dos entidades
- add_relation_nm: Relación muchos a muchos (crea tabla intermedia)

IMPORTANTE:
- Genera EXACTAMENTE lo que el usuario solicita, ni más ni menos
- Si pide una entidad simple → NO crees un sistema completo
- Si pide un sistema completo → Genera todas las entidades y relaciones necesarias
- SOLO responde con JSON válido, sin texto adicional`;
};
