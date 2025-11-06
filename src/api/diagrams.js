import api from "./api";

export const DiagramsApi = {
  // Obtener diagrama de un proyecto
  get: async (projectId) => {
    try {
      const response = await api.get(`/api/projects/${projectId}/diagram`);
      return response.data;
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
      console.error(`[DiagramsApi] Error obteniendo diagrama:`, error.userMessage);
      throw error;
    }
  },

  // Actualizar diagrama de un proyecto
  update: async (projectId, body) => {
    try {
      const response = await api.put(`/api/projects/${projectId}/diagram`, body);
      return response.data;
    } catch (error) {
      console.error(`[DiagramsApi] Error actualizando diagrama:`, error.userMessage);
      throw error;
    }
  },

  // Validar datos antes de guardar
  validate: (nodes, edges) => {
    const errors = [];
    
    if (!Array.isArray(nodes)) {
      errors.push("Los nodos deben ser un array");
    }
    
    if (!Array.isArray(edges)) {
      errors.push("Las aristas deben ser un array");
    }
    
    // Validar que todas las referencias de edges existan en nodes
    if (Array.isArray(nodes) && Array.isArray(edges)) {
      const nodeIds = new Set(nodes.map(n => n.id));
      const invalidEdges = edges.filter(e => 
        !nodeIds.has(e.source) || !nodeIds.has(e.target)
      );
      
      if (invalidEdges.length > 0) {
        errors.push(`Hay ${invalidEdges.length} relación(es) con nodos inexistentes`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  },

  // ⚠️ No hay remove directo; se elimina al borrar el proyecto
};
