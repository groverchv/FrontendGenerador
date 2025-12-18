// src/pages/components/Diagramador/components/AsistenteIA/ParserComandos.js
// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 PARSER AVANZADO DE COMANDOS EN LENGUAJE NATURAL
// ═══════════════════════════════════════════════════════════════════════════════
// Este módulo analiza el texto del usuario y extrae las acciones a realizar
// sobre el diagrama UML sin necesidad de llamar a la IA para comandos simples.

import {
  normalizarTipo,
  normalizarMultiplicidad,
  TIPOS_DATOS,
  TIPOS_RELACIONES,
} from './ReglasPromt';

/* ═══════════════════════════════════════════════════════════════════════════════
    PATRONES REGEX PARA DETECCIÓN DE COMANDOS
   ═══════════════════════════════════════════════════════════════════════════════ */

const PATRONES = {
  // ═══ ENTIDADES ═══

  // Crear entidad con atributos: "crear entidad Usuario(id Integer, nombre String)"
  crearEntidadConAttrs: /(?:crea(?:r)?|haz(?:me)?|genera(?:r)?|define|quiero|necesito|dame|nueva?)(?:\s+(?:un|una|la|el))?\s*(?:entidad|clase|tabla)?\s*([A-Za-z_]\w*)(?:\s+(?:con|que\s+tenga))?\s*\(([^)]+)\)/gi,

  // Crear entidad simple: "crear entidad Usuario"
  crearEntidadSimple: /(?:crea(?:r)?|haz(?:me)?|genera(?:r)?|define|quiero|necesito|dame|nueva?)(?:\s+(?:un|una|la|el))?\s*(?:entidad|clase|tabla)?\s+([A-Za-z_]\w*)\b(?!\s*\()/gi,

  // Renombrar entidad: "renombra Usuario a Cliente"
  renombrarEntidad: /(?:renombra(?:r)?|cambia(?:r)?(?:\s+(?:el\s+)?nombre\s+de)?)\s+(?:la\s+)?(?:entidad|clase)?\s*([A-Za-z_]\w*)\s+(?:a|por)\s+([A-Za-z_]\w*)/gi,

  // Eliminar entidad: "elimina Usuario"
  eliminarEntidad: /(?:elimina(?:r)?|borra(?:r)?|quita(?:r)?|remueve)\s+(?:la\s+)?(?:entidad|clase|tabla)?\s*([A-Za-z_]\w*)/gi,

  // ═══ ATRIBUTOS ═══

  // Agregar atributo: "agrega atributo email String a Usuario"
  agregarAtributo: /(?:agrega(?:r)?|añade|añadir|pon(?:le)?|incluye)(?:\s+(?:un|una|el|la))?\s*(?:atributo|campo|propiedad)?\s*([A-Za-z_]\w*)\s+(?:de\s+tipo\s+)?([A-Za-z_][\w<>,\s]*)\s+(?:a|en|para)\s+(?:la\s+)?(?:entidad\s+)?([A-Za-z_]\w*)/gi,

  // Agregar atributo (alternativa): "a Usuario agrégale email String"
  agregarAtributoAlt: /(?:a|en)\s+(?:la\s+)?(?:entidad\s+)?([A-Za-z_]\w*)\s+(?:agrega(?:le)?|añade(?:le)?|pon(?:le)?)\s+(?:un|una|el|la)?\s*(?:atributo|campo)?\s*([A-Za-z_]\w*)\s+(?:de\s+tipo\s+)?([A-Za-z_][\w<>,\s]*)?/gi,

  // Eliminar atributo: "quita email de Usuario"
  eliminarAtributo: /(?:quita(?:r)?|elimina(?:r)?|borra(?:r)?|saca(?:r)?|remueve)(?:\s+(?:el|la))?\s*(?:atributo|campo|propiedad)?\s*([A-Za-z_]\w*)\s+(?:de|en)\s+(?:la\s+)?(?:entidad\s+)?([A-Za-z_]\w*)/gi,

  // Renombrar atributo: "renombra telefono a celular en Usuario"
  renombrarAtributo: /(?:renombra(?:r)?|cambia(?:r)?(?:\s+(?:el\s+)?nombre\s+de)?)\s*(?:atributo|campo)?\s*([A-Za-z_]\w*)\s+(?:de|en)\s+(?:la\s+)?(?:entidad\s+)?([A-Za-z_]\w*)\s+(?:a|por)\s+([A-Za-z_]\w*)/gi,

  // Cambiar tipo: "cambia tipo de precio a BigDecimal en Producto"
  cambiarTipo: /(?:cambia(?:r)?|modifica(?:r)?)\s+(?:el\s+)?tipo\s+(?:de(?:l)?\s+)?(?:atributo\s+)?([A-Za-z_]\w*)\s+(?:a|por)\s+([A-Za-z_][\w<>,\s]*)\s+(?:en|de)\s+(?:la\s+)?(?:entidad\s+)?([A-Za-z_]\w*)/gi,

  // Limpiar atributos: "elimina todos los atributos de Usuario"
  limpiarAtributos: /(?:elimina(?:r)?|quita(?:r)?|borra(?:r)?|limpia(?:r)?)\s+(?:todos\s+)?(?:los\s+)?(?:atributos|campos)\s+(?:de|del)\s+(?:la\s+)?(?:entidad\s+)?([A-Za-z_]\w*)/gi,

  // ═══ RELACIONES ═══

  // Relación con multiplicidades: "relación Usuario 1 - * Pedido"
  relacionConMult: /(?:relaci[oó]n|asociaci[oó]n|conecta(?:r)?)\s+([A-Za-z_]\w*)\s+([01n*](?:\.\.[01n*])?)\s*[-–—]\s*([01n*](?:\.\.[01n*])?)\s+([A-Za-z_]\w*)(?:\s*\(?\s*(?:verbo:?\s*)?["']?([^"')]+)["']?\)?)?/gi,

  // Relación simple: "Usuario tiene Pedidos"
  relacionSimple: /([A-Za-z_]\w*)\s+(?:tiene|posee|contiene|agrupa)\s+(?:muchos?\s+)?([A-Za-z_]\w*)/gi,

  // Relación pertenece: "Pedido pertenece a Usuario"
  relacionPertenece: /([A-Za-z_]\w*)\s+(?:pertenece|corresponde)\s+(?:a\s+)?(?:un\s+)?([A-Za-z_]\w*)/gi,

  // Composición: "composición Pedido 1 - * DetallePedido"
  composicion: /(?:composici[oó]n)\s+([A-Za-z_]\w*)\s*(?:([01n*](?:\.\.[01n*])?)\s*[-–—]\s*([01n*](?:\.\.[01n*])?))?(?:\s+|\s*[-–—]\s*)([A-Za-z_]\w*)/gi,

  // Composición natural: "composición de Pedido y DetallePedido" o "composición de X a Y"
  composicionNatural: /(?:composici[oó]n)\s+(?:de|entre)?\s*([A-Za-z_]\w*)\s+(?:y|con|a)\s+([A-Za-z_]\w*)/gi,

  // Agregación: "agregación Universidad tiene Profesores"
  agregacion: /(?:agregaci[oó]n)\s+([A-Za-z_]\w*)\s*(?:([01n*](?:\.\.[01n*])?)\s*[-–—]\s*([01n*](?:\.\.[01n*])?))?(?:\s+|\s*[-–—]\s*)([A-Za-z_]\w*)/gi,

  // Agregación natural: "agregación de Universidad y Profesor" o "agregación de X a Y"
  agregacionNatural: /(?:agregaci[oó]n)\s+(?:de|entre)?\s*([A-Za-z_]\w*)\s+(?:y|con|a)\s+([A-Za-z_]\w*)/gi,

  // Herencia: "Empleado extiende Persona"
  herencia: /([A-Za-z_]\w*)\s+(?:extiende|hereda\s+de|es\s+un(?:a)?|deriva\s+de|->)\s+([A-Za-z_]\w*)/gi,

  // Herencia explícita: "herencia Empleado Persona"
  herenciaExplicita: /(?:herencia)\s+(?:de|entre)?\s*([A-Za-z_]\w*)\s+(?:y|con|a|->)?\s*([A-Za-z_]\w*)/gi,

  // Dependencia: "dependencia Controlador -> Servicio"
  dependencia: /(?:dependencia)\s+(?:de|entre)?\s*([A-Za-z_]\w*)\s+(?:->|y|con|a|hacia|depende\s+de)\s*([A-Za-z_]\w*)/gi,

  // N-M: "n-m Usuario y Rol"
  relacionNM: /(?:n[-–\s]*m|muchos\s+a\s+muchos)\s+(?:entre\s+)?([A-Za-z_]\w*)\s+(?:y|con)\s+([A-Za-z_]\w*)(?:\s+(?:con\s+tabla|join)\s+([A-Za-z_]\w*))?/gi,

  // Eliminar relación: "elimina relación entre Usuario y Pedido"
  eliminarRelacion: /(?:elimina(?:r)?|quita(?:r)?|borra(?:r)?)\s+(?:la\s+)?(?:relaci[oó]n|conexi[oó]n)\s+(?:entre\s+)?([A-Za-z_]\w*)\s+(?:y|con)\s+([A-Za-z_]\w*)/gi,

  // ═══ SISTEMAS PREDEFINIDOS ═══

  sistemaVentas: /(?:crea(?:r)?|genera(?:r)?|haz(?:me)?|quiero|necesito)\s+(?:un\s+)?sistema\s+(?:completo\s+)?(?:de\s+)?(?:ventas?|punto\s+de\s+venta)/gi,
  sistemaBiblioteca: /(?:crea(?:r)?|genera(?:r)?|haz(?:me)?|quiero|necesito)\s+(?:un\s+)?sistema\s+(?:completo\s+)?(?:de\s+)?biblioteca/gi,
  sistemaHospital: /(?:crea(?:r)?|genera(?:r)?|haz(?:me)?|quiero|necesito)\s+(?:un\s+)?sistema\s+(?:completo\s+)?(?:de\s+)?(?:hospital|cl[ií]nica)/gi,
  sistemaEcommerce: /(?:crea(?:r)?|genera(?:r)?|haz(?:me)?|quiero|necesito)\s+(?:un\s+)?sistema\s+(?:completo\s+)?(?:de\s+)?(?:ecommerce|e-commerce|tienda\s+online|comercio)/gi,
  sistemaEscuela: /(?:crea(?:r)?|genera(?:r)?|haz(?:me)?|quiero|necesito)\s+(?:un\s+)?sistema\s+(?:completo\s+)?(?:de\s+)?(?:escuela|colegio|educaci[oó]n)/gi,
  sistemaRestaurante: /(?:crea(?:r)?|genera(?:r)?|haz(?:me)?|quiero|necesito)\s+(?:un\s+)?sistema\s+(?:completo\s+)?(?:de\s+)?restaurante/gi,
};

