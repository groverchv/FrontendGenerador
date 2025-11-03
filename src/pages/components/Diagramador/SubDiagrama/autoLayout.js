/**
 * Auto-layout profesional para diagramas UML
 * Distribuye entidades de forma ordenada, considerando relaciones y jerarquías
 */

const NODE_WIDTH = 220;
const NODE_HEIGHT = 150;
const HORIZONTAL_GAP = 180;
const VERTICAL_GAP = 120;
const LAYER_VERTICAL_GAP = 200;

/**
 * Calcula el nivel jerárquico de cada entidad basándose en herencias
 */
function calculateHierarchyLevels(nodes, edges) {
  const levels = new Map();
  const inheritanceEdges = edges.filter(e => e.data?.relKind === "INHERIT");
  
  // Encontrar nodos raíz (sin padre)
  const childIds = new Set(inheritanceEdges.map(e => e.source));
  const rootIds = nodes
    .map(n => n.id)
    .filter(id => !childIds.has(id));
  
  // BFS para asignar niveles
  const queue = rootIds.map(id => ({ id, level: 0 }));
  const visited = new Set();
  
  while (queue.length > 0) {
    const { id, level } = queue.shift();
    if (visited.has(id)) continue;
    
    visited.add(id);
    levels.set(id, level);
    
    // Buscar hijos
    const children = inheritanceEdges
      .filter(e => e.target === id)
      .map(e => e.source);
    
    children.forEach(childId => {
      if (!visited.has(childId)) {
        queue.push({ id: childId, level: level + 1 });
      }
    });
  }
  
  // Asignar nivel 0 a nodos sin relaciones de herencia
  nodes.forEach(n => {
    if (!levels.has(n.id)) {
      levels.set(n.id, 0);
    }
  });
  
  return levels;
}

/**
 * Agrupa entidades por categorías semánticas
 */
function categorizeEntities(nodes) {
  const categories = {
    core: [],      // Entidades principales del negocio
    users: [],     // Usuario, Perfil, Rol, etc.
    transactions: [], // Venta, Pedido, Pago, etc.
    catalog: [],   // Producto, Categoria, etc.
    details: [],   // Detalles, Items, Líneas
    auxiliary: [], // Entidades de soporte
    joins: []      // Tablas intermedias N-M
  };
  
  nodes.forEach(node => {
    const name = (node.data?.label || "").toLowerCase();
    const attrs = node.data?.attrs || [];
    
    // Detectar tablas join (tienen solo 2 atributos tipo "_id")
    const isJoinTable = attrs.length <= 3 && 
      attrs.filter(a => a.name.endsWith("_id") || a.name.endsWith("Id")).length >= 2;
    
    if (isJoinTable) {
      categories.joins.push(node);
    } else if (/usuario|user|perfil|profile|rol|role|auth/.test(name)) {
      categories.users.push(node);
    } else if (/venta|pedido|orden|order|pago|payment|factura|invoice|transac/.test(name)) {
      categories.transactions.push(node);
    } else if (/producto|product|categoria|category|articulo|item(?!pedido)/.test(name)) {
      categories.catalog.push(node);
    } else if (/detalle|detail|linea|line|item/.test(name)) {
      categories.details.push(node);
    } else {
      // Determinar si es core o auxiliar por número de relaciones
      categories.core.push(node);
    }
  });
  
  return categories;
}

/**
 * Calcula el número de conexiones de cada nodo
 */
function calculateConnections(nodes, edges) {
  const connections = new Map();
  
  nodes.forEach(n => connections.set(n.id, 0));
  
  edges.forEach(e => {
    connections.set(e.source, (connections.get(e.source) || 0) + 1);
    connections.set(e.target, (connections.get(e.target) || 0) + 1);
  });
  
  return connections;
}

/**
 * Layout jerárquico para herencias
 */
function hierarchicalLayout(nodes, edges, levels) {
  const positioned = new Map();
  const maxLevel = Math.max(...levels.values());
  
  // Agrupar por nivel
  const byLevel = new Map();
  for (let i = 0; i <= maxLevel; i++) {
    byLevel.set(i, []);
  }
  
  nodes.forEach(node => {
    const level = levels.get(node.id) || 0;
    byLevel.get(level).push(node);
  });
  
  // Posicionar por niveles
  byLevel.forEach((nodesInLevel, level) => {
    const y = 100 + level * LAYER_VERTICAL_GAP;
    const totalWidth = nodesInLevel.length * (NODE_WIDTH + HORIZONTAL_GAP);
    const startX = Math.max(100, (1200 - totalWidth) / 2);
    
    nodesInLevel.forEach((node, index) => {
      const x = startX + index * (NODE_WIDTH + HORIZONTAL_GAP);
      positioned.set(node.id, { x, y });
    });
  });
  
  return positioned;
}

/**
 * Layout en grid ordenado por categorías
 */
