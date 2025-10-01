import api from "./api";

export const DiagramsApi = {
  // Obtener diagrama de un proyecto
  get: (projectId) =>
    api.get(`/api/projects/${projectId}/diagram`).then((r) => r.data),

  // Actualizar diagrama de un proyecto
  update: (projectId, body) =>
    api.put(`/api/projects/${projectId}/diagram`, body).then((r) => r.data),

  // ⚠️ No hay remove directo; se elimina al borrar el proyecto
};
