import { useContext } from "react";
import { ToastCtx } from "../components/ToastProvider";

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}