function categorizedGridLayout(nodes, edges, categories) {
  const positioned = new Map();
  let currentY = 100;
  
  // Orden de renderizado
  const order = ['users', 'core', 'catalog', 'transactions', 'details', 'joins', 'auxiliary'];
  
  order.forEach(catName => {
    const catNodes = categories[catName] || [];
    if (catNodes.length === 0) return;
    
    // Calcular cuántos nodos por fila (máximo 4)
    const nodesPerRow = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(catNodes.length))));
    const rows = Math.ceil(catNodes.length / nodesPerRow);
    
    for (let row = 0; row < rows; row++) {
      const rowNodes = catNodes.slice(row * nodesPerRow, (row + 1) * nodesPerRow);
      const rowWidth = rowNodes.length * (NODE_WIDTH + HORIZONTAL_GAP);
      const startX = Math.max(100, (1400 - rowWidth) / 2);
      
      rowNodes.forEach((node, col) => {
        const x = startX + col * (NODE_WIDTH + HORIZONTAL_GAP);
        const y = currentY;
        positioned.set(node.id, { x, y });
      });
      
      currentY += NODE_HEIGHT + VERTICAL_GAP;
    }
    
    // Espacio extra entre categorías
    currentY += 60;
  });
  
  return positioned;
}

/**
 * Layout circular para sistemas pequeños (<8 entidades)
 */
function circularLayout(nodes, connections) {
  const positioned = new Map();
  const centerX = 600;
  const centerY = 400;
  const radius = 300;
  
  // Ordenar por número de conexiones (más conectados al centro)
  const sorted = [...nodes].sort((a, b) => {
    return (connections.get(b.id) || 0) - (connections.get(a.id) || 0);
  });
  
  sorted.forEach((node, index) => {
    const angle = (index / nodes.length) * 2 * Math.PI - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    positioned.set(node.id, { x, y });
  });
  
  return positioned;
}

/**
 * Layout force-directed simplificado (reservado para uso futuro)
 */
/* eslint-disable-next-line no-unused-vars */
function forceDirectedLayout(nodes, edges, iterations = 50) {
  const positioned = new Map();
  
  // Inicializar posiciones aleatorias
  nodes.forEach((node, i) => {
    positioned.set(node.id, {
      x: 200 + (i % 4) * 300 + Math.random() * 50,
      y: 200 + Math.floor(i / 4) * 250 + Math.random() * 50
    });
  });
  
  const k = 200; // Constante de resorte
  const repulsion = 10000; // Fuerza de repulsión
  
  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map();
    nodes.forEach(n => forces.set(n.id, { x: 0, y: 0 }));
    
    // Fuerzas de repulsión entre todos los nodos
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];
        const p1 = positioned.get(n1.id);
        const p2 = positioned.get(n2.id);
        
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        
        forces.get(n1.id).x -= fx;
        forces.get(n1.id).y -= fy;
        forces.get(n2.id).x += fx;
        forces.get(n2.id).y += fy;
      }
    }
    
    // Fuerzas de atracción entre nodos conectados
    edges.forEach(edge => {
      const p1 = positioned.get(edge.source);
      const p2 = positioned.get(edge.target);
      if (!p1 || !p2) return;
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      
      const force = (dist * dist) / k;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      
      forces.get(edge.source).x += fx * 0.5;
      forces.get(edge.source).y += fy * 0.5;
      forces.get(edge.target).x -= fx * 0.5;
      forces.get(edge.target).y -= fy * 0.5;
    });
    
    // Aplicar fuerzas
    const damping = 0.8;
    nodes.forEach(node => {
      const pos = positioned.get(node.id);
      const force = forces.get(node.id);
      
      pos.x += force.x * damping;
      pos.y += force.y * damping;
      
      // Mantener dentro de límites
      pos.x = Math.max(50, Math.min(1800, pos.x));
      pos.y = Math.max(50, Math.min(1200, pos.y));
    });
  }
  
  return positioned;
}

/**
 * Función principal: selecciona y aplica el mejor layout
 */
export function applyAutoLayout(nodes, edges) {
  if (nodes.length === 0) return nodes;
  
  const connections = calculateConnections(nodes, edges);
  const levels = calculateHierarchyLevels(nodes, edges);
  const categories = categorizeEntities(nodes);
  
  let positioned;
  
  // Seleccionar estrategia según características
  const hasInheritance = edges.some(e => e.data?.relKind === "INHERIT");
  const maxLevel = Math.max(...levels.values());
  
  if (nodes.length <= 7) {
    // Circular para sistemas pequeños
    positioned = circularLayout(nodes, connections);
  } else if (hasInheritance && maxLevel > 0) {
    // Jerárquico si hay herencias
    positioned = hierarchicalLayout(nodes, edges, levels);
  } else {
    // Grid categorizado para la mayoría de casos
    positioned = categorizedGridLayout(nodes, edges, categories);
  }
  
  // Aplicar posiciones
  return nodes.map(node => ({
    ...node,
    position: positioned.get(node.id) || node.position || { x: 100, y: 100 }
  }));
}

/**
 * Optimiza las posiciones para minimizar cruces de líneas
 */
export function optimizeEdgeCrossings(nodes) {
  // Implementación simplificada: ajustar nodos muy cercanos
  const MIN_DISTANCE = 200;
  
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const n1 = nodes[i];
      const n2 = nodes[j];
      
      const dx = n2.position.x - n1.position.x;
      const dy = n2.position.y - n1.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < MIN_DISTANCE && dist > 0) {
        const push = (MIN_DISTANCE - dist) / 2;
        const angle = Math.atan2(dy, dx);
        
        n1.position.x -= Math.cos(angle) * push;
        n1.position.y -= Math.sin(angle) * push;
        n2.position.x += Math.cos(angle) * push;
        n2.position.y += Math.sin(angle) * push;
      }
    }
  }
  
  return nodes;
}
