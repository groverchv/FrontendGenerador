import React from "react";
import { Link } from "react-router-dom";

export default function Sidebar({ open, onClose }) {
  return (
    <div
      className={`fixed top-16 left-0 h-[calc(100vh-4rem)] w-56 bg-gray-800 text-white flex flex-col shadow-lg z-40 transition-transform duration-300
      ${open ? "translate-x-0" : "-translate-x-full"}`}
    >
      <div className="px-6 py-4 font-bold text-xl border-b border-gray-700 flex justify-between items-center">
        Menú
      </div>
      <nav className="flex-1 px-4 py-2 space-y-2">
       
        {/* Sidebar.jsx */}
        <Link
          to="/proyectos" // <-- antes estaba /proyecto
          className="block px-4 py-2 rounded hover:bg-gray-700"
          onClick={onClose}
        >
          Proyectos
        </Link>
      </nav>
    </div>
  );
}
