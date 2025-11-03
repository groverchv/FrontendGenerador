// src/views/proyectos/Diagramador/SubDiagrama/PanelLateral.jsx
import React from "react";
import Sidebar from "../sidebar/sidebar";                // ya existente
import EntidadPanel from "../components/entidad";       // ya existente
import RelacionarPanel from "../components/relacionar"; // ya existente"

/**
 * PanelLateral
 * Orquesta los tabs y pasa callbacks hacia EntidadPanel / RelacionarPanel.
 */
export default function PanelLateral({
  activeTab,
  setActiveTab,
  selectedNode,
  nodes,
  edges,

  // acciones de barra
  onAddEntity,
  onClear,
  onExport,
  onGenerate,
  onOpenIA,

  // CRUD Entidad
  onChangeName,
  onAddAttr,
  onUpdateAttr,
  onRemoveAttr,
  onDeleteEntity,

  // Relaciones
  onRelacionSimple,
  onRelacionNM,
  onUpdateEdge,
  onDeleteEdge,
}) {
  return (
    <div className="md:h-full h-[40vh] md:relative fixed bottom-0 left-0 right-0 bg-white shadow-lg md:shadow-none border-t md:border-l z-20 overflow-y-auto">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onAddEntity={onAddEntity}
        onClear={onClear}
        onExport={onExport}
        onGenerate={onGenerate}
        onOpenIA={onOpenIA}
      >
        {activeTab === "entidad" ? (
          <EntidadPanel
            node={selectedNode || null}
            onChangeName={onChangeName}
            onAddAttr={onAddAttr}
            onUpdateAttr={onUpdateAttr}
            onRemoveAttr={onRemoveAttr}
            onDelete={onDeleteEntity}
            onOpenIA={onOpenIA}
          />
        ) : (
          <RelacionarPanel
            nodes={nodes}
            edges={edges}
            onRelacionSimple={onRelacionSimple}
            onRelacionNM={onRelacionNM}
            onUpdateEdge={onUpdateEdge}
            onDeleteEdge={onDeleteEdge}
            onOpenIA={onOpenIA}
          />
        )}
      </Sidebar>
    </div>
  );
}
