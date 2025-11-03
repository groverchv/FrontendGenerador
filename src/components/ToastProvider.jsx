import React, { createContext, useCallback, useMemo, useState } from "react";

const ToastCtx = createContext(null);

function ToastContainer({ toasts, remove }) {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] space-y-2 w-[min(92vw,360px)]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={
            "shadow rounded px-3 py-2 text-sm border transition " +
            (t.type === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : t.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-slate-50 border-slate-200 text-slate-800")
          }
        >
          <div className="flex items-start gap-2">
            <div className="flex-1">
              {t.title && <div className="font-medium mb-0.5">{t.title}</div>}
              <div>{t.message}</div>
            </div>
            <button
              onClick={() => remove(t.id)}
              className="ml-2 text-xs text-slate-500 hover:text-slate-900"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((toast) => {
    const id = toast.id || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const ttl = typeof toast.ttl === "number" ? toast.ttl : 4000;
    setToasts((ts) => [...ts, { ...toast, id }]);
    if (ttl > 0) {
      setTimeout(() => remove(id), ttl);
    }
    return id;
  }, [remove]);

  const api = useMemo(() => ({
    success: (message, opts = {}) => push({ type: "success", message, ...opts }),
    error: (message, opts = {}) => push({ type: "error", message, ...opts }),
    info: (message, opts = {}) => push({ type: "info", message, ...opts }),
  }), [push]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <ToastContainer toasts={toasts} remove={remove} />
    </ToastCtx.Provider>
  );
}

export { ToastCtx };
