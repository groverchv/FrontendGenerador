import React, { useMemo, useState } from "react";

/** Tipos “por lado” (UML multiplicities) */
const SIDE_TYPES = ["1", "0..1", "N", "0..N"];
const isMany = (t) => t === "N" || t === "0..N";

/** Decide si es N–M o relación simple compatible */
function decideTipo(left, right) {
  if (!left || !right) return { error: "Selecciona ambos tipos." };
  if (isMany(left) && isMany(right)) return { mode: "NM" };

  const key =
    (left === "1" && right === "1") ? "1-1" :
    (left === "1" && right === "N") ? "1-N" :
    (left === "N" && right === "1") ? "N-1" :
    (left === "0..1" && right === "1") ? "0-1" :
    (left === "1" && right === "0..1") ? "1-0" :
    (left === "0..N" && right === "N") ? "0-N" :
    (left === "N" && right === "0..N") ? "N-0" :
    null;

  if (!key) {
    return { error: "Combinación no soportada. Para N–M elige N u 0..N en ambos lados." };
  }
  return { mode: "SIMPLE", tipo: key };
}

export default function RelacionarPanel({
  nodes,
  edges,
  // Crear relación simple: { sourceId, targetId, tipo, mA, mB, verb }
  onRelacionSimple,
  // Crear relación N–M (con tabla intermedia): { aId, bId, nombreIntermedia }
  onRelacionNM,
  // Actualizar y borrar edges del historial
  onUpdateEdge,       // (edgeId, partial)
  onDeleteEdge,       // (edgeId)
  onOpenIA            // ← NUEVO: abre modal IA con contexto de relaciones
}) {
  const options = useMemo(
    () => nodes.map(n => ({ id: n.id, name: n.data?.label || n.id })),
    [nodes]
  );
  const nameOf = (id) => options.find(o => o.id === id)?.name || id;

  // --- Form state ---
  const [a, setA] = useState("");
  const [aTipo, setATipo] = useState("1");
  const [b, setB] = useState("");
  const [bTipo, setBTipo] = useState("1");
  const [verb, setVerb] = useState("");
  const [interName, setInterName] = useState("");

  // Modo edición
  const [editingId, setEditingId] = useState(null);

  const same = a && b && a === b;
  const decision = decideTipo(aTipo, bTipo);
  const isNM = decision.mode === "NM";
  const canCreate = !!a && !!b && !same && !decision.error;
  const canUpdate = canCreate && !isNM; // en edición no permitimos convertir a N–M

  const clearForm = () => {
    setA("");
    setATipo("1");
    setB("");
    setBTipo("1");
    setVerb("");
    setInterName("");
    setEditingId(null);
  };

  const crear = () => {
    if (!canCreate) return;
    if (isNM) {
      onRelacionNM?.({ aId: a, bId: b, nombreIntermedia: interName.trim() || undefined });
      clearForm();
    } else {
      onRelacionSimple?.({
        sourceId: a,
        targetId: b,
        tipo: decision.tipo,
        mA: aTipo,
        mB: bTipo,
        verb: verb.trim(),
      });
      clearForm();
    }
  };

  const actualizar = () => {
    if (!editingId || !canUpdate) return;
    onUpdateEdge?.(editingId, {
      source: a,
      target: b,
      data: { mA: aTipo, mB: bTipo, verb: verb.trim(), relType: decision.tipo },
      label: verb.trim() || undefined,
    });
    clearForm();
  };

  const startEditFromEdge = (e) => {
    setEditingId(e.id);
    setA(e.source);
    setATipo(e.data?.mA || "1");
    setB(e.target);
    setBTipo(e.data?.mB || "1");
    setVerb(e.data?.verb || "");
    setInterName(""); // no aplica en edición
  };

  const openIAHere = () => {
    onOpenIA?.({
      scope: "relation",
      candidates: options.map(o => o.name),
      draft: {
        aName: a ? nameOf(a) : "",
        bName: b ? nameOf(b) : "",
        mA: aTipo,
        mB: bTipo,
        verb: verb.trim(),
        joinName: interName.trim() || ""
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* NUEVA / EDITAR RELACIÓN */}
      <div className="p-3 border border-gray-200 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="font-semibold mb-1">
            {editingId ? "Editar relación" : "Nueva relación"}
          </div>
          {onOpenIA && (
            <button
              type="button"
              onClick={openIAHere}
              className="px-2 py-1 rounded-md border bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              title="Sugerir relaciones con IA"
            >
              IA
            </button>
          )}
        </div>

        {editingId && (
          <div className="text-xs text-blue-700 mb-2">
            Estás editando una relación existente. Cambia valores y pulsa <b>Actualizar relación</b>.
          </div>
        )}

        {/* Entidad A */}
        <div className="grid grid-cols-[1fr_auto] gap-2 items-center mb-2">
          <div>
            <div className="text-xs text-gray-600">Entidad A</div>
            <div className="font-semibold min-h-[20px]">{a ? nameOf(a) : "\u00A0"}</div>
          </div>
          <select className="border rounded-md px-2 py-1" value={a} onChange={(e) => setA(e.target.value)}>
            <option value="">Seleccionar</option>
            {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>

        {/* Tipo A */}
        <div className="grid grid-cols-[1fr_auto] gap-2 items-center mb-2">
          <div>
            <div className="text-xs text-gray-600">Tipo de relación (A)</div>
            <div className="font-semibold min-h-[20px]">{aTipo}</div>
          </div>
          <select className="border rounded-md px-2 py-1" value={aTipo} onChange={(e) => setATipo(e.target.value)}>
            {SIDE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Entidad B */}
        <div className="grid grid-cols-[1fr_auto] gap-2 items-center mb-2">
          <div>
            <div className="text-xs text-gray-600">Entidad B</div>
            <div className="font-semibold min-h-[20px]">{b ? nameOf(b) : "\u00A0"}</div>
          </div>
          <select className="border rounded-md px-2 py-1" value={b} onChange={(e) => setB(e.target.value)}>
            <option value="">Seleccionar</option>
            {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>

        {/* Tipo B */}
        <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
          <div>
            <div className="text-xs text-gray-600">Tipo de relación (B)</div>
            <div className="font-semibold min-h-[20px]">{bTipo}</div>
          </div>
          <select className="border rounded-md px-2 py-1" value={bTipo} onChange={(e) => setBTipo(e.target.value)}>
            {SIDE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Verbo opcional */}
        <div className="mt-2">
          <label className="text-xs text-gray-600">Verbo (opcional)</label>
          <input
            className="w-full border rounded-md px-2 py-1 mt-1"
            value={verb}
            onChange={(e) => setVerb(e.target.value)}
            placeholder="Ej: gestiona, tiene, pertenece a…"
          />
        </div>

        {/* Campo intermedio solo si N–M y NO en edición */}
        {!editingId && isNM && (
          <div className="mt-2">
            <label className="text-xs text-gray-600">Nombre de tabla intermedia (opcional)</label>
            <input
              className="w-full border rounded-md px-2 py-1 mt-1"
              value={interName}
              onChange={(e) => setInterName(e.target.value)}
              placeholder="Ej: Usuario_Rol"
            />
          </div>
        )}

        {/* Reglas / errores */}
        <div className="mt-2 text-sm">
          {same && <div className="text-red-600">La Entidad A y B deben ser distintas.</div>}
          {decision.error && <div className="text-amber-600">{decision.error}</div>}
          {editingId && isNM && (
            <div className="text-amber-600">
              No se puede actualizar a N–M desde edición. Crea una relación N–M nueva si lo necesitas.
            </div>
          )}
        </div>

        {/* Botones */}
        {editingId ? (
          <div className="mt-3 flex gap-2">
            <button
              disabled={!canUpdate}
              onClick={actualizar}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Actualizar relación
            </button>
            <button
              type="button"
              onClick={clearForm}
              className="px-3 py-2 rounded-lg border hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            disabled={!canCreate || same}
            onClick={crear}
            className="mt-3 px-3 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Crear relación
          </button>
        )}
      </div>

      {/* HISTORIAL / EDICIÓN */}
      <div className="p-3 border border-gray-200 rounded-xl">
        <div className="font-semibold mb-2">Historial de relaciones</div>

        {edges?.length ? (
          <ul className="list-none p-0 m-0">
            {edges.map((e) => (
              <li key={e.id} className="py-2 border-b border-dashed border-gray-200 last:border-b-0">
                {/* Encabezado: muestra multiplicidades estilo UML */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">
                      {nameOf(e.source)}{" "}
                      <span className="text-gray-700">{e.data?.mA || ""}</span>
                      {" "}→{" "}
                      <span className="text-gray-700">{e.data?.mB || ""}</span>{" "}
                      {nameOf(e.target)}
                    </div>
                    <div className="text-xs text-gray-600">
                      Verbo: <code>{e.data?.verb || "(sin verbo)"}</code>
                    </div>
                  </div>

                  {/* IA contextual por relación */}
                  {onOpenIA && (
                    <button
                      onClick={() => onOpenIA({
                        scope: "relation-edit",
                        edgeId: e.id,
                        current: {
                          aName: nameOf(e.source),
                          bName: nameOf(e.target),
                          mA: e.data?.mA || "1",
                          mB: e.data?.mB || "1",
                          verb: e.data?.verb || "",
                          relType: e.data?.relType || ""
                        }
                      })}
                      className="px-2 py-1 rounded-md border bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm"
                      title="Sugerencias IA para esta relación"
                    >
                      IA
                    </button>
                  )}
                </div>

                {/* Editor de VERBO (opcional) */}
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

                {/* Acciones abajo: Editar + basurero */}
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    className="px-3 py-1 rounded-md border text-sm hover:bg-gray-50"
                    onClick={() => startEditFromEdge(e)}
                  >
                    Editar
                  </button>
                  <button
                    title="Eliminar relación"
                    className="px-3 py-1 rounded-md border text-sm text-red-600 hover:bg-red-50"
                    onClick={() => onDeleteEdge?.(e.id)}
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
      </div>
    </div>
  );
}
