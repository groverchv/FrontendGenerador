import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE || "http://localhost:8080";

const api = axios.create({
  baseURL: API_BASE_URL.replace(/\/+$/, ""),
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

// Interceptor para requests - agregar logs en desarrollo
api.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.log(`[API] → ${config.method?.toUpperCase()} ${config.url}`, config.data);
    }
    return config;
  },
  (error) => {
    console.error("[API] Request error:", error);
    return Promise.reject(error);
  }
);

// Interceptor para responses - manejo centralizado de errores
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`[API] ← ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    
    // Manejo específico por código de error
    switch (status) {
      case 400:
        console.error("[API] Bad Request:", message);
        break;
      case 401:
        console.error("[API] No autorizado - redirigir a login si fuera necesario");
        break;
      case 403:
        console.error("[API] Acceso prohibido:", message);
        break;
      case 404:
        console.error("[API] Recurso no encontrado:", error.config?.url);
        break;
      case 500:
      case 502:
      case 503:
        console.error("[API] Error del servidor:", message);
        break;
      default:
        console.error("[API] Error:", status, message);
    }
    
    // Agregar información útil al error
    error.userMessage = message || "Error de conexión con el servidor";
    error.isNetworkError = !error.response;
    
    return Promise.reject(error);
  }
);

export default api;
