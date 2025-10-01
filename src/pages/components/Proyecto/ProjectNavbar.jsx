import React from "react";
import { Link } from "react-router-dom";
import { SiSpringboot } from "react-icons/si";
import { FaSave, FaFolderOpen, FaUsers } from "react-icons/fa";

function formatFecha(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  } catch { return iso; }
}

export default function ProjectNavbar({ project, onGenerate, onSave, onlineCount }) {
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
      <div className="flex gap-2">
        
        <button onClick={onGenerate} className="flex items-center gap-2 px-3 py-2 rounded-md border bg-green-50 text-green-700 hover:bg-green-100 text-sm">
          <SiSpringboot className="w-5 h-5 text-green-700" /> Generar
        </button>
        <Link to="/proyectos" className="flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-gray-50 text-sm">
          <FaFolderOpen className="w-4 h-4" /> Ver proyectos
        </Link>
      </div>
    </div>
  );
}
