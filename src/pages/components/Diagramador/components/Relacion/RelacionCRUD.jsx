import React, { useMemo, useState, useEffect } from "react";
import {
  SIDE_TYPES,
  normalizeLegacy,
  decideTipo,
  suggestJoinName,
  REL_KINDS,
  REL_KIND_LABEL,
  kindSupportsMultiplicity,
  kindSupportsVerb,
  kindSupportsJoin,
  kindNeedsOwner,
} from "./relationRules";
import RelacionIA from "./RelacionIA";
import Previsualizacion from "./Previsualizacion";

/** Props:
 *  - nodes, edges
 *  - onRelacionSimple, onRelacionNM, onUpdateEdge, onDeleteEdge
 *  - onAskIA?
 *  - nameOverrides? (map id->nombre)
 */
export default function RelacionCRUD({
  nodes = [],
  edges = [],
  onRelacionSimple,
  onRelacionNM,
  onUpdateEdge,
  onDeleteEdge,
  onAskIA,
  nameOverrides = {},
}) {
  const options = useMemo(
    () => nodes.map((n) => ({ id: n.id, name: n.data?.label || n.id })),
    [nodes]
  );
  const nameOf = (id) => options.find((o) => o.id === id)?.name || id;

  // --- State
  const [kind, setKind] = useState("ASSOCIATION");
  const [a, setA] = useState("");
  const [aTipo, setATipo] = useState("1");
  const [b, setB] = useState("");
  const [bTipo, setBTipo] = useState("1");
  const [verb, setVerb] = useState("");
  const [interName, setInterName] = useState("");
  const [ownerSide, setOwnerSide] = useState("A");
  const [superEnd, setSuperEnd] = useState("B");
  const [editingId, setEditingId] = useState(null);

  const same = a && b && a === b;
  const decision = decideTipo(aTipo, bTipo);
  const isNM = decision.mode === "NM";

  const canCreate =
    !!a && !!b && !same &&
    (!kindSupportsMultiplicity(kind) || !decision.error);

  // Autocompletar join si es N–M (solo Asociación)
  useEffect(() => {
    if (!editingId && kind === "ASSOCIATION" && isNM && a && b) {
      const suggested = suggestJoinName(
        nameOverrides[a]?.trim() || nameOf(a),
        nameOverrides[b]?.trim() || nameOf(b)
      );
      if (!interName) setInterName(suggested);
    }
    if (!(kind === "ASSOCIATION" && isNM) && interName) setInterName("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, a, b, aTipo, bTipo, isNM, editingId, nameOverrides]);

  // Limpiar campos cuando no aplican al tipo
  useEffect(() => {
    if (!kindSupportsMultiplicity(kind)) {
      setATipo("1");
      setBTipo("1");
    }
    if (!kindSupportsVerb(kind)) setVerb("");
    if (!kindNeedsOwner(kind)) setOwnerSide("A");
    if (kind !== "INHERITANCE") setSuperEnd("B");
  }, [kind]);

  const clearForm = () => {
    setKind("ASSOCIATION");
    setA(""); setATipo("1");
    setB(""); setBTipo("1");
    setVerb(""); setInterName("");
    setOwnerSide("A"); setSuperEnd("B");
    setEditingId(null);
  };

  const crear = () => {
    if (!canCreate) return;
    const basePayload = {
      sourceId: a,
      targetId: b,
      mA: aTipo,
      mB: bTipo,
      verb: verb.trim(),
      tipo: decision.tipo,
      meta: {
        kind,
        ownerSide,
        superEnd,
      },
    };

    if (kind === "ASSOCIATION" && isNM && kindSupportsJoin(kind)) {
      onRelacionNM?.({
        aId: a,
        bId: b,
        nombreIntermedia:
          (interName || suggestJoinName(nameOf(a), nameOf(b))).trim(),
        meta: { kind },
      });
      clearForm();
      return;
    }
    onRelacionSimple?.(basePayload);
    clearForm();
  };

  const actualizar = () => {
    if (!editingId) return;
    onUpdateEdge?.(editingId, {
      source: a,
      target: b,
      data: {
        mA: aTipo,
        mB: bTipo,
        verb: verb.trim(),
        relType: decision.tipo,
        kind,
        ownerSide,
        superEnd,
      },
      label: verb.trim() || undefined,
    });
    clearForm();
  };

  const startEditFromEdge = (e) => {
    setEditingId(e.id);
    setA(e.source);
    setATipo(normalizeLegacy(e.data?.mA));
    setB(e.target);
    setBTipo(normalizeLegacy(e.data?.mB));
    setVerb(e.data?.verb || "");
    setInterName("");

    setKind(e.data?.kind || "ASSOCIATION");
    setOwnerSide(e.data?.ownerSide || "A");
    setSuperEnd(e.data?.superEnd || "B");
  };

  // Helpers de UI
  const showMultiplicity = kindSupportsMultiplicity(kind);
  const showVerb = kindSupportsVerb(kind);
  const showJoinName = !editingId && kind === "ASSOCIATION" && kindSupportsJoin(kind) && isNM;
  const showOwner = kindNeedsOwner(kind);
  const showSuperEnd = kind === "INHERITANCE";

  return (
    <div className="flex flex-col gap-4 min-w-0">
      {/* === NUEVA / EDITAR === */}
      <div className="p-3 sm:p-4 border border-gray-200 rounded-2xl min-w-0">
        {/* Título + IA */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div>
            <div className="text-base sm:text-lg font-semibold leading-tight">
              {editingId ? "Editar relación" : "Nueva relación"}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">
              Define tipo, entidades y opciones. Usa IA para sugerencias.
            </div>
          </div>

          {onAskIA && (
            <RelacionIA
              onAsk={onAskIA}
              scope="relation"
              candidates={options.map((o) => o.name)}
              draft={{
                aName: (a && (nameOverrides[a]?.trim() || nameOf(a))) || "",
                bName: (b && (nameOverrides[b]?.trim() || nameOf(b))) || "",
                mA: aTipo,
                mB: bTipo,
                verb: verb.trim(),
                joinName: (interName || "").trim(),
                umlKind: kind,
                ownerSide,
                superEnd,
              }}
              title="Sugerir relaciones con IA"
            />
          )}
        </div>

        {/* Tipo */}
        <div className="mt-3">
          <label className="text-xs text-gray-600">Tipo</label>
          <select
            className="mt-1 w-full border rounded-md px-2 py-2 text-sm"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            {REL_KINDS.map((k) => (
              <option key={k.code} value={k.code}>
                {k.label}
              </option>
            ))}
          </select>
          <div className="text-[11px] text-gray-500 mt-1">
            {REL_KINDS.find((k) => k.code === kind)?.note}
          </div>
        </div>

        {/* Entidades A/B */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="min-w-0">
            <div className="text-xs text-gray-600">Entidad A</div>
            <select
              className="mt-1 w-full border rounded-md px-2 py-2 text-sm"
              value={a}
              onChange={(e) => setA(e.target.value)}
            >
              <option value="">Seleccionar</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <div className="text-xs text-gray-600">Entidad B</div>
            <select
              className="mt-1 w-full border rounded-md px-2 py-2 text-sm"
              value={b}
              onChange={(e) => setB(e.target.value)}
            >
              <option value="">Seleccionar</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Multiplicidad */}
        {showMultiplicity && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="min-w-0">
              <div className="text-xs text-gray-600">Multiplicidad (A)</div>
              <select
                className="mt-1 w-full border rounded-md px-2 py-2 text-sm"
                value={aTipo}
                onChange={(e) => setATipo(e.target.value)}
              >
                {SIDE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-600">Multiplicidad (B)</div>
              <select
                className="mt-1 w-full border rounded-md px-2 py-2 text-sm"
                value={bTipo}
                onChange={(e) => setBTipo(e.target.value)}
              >
                {SIDE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Dueño / Padre */}
        {kindNeedsOwner(kind) && (
          <div className="mt-3 min-w-0">
            <label className="text-xs text-gray-600">Dueño (rombo)</label>
            <div className="mt-1 flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="ownerSide"
                  value="A"
                  checked={ownerSide === "A"}
                  onChange={() => setOwnerSide("A")}
                />
                A
              </label>
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="ownerSide"
                  value="B"
                  checked={ownerSide === "B"}
                  onChange={() => setOwnerSide("B")}
                />
                B
              </label>
            </div>
          </div>
        )}

        {kind === "INHERITANCE" && (
          <div className="mt-3 min-w-0">
            <label className="text-xs text-gray-600">Padre (triángulo)</label>
            <div className="mt-1 flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="superEnd"
                  value="A"
                  checked={superEnd === "A"}
                  onChange={() => setSuperEnd("A")}
                />
                A (padre)
              </label>
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="superEnd"
                  value="B"
                  checked={superEnd === "B"}
                  onChange={() => setSuperEnd("B")}
                />
                B (padre)
              </label>
            </div>
          </div>
        )}

        {/* Verbo */}
        {showVerb && (
          <div className="mt-3 min-w-0">
            <label className="text-xs text-gray-600">
              Etiqueta / Verbo (opcional)
            </label>
            <input
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
              value={verb}
              onChange={(e) => setVerb(e.target.value)}
              placeholder={
                kind === "DEPENDENCY"
                  ? "usa, depende de, llama a…"
                  : "gestiona, tiene, pertenece a…"
              }
            />
          </div>
        )}

        {/* Join table */}
        {showJoinName && (
          <div className="mt-3 min-w-0">
            <label className="text-xs text-gray-600">
              Nombre de tabla intermedia
            </label>
            <input
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
              value={interName}
              onChange={(e) => setInterName(e.target.value)}
              placeholder="Ej: usuario_rol"
            />
            <div className="text-[11px] text-gray-500 mt-1">
              Sugerido automáticamente; edítalo si quieres.
            </div>
          </div>
        )}

        {/* Previsualización (altura adaptativa) */}
        <div className="mt-4 min-w-0">
          <Previsualizacion
            kind={kind}
            nodes={nodes}
            aId={a}
            bId={b}
            mA={aTipo}
            mB={bTipo}
            verb={verb}
            isNM={isNM}
            joinName={interName}
            nameOverrides={nameOverrides}
            ownerSide={ownerSide}
            superEnd={superEnd}
            height={180}             // xs
            heightSm={200}           // sm
            heightMd={220}           // md+
          />
        </div>

        {/* Reglas / errores */}
        <div className="mt-3 text-sm min-w-0">
          {same && (
            <div className="text-red-600">
              La Entidad A y B deben ser distintas.
            </div>
          )}
          {kindSupportsMultiplicity(kind) && decision.error && (
            <div className="text-amber-600">{decision.error}</div>
          )}
        </div>

        {/* Botones */}
        <div className="mt-3 flex flex-wrap gap-2">
          {editingId ? (
            <>
              <button
                onClick={actualizar}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700"
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
            </>
          ) : (
            <button
              disabled={!canCreate || same}
              onClick={crear}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Crear relación
            </button>
          )}
        </div>
      </div>

      {/* === HISTORIAL === */}
      <div className="p-3 sm:p-4 border border-gray-200 rounded-2xl min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="font-semibold">Historial de relaciones</div>
          {/* (opcional) un select para filtrar por tipo */}
        </div>

        {edges?.length ? (
          <ul className="list-none p-0 m-0 mt-2 space-y-3">
            {edges.map((e) => {
              const aName = options.find((o) => o.id === e.source)?.name || e.source;
              const bName = options.find((o) => o.id === e.target)?.name || e.target;
              const kindLabel = REL_KIND_LABEL[e.data?.kind || "ASSOCIATION"];
              return (
                <li
                  key={e.id}
                  className="p-3 rounded-xl border border-gray-100 bg-white shadow-sm/20"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {aName}{" "}
                        <span className="text-gray-700">
                          {normalizeLegacy(e.data?.mA)}
                        </span>{" "}
                        →{" "}
                        <span className="text-gray-700">
                          {normalizeLegacy(e.data?.mB)}
                        </span>{" "}
                        {bName}
                      </div>
                      <div className="mt-1 text-xs text-gray-600 flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 border text-gray-700">
                          {kindLabel}
                        </span>
                        {e.data?.relType && (
                          <>
                            <span>•</span>
                            <span>Cardinalidad:</span>
                            <span className="px-1.5 py-0.5 rounded border text-gray-700 bg-white">
                              {e.data.relType}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {onAskIA && (
                      <RelacionIA
                        small
                        onAsk={onAskIA}
                        scope="relation-edit"
                        edgeId={e.id}
                        current={{
                          aName,
                          bName,
                          mA: normalizeLegacy(e.data?.mA || "1"),
                          mB: normalizeLegacy(e.data?.mB || "1"),
                          verb: e.data?.verb || "",
                          relType: e.data?.relType || "",
                          kind: e.data?.kind || "ASSOCIATION",
                          ownerSide: e.data?.ownerSide || "A",
                          superEnd: e.data?.superEnd || "B",
                        }}
                        title="Sugerencias IA para esta relación"
                      />
                    )}
                  </div>

                  {/* Verbo editable si aplica */}
                  {kindSupportsVerb(e.data?.kind || "ASSOCIATION") && (
                    <div className="mt-2">
                      <label className="text-xs text-gray-600">
                        Etiqueta / Verbo
                      </label>
                      <input
                        className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
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

                  <div className="mt-2 flex flex-wrap justify-end gap-2">
                    <button
                      className="px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50"
                      onClick={() => startEditFromEdge(e)}
                    >
                      Editar
                    </button>
                    <button
                      title="Eliminar relación"
                      className="px-3 py-1.5 rounded-md border text-sm text-red-600 hover:bg-red-50"
                      onClick={() => onDeleteEdge?.(e.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-gray-500 mt-2">Sin relaciones aún.</div>
        )}
      </div>
    </div>
  );
}