/* ═══════════════════════════════════════════════════════════════════════════════
   🔧 FUNCIONES DE PARSING
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Parsea los atributos de una cadena: "id Integer, nombre String, activo Boolean"
 */
function parseAtributos(attrString) {
  if (!attrString || attrString.trim() === "") {
    return [{ name: "id", type: "Integer" }];
  }

  const attrs = [];
  const partes = attrString.split(",");

  for (const parte of partes) {
    const tokens = parte.trim().split(/\s+/);
    if (tokens.length >= 1) {
      const nombre = tokens[0].replace(/[^a-zA-Z0-9_]/g, "");
      const tipo = normalizarTipo(tokens[1] || "String");

      if (nombre) {
        attrs.push({ name: nombre, type: tipo });
      }
    }
  }

  // Asegurar que siempre haya un id
  if (!attrs.some(a => a.name.toLowerCase() === "id")) {
    attrs.unshift({ name: "id", type: "Integer" });
  }

  return attrs;
}

/**
 * Normaliza una multiplicidad del texto capturado
 */
function parseMultiplicidad(mult) {
  if (!mult) return "1";

  const m = mult.toLowerCase().trim();

  // Mapeos directos
  const mapeos = {
    "n": "*",
    "0..n": "*",
    "1..n": "1..*",
    "0..1": "0..1",
    "1": "1",
    "*": "*",
    "0..*": "*",
    "1..*": "1..*",
  };

  return mapeos[m] || normalizarMultiplicidad(m);
}

