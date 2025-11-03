export const buildPrompt2 = (currentModel, userInstruction) => {
  const context = currentModel?.entities?.length
    ? `Contexto: ${currentModel.entities.map((e) => e.name).join(", ")}`
    : "Diagrama vacío";

  return `${context}

INSTRUCCIÓN: ${userInstruction}

Eres un EXPERTO en DISEÑO DE BASES DE DATOS y DIAGRAMAS UML. Debes generar un diagrama COMPLETO y PROFESIONAL como si fuera una base de datos real.

REGLAS OBLIGATORIAS:

1. ATRIBUTOS COMPLETOS:
   - SIEMPRE incluir: id (Integer/Long), createdAt (Date), updatedAt (Date)
   - Agregar TODOS los atributos necesarios (mínimo 5-8 por entidad)
   - Incluir claves foráneas cuando hay relaciones: nombreEntidad_id (Integer)
   - Tipos precisos: String, Integer, Long, Boolean, Date, BigDecimal, Double

2. RELACIONES COMPLETAS Y REALES:
   - TODAS las entidades deben estar relacionadas coherentemente
   - Usar multiplicidades correctas: "1", "0..1", "1..*", "0..*"
   - relKind: "ASSOC" (asociación), "COMP" (composición), "AGGR" (agregación), "INHERIT" (herencia)
   - Agregar nombre/verbo descriptivo a cada relación

3. SISTEMA COHERENTE (ejemplo para "sistema de ventas"):
   Entidades base:
   - Usuario: id, username, password, email, rol, telefono, activo, createdAt, updatedAt
   - Cliente: id, nombre, apellido, email, telefono, direccion, ciudad, nit, createdAt, updatedAt
   - Categoria: id, nombre, descripcion, activo, createdAt, updatedAt
   - Producto: id, nombre, descripcion, precio, stock, stockMinimo, categoria_id, activo, createdAt, updatedAt
   - Venta: id, numeroFactura, fecha, total, descuento, subtotal, cliente_id, usuario_id, metodoPago, estado, createdAt, updatedAt
   - DetalleVenta: id, cantidad, precioUnitario, subtotal, descuento, total, venta_id, producto_id, createdAt, updatedAt
   
   Relaciones:
   - Producto → Categoria (1..* a 1) "pertenece a"
   - Venta → Cliente (1..* a 1) "realizada por"
   - Venta → Usuario (1..* a 1) "registrada por"
   - DetalleVenta → Venta (1..* a 1) "pertenece a" [COMP]
   - DetalleVenta → Producto (1..* a 1) "contiene"

FORMATO DE RESPUESTA (JSON válido):
{
  "actions": [
    {"op":"add_entity","name":"Usuario","attrs":[{"name":"id","type":"Integer"},{"name":"username","type":"String"},{"name":"password","type":"String"},{"name":"email","type":"String"},{"name":"rol","type":"String"},{"name":"telefono","type":"String"},{"name":"activo","type":"Boolean"},{"name":"createdAt","type":"Date"},{"name":"updatedAt","type":"Date"}]},
    {"op":"add_entity","name":"Cliente","attrs":[{"name":"id","type":"Integer"},{"name":"nombre","type":"String"},{"name":"apellido","type":"String"},{"name":"email","type":"String"},{"name":"telefono","type":"String"},{"name":"direccion","type":"String"},{"name":"ciudad","type":"String"},{"name":"nit","type":"String"},{"name":"createdAt","type":"Date"},{"name":"updatedAt","type":"Date"}]},
    {"op":"add_relation","a":"Producto","b":"Categoria","mA":"1..*","mB":"1","relKind":"ASSOC","verb":"pertenece a"},
    {"op":"add_relation","a":"Venta","b":"Cliente","mA":"1..*","mB":"1","relKind":"ASSOC","verb":"realizada por"},
    {"op":"add_relation","a":"DetalleVenta","b":"Venta","mA":"1..*","mB":"1","relKind":"COMP","verb":"pertenece a"}
  ]
}

IMPORTANTE:
- Genera TODAS las entidades necesarias para el sistema solicitado
- Agrega TODAS las relaciones entre entidades
- Incluye claves foráneas (nombreEntidad_id) en atributos cuando hay relación
- SOLO responde con JSON válido, sin texto adicional`;
};
