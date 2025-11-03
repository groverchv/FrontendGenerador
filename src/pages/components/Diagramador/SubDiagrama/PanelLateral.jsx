// src/views/proyectos/Diagramador/SubDiagrama/PanelLateral.jsx
import React from "react";
import EntidadPanel from "../components/Entidad/EntidadPanel";
import RelacionarPanel from "../components/Relacion/RelacionarPanel";
import { Sparkles, Plus, Eraser, Box, Link2 } from "lucide-react";

export default function PanelLateral({
  activeTab,
  setActiveTab,
  selectedNode,
  nodes = [],
  edges = [],
  onAddEntity,
  onClear,
  onOpenIA,          // ← se mantiene SOLO aquí (botón global)
  onChangeName,
  onAddAttr,
  onUpdateAttr,
  onRemoveAttr,
  onDeleteEntity,
  onRelacionSimple,
  onRelacionNM,
  onUpdateEdge,
  onDeleteEdge,
}) {
  const handleClear = () => {
    const ok = window.confirm(
      "¿Seguro que deseas limpiar el lienzo? Se eliminarán TODAS las entidades y relaciones."
    );
    if (ok) onClear?.();
  };

  const baseBtn =
    "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm bg-white hover:bg-gray-50 active:scale-[.98] transition select-none";
  const tabBtn = (active) =>
    `inline-flex items-center gap-2 px-3 py-1.5 rounded-md border transition ${
      active ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "border-gray-200 hover:bg-gray-50"
    }`;

  return (
    <div className="md:h-full h-[40vh] md:relative fixed bottom-0 left-0 right-0 bg-white shadow-lg md:shadow-none border-t md:border-l z-20 overflow-y-auto">
      {/* Acciones principales */}
      <div className="p-3 flex flex-wrap gap-2 border-b">
        <button
          className={baseBtn}
          onClick={onOpenIA}
          title="Agregar entidad(es) con ayuda de IA"
          aria-label="Agregar con IA"
        >
          <Sparkles className="w-4 h-4" />
          <span className="font-medium">Hacer con IA</span>
        </button>

        <button
          className={baseBtn}
          onClick={onAddEntity}
          title="Agregar una nueva entidad al diagrama"
          aria-label="Agregar Entidad"
        >
          <Plus className="w-4 h-4" />
          <span className="font-medium">Agregar Entidad</span>
        </button>

        <button
          className={baseBtn}
          onClick={handleClear}
          title="Limpiar el lienzo (elimina todas las entidades y relaciones)"
          aria-label="Limpiar"
        >
          <Eraser className="w-4 h-4" />
          <span className="font-medium">Limpiar</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="px-3 pt-2 flex gap-2">
        <button
          className={tabBtn(activeTab === "entidad")}
          onClick={() => setActiveTab?.("entidad")}
          title="Editar atributos y nombre de la entidad seleccionada"
          aria-label="Pestaña Entidad"
        >
          <Box className="w-4 h-4" />
          <span>Entidad</span>
        </button>
        <button
          className={tabBtn(activeTab === "relacionar")}
          onClick={() => setActiveTab?.("relacionar")}
          title="Crear y editar relaciones entre entidades"
          aria-label="Pestaña Relacionar"
        >
          <Link2 className="w-4 h-4" />
          <span>Relacionar</span>
        </button>
      </div>

      {/* Contenido */}
      <div className="p-3">
        {activeTab === "relacionar" ? (
          <RelacionarPanel
            nodes={nodes}
            edges={edges}
            onRelacionSimple={onRelacionSimple}
            onRelacionNM={onRelacionNM}
            onUpdateEdge={onUpdateEdge}
            onDeleteEdge={onDeleteEdge}
       
          />
        ) : (
          <EntidadPanel
            node={selectedNode}
            onChangeName={onChangeName}
            onAddAttr={onAddAttr}
            onUpdateAttr={onUpdateAttr}
            onRemoveAttr={onRemoveAttr}
            onDelete={onDeleteEntity}
         
          />
        )}
      </div>
    </div>
  );
}
