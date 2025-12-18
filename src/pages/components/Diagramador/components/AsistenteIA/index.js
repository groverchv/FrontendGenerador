// src/pages/components/Diagramador/components/AsistenteIA/index.js
// ═══════════════════════════════════════════════════════════════════════════════
// 📦 ÍNDICE DE EXPORTACIONES - ASISTENTE IA
// ═══════════════════════════════════════════════════════════════════════════════
// Exporta todos los componentes y utilidades del módulo AsistenteIA

// ────────────────────────────────────────────────────────────────────────────────
// 🧩 COMPONENTES PRINCIPALES
// ────────────────────────────────────────────────────────────────────────────────
export { default as Asistente } from './Asistente';
export { default as PanelComandosRapidos } from './PanelComandosRapidos';
export { default as EditorAtributos } from './EditorAtributos';
export { default as EditorRelaciones } from './EditorRelaciones';

// ────────────────────────────────────────────────────────────────────────────────
// 📝 REGLAS Y PROMPTS
// ────────────────────────────────────────────────────────────────────────────────
export {
  // Tipos de datos
  TIPOS_DATOS,
  ALIAS_TIPOS,
  normalizarTipo,
  
  // Tipos de relaciones
  TIPOS_RELACIONES,
  ALIAS_RELACIONES,
  normalizarRelacion,
  
  // Multiplicidades
  MULTIPLICIDADES,
  ALIAS_MULTIPLICIDADES,
  normalizarMultiplicidad,
  
  // Ejemplos de comandos
  EJEMPLOS_COMANDOS,
  
  // Funciones de prompt
  buildInterpretPrompt,
  buildSuggestAttrsPrompt,
  buildSuggestRelationsPrompt,
  buildValidatePrompt,
  buildPrompt2,
  
  // Ayuda contextual
  getAyudaContextual,
} from './ReglasPromt';

// ────────────────────────────────────────────────────────────────────────────────
// 🔍 PARSER DE COMANDOS
// ────────────────────────────────────────────────────────────────────────────────
export {
  parseComando,
  detectarIntencion,
  obtenerSugerencias,
  PATRONES,
} from './ParserComandos';

// ────────────────────────────────────────────────────────────────────────────────
// 📖 DOCUMENTACIÓN DE USO
// ────────────────────────────────────────────────────────────────────────────────
/**
 * ASISTENTE IA - Sistema de edición de diagramas UML con IA
 * 
 * COMPONENTES:
 * 
 * 1. Asistente
 *    - Modal principal para interactuar con el diagrama usando lenguaje natural
 *    - Soporta dictado por voz
 *    - Historial de comandos
 *    - Ejemplos interactivos
 * 
 *    Uso:
 *    <Asistente
 *      open={modalAbierto}
 *      onClose={() => setModalAbierto(false)}
 *      onSubmit={(delta) => aplicarDelta(delta)}
 *      currentModel={{ entities: [], relations: [] }}
 *    />
 * 
 * 2. PanelComandosRapidos
 *    - Barra lateral con botones de acceso rápido
 *    - Categorías: Entidades, Atributos, Relaciones, Sistemas
 * 
 *    Uso:
 *    <PanelComandosRapidos
 *      onSeleccionarComando={(template) => setTexto(template)}
 *      modo="vertical" // o "horizontal"
 *    />
 * 
 * 3. EditorAtributos
 *    - Editor visual para atributos de una entidad
 *    - CRUD completo: crear, editar, eliminar, reordenar
 *    - Sugerencias de IA
 * 
 *    Uso:
 *    <EditorAtributos
 *      entidad="Usuario"
 *      atributos={[{ nombre: 'id', tipo: 'Long', visibility: 'private' }]}
 *      onChange={(nuevosAttrs) => actualizarAtributos(nuevosAttrs)}
 *      onSugerirIA={async (entidad, attrs) => sugerirAtributosConIA(entidad, attrs)}
 *    />
 * 
 * 4. EditorRelaciones
 *    - Editor visual para relaciones entre entidades
 *    - Soporta los 5 tipos: Asociación, Agregación, Composición, Herencia, Dependencia
 *    - Multiplicidades configurables
 * 
 *    Uso:
 *    <EditorRelaciones
 *      relaciones={[{ tipo: 'ASSOCIATION', origen: 'Usuario', destino: 'Pedido', ... }]}
 *      entidades={['Usuario', 'Pedido', 'Producto']}
 *      onChange={(nuevasRels) => actualizarRelaciones(nuevasRels)}
 *      onSugerirIA={async (entidades, rels) => sugerirRelacionesConIA(entidades, rels)}
 *    />
 * 
 * FUNCIONES DE UTILIDAD:
 * 
 * - parseComando(texto, modelo): Parsea un comando en lenguaje natural
 * - detectarIntencion(texto): Detecta qué quiere hacer el usuario
 * - obtenerSugerencias(texto, modelo): Obtiene sugerencias de autocompletado
 * - normalizarTipo(tipo): Normaliza un tipo de dato (ej: "texto" -> "String")
 * - normalizarRelacion(tipo): Normaliza un tipo de relación
 * - normalizarMultiplicidad(mult): Normaliza una multiplicidad
 * 
 * COMANDOS SOPORTADOS:
 * 
 * Entidades:
 * - "Crear entidad Usuario"
 * - "Crear entidad Producto con nombre String y precio BigDecimal"
 * - "Renombrar entidad Usuario a Cliente"
 * - "Eliminar entidad Usuario"
 * 
 * Atributos:
 * - "Agregar atributo email tipo String a Usuario"
 * - "Agregar id Long a Usuario"
 * - "Renombrar atributo email a correo en Usuario"
 * - "Cambiar tipo de precio a Double en Producto"
 * - "Eliminar atributo telefono de Usuario"
 * 
 * Relaciones:
 * - "Usuario tiene muchos Pedidos" (Asociación 1..*)
 * - "Departamento contiene Empleados" (Agregación)
 * - "Factura se compone de DetalleFactura" (Composición)
 * - "Admin extiende Usuario" (Herencia)
 * - "Pedido usa Producto" (Dependencia)
 * - "Eliminar relación entre Usuario y Pedido"
 * 
 * Multiplicidades en español:
 * - "uno a uno" -> 1..1
 * - "uno a muchos" -> 1..*
 * - "muchos a muchos" -> *..*
 * - "cero o uno" -> 0..1
 * - "cero o mas" -> 0..*
 * 
 * Sistemas predefinidos:
 * - "Crear sistema de ventas"
 * - "Crear sistema de biblioteca"
 * - "Crear sistema de hospital"
 * - "Crear sistema de ecommerce"
 * - "Crear sistema escolar"
 * - "Crear sistema de restaurante"
 */