/**
 * Parser principal de comandos
 * @param {string} texto - Texto del usuario
 * @param {Object} modeloActual - Modelo actual del diagrama
 * @returns {Object} { actions: [], explanation: string, needsAI: boolean }
 */
export function parseComando(texto) {
  const actions = [];
  let explanation = "";
  let needsAI = false;

  // Verificar sistemas predefinidos primero
  if (PATRONES.sistemaVentas.test(texto)) {
    return {
      actions: [],
      explanation: "Se detectó solicitud de sistema de ventas",
      needsAI: false,
      template: "ventas"
    };
  }
  if (PATRONES.sistemaBiblioteca.test(texto)) {
    return { actions: [], explanation: "Sistema de biblioteca", needsAI: false, template: "biblioteca" };
  }
  if (PATRONES.sistemaHospital.test(texto)) {
    return { actions: [], explanation: "Sistema de hospital", needsAI: false, template: "hospital" };
  }
  if (PATRONES.sistemaEcommerce.test(texto)) {
    return { actions: [], explanation: "Sistema de e-commerce", needsAI: false, template: "ecommerce" };
  }
  if (PATRONES.sistemaEscuela.test(texto)) {
    return { actions: [], explanation: "Sistema de escuela", needsAI: false, template: "escuela" };
  }
  if (PATRONES.sistemaRestaurante.test(texto)) {
    return { actions: [], explanation: "Sistema de restaurante", needsAI: false, template: "restaurante" };
  }

  // ═══ PROCESAR ENTIDADES ═══

  // Crear entidad con atributos
  let match;
  PATRONES.crearEntidadConAttrs.lastIndex = 0;
  while ((match = PATRONES.crearEntidadConAttrs.exec(texto)) !== null) {
    const nombre = match[1].trim();
    const attrs = parseAtributos(match[2]);
    actions.push({
      op: "update_entity",
      name: nombre,
      attrs: attrs
    });
    explanation += `Crear entidad ${nombre} con ${attrs.length} atributos. `;
  }

  // Crear entidad simple (solo si no se creó con atributos)
  if (actions.length === 0) {
    PATRONES.crearEntidadSimple.lastIndex = 0;
    while ((match = PATRONES.crearEntidadSimple.exec(texto)) !== null) {
      const nombre = match[1].trim();
      // Evitar palabras reservadas
      if (!["con", "que", "tiene", "de", "la", "el"].includes(nombre.toLowerCase())) {
        actions.push({
          op: "add_entity",
          name: nombre,
          attrs: [{ name: "id", type: "Integer" }]
        });
        explanation += `Crear entidad ${nombre}. `;
      }
    }
  }

  // Renombrar entidad
  PATRONES.renombrarEntidad.lastIndex = 0;
  while ((match = PATRONES.renombrarEntidad.exec(texto)) !== null) {
    actions.push({
      op: "rename_entity",
      old: match[1].trim(),
      name: match[2].trim()
    });
    explanation += `Renombrar ${match[1]} a ${match[2]}. `;
  }

  // Eliminar entidad
  PATRONES.eliminarEntidad.lastIndex = 0;
  while ((match = PATRONES.eliminarEntidad.exec(texto)) !== null) {
    const nombre = match[1].trim();
    // Evitar palabras comunes
    if (!["los", "las", "todos", "todas", "atributos", "relacion", "relaciones"].includes(nombre.toLowerCase())) {
      actions.push({
        op: "remove_entity",
        name: nombre
      });
      explanation += `Eliminar entidad ${nombre}. `;
    }
  }

  // ═══ PROCESAR ATRIBUTOS ═══

  // Agregar atributo
  PATRONES.agregarAtributo.lastIndex = 0;
  while ((match = PATRONES.agregarAtributo.exec(texto)) !== null) {
    actions.push({
      op: "add_attr",
      entity: match[3].trim(),
      attr: {
        name: match[1].trim(),
        type: normalizarTipo(match[2].trim())
      }
    });
    explanation += `Agregar ${match[1]} a ${match[3]}. `;
  }

  // Agregar atributo (alternativa)
  PATRONES.agregarAtributoAlt.lastIndex = 0;
  while ((match = PATRONES.agregarAtributoAlt.exec(texto)) !== null) {
    actions.push({
      op: "add_attr",
      entity: match[1].trim(),
      attr: {
        name: match[2].trim(),
        type: normalizarTipo(match[3]?.trim() || "String")
      }
    });
    explanation += `Agregar ${match[2]} a ${match[1]}. `;
  }

  // Eliminar atributo
  PATRONES.eliminarAtributo.lastIndex = 0;
  while ((match = PATRONES.eliminarAtributo.exec(texto)) !== null) {
    actions.push({
      op: "remove_attr",
      entity: match[2].trim(),
      name: match[1].trim()
    });
    explanation += `Eliminar atributo ${match[1]} de ${match[2]}. `;
  }

  // Renombrar atributo
  PATRONES.renombrarAtributo.lastIndex = 0;
  while ((match = PATRONES.renombrarAtributo.exec(texto)) !== null) {
    actions.push({
      op: "update_attr",
      entity: match[2].trim(),
      old: match[1].trim(),
      attr: { name: match[3].trim() }
    });
    explanation += `Renombrar ${match[1]} a ${match[3]} en ${match[2]}. `;
  }

  // Cambiar tipo
  PATRONES.cambiarTipo.lastIndex = 0;
  while ((match = PATRONES.cambiarTipo.exec(texto)) !== null) {
    actions.push({
      op: "update_attr",
      entity: match[3].trim(),
      old: match[1].trim(),
      attr: {
        name: match[1].trim(),
        type: normalizarTipo(match[2].trim())
      }
    });
    explanation += `Cambiar tipo de ${match[1]} a ${match[2]} en ${match[3]}. `;
  }

  // Limpiar atributos
  PATRONES.limpiarAtributos.lastIndex = 0;
  while ((match = PATRONES.limpiarAtributos.exec(texto)) !== null) {
    actions.push({
      op: "clear_attrs",
      entity: match[1].trim()
    });
    explanation += `Limpiar atributos de ${match[1]}. `;
  }

  // ═══ PROCESAR RELACIONES ═══

  // Relación con multiplicidades
  PATRONES.relacionConMult.lastIndex = 0;
  while ((match = PATRONES.relacionConMult.exec(texto)) !== null) {
    actions.push({
      op: "add_relation",
      a: match[1].trim(),
      b: match[4].trim(),
      mA: parseMultiplicidad(match[2]),
      mB: parseMultiplicidad(match[3]),
      relKind: "ASSOC",
      verb: match[5]?.trim() || "",
      direction: "A->B"
    });
    explanation += `Relación ${match[1]} ${match[2]} - ${match[3]} ${match[4]}. `;
  }

  // Relación simple "tiene"
  PATRONES.relacionSimple.lastIndex = 0;
  while ((match = PATRONES.relacionSimple.exec(texto)) !== null) {
    actions.push({
      op: "add_relation",
      a: match[1].trim(),
      b: match[2].trim(),
      mA: "1",
      mB: "*",
      relKind: "ASSOC",
      verb: "tiene",
      direction: "A->B"
    });
    explanation += `${match[1]} tiene ${match[2]}. `;
  }

  // Relación "pertenece"
  PATRONES.relacionPertenece.lastIndex = 0;
  while ((match = PATRONES.relacionPertenece.exec(texto)) !== null) {
    actions.push({
      op: "add_relation",
      a: match[1].trim(),
      b: match[2].trim(),
      mA: "*",
      mB: "1",
      relKind: "ASSOC",
      verb: "pertenece a",
      direction: "A->B"
    });
    explanation += `${match[1]} pertenece a ${match[2]}. `;
  }

  // Composición con multiplicidades
  PATRONES.composicion.lastIndex = 0;
  while ((match = PATRONES.composicion.exec(texto)) !== null) {
    actions.push({
      op: "add_relation",
      a: match[1].trim(),
      b: match[4].trim(),
      mA: parseMultiplicidad(match[2] || "1"),
      mB: parseMultiplicidad(match[3] || "*"),
      relKind: "COMP",
      owning: "A",
      direction: "A->B"
    });
    explanation += `Composición ${match[1]} - ${match[4]}. `;
  }

  // Composición natural
  PATRONES.composicionNatural.lastIndex = 0;
  while ((match = PATRONES.composicionNatural.exec(texto)) !== null) {
    // Evitar duplicados
    const yaExiste = actions.some(a =>
      a.op === "add_relation" && a.a === match[1].trim() && a.b === match[2].trim()
    );
    if (!yaExiste) {
      actions.push({
        op: "add_relation",
        a: match[1].trim(),
        b: match[2].trim(),
        mA: "1",
        mB: "*",
        relKind: "COMP",
        owning: "A",
        direction: "A->B"
      });
      explanation += `Composición ${match[1]} ◆- ${match[2]}. `;
    }
  }

  // Agregación
  PATRONES.agregacion.lastIndex = 0;
  while ((match = PATRONES.agregacion.exec(texto)) !== null) {
    actions.push({
      op: "add_relation",
      a: match[1].trim(),
      b: match[4].trim(),
      mA: parseMultiplicidad(match[2] || "1"),
      mB: parseMultiplicidad(match[3] || "*"),
      relKind: "AGGR",
      owning: "A",
      direction: "A->B"
    });
    explanation += `Agregación ${match[1]} - ${match[4]}. `;
  }

  // Agregación natural
  PATRONES.agregacionNatural.lastIndex = 0;
  while ((match = PATRONES.agregacionNatural.exec(texto)) !== null) {
    const yaExiste = actions.some(a =>
      a.op === "add_relation" && a.a === match[1].trim() && a.b === match[2].trim()
    );
    if (!yaExiste) {
      const newAction = {
        op: "add_relation",
        a: match[1].trim(),
        b: match[2].trim(),
        mA: "1",
        mB: "*",
        relKind: "AGGR",
        owning: "A",
        direction: "A->B"
      };
      console.log(`[parseComando] ✅ Agregación detectada: ${match[1]} → ${match[2]}, relKind=${newAction.relKind}`);
      actions.push(newAction);
      explanation += `Agregación ${match[1]} ◇- ${match[2]}. `;
    }
  }

  // Herencia
  PATRONES.herencia.lastIndex = 0;
  while ((match = PATRONES.herencia.exec(texto)) !== null) {
    actions.push({
      op: "add_relation",
      a: match[1].trim(),
      b: match[2].trim(),
      relKind: "INHERIT",
      direction: "A->B"
    });
    explanation += `${match[1]} hereda de ${match[2]}. `;
  }

  // Herencia explícita
  PATRONES.herenciaExplicita.lastIndex = 0;
  while ((match = PATRONES.herenciaExplicita.exec(texto)) !== null) {
    const yaExiste = actions.some(a =>
      a.op === "add_relation" && a.relKind === "INHERIT" && a.a === match[1].trim()
    );
    if (!yaExiste) {
      actions.push({
        op: "add_relation",
        a: match[1].trim(),
        b: match[2].trim(),
        relKind: "INHERIT",
        direction: "A->B"
      });
      explanation += `Herencia ${match[1]} △- ${match[2]}. `;
    }
  }

  // Dependencia
  PATRONES.dependencia.lastIndex = 0;
  while ((match = PATRONES.dependencia.exec(texto)) !== null) {
    actions.push({
      op: "add_relation",
      a: match[1].trim(),
      b: match[2].trim(),
      relKind: "DEPEND",
      verb: "depende de",
      direction: "A->B"
    });
    explanation += `Dependencia ${match[1]} ---> ${match[2]}. `;
  }

  // N-M
  PATRONES.relacionNM.lastIndex = 0;
  while ((match = PATRONES.relacionNM.exec(texto)) !== null) {
    actions.push({
      op: "add_relation_nm",
      a: match[1].trim(),
      b: match[2].trim(),
      joinName: match[3]?.trim() || `${match[1].trim()}_${match[2].trim()}`
    });
    explanation += `Relación N-M ${match[1]} ↔ ${match[2]}. `;
  }

  // Eliminar relación
  PATRONES.eliminarRelacion.lastIndex = 0;
  while ((match = PATRONES.eliminarRelacion.exec(texto)) !== null) {
    actions.push({
      op: "remove_relation",
      a: match[1].trim(),
      b: match[2].trim()
    });
    explanation += `Eliminar relación entre ${match[1]} y ${match[2]}. `;
  }

  // Si no se detectó nada, marcar para usar IA
  if (actions.length === 0) {
    needsAI = true;
    explanation = "No se pudo interpretar el comando localmente. Consultando IA...";
  }

  return {
    actions,
    explanation: explanation || "Comando procesado correctamente.",
    needsAI
  };
}

