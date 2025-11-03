// Prompt IA reforzado: salida coherente y sin placeholders tipo "atributo1"

export function buildPrompt2(currentModel, userInstruction) {
  const hint = JSON.stringify(currentModel, null, 2);
  return `
Eres un asistente que ACTUALIZA un diagrama UML de CLASES de forma INCREMENTAL.
Devuelve SOLO un JSON válido con:
{ "actions": [ ... ] }

REGLAS OBLIGATORIAS
- ENTIDADES en PascalCase sin acentos.
- ATRIBUTOS en camelCase sin acentos. "id" (Integer) VA PRIMERO cuando definas una lista completa.
- TIPOS EXACTOS permitidos (NO sinónimos): 
  String, Boolean, Byte, Short, Integer, Long, Float, Double, BigDecimal,
  LocalDate, LocalDateTime, Instant, OffsetDateTime, UUID, byte[], Text.
- Multiplicidades: "1", "0..1", "1..*", "0..*", "*".
- PROHIBIDO usar nombres genéricos como "atributo1", "campo1", "propiedad1".
  Usa nombres SEMÁNTICOS y propios del dominio (p.ej. Venta → fecha, subtotal, impuesto, total, metodoPago, clienteId…).
- Evita relaciones duplicadas.
- INHERIT (herencia): sin multiplicidades; dirección A->B (A extiende B).
- DEPEND (dependencia): sin multiplicidades; "direction":"A->B".
- AGGR/COMP: incluye "owning":"A"|"B" (lado del diamante). Si faltan multiplicidades, asume Whole:1 y Part:1..*.
- N–M: { "op":"add_relation_nm", "a":"A", "b":"B", "joinName":"a_b" } (snake_case). Si falta joinName, genera "<a>_<b>".

ACCIONES (ejemplos):
{
  "actions": [
    { "op":"add_entity", "name":"Producto",
      "attrs":[ { "name":"id","type":"Integer" }, { "name":"nombre","type":"String" }, { "name":"precio","type":"BigDecimal" } ] },
    { "op":"update_entity", "name":"Producto", "attrs":[ { "name":"stock","type":"Integer" } ] },
    { "op":"rename_entity", "old":"Producto", "name":"Articulo" },
    { "op":"remove_entity", "name":"Temporal" },

    { "op":"add_attr", "entity":"Usuario", "attr":{ "name":"telefonoMovil","type":"String" } },
    { "op":"update_attr", "entity":"Usuario", "old":"telefono", "attr":{ "name":"telefonoMovil","type":"String" } },
    { "op":"remove_attr", "entity":"Usuario", "name":"correo" },
    { "op":"clear_attrs", "entity":"Usuario" },

    { "op":"add_relation", "a":"Usuario", "b":"Perfil", "mA":"1", "mB":"1..*", "verb":"tiene", "relKind":"ASSOC" },
    { "op":"add_relation_nm", "a":"Usuario", "b":"Rol", "joinName":"usuario_rol" },
    { "op":"add_relation", "a":"Empleado", "b":"Persona", "relKind":"INHERIT" },
    { "op":"add_relation", "a":"Pedido", "b":"Linea", "mA":"1", "mB":"1..*", "relKind":"AGGR", "owning":"A" },
    { "op":"add_relation", "a":"Carrito", "b":"Item", "mA":"1", "mB":"1..*", "relKind":"COMP", "owning":"A" },
    { "op":"add_relation", "a":"Servicio", "b":"Repositorio", "relKind":"DEPEND", "direction":"A->B" },
    { "op":"remove_relation", "a":"Usuario", "b":"Perfil" },

    // Para pedidos del usuario como “agrégame 15 atributos a Venta”
    { "op":"add_attrs_smart", "entity":"Venta", "count":15 }
  ]
}

NO expliques nada. NO uses markdown. SOLO el JSON.

────────────────────────────────
MODELO ACTUAL
${hint}

────────────────────────────────
INSTRUCCIÓN DEL USUARIO
${userInstruction}
`;
}
