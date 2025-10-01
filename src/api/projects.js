import api from "./api";

export const ProjectsApi = {
  list: () => api.get("/api/projects").then(r => r.data),
  get:  (id) => api.get(`/api/projects/${id}`).then(r => r.data),
  create: (body) => api.post("/api/projects", body).then(r => r.data),
  update: (id, body) => api.put(`/api/projects/${id}`, body).then(r => r.data),
  remove: (id) => api.delete(`/api/projects/${id}`),

  // 1–1: obtener el único diagrama del proyecto
  getDiagram: (projectId) =>
    api.get(`/api/projects/${projectId}/diagram`).then(r => r.data),

  // 🔹 NUEVO: actualizar diagrama
  updateDiagram: (projectId, body) =>
    api.put(`/api/projects/${projectId}/diagram`, body).then(r => r.data),
};
