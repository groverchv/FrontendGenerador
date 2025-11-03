// src/views/proyectos/Diagramador/SubDiagrama/PanelLateral.jsx
import React from "react";
import EntidadPanel from "../components/Entidad/EntidadPanel";
import RelacionarPanel from "../components/Relacion/RelacionarPanel";

/**
 * PanelLateral
 * - Encabezado con acciones rápidas (añadir, limpiar, guardar, generar, IA)
 * - Tabs: "Entidad" y "Relacionar"
 * - Renderiza EntidadPanel o RelacionarPanel según la pestaña activa
 */
export default function PanelLateral({
  // pestañas
  activeTab,
  setActiveTab,

  // entidad seleccionada (llega desde Diagramador)
  selectedNode,

  // datos del diagrama
  nodes = [],
  edges = [],

  // acciones generales
  onAddEntity,
  onClear,
  onExport,
  onGenerate,
  onOpenIA,

  // CRUD entidad
  onChangeName,
  onAddAttr,
  onUpdateAttr,
  onRemoveAttr,
  onDeleteEntity,

  // relaciones
  onRelacionSimple,
  onRelacionNM,
  onUpdateEdge,
  onDeleteEdge,
}) {
  return (
    <div className="md:h-full h-[40vh] md:relative fixed bottom-0 left-0 right-0 bg-white shadow-lg md:shadow-none border-t md:border-l z-20 overflow-y-auto">
      {/* Acciones principales */}
      <div className="p-3 flex flex-wrap gap-2 border-b">
        <button
          className="px-3 py-1 rounded-md border hover:bg-gray-50"
          onClick={onAddEntity}
          title="Agregar una nueva entidad al diagrama"
        >
          + Entidad
        </button>
        <button
          className="px-3 py-1 rounded-md border hover:bg-gray-50"
          onClick={onClear}
          title="Limpiar el lienzo (elimina todas las entidades y relaciones)"
        >
          Limpiar
        </button>
        <button
          className="px-3 py-1 rounded-md border hover:bg-gray-50"
          onClick={onExport}
          title="Guardar diagrama en el servidor"
        >
          Guardar
        </button>
        <button
          className="px-3 py-1 rounded-md border hover:bg-gray-50"
          onClick={onGenerate}
          title="Generar código (Spring Boot) desde el diagrama"
        >
          Generar código
        </button>
        <button
          className="px-3 py-1 rounded-md border hover:bg-gray-50"
          onClick={onOpenIA}
          title="Abrir asistente de IA"
        >
          IA
        </button>
      </div>

      {/* Tabs */}
      <div className="px-3 pt-2 flex gap-2">
        <button
          className={`px-3 py-1 rounded-md border transition ${
            activeTab === "entidad" ? "bg-indigo-50 border-indigo-300" : "hover:bg-gray-50"
          }`}
          onClick={() => setActiveTab?.("entidad")}
          title="Editar atributos y nombre de la entidad seleccionada"
        >
          Entidad
        </button>
        <button
          className={`px-3 py-1 rounded-md border transition ${
            activeTab === "relacionar" ? "bg-indigo-50 border-indigo-300" : "hover:bg-gray-50"
          }`}
          onClick={() => setActiveTab?.("relacionar")}
          title="Crear y editar relaciones entre entidades"
        >
          Relacionar
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
            onOpenIA={onOpenIA}
          />
        ) : (
          <EntidadPanel
            node={selectedNode}
            onChangeName={onChangeName}
            onAddAttr={onAddAttr}
            onUpdateAttr={onUpdateAttr}
            onRemoveAttr={onRemoveAttr}
            onDelete={onDeleteEntity}
            onOpenIA={onOpenIA}
          />
        )}
      </div>
    </div>
  );
}
