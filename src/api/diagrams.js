import api from "./api";

/**
 * API para gestión de diagramas UML
 * Proporciona métodos para obtener, actualizar y validar diagramas
 */
export const DiagramsApi = {
  /**
   * Obtiene el diagrama de un proyecto
   * @param {string|number} projectId - ID del proyecto
   * @returns {Promise<Object>} Diagrama con nodes, edges, version y name
   * @throws {Error} Si falla la petición (excepto 404)
   */
  get: async (projectId) => {
    if (!projectId) {
      throw new Error("[DiagramsApi] ID de proyecto requerido");
    }
    
    try {
      const response = await api.get(`/api/projects/${projectId}/diagram`);
      const data = response.data || {};
      
      // Normalizar y validar respuesta
      return {
        nodes: data.nodes || "[]",
        edges: data.edges || "[]",
        version: data.version || 1,
        name: data.name || "Principal"
      };
    } catch (error) {
      // Si no existe, devolver estructura vacía
      if (error.response?.status === 404) {
        console.warn(`[DiagramsApi] Diagrama no encontrado para proyecto ${projectId}`);
        return { 
          nodes: "[]", 
          edges: "[]", 
          version: 1,
          name: "Principal" 
        };
      }
      console.error(`[DiagramsApi] Error obteniendo diagrama:`, error?.message || error);
      throw error;
    }
  },

  /**
   * Actualiza el diagrama de un proyecto
   * @param {string|number} projectId - ID del proyecto
   * @param {Object} body - Datos del diagrama
   * @param {string} body.nodes - Nodos serializados en JSON
   * @param {string} body.edges - Aristas serializadas en JSON
   * @param {string} [body.name] - Nombre del diagrama
   * @param {Object} [body.viewport] - Vista del canvas
   * @returns {Promise<Object>} Diagrama actualizado
   * @throws {Error} Si falla la petición o validación
   */
  update: async (projectId, body) => {
    if (!projectId) {
      throw new Error("[DiagramsApi] ID de proyecto requerido");
    }
    if (!body || typeof body !== 'object') {
      throw new Error("[DiagramsApi] Datos de diagrama inválidos");
    }
    if (!body.nodes || !body.edges) {
      throw new Error("[DiagramsApi] Nodes y edges son requeridos");
    }
    
    try {
      const response = await api.put(`/api/projects/${projectId}/diagram`, body);
      return response.data;
    } catch (error) {
      console.error(`[DiagramsApi] Error actualizando diagrama:`, error?.message || error);
      throw error;
    }
  },

  /**
   * Valida la estructura de un diagrama antes de guardarlo
   * @param {Array} nodes - Array de nodos
   * @param {Array} edges - Array de aristas
   * @returns {Object} Resultado de validación con {valid: boolean, errors: string[]}
   */
  validate: (nodes, edges) => {
    const errors = [];
    
    // Validar tipos
    if (!Array.isArray(nodes)) {
      errors.push("Los nodos deben ser un array");
    }
    
    if (!Array.isArray(edges)) {
      errors.push("Las aristas deben ser un array");
    }
    
    // Si no son arrays, no podemos continuar validando
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      return { valid: false, errors };
    }
    
    // Validar estructura de nodos
    nodes.forEach((node, index) => {
      if (!node.id) {
        errors.push(`Nodo ${index} no tiene ID`);
      }
      if (!node.type) {
        errors.push(`Nodo ${node.id || index} no tiene tipo`);
      }
      if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
        errors.push(`Nodo ${node.id || index} tiene posición inválida`);
      }
      if (!node.data || !node.data.label) {
        errors.push(`Nodo ${node.id || index} no tiene label en data`);
      }
    });
    
    // Validar que todas las referencias de edges existan en nodes
    if (nodes.length > 0 && edges.length > 0) {
      const nodeIds = new Set(nodes.map(n => n.id));
      const invalidEdges = edges.filter(e => 
        !e.source || !e.target || 
        !nodeIds.has(e.source) || !nodeIds.has(e.target)
      );
      
      if (invalidEdges.length > 0) {
        errors.push(`Hay ${invalidEdges.length} relación(es) con nodos inexistentes o inválidas`);
      }
    }
    
    // Validar estructura de edges
    edges.forEach((edge, index) => {
      if (!edge.id) {
        errors.push(`Edge ${index} no tiene ID`);
      }
      if (!edge.source) {
        errors.push(`Edge ${edge.id || index} no tiene source`);
      }
      if (!edge.target) {
        errors.push(`Edge ${edge.id || index} no tiene target`);
      }
      if (!edge.type) {
        errors.push(`Edge ${edge.id || index} no tiene tipo`);
      }
    });
    
    // Detectar ciclos de herencia (prevenir errores lógicos)
    const inheritanceEdges = edges.filter(e => e.data?.relKind === 'INHERIT');
    if (inheritanceEdges.length > 0) {
      const graph = new Map();
      inheritanceEdges.forEach(e => {
        if (!graph.has(e.source)) graph.set(e.source, []);
        graph.get(e.source).push(e.target);
      });
      
      // Detectar ciclos usando DFS
      const visited = new Set();
      const recStack = new Set();
      
      const hasCycle = (nodeId) => {
        if (recStack.has(nodeId)) return true;
        if (visited.has(nodeId)) return false;
        
        visited.add(nodeId);
        recStack.add(nodeId);
        
        const neighbors = graph.get(nodeId) || [];
        for (const neighbor of neighbors) {
          if (hasCycle(neighbor)) return true;
        }
        
        recStack.delete(nodeId);
        return false;
      };
      
      for (const nodeId of graph.keys()) {
        if (hasCycle(nodeId)) {
          errors.push("Se detectó un ciclo en las relaciones de herencia");
          break;
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Valida y limpia un diagrama antes de guardarlo
   * @param {Array} nodes - Array de nodos
   * @param {Array} edges - Array de aristas
   * @returns {Object} Diagrama limpio {nodes, edges} o null si inválido
   */
  sanitize: (nodes, edges) => {
    try {
      if (!Array.isArray(nodes) || !Array.isArray(edges)) {
        return null;
      }
      
      const nodeIds = new Set(nodes.map(n => n.id));
      
      // Limpiar edges que referencian nodos inexistentes
      const cleanEdges = edges.filter(e => 
        e.source && e.target && 
        nodeIds.has(e.source) && nodeIds.has(e.target)
      );
      
      return { nodes, edges: cleanEdges };
    } catch (error) {
      console.error("[DiagramsApi] Error sanitizando diagrama:", error);
      return null;
    }
  },
};
