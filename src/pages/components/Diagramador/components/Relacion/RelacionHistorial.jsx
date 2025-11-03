import React from "react";

export default function RelacionHistorial({
  edges = [],
  options = [],
  onEdit,         // (edge)
  onDelete,       // (edgeId)
  onUpdateEdge,   // (edgeId, partial)
  onOpenIA,       // (payload)
}) {
  const nameOf = (id) => options.find((o) => o.id === id)?.name || id;
  const norm = (v) => (v === "N" ? "*" : v === "0..N" ? "0..*" : v || "1");

  const relKindLabel = (k) =>
    k === "COMP" ? "Composición" :
    k === "AGGR" ? "Agregación" :
    k === "INHERIT" ? "Herencia" :
    k === "DEPEND" ? "Dependencia" : "Asociación";

  return (
    <>
      <div className="font-semibold mb-2">Historial de relaciones</div>

      {edges?.length ? (
        <ul className="list-none p-0 m-0">
          {edges.map((e) => (
            <li key={e.id} className="py-2 border-b border-dashed border-gray-200 last:border-b-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">
                    {nameOf(e.source)}{" "}
                    <span className="text-gray-700">{norm(e.data?.mA)}</span>{" "}
                    →{" "}
                    <span className="text-gray-700">{norm(e.data?.mB)}</span>{" "}
                    {nameOf(e.target)}
                  </div>
                  <div className="text-xs text-gray-600">
                    Tipo: <b>{relKindLabel(e.data?.relKind || "ASSOC")}</b>{" "}
                    {e.data?.direction && (
                      <span className="ml-1">
                        · Dirección: <code>{e.data.direction}</code>
                      </span>
                    )}
                    {e.data?.owning && (
                      <span className="ml-1">
                        · Lado contenedor:{" "}
                        <b>{e.data.owning === "A" ? nameOf(e.source) : nameOf(e.target)}</b>
                      </span>
                    )}
                  </div>
                </div>

                {onOpenIA && (
                  <button
                    onClick={() =>
                      onOpenIA({
                        scope: "relation-edit",
                        edgeId: e.id,
                        current: {
                          aName: nameOf(e.source),
                          bName: nameOf(e.target),
                          mA: norm(e.data?.mA || "1"),
                          mB: norm(e.data?.mB || "1"),
                          verb: e.data?.verb || "",
                          relType: e.data?.relType || "",
                          relKind: e.data?.relKind || "ASSOC",
                          owning: e.data?.owning || "A",
                          direction: e.data?.direction || "A->B",
                        },
                      })
                    }
                    className="px-2 py-1 rounded-md border bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm"
                    title="Sugerencias IA para esta relación"
                  >
                    IA
                  </button>
                )}
              </div>

              <div className="mt-2">
                <label className="text-xs text-gray-600">Verbo</label>
                <input
                  className="border rounded-md px-2 py-1 w-full"
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

              <div className="mt-2 flex justify-end gap-2">
                <button
                  className="px-3 py-1 rounded-md border text-sm hover:bg-gray-50"
                  onClick={() => onEdit?.(e)}
                >
                  Editar
                </button>
                <button
                  title="Eliminar relación"
                  className="px-3 py-1 rounded-md border text-sm text-red-600 hover:bg-red-50"
                  onClick={() => onDelete?.(e.id)}
                >
                  🗑️
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-gray-500">Sin relaciones aún.</div>
      )}
    </>
  );
}
