import React, { useState } from "react";
import { Link } from "react-router-dom";
import { SiSpringboot } from "react-icons/si";
import { FaSave, FaFolderOpen, FaUsers } from "react-icons/fa";

function formatFecha(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
}

function Spinner({ className = "w-4 h-4" }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export default function ProjectNavbar({
  project,
  onGenerate,
  onSave,
  onlineCount,
  /** Opcional: control externo del loading */
  isGenerating: isGeneratingProp,
}) {
  const [internalGenerating, setInternalGenerating] = useState(false);
  const isGenerating =
    typeof isGeneratingProp === "boolean" ? isGeneratingProp : internalGenerating;

  const handleGenerate = async () => {
    if (!onGenerate || isGenerating) return;

    // Llamamos a onGenerate y, si devuelve promesa, esperamos.
    const maybePromise = onGenerate();

    if (maybePromise && typeof maybePromise.then === "function") {
      try {
        setInternalGenerating(true);
        await maybePromise;
      } finally {
        setInternalGenerating(false);
      }
    } else {
      // Fallback si onGenerate no es async: muestra un breve estado
      setInternalGenerating(true);
      setTimeout(() => setInternalGenerating(false), 800);
    }
  };

  return (
    <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b bg-white">
      <div>
        <div className="text-sm sm:text-lg font-semibold flex items-center gap-3">
          {project?.name || "Proyecto"}
          {typeof onlineCount === "number" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] sm:text-xs border bg-emerald-50 text-emerald-700">
              <FaUsers className="w-3 h-3" />
              En línea: {onlineCount}
            </span>
          )}
        </div>
        <div className="text-[11px] sm:text-xs text-gray-500">
          Creado: {formatFecha(project?.createdAt)}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          aria-busy={isGenerating}
          aria-live="polite"
          className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm bg-green-50 text-green-700 
            ${isGenerating ? "opacity-60 cursor-not-allowed" : "hover:bg-green-100"}`}
        >
          {isGenerating ? (
            <>
              <Spinner className="w-4 h-4" />
              <span>Generando…</span>
            </>
          ) : (
            <>
              <SiSpringboot className="w-5 h-5 text-green-700" />
              <span>Generar</span>
            </>
          )}
        </button>

        <Link
          to="/proyectos"
          className="flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-gray-50 text-sm"
        >
          <FaFolderOpen className="w-4 h-4" /> Ver proyectos
        </Link>
      </div>
    </div>
  );
}
