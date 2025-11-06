import React, { useMemo, useState, useCallback } from "react";
import RelacionForm from "./RelacionForm";
import RelacionHistorial from "./RelacionHistorial";

/**
 * Contenedor: arma opciones, maneja edición y puentea handlers hacia el padre.
 */
export default function RelacionarPanel({
  nodes = [],
  edges = [],
  onRelacionSimple,   // ({ sourceId, targetId, tipo, mA, mB, verb, meta })
  onRelacionNM,       // ({ aId, bId, nombreIntermedia })
  onUpdateEdge,       // (edgeId, partial)
  onDeleteEdge,       // (edgeId)
  onOpenIA,           // (payload)
}) {
  const options = useMemo(
    () => nodes.map((n) => ({ id: n.id, name: n.data?.label || n.id })),
    [nodes]
  );
  const nameOf = useCallback(
    (id) => options.find((o) => o.id === id)?.name || id,
    [options]
  );

  // Edición
  const [editing, setEditing] = useState(null); // { edgeId, values... } o null
  const cancelEdit = () => setEditing(null);

  const startEdit = useCallback((e) => {
    setEditing({
      edgeId: e.id,
      a: e.source,
      b: e.target,
      mA: normalizeLegacy(e.data?.mA || "1"),
      mB: normalizeLegacy(e.data?.mB || "1"),
      verb: e.data?.verb || "",
      relKind: e.data?.relKind || "ASSOC",
      owning: e.data?.owning || "A",
      direction: e.data?.direction || "A->B",
    });
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Sección de creación/edición de relación */}
      <div className="bg-gradient-to-br from-white to-blue-50 p-4 rounded-2xl border-2 border-blue-200 shadow-sm">
        <RelacionForm
          options={options}
          editing={editing}
          cancelEdit={cancelEdit}
          onCreateSimple={onRelacionSimple}
          onCreateNM={onRelacionNM}
          onUpdateEdge={onUpdateEdge}
          onOpenIA={onOpenIA}
          nameOf={nameOf}
        />
      </div>

      {/* Sección de historial */}
      <div className="bg-gradient-to-br from-white to-gray-50 p-4 rounded-2xl border-2 border-gray-200 shadow-sm">
        <RelacionHistorial
          edges={edges}
          options={options}
          onEdit={startEdit}
          onDelete={onDeleteEdge}
          onUpdateEdge={onUpdateEdge}
          onOpenIA={onOpenIA}
        />
      </div>
    </div>
  );
}

/* ===== Helpers locales ===== */
const normalizeLegacy = (v) =>
  v === "N" ? "*" : v === "0..N" ? "0..*" : v || "1";
