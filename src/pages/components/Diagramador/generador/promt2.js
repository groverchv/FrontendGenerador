// Prompt para que la IA COMPLETE/ACTUALICE el DIAGRAMA en base a instrucciones del usuario.
// Debe responder SOLO un JSON con un "delta" de acciones para aplicar al grafo.

export function buildPrompt2(currentModel, userInstruction) {
  const hint = JSON.stringify(currentModel, null, 2);

  return `
Eres un asistente que actualiza un diagrama UML de clases de manera INCREMENTAL.
Recibirás:
- El modelo ACTUAL (entities, relations, joinTables).
- Una instrucción del usuario en lenguaje natural.

DEBES responder SOLO un JSON válido con la forma:

{
  "actions": [
    // Crear o actualizar entidades
    { "op": "add_entity", "name": "Usuario", "attrs": [ { "name": "id", "type": "Integer" }, { "name": "nombre", "type": "String" } ] },
    { "op": "update_entity", "name": "Usuario", "attrs": [ { "name": "telefono", "type": "Integer" } ] },
    { "op": "remove_entity", "name": "Temporal" },

    // Relaciones simples (no N-M)
    { "op": "add_relation", "a": "Usuario", "b": "Perfil", "mA": "1", "mB": "N", "verb": "tiene", "relType": "1-N" },

    // N-M (con entidad intermedia opcional)
    { "op": "add_relation_nm", "a": "Usuario", "b": "Rol", "joinName": "Usuario_Rol" },

    // Borrar relación (si se pide)
    { "op": "remove_relation", "a": "Usuario", "b": "Perfil" }
  ]
}

Reglas:
- Usa tipos Java habituales: String, Integer, Long, Double, BigDecimal, Boolean, LocalDate, LocalDateTime, UUID, Text, byte[]...
- No repitas acciones que no cambian nada.
- Si el usuario pide "genera todo", puedes incluir varias acciones.
- Para N–M: si no se especifica joinName, usa "<A>_<B>".
- Las multiplicidades admitidas: "1", "0..1", "1..*", "0..*", "*" (también puedes usar "N" → equivale a "*").

No incluyas explicación, ni markdown. SOLO el JSON.

────────────────────────────────────────────────────────────────────────
MODELO ACTUAL
${hint}

────────────────────────────────────────────────────────────────────────
INSTRUCCIÓN DEL USUARIO
${userInstruction}
`;
}
