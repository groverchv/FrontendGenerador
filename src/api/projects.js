import api from "./api";

export const ProjectsApi = {
    // Listar todos los proyectos
    list: async () => {
        try {
            const response = await api.get("/api/projects");
            return response.data;
        } catch (error) {
            console.error("[ProjectsApi] Error listando proyectos:", error.userMessage);
            throw error;
        }
    },

    // Obtener un proyecto por ID
    get: async (id) => {
        try {
            const response = await api.get(`/api/projects/${id}`);
            return response.data;
        } catch (error) {
            console.error(`[ProjectsApi] Error obteniendo proyecto ${id}:`, error.userMessage);
            throw error;
        }
    },

    // Crear nuevo proyecto
    create: async (body) => {
        try {
            const response = await api.post("/api/projects", body);
            return response.data;
        } catch (error) {
            console.error("[ProjectsApi] Error creando proyecto:", error.userMessage);
            throw error;
        }
    },

    // Actualizar proyecto existente
    update: async (id, body) => {
        try {
            const response = await api.put(`/api/projects/${id}`, body);
            return response.data;
        } catch (error) {
            console.error(`[ProjectsApi] Error actualizando proyecto ${id}:`, error.userMessage);
            throw error;
        }
    },

    // Eliminar proyecto
    remove: async (id) => {
        try {
            await api.delete(`/api/projects/${id}`);
        } catch (error) {
            console.error(`[ProjectsApi] Error eliminando proyecto ${id}:`, error.userMessage);
            throw error;
        }
    },

    // Obtener diagrama del proyecto (relación 1-1)
    getDiagram: async (projectId) => {
        try {
            const response = await api.get(`/api/projects/${projectId}/diagram`);
            return response.data;
        } catch (error) {
            // Si es 404, devolver diagrama vacío en lugar de fallar
            if (error.response?.status === 404) {
                console.warn(
                    `[ProjectsApi] Diagrama no encontrado para proyecto ${projectId}, creando vacío`
                );
                return { nodes: "[]", edges: "[]", version: 1 };
            }
            console.error(
                `[ProjectsApi] Error obteniendo diagrama del proyecto ${projectId}:`,
                error.userMessage
            );
            throw error;
        }
    },

    // Actualizar diagrama del proyecto
    updateDiagram: async (projectId, body) => {
        try {
            const response = await api.put(`/api/projects/${projectId}/diagram`, body);
            return response.data;
        } catch (error) {
            console.error(
                `[ProjectsApi] Error actualizando diagrama del proyecto ${projectId}:`,
                error.userMessage
            );
            throw error;
        }
    },

    // Subir imagen para reconocimiento de diagrama
    uploadDiagramImage: async (projectId, file) => {
        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await api.post(
                `/api/projects/${projectId}/diagram/upload-image`,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );
            return response.data;
        } catch (error) {
            console.error(
                `[ProjectsApi] Error subiendo imagen para proyecto ${projectId}:`,
                error.userMessage
            );
            throw error;
        }
    },
};
