import api from "./api";

/**
 * API para gestión de proyectos y diagramas
 * Proporciona métodos CRUD para proyectos y operaciones de diagrama
 */
export const ProjectsApi = {
  /**
   * Lista todos los proyectos disponibles
   * @returns {Promise<Array>} Lista de proyectos
   * @throws {Error} Si falla la petición
   */
  list: async () => {
    try {
      const response = await api.get("/api/projects");
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error("[ProjectsApi] Error listando proyectos:", error?.message || error);
      throw error;
    }
  },

  /**
   * Obtiene un proyecto específico por su ID
   * @param {string|number} id - ID del proyecto
   * @returns {Promise<Object>} Datos del proyecto
   * @throws {Error} Si falla la petición o el ID es inválido
   */
  get: async (id) => {
    if (!id) {
      throw new Error("[ProjectsApi] ID de proyecto requerido");
    }
    try {
      const response = await api.get(`/api/projects/${id}`);
      return response.data || null;
    } catch (error) {
      console.error(`[ProjectsApi] Error obteniendo proyecto ${id}:`, error?.message || error);
      throw error;
    }
  },

  /**
   * Crea un nuevo proyecto
   * @param {Object} body - Datos del proyecto
   * @param {string} body.name - Nombre del proyecto (requerido)
   * @param {string} [body.description] - Descripción del proyecto
   * @returns {Promise<Object>} Proyecto creado
   * @throws {Error} Si falla la petición o los datos son inválidos
   */
  create: async (body) => {
    if (!body || !body.name || typeof body.name !== 'string' || !body.name.trim()) {
      throw new Error("[ProjectsApi] Nombre de proyecto requerido");
    }
    try {
      const response = await api.post("/api/projects", body);
      return response.data;
    } catch (error) {
      console.error("[ProjectsApi] Error creando proyecto:", error?.message || error);
      throw error;
    }
  },

  /**
   * Actualiza un proyecto existente
   * @param {string|number} id - ID del proyecto
   * @param {Object} body - Datos actualizados
   * @returns {Promise<Object>} Proyecto actualizado
   * @throws {Error} Si falla la petición
   */
  update: async (id, body) => {
    if (!id) {
      throw new Error("[ProjectsApi] ID de proyecto requerido");
    }
    if (!body || typeof body !== 'object') {
      throw new Error("[ProjectsApi] Datos de actualización inválidos");
    }
    try {
      const response = await api.put(`/api/projects/${id}`, body);
      return response.data;
    } catch (error) {
      console.error(`[ProjectsApi] Error actualizando proyecto ${id}:`, error?.message || error);
      throw error;
    }
  },

  /**
   * Elimina un proyecto
   * @param {string|number} id - ID del proyecto
   * @returns {Promise<void>}
   * @throws {Error} Si falla la petición
   */
  remove: async (id) => {
    if (!id) {
      throw new Error("[ProjectsApi] ID de proyecto requerido");
    }
    try {
      await api.delete(`/api/projects/${id}`);
    } catch (error) {
      console.error(`[ProjectsApi] Error eliminando proyecto ${id}:`, error?.message || error);
      throw error;
    }
  },

  /**
   * Obtiene el diagrama asociado a un proyecto
   * @param {string|number} projectId - ID del proyecto
   * @returns {Promise<Object>} Diagrama con nodes, edges, version y timestamps
   * @throws {Error} Si falla la petición (excepto 404)
   */
  getDiagram: async (projectId) => {
    if (!projectId) {
      throw new Error("[ProjectsApi] ID de proyecto requerido");
    }
    try {
      const response = await api.get(`/api/projects/${projectId}/diagram`);
      const data = response.data || {};
      
      // Validar y normalizar la respuesta incluyendo timestamps
      return {
        id: data.id,
        nodes: data.nodes || "[]",
        edges: data.edges || "[]",
        version: data.version || 1,
        name: data.name || "Principal",
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
      };
    } catch (error) {
      // Si es 404, devolver diagrama vacío en lugar de fallar
      if (error.response?.status === 404) {
        console.warn(`[ProjectsApi] Diagrama no encontrado para proyecto ${projectId}, devolviendo vacío`);
        return { 
          nodes: "[]", 
          edges: "[]", 
          version: 1, 
          name: "Principal",
          createdAt: null,
          updatedAt: null,
        };
      }
      console.error(`[ProjectsApi] Error obteniendo diagrama del proyecto ${projectId}:`, error?.message || error);
      throw error;
    }
  },

  /**
   * Actualiza el diagrama de un proyecto
   * @param {string|number} projectId - ID del proyecto
   * @param {Object} body - Datos del diagrama
   * @param {string} body.nodes - Nodos en formato JSON string
   * @param {string} body.edges - Aristas en formato JSON string
   * @param {string} [body.name] - Nombre del diagrama
   * @returns {Promise<Object>} Diagrama actualizado
   * @throws {Error} Si falla la petición o los datos son inválidos
   */
  updateDiagram: async (projectId, body) => {
    if (!projectId) {
      throw new Error("[ProjectsApi] ID de proyecto requerido");
    }
    if (!body || typeof body !== 'object') {
      throw new Error("[ProjectsApi] Datos de diagrama inválidos");
    }
    if (!body.nodes || !body.edges) {
      throw new Error("[ProjectsApi] Nodes y edges requeridos");
    }
    
    try {
      const response = await api.put(`/api/projects/${projectId}/diagram`, body);
      return response.data;
    } catch (error) {
      console.error(`[ProjectsApi] Error actualizando diagrama del proyecto ${projectId}:`, error?.message || error);
      throw error;
    }
  },
};
