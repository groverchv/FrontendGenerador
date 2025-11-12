import React from "react";
import { Menu, X } from "lucide-react";

/**
 * Navbar responsive con diseño optimizado para móvil
 * @param {boolean} sidebarOpen - Estado del sidebar
 * @param {function} onMenuClick - Callback para toggle del sidebar
 */
const Navbar = ({ sidebarOpen, onMenuClick }) => {
  return (
    <nav className="fixed top-0 left-0 w-full h-14 md:h-16 bg-gradient-to-r from-blue-600 to-indigo-600 px-3 md:px-6 flex items-center z-50 shadow-lg">
      <div className="max-w-7xl mx-auto relative flex items-center justify-between w-full">
        {/* Botón Menú */}
        <button
          className="text-white focus:outline-none p-2 hover:bg-white/10 rounded-lg transition-all active:scale-95 touch-manipulation"
          onClick={onMenuClick}
          aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {sidebarOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>

        {/* Título responsive */}
        <div className="flex-1 text-center px-2">
          <h1 className="text-white font-bold text-sm md:text-xl lg:text-2xl truncate">
            <span className="hidden sm:inline">Generador de Código </span>
            <span className="sm:hidden">Gen. </span>Spring Boot
          </h1>
        </div>

        {/* Espacio para balance visual */}
        <div className="w-10 md:w-12"></div>
      </div>
    </nav>
  );
};

export default Navbar;