/**
 * Detecta la intención principal del comando
 */
export function detectarIntencion(texto) {
  const textoLower = texto.toLowerCase();

  // Intenciones de entidad
  if (/crea(?:r)?|genera(?:r)?|haz(?:me)?|nueva?|quiero|necesito|dame/.test(textoLower) &&
    /entidad|clase|tabla/.test(textoLower)) {
    return "crear_entidad";
  }

  // Intenciones de atributo
  if (/agrega(?:r)?|añade|pon(?:le)?|incluye/.test(textoLower) &&
    /atributo|campo|propiedad/.test(textoLower)) {
    return "agregar_atributo";
  }

  // Intenciones de relación
  if (/relaci[oó]n|asociaci[oó]n|conecta|vincula|herencia|composici[oó]n|agregaci[oó]n/.test(textoLower)) {
    return "crear_relacion";
  }

  // Intenciones de eliminación
  if (/elimina(?:r)?|borra(?:r)?|quita(?:r)?|remueve/.test(textoLower)) {
    return "eliminar";
  }

  // Intenciones de modificación
  if (/renombra(?:r)?|cambia(?:r)?|modifica(?:r)?/.test(textoLower)) {
    return "modificar";
  }

  // Sistema completo
  if (/sistema/.test(textoLower)) {
    return "sistema_completo";
  }

  return "desconocido";
}

