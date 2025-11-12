import React from "react";
import { Link } from "react-router-dom";
import { FolderKanban, X } from "lucide-react";

/**
 * Sidebar responsive con overlay en móvil
 * @param {boolean} open - Estado de visibilidad
 * @param {function} onClose - Callback para cerrar
 */
export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Overlay para móvil */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-14 md:top-16 left-0 h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] w-64 md:w-56 bg-gray-800 text-white flex flex-col shadow-2xl z-40 transition-transform duration-300 ease-in-out
        ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Header del sidebar */}
        <div className="px-4 md:px-6 py-3 md:py-4 font-bold text-lg md:text-xl border-b border-gray-700 flex justify-between items-center">
          <span>Menú</span>
          {/* Botón cerrar solo en móvil */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 hover:bg-gray-700 rounded-lg transition-colors touch-manipulation"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 md:px-4 py-4 space-y-1 overflow-y-auto">
          <Link
            to="/proyectos"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-700 active:bg-gray-600 transition-all touch-manipulation group"
            onClick={onClose}
          >
            <FolderKanban className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="font-medium">Proyectos</span>
          </Link>
        </nav>

        {/* Footer opcional */}
        <div className="px-4 py-3 border-t border-gray-700 text-xs text-gray-400 text-center">
          <p>v1.0.0</p>
        </div>
      </aside>
    </>
  );
}
