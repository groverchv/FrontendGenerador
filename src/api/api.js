import axios from "axios";

// Permite VITE_API_BASE (existente) y VITE_API_BASE_URL (alias) con fallback a http://localhost:8080
export const API_BASE_URL =
<<<<<<< HEAD
  import.meta.env.VITE_API_BASE || "http://localhost:8080";//"https://backendgenerador.up.railway.app;
=======
  (import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_BASE_URL || "http://localhost:8080");
>>>>>>> trabajo-temporal

const api = axios.create({
  baseURL: API_BASE_URL.replace(/\/+$/, ""),
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
  timeout: 10000, // 10s timeout por defecto
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
  async (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    const config = error.config || {};
    
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
      case 502:
      case 503:
      case 504:
        console.error("[API] Error temporal del servidor:", message);
        break;
      case 500:
        console.error("[API] Error del servidor:", message);
        break;
      default:
        console.error("[API] Error:", status, message);
    }
    
    // Agregar información útil al error
    error.userMessage = message || "Error de conexión con el servidor";
    error.isNetworkError = !error.response;

    // Reintentos simples con backoff para errores transitorios en métodos idempotentes
    const method = (config.method || "get").toLowerCase();
    const canRetryMethod = ["get", "put", "delete", "head"].includes(method);
    const isTransient = error.isNetworkError || [502, 503, 504].includes(status);
    const maxRetries = typeof config.retry === "number" ? config.retry : 2;
    config.__retryCount = config.__retryCount || 0;

    if (isTransient && canRetryMethod && config.__retryCount < maxRetries) {
      config.__retryCount += 1;
      const delay = Math.min(1500, 300 * Math.pow(2, config.__retryCount)) + Math.floor(Math.random() * 250);
      if (import.meta.env.DEV) {
        console.warn(`[API] Reintentando (${config.__retryCount}/${maxRetries}) ${method.toUpperCase()} ${config.url} en ${delay}ms`);
      }
      await new Promise((res) => setTimeout(res, delay));
      return api(config);
    }

    return Promise.reject(error);
  }
);

export default api;