/**
 * Obtiene sugerencias de autocompletado basadas en el texto parcial
 */
export function obtenerSugerencias(textoPartial, modeloActual) {
  const sugerencias = [];
  const textoLower = textoPartial.toLowerCase();

  // Sugerir completar con entidades existentes
  if (modeloActual?.entities) {
    for (const entity of modeloActual.entities) {
      if (entity.name.toLowerCase().includes(textoLower)) {
        sugerencias.push({
          tipo: "entidad",
          valor: entity.name,
          descripcion: `Entidad con ${entity.attrs?.length || 0} atributos`
        });
      }
    }
  }

  // Sugerir tipos de datos
  if (/tipo|type/.test(textoLower)) {
    for (const categoria of Object.values(TIPOS_DATOS)) {
      for (const tipo of categoria) {
        sugerencias.push({
          tipo: "tipo_dato",
          valor: tipo.nombre,
          descripcion: tipo.descripcion
        });
      }
    }
  }

  // Sugerir tipos de relación
  if (/relaci[oó]n|asociaci[oó]n/.test(textoLower)) {
    for (const [, rel] of Object.entries(TIPOS_RELACIONES)) {
      sugerencias.push({
        tipo: "relacion",
        valor: rel.nombre,
        descripcion: rel.descripcion
      });
    }
  }

  return sugerencias.slice(0, 10);
}

export default {
  parseComando,
  detectarIntencion,
  obtenerSugerencias,
  parseAtributos,
  PATRONES,
};
