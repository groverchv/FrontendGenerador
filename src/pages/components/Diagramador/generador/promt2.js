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
   - Agregar nombre/verbo descriptivo a cada relación

3. TIPOS DE RELACIÓN UML (relKind):
   a) "ASSOC" (Asociación): Relación básica entre entidades
      - Soporta multiplicidades y verbos
      - Ej: Usuario-Pedido, Cliente-Dirección
   
   b) "AGGR" (Agregación): Relación todo-parte (rombo vacío ◇)
      - El todo "contiene" la parte, pero la parte puede existir independientemente
      - Requiere especificar owning: "A" o "B" (quien es el todo)
      - Ej: Departamento-Profesor, Curso-Estudiante
   
   c) "COMP" (Composición): Relación todo-parte fuerte (rombo lleno ◆)
      - El todo "posee" la parte, la parte NO puede existir sin el todo
      - Requiere especificar owning: "A" o "B" (quien es el todo)
      - Ej: Pedido-DetallePedido, Factura-ItemFactura
   
   d) "INHERIT" (Herencia): Relación es-un (triángulo en padre)
      - NO usa multiplicidades ni verbos
      - Ej: Vehiculo←Carro, Persona←Estudiante, Animal←Perro
   
   e) "DEPEND" (Dependencia): Una clase usa o depende de otra (línea punteada)
      - NO usa multiplicidades, puede tener verbo
      - Ej: Servicio→Repositorio, Controller→Service

4. Genera TODAS las entidades y relaciones necesarias para el sistema solicitado` 
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
   - Usa el tipo de relación UML correcto según el contexto

4. TIPOS DE RELACIÓN UML (relKind):
   a) "ASSOC" (Asociación): Relación básica entre entidades
      - Soporta multiplicidades y verbos
      - Ej: Usuario-Pedido (1 a 0..*)
   
   b) "AGGR" (Agregación): Relación todo-parte débil (rombo vacío ◇)
      - La parte puede existir sin el todo
      - Requiere owning: "A" o "B" (quien es el contenedor)
      - Ej: Departamento-Profesor (el profesor puede existir sin departamento)
   
   c) "COMP" (Composición): Relación todo-parte fuerte (rombo lleno ◆)
      - La parte NO puede existir sin el todo
      - Requiere owning: "A" o "B" (quien es el dueño)
      - Ej: Pedido-DetallePedido (detalle no existe sin pedido)
   
   d) "INHERIT" (Herencia): Relación es-un tipo-de (triángulo)
      - NO usa multiplicidades ni verbos
      - "a" es la subclase, "b" es la superclase
      - Ej: {"a":"Estudiante","b":"Persona","relKind":"INHERIT"}
   
   e) "DEPEND" (Dependencia): Usa o depende de (línea punteada →)
      - NO usa multiplicidades, puede tener verbo opcional
      - Ej: Controlador depende de Servicio

5. TIPOS DE DATOS COMUNES:
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
    {"op":"add_relation","a":"Entidad1","b":"Entidad2","mA":"1..*","mB":"1","relKind":"ASSOC","verb":"gestiona","direction":"A->B"},
    {"op":"add_relation","a":"DetallePedido","b":"Pedido","mA":"1..*","mB":"1","relKind":"COMP","owning":"B","direction":"A->B"},
    {"op":"add_relation","a":"Estudiante","b":"Persona","relKind":"INHERIT"},
    {"op":"add_relation","a":"Controller","b":"Service","relKind":"DEPEND","verb":"usa","direction":"A->B"}
  ]
}

OPERACIONES DISPONIBLES:
- add_entity: Crear nueva entidad con atributos
- update_entity: Actualizar entidad existente agregando/modificando atributos
- add_attr: Agregar un atributo específico a entidad existente
- remove_attr: Eliminar un atributo específico
- add_relation: Crear relación entre dos entidades
  * ASSOC: {"op":"add_relation","a":"A","b":"B","mA":"1","mB":"0..*","relKind":"ASSOC","verb":"tiene","direction":"A->B"}
  * AGGR: {"op":"add_relation","a":"A","b":"B","mA":"1..*","mB":"1","relKind":"AGGR","owning":"B","direction":"A->B"}
  * COMP: {"op":"add_relation","a":"A","b":"B","mA":"1..*","mB":"1","relKind":"COMP","owning":"B","direction":"A->B"}
  * INHERIT: {"op":"add_relation","a":"Hija","b":"Padre","relKind":"INHERIT"} (NO mA, NO mB, NO verb)
  * DEPEND: {"op":"add_relation","a":"A","b":"B","relKind":"DEPEND","verb":"usa","direction":"A->B"} (NO mA, NO mB)
- add_relation_nm: Relación muchos a muchos (crea tabla intermedia automáticamente)
  * {"op":"add_relation_nm","a":"Usuario","b":"Rol","joinName":"usuario_rol"}

IMPORTANTE:
- Genera EXACTAMENTE lo que el usuario solicita, ni más ni menos
- Si pide una entidad simple → NO crees un sistema completo
- Si pide un sistema completo → Genera todas las entidades y relaciones necesarias
- SOLO responde con JSON válido, sin texto adicional`;
};
