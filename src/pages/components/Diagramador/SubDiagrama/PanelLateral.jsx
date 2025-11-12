// src/views/proyectos/Diagramador/SubDiagrama/PanelLateral.jsx
import React, { useState } from "react";
import EntidadPanel from "../components/Entidad/EntidadPanel";
import RelacionarPanel from "../components/Relacion/RelacionarPanel";
import { Sparkles, Plus, Eraser, Box, Link2, ChevronUp, ChevronDown } from "lucide-react";

/**
 * Panel lateral responsive para edición de entidades y relaciones
 * En móvil se muestra como panel inferior deslizable
 * En desktop se mantiene fijo a la derecha
 */
export default function PanelLateral({
  activeTab,
  setActiveTab,
  selectedNode,
  nodes = [],
  edges = [],
  onAddEntity,
  onClear,
  onOpenIA,
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
  // Estado para expandir/contraer panel en móvil
  const [expanded, setExpanded] = useState(false);

  const handleClear = () => {
    const ok = window.confirm(
      "¿Seguro que deseas limpiar el lienzo? Se eliminarán TODAS las entidades y relaciones."
    );
    if (ok) onClear?.();
  };

  const baseBtn =
    "inline-flex items-center justify-center gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-gray-200 shadow-sm bg-white hover:bg-gray-50 active:scale-95 transition-all select-none text-xs md:text-sm font-medium touch-manipulation";
  
  const tabBtn = (active) =>
    `inline-flex items-center justify-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border transition-all text-xs md:text-sm font-medium touch-manipulation ${
      active 
        ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm" 
        : "border-gray-200 hover:bg-gray-50 text-gray-700"
    }`;

  return (
    <>
      {/* Panel Desktop (derecha) */}
      <div className="hidden md:block md:h-full bg-white shadow-lg border-l overflow-y-auto">
        <PanelContent
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedNode={selectedNode}
          nodes={nodes}
          edges={edges}
          onAddEntity={onAddEntity}
          onClear={handleClear}
          onOpenIA={onOpenIA}
          onChangeName={onChangeName}
          onAddAttr={onAddAttr}
          onUpdateAttr={onUpdateAttr}
          onRemoveAttr={onRemoveAttr}
          onDeleteEntity={onDeleteEntity}
          onRelacionSimple={onRelacionSimple}
          onRelacionNM={onRelacionNM}
          onUpdateEdge={onUpdateEdge}
          onDeleteEdge={onDeleteEdge}
          baseBtn={baseBtn}
          tabBtn={tabBtn}
        />
      </div>

      {/* Panel Móvil (inferior deslizable) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white shadow-2xl border-t-2 border-gray-200 transition-all duration-300 ease-in-out"
        style={{ 
          height: expanded ? '70vh' : '120px',
          maxHeight: '85vh'
        }}
      >
        {/* Handle para deslizar */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2 flex items-center justify-center bg-gradient-to-b from-gray-100 to-white border-b border-gray-200 touch-manipulation active:bg-gray-200"
          aria-label={expanded ? "Contraer panel" : "Expandir panel"}
        >
          {expanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          )}
          <span className="ml-2 text-xs text-gray-500 font-medium">
            {expanded ? "Contraer" : "Expandir panel"}
          </span>
        </button>

        {/* Contenido */}
        <div className="h-[calc(100%-2.5rem)] overflow-y-auto">
          <PanelContent
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedNode={selectedNode}
            nodes={nodes}
            edges={edges}
            onAddEntity={onAddEntity}
            onClear={handleClear}
            onOpenIA={onOpenIA}
            onChangeName={onChangeName}
            onAddAttr={onAddAttr}
            onUpdateAttr={onUpdateAttr}
            onRemoveAttr={onRemoveAttr}
            onDeleteEntity={onDeleteEntity}
            onRelacionSimple={onRelacionSimple}
            onRelacionNM={onRelacionNM}
            onUpdateEdge={onUpdateEdge}
            onDeleteEdge={onDeleteEdge}
            baseBtn={baseBtn}
            tabBtn={tabBtn}
            isMobile={true}
          />
        </div>
      </div>
    </>
  );
}

/**
 * Contenido del panel (compartido entre desktop y móvil)
 */
function PanelContent({
  activeTab,
  setActiveTab,
  selectedNode,
  nodes,
  edges,
  onAddEntity,
  onClear,
  onOpenIA,
  onChangeName,
  onAddAttr,
  onUpdateAttr,
  onRemoveAttr,
  onDeleteEntity,
  onRelacionSimple,
  onRelacionNM,
  onUpdateEdge,
  onDeleteEdge,
  baseBtn,
  tabBtn,
}) {
  return (
    <>
      {/* Acciones principales */}
      <div className="p-2 md:p-3 flex flex-wrap gap-1.5 md:gap-2 border-b bg-gray-50">
        <button
          className={baseBtn}
          onClick={onOpenIA}
          title="Agregar entidad(es) con ayuda de IA"
          aria-label="Agregar con IA"
        >
          <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span className="hidden sm:inline">Hacer con IA</span>
          <span className="sm:hidden">IA</span>
        </button>

        <button
          className={baseBtn}
          onClick={onAddEntity}
          title="Agregar una nueva entidad al diagrama"
          aria-label="Agregar Entidad"
        >
          <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span className="hidden sm:inline">Agregar</span>
          <span className="sm:hidden">+</span>
        </button>

        <button
          className={baseBtn}
          onClick={onClear}
          title="Limpiar el lienzo"
          aria-label="Limpiar"
        >
          <Eraser className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span className="hidden sm:inline">Limpiar</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="px-2 md:px-3 pt-2 flex gap-2 border-b bg-white sticky top-0 z-10">
        <button
          className={tabBtn(activeTab === "entidad")}
          onClick={() => setActiveTab?.("entidad")}
          title="Editar atributos y nombre de la entidad seleccionada"
          aria-label="Pestaña Entidad"
        >
          <Box className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span>Entidad</span>
        </button>
        <button
          className={tabBtn(activeTab === "relacionar")}
          onClick={() => setActiveTab?.("relacionar")}
          title="Crear y editar relaciones entre entidades"
          aria-label="Pestaña Relacionar"
        >
          <Link2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span>Relacionar</span>
        </button>
      </div>

      {/* Contenido */}
      <div className="p-2 md:p-3">
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
    </>
  );
}
