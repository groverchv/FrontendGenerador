import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SiSpringboot, SiFlutter } from "react-icons/si";
import { FaFolderOpen, FaUsers, FaFileAlt, FaFileExport, FaFileImport, FaImage, FaCamera, FaQuestionCircle } from "react-icons/fa";
import { createPortal } from "react-dom";

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
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

/** Menú en Portal (fuera del flujo) */
function ArchivoMenuPortal({ anchorRef, open, onClose, onExport, onImport }) {
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const place = () => {
    const btn = anchorRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    // Desplegar pegado al borde izquierdo del botón, bajo él
    setPos({
      top: r.bottom + 6 + window.scrollY,
      left: r.left + window.scrollX,
      width: Math.max(176, r.width), // ancho mínimo agradable
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => place();
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (!menuRef.current) return;
      if (
        !menuRef.current.contains(e.target) &&
        !anchorRef.current?.contains(e.target)
      ) {
        onClose?.();
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, onClose]);

  if (!open) return null;

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Opciones de Archivo"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 9999, // por encima del canvas/sidebar
      }}
      className="rounded-md border bg-white shadow-lg p-1"
    >
      <button
        role="menuitem"
        onClick={() => { onClose?.(); onExport?.(); }}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-gray-50"
      >
        <FaFileExport className="w-4 h-4" />
        Exportar
      </button>
      <button
        role="menuitem"
        onClick={() => { onClose?.(); onImport?.(); }}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-gray-50"
      >
        <FaFileImport className="w-4 h-4" />
        Importar
      </button>
    </div>
  );

  return createPortal(menu, document.body);
}

/** Menú Importar Imagen en Portal */
function ImportImageMenuPortal({ anchorRef, open, onClose, onCamera, onFile }) {
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const place = () => {
    const btn = anchorRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    setPos({
      top: r.bottom + 6 + window.scrollY,
      left: r.left + window.scrollX,
      width: Math.max(176, r.width),
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => place();
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (!menuRef.current) return;
      if (
        !menuRef.current.contains(e.target) &&
        !anchorRef.current?.contains(e.target)
      ) {
        onClose?.();
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, onClose]);

  if (!open) return null;

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Opciones de Importar Imagen"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 9999,
      }}
      className="rounded-md border bg-white shadow-lg p-1"
    >
      <button
        role="menuitem"
        onClick={() => { onClose?.(); onCamera?.(); }}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-gray-50"
      >
        <FaCamera className="w-4 h-4" />
        Desde Cámara
      </button>
      <button
        role="menuitem"
        onClick={() => { onClose?.(); onFile?.(); }}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-gray-50"
      >
        <FaImage className="w-4 h-4" />
        Desde Archivo
      </button>
    </div>
  );

  return createPortal(menu, document.body);
}

export default function ProjectNavbar({
  project,
  onGenerate,
  onSave,
  onExport,   // opcional
  onImport,   // opcional
  onGenerateFlutter, // nuevo
  onImportImageFromCamera, // nuevo
  onImportImageFromFile, // nuevo
  onShowExamples, // nuevo
  onlineCount,
  isGenerating: isGeneratingProp,
  isGeneratingFlutter: isGeneratingFlutterProp,
}) {
  const [internalGenerating, setInternalGenerating] = useState(false);
  const [internalGeneratingFlutter, setInternalGeneratingFlutter] = useState(false);
  
  const isGenerating = typeof isGeneratingProp === "boolean" ? isGeneratingProp : internalGenerating;
  const isGeneratingFlutter = typeof isGeneratingFlutterProp === "boolean" ? isGeneratingFlutterProp : internalGeneratingFlutter;

  const [openArchivo, setOpenArchivo] = useState(false);
  const [openImportImage, setOpenImportImage] = useState(false);
  
  const archivoBtnRef = useRef(null);
  const importImageBtnRef = useRef(null);

  const handleGenerate = async () => {
    if (!onGenerate || isGenerating) return;
    const maybe = onGenerate();
    if (maybe?.then) {
      try {
        setInternalGenerating(true);
        await maybe;
      } finally {
        setInternalGenerating(false);
      }
    } else {
      setInternalGenerating(true);
      setTimeout(() => setInternalGenerating(false), 800);
    }
  };

  const handleGenerateFlutter = async () => {
    if (!onGenerateFlutter || isGeneratingFlutter) return;
    const maybe = onGenerateFlutter();
    if (maybe?.then) {
      try {
        setInternalGeneratingFlutter(true);
        await maybe;
      } finally {
        setInternalGeneratingFlutter(false);
      }
    } else {
      setInternalGeneratingFlutter(true);
      setTimeout(() => setInternalGeneratingFlutter(false), 800);
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
        <div className="text-[11px] sm:text-xs text-gray-500">Creado: {formatFecha(project?.createdAt)}</div>
      </div>

      <div className="flex items-center gap-2">
        {/* Importar imagen (anchor) */}
        <button
          ref={importImageBtnRef}
          type="button"
          onClick={() => setOpenImportImage((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={openImportImage}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700 text-sm font-medium transition-colors"
        >
          <FaImage className="w-5 h-5" />
          Importar imagen
        </button>

        {/* Portal con menú de importar imagen */}
        <ImportImageMenuPortal
          anchorRef={importImageBtnRef}
          open={openImportImage}
          onClose={() => setOpenImportImage(false)}
          onCamera={onImportImageFromCamera}
          onFile={onImportImageFromFile}
        />

        {/* General Flutter */}
        <button
          onClick={handleGenerateFlutter}
          disabled={isGeneratingFlutter}
          aria-busy={isGeneratingFlutter}
          aria-live="polite"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-blue-300 bg-blue-50 text-blue-700 text-sm font-medium transition-colors ${
            isGeneratingFlutter ? "opacity-60 cursor-not-allowed" : "hover:bg-blue-100"
          }`}
        >
          {isGeneratingFlutter ? (
            <>
              <Spinner className="w-4 h-4" />
              <span>Generando Flutter…</span>
            </>
          ) : (
            <>
              <SiFlutter className="w-5 h-5" />
              <span>General Flutter</span>
            </>
          )}
        </button>

        {/* General Spring Boot */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          aria-busy={isGenerating}
          aria-live="polite"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-green-300 bg-green-50 text-green-700 text-sm font-medium transition-colors ${
            isGenerating ? "opacity-60 cursor-not-allowed" : "hover:bg-green-100"
          }`}
        >
          {isGenerating ? (
            <>
              <Spinner className="w-4 h-4" />
              <span>Generando…</span>
            </>
          ) : (
            <>
              <SiSpringboot className="w-5 h-5 text-green-700" />
              <span>General Spring Boot</span>
            </>
          )}
        </button>

        {/* Archivo (anchor) */}
        <button
          ref={archivoBtnRef}
          type="button"
          onClick={() => setOpenArchivo((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={openArchivo}
          className="flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-gray-50 text-sm"
        >
          <FaFileAlt className="w-4 h-4" />
          Archivo
          <svg
            className={`w-3 h-3 transition-transform ${openArchivo ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Portal con menú fuera del contenedor */}
        <ArchivoMenuPortal
          anchorRef={archivoBtnRef}
          open={openArchivo}
          onClose={() => setOpenArchivo(false)}
          onExport={onExport}
          onImport={onImport}
        />

        {/* Ver proyectos */}
        <Link to="/proyectos" className="flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-gray-50 text-sm">
          <FaFolderOpen className="w-4 h-4" /> Ver proyectos
        </Link>
      </div>
    </div>
  );
}
