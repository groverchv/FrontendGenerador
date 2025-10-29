import React, { useMemo } from "react";
import {
  normalizeLegacy,
  REL_KINDS,
  REL_KIND_LABEL,
  kindSupportsVerb,
  kindSupportsMultiplicity,
} from "./relationRules";

/**
 * Historial de relaciones — agrupado por tipo UML, sin duplicados,
 * con UI más agradable.
 */
export default function RelacionHistoria({
  nodes = [],
  edges = [],
  onUpdateEdge,
  onDeleteEdge,
  onAskIA,
  onEditEdge,
}) {
  const nameOf = (id) =>
    nodes.find((n) => n.id === id)?.data?.label ||
    nodes.find((n) => n.id === id)?.data?.name ||
    id;

  // 1) dedupe exacto
  const uniqueEdges = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const e of edges || []) {
      const mA = normalizeLegacy(e.data?.mA || "1");
      const mB = normalizeLegacy(e.data?.mB || "1");
      const sig = [
        e.data?.kind || "ASSOCIATION",
        e.source,
        e.target,
        mA,
        mB,
        e.data?.relType || "",
        e.data?.ownerSide || "",
        e.data?.superEnd || "",
      ].join("|");
      if (!seen.has(sig)) {
        seen.add(sig);
        out.push(e);
      }
    }
    return out;
  }, [edges]);

  // 2) agrupar por tipo
  const groups = useMemo(() => {
    const map = new Map();
    for (const e of uniqueEdges) {
      const kind = e.data?.kind || "ASSOCIATION";
      if (!map.has(kind)) map.set(kind, []);
      map.get(kind).push(e);
    }
    return map;
  }, [uniqueEdges]);

  const orderedKinds = REL_KINDS.map((k) => k.code).filter((k) =>
    groups.has(k)
  );

  if (!uniqueEdges.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="font-semibold mb-2 text-slate-800">Historial de relaciones</div>
        <div className="text-slate-500">Sin relaciones aún.</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="font-semibold mb-2 text-slate-800">Historial de relaciones</div>

      {orderedKinds.map((kind) => {
        const list = groups.get(kind) || [];
        const showCardinality = kindSupportsMultiplicity(kind);

        return (
          <section key={kind} className="mb-4">
            <div className="sticky -top-1 z-0 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 pb-1">
              <h4 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span className="px-2 py-0.5 rounded-full border bg-slate-50 text-slate-700">
                  {REL_KIND_LABEL[kind]}
                </span>
                <span className="text-xs text-slate-500">({list.length})</span>
              </h4>
            </div>

            <ul className="list-none p-0 m-0">
              {list.map((e) => {
                const leftName = nameOf(e.source);
                const rightName = nameOf(e.target);
                const mA = normalizeLegacy(e.data?.mA || "1");
                const mB = normalizeLegacy(e.data?.mB || "1");
                const canVerb = kindSupportsVerb(e.data?.kind || "ASSOCIATION");

                return (
                  <li
                    key={e.id}
                    className="py-3 border-b border-dashed border-slate-200 last:border-b-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-800">
                          {leftName}{" "}
                          {showCardinality && (
                            <span className="text-slate-600">{mA}</span>
                          )}{" "}
                          →{" "}
                          {showCardinality && (
                            <span className="text-slate-600">{mB}</span>
                          )}{" "}
                          {rightName}
                        </div>

                        <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap mt-1">
                          {showCardinality && e.data?.relType && (
                            <>
                              <span>Cardinalidad:</span>
                              <code className="px-1.5 py-0.5 rounded bg-slate-100 border">
                                {e.data.relType}
                              </code>
                            </>
                          )}

                          {(kind === "AGGREGATION" || kind === "COMPOSITION") &&
                            e.data?.ownerSide && (
                              <>
                                <span>• Dueño:</span>
                                <code className="px-1.5 py-0.5 rounded bg-slate-100 border">
                                  {e.data.ownerSide}
                                </code>
                              </>
                            )}

                          {kind === "INHERITANCE" && e.data?.superEnd && (
                            <>
                              <span>• Padre:</span>
                              <code className="px-1.5 py-0.5 rounded bg-slate-100 border">
                                {e.data.superEnd}
                              </code>
                            </>
                          )}
                        </div>
                      </div>

                      {onAskIA && (
                        <button
                          onClick={() =>
                            onAskIA({
                              scope: "relation-edit",
                              edgeId: e.id,
                              current: {
                                aName: leftName,
                                bName: rightName,
                                mA,
                                mB,
                                verb: e.data?.verb || "",
                                relType: e.data?.relType || "",
                                kind: e.data?.kind || "ASSOCIATION",
                                ownerSide: e.data?.ownerSide || "A",
                                superEnd: e.data?.superEnd || "B",
                              },
                            })
                          }
                          className="px-2.5 py-1 rounded-lg border bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-medium shadow-sm"
                          title="Sugerencias IA para esta relación"
                        >
                          IA
                        </button>
                      )}
                    </div>

                    {canVerb && (
                      <div className="mt-2">
                        <label className="text-xs text-slate-600">Etiqueta / Verbo</label>
                        <input
                          className="mt-1 border rounded-md px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          defaultValue={e.data?.verb || ""}
                          placeholder="gestiona, usa, pertenece a…"
                          onBlur={(ev) =>
                            onUpdateEdge?.(e.id, {
                              data: { verb: ev.target.value },
                              label: ev.target.value || undefined,
                            })
                          }
                          title="Edita y sal del campo para guardar"
                        />
                      </div>
                    )}

                    <div className="mt-2 flex justify-end gap-2">
                      {onEditEdge && (
                        <button
                          className="px-3 py-1.5 rounded-lg border text-sm hover:bg-slate-50"
                          onClick={() => onEditEdge(e)}
                        >
                          Editar
                        </button>
                      )}
                      <button
                        title="Eliminar relación"
                        className="px-3 py-1.5 rounded-lg border text-sm text-red-600 hover:bg-red-50"
                        onClick={() => onDeleteEdge?.(e.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
