// src/views/proyectos/Diagramador/SubDiagrama/components/Relacion/RelacionHistorial.jsx
import React from "react";

export default function RelacionHistorial({
  edges = [],
  options = [],
  onEdit,
  onDelete,
  onUpdateEdge,
}) {
  const nameOf = (id) => options.find((o) => o.id === id)?.name || id;
  const norm = (v) => (v === "N" ? "*" : v === "0..N" ? "0..*" : v || "1");

  const relKindLabel = (k) =>
    k === "COMP" ? "Composición ◆" :
    k === "AGGR" ? "Agregación ◇" :
    k === "INHERIT" ? "Herencia △" :
    k === "DEPEND" ? "Dependencia - ->" : "Asociación →";

  const relKindColor = (k) =>
    k === "COMP" ? "bg-red-100 text-red-800 border-red-300" :
    k === "AGGR" ? "bg-orange-100 text-orange-800 border-orange-300" :
    k === "INHERIT" ? "bg-purple-100 text-purple-800 border-purple-300" :
    k === "DEPEND" ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-green-100 text-green-800 border-green-300";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-lg font-bold text-gray-800">📋 Historial de relaciones</h3>
        <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-bold rounded-full">
          {edges?.length || 0}
        </span>
      </div>

      {edges?.length ? (
        <div className="space-y-2">
          {edges.map((e) => (
            <div 
              key={e.id} 
              className="bg-white p-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
            >
              {/* Encabezado de la relación */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${relKindColor(e.data?.relKind || "ASSOC")}`}>
                      {relKindLabel(e.data?.relKind || "ASSOC")}
                    </span>
                    {e.data?.direction && e.data.direction !== "NONE" && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">
                        {e.data.direction === "A->B" ? "→" : "←"}
                      </span>
                    )}
                  </div>
                  
                  <div className="font-bold text-gray-900 text-sm">
                    <span className="text-blue-600">{nameOf(e.source)}</span>
                    <span className="mx-1 text-xs font-normal text-gray-500">[{norm(e.data?.mA)}]</span>
                    <span className="mx-1">→</span>
                    <span className="mx-1 text-xs font-normal text-gray-500">[{norm(e.data?.mB)}]</span>
                    <span className="text-green-600">{nameOf(e.target)}</span>
                  </div>

                  {e.data?.owning && (
                    <div className="text-xs text-gray-600 mt-1">
                      🔹 Contenedor: <span className="font-semibold">{e.data.owning === "A" ? nameOf(e.source) : nameOf(e.target)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Campo de verbo */}
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  💬 Verbo (opcional)
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                  defaultValue={e.data?.verb || ""}
                  placeholder="gestiona, tiene, pertenece a…"
                  onBlur={(ev) =>
                    onUpdateEdge?.(e.id, {
                      data: { verb: ev.target.value },
                      label: ev.target.value || undefined,
                    })
                  }
                  title="Edita y sal del campo para guardar"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-2">
                <button 
                  className="px-3 py-2 rounded-lg border-2 border-blue-300 text-blue-700 text-sm font-semibold hover:bg-blue-50 transition-all" 
                  onClick={() => onEdit?.(e)}
                >
                  ✏️ Editar
                </button>
                <button
                  title="Eliminar relación"
                  className="px-3 py-2 rounded-lg border-2 border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50 transition-all"
                  onClick={() => onDelete?.(e.id)}
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <div className="text-gray-400 text-4xl mb-2">📭</div>
          <div className="text-gray-500 font-medium">Sin relaciones aún</div>
          <div className="text-gray-400 text-sm">Crea tu primera relación arriba</div>
        </div>
      )}
    </div>
  );
}
