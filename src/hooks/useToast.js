import { useContext } from "react";
import { ToastCtx } from "../components/ToastProvider";
import { ERROR_MESSAGES } from "../constants";

/**
 * Hook personalizado para acceder al sistema de notificaciones toast
 * @returns {Object} Contexto de toast con métodos success, error, info, warning
 * @throws {Error} Si se usa fuera de ToastProvider
 */
export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    throw new Error(ERROR_MESSAGES.TOAST_PROVIDER_ERROR);
  }
  return ctx;
}
