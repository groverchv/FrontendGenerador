import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE || "http://localhost:8080";//"https://backendgenerador.up.railway.app;

const api = axios.create({
  baseURL: API_BASE_URL.replace(/\/+$/, ""),
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

export default api;
