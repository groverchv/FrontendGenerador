import React, { useMemo, useState } from "react";

/** Multiplicidades por lado (UML) */
const SIDE_TYPES = ["1", "0..1", "N", "0..N"];
const isMany = (t) => t === "N" || t === "0..N";

/** Tipos de relación de alto nivel */
const REL_KINDS = [
  { value: "ASSOC", label: "Asociación" },
  { value: "AGGR", label: "Agregación (◇)" },
  { value: "COMP", label: "Composición (◆)" },
  { value: "INHERIT", label: "Herencia (extends)" },
];

/** Navegabilidad / dirección */
const DIR_OPTIONS = [
  { value: "A->B", label: "Unidireccional A → B" },
  { value: "B->A", label: "Unidireccional B → A" },
  { value: "BIDI", label: "Bidireccional" },
];

/** JPA */
const CASCADE_OPTS = ["PERSIST", "MERGE", "REMOVE", "REFRESH", "DETACH", "ALL"];
const FETCH_OPTS = ["DEFAULT", "EAGER", "LAZY"];
const INHERIT_STRATEGY = [
  { value: "JOINED", label: "JOINED" },
  { value: "SINGLE_TABLE", label: "SINGLE_TABLE" },
  { value: "TABLE_PER_CLASS", label: "TABLE_PER_CLASS" },
];

/** Decide si es N–M o relación simple compatible */
function decideTipo(left, right) {
  if (!left || !right) return { error: "Selecciona ambos tipos." };
  if (isMany(left) && isMany(right)) return { mode: "NM" };
  return { mode: "SIMPLE", tipo: `${left}-${right}` };
}

export default function RelacionarPanel({
  nodes,
  edges,
  // Crear relación simple: { sourceId, targetId, tipo, mA, mB, verb, meta }
  onRelacionSimple,
  // Crear relación N–M (con tabla intermedia): { aId, bId, nombreIntermedia, meta }
  onRelacionNM,
  // Actualizar y borrar
  onUpdateEdge,
  onDeleteEdge,
  onOpenIA,
}) {
  const options = useMemo(
    () => nodes.map((n) => ({ id: n.id, name: n.data?.label || n.id })),
    [nodes]
  );
  const nameOf = (id) => options.find((o) => o.id === id)?.name || id;

  // --- Form state ---
  const [a, setA] = useState("");
  const [aTipo, setATipo] = useState("1");
  const [b, setB] = useState("");
  const [bTipo, setBTipo] = useState("1");
  const [verb, setVerb] = useState("");
  const [kind, setKind] = useState("ASSOC");
  const [direction, setDirection] = useState("A->B");
  const [interName, setInterName] = useState("");

  // Roles (nombres de campo)
  const [roleA, setRoleA] = useState(""); // nombre del campo en B que apunta a A
  const [roleB, setRoleB] = useState(""); // nombre del campo en A que apunta a B

  // JPA metadatos
  const [owning, setOwning] = useState("A"); // lado dueño si BIDI
  const [optionalA, setOptionalA] = useState(false);
  const [optionalB, setOptionalB] = useState(false);
  const [orphanRemoval, setOrphanRemoval] = useState(false);
  const [fetch, setFetch] = useState("DEFAULT");
  const [cascade, setCascade] = useState([]);
  // JoinTable (N–M)
  const [joinTable, setJoinTable] = useState("");
  const [joinColumnA, setJoinColumnA] = useState("");
  const [joinColumnB, setJoinColumnB] = useState("");
  // Herencia
  const [inheritStrategy, setInheritStrategy] = useState("JOINED");

  // Edición
  const [editingId, setEditingId] = useState(null);

  const same = a && b && a === b;
  const decision = kind === "INHERIT" ? { mode: "INHERIT" } : decideTipo(aTipo, bTipo);
  const isNM = decision.mode === "NM";
  const canCreateBase = !!a && !!b && !same && !decision.error;
  const canCreate = kind === "INHERIT" ? (!!a && !!b && !same) : canCreateBase;
  const canUpdate = canCreate && decision.mode !== "NM";

  const clearForm = () => {
    setA(""); setATipo("1");
    setB(""); setBTipo("1");
    setVerb("");
    setKind("ASSOC");
    setDirection("A->B");
    setInterName("");
    setRoleA(""); setRoleB("");
    setOwning("A");
    setOptionalA(false); setOptionalB(false);
    setOrphanRemoval(false);
    setFetch("DEFAULT");
    setCascade([]);
    setJoinTable(""); setJoinColumnA(""); setJoinColumnB("");
    setInheritStrategy("JOINED");
    setEditingId(null);
  };

  const toggleCascade = (c) => {
    setCascade((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : prev.concat(c)
    );
  };

  const metaPack = () => ({
    relKind: kind,             // ASSOC | AGGR | COMP | INHERIT
    direction,                 // A->B | B->A | BIDI
    roleA: roleA.trim() || undefined,
    roleB: roleB.trim() || undefined,
    owning,                    // A | B (sólo aplica BIDI)
    optionalA, optionalB,
    orphanRemoval,
    fetch,
    cascade,
    join: isNM ? {
      table: (joinTable || interName || "").trim() || undefined,
      joinColumn: (joinColumnA || "").trim() || undefined,          // FK a A
      inverseJoinColumn: (joinColumnB || "").trim() || undefined,   // FK a B
    } : undefined,
    inheritStrategy: kind === "INHERIT" ? inheritStrategy : undefined,
  });

  const crear = () => {
    if (!canCreate) return;

    if (kind === "INHERIT") {
      onRelacionSimple?.({
        sourceId: a, // hijo
        targetId: b, // padre
        tipo: "INHERIT",
        mA: "",
        mB: "",
        verb: "extends",
        meta: metaPack(),
      });
      clearForm();
      return;
    }

    if (isNM) {
      onRelacionNM?.({
        aId: a,
        bId: b,
        nombreIntermedia: interName.trim() || undefined,
        meta: metaPack(),
      });
      clearForm();
      return;
    }

    onRelacionSimple?.({
      sourceId: a,
      targetId: b,
      tipo: decision.tipo,
      mA: aTipo,
      mB: bTipo,
      verb: verb.trim(),
      meta: metaPack(),
    });
    clearForm();
  };

  const actualizar = () => {
    if (!editingId || !canUpdate) return;
    onUpdateEdge?.(editingId, {
      source: a,
      target: b,
      data: {
        mA: aTipo,
        mB: bTipo,
        verb: verb.trim(),
        relType: kind === "INHERIT" ? "INHERIT" : decision.tipo,
        ...metaPack(),
      },
      label: verb.trim() || undefined,
    });
    clearForm();
  };

  const startEditFromEdge = (e) => {
    setEditingId(e.id);
    setA(e.source);
    setB(e.target);
    setATipo(e.data?.mA || "1");
    setBTipo(e.data?.mB || "1");
    setVerb(e.data?.verb || "");
    setKind(e.data?.relKind || "ASSOC");
    setDirection(e.data?.direction || "A->B");
    setRoleA(e.data?.roleA || "");
    setRoleB(e.data?.roleB || "");
    setOwning(e.data?.owning || "A");
    setOptionalA(!!e.data?.optionalA);
    setOptionalB(!!e.data?.optionalB);
    setOrphanRemoval(!!e.data?.orphanRemoval);
    setFetch(e.data?.fetch || "DEFAULT");
    setCascade(Array.isArray(e.data?.cascade) ? e.data.cascade : []);
    setJoinTable(e.data?.join?.table || "");
    setJoinColumnA(e.data?.join?.joinColumn || "");
    setJoinColumnB(e.data?.join?.inverseJoinColumn || "");
    setInheritStrategy(e.data?.inheritStrategy || "JOINED");
    setInterName(e.data?.relType === "NM" ? (e.data?.verb || "") : "");
  };

  const openIAHere = () => {
    onOpenIA?.({
      scope: "relation",
      candidates: options.map((o) => o.name),
      draft: {
        aName: a ? nameOf(a) : "",
        bName: b ? nameOf(b) : "",
        mA: aTipo,
        mB: bTipo,
        verb: verb.trim(),
        joinName: interName.trim() || "",
        kind,
        direction,
      },
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

        {/* Clase de relación */}
        <div className="grid grid-cols-[1fr_auto] gap-2 items-center mb-2">
          <div>
            <div className="text-xs text-gray-600">Clase de relación</div>
            <div className="font-semibold min-h-[20px]">
              {REL_KINDS.find(k => k.value === kind)?.label}
            </div>
          </div>
          <select
            className="border rounded-md px-2 py-1"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            {REL_KINDS.map(k => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
        </div>

        {/* Entidad A */}
        <div className="grid grid-cols-[1fr_auto] gap-2 items-center mb-2">
          <div>
            <div className="text-xs text-gray-600">
              {kind === "INHERIT" ? "Hijo (A)" : "Entidad A"}
            </div>
            <div className="font-semibold min-h-[20px]">{a ? nameOf(a) : "\u00A0"}</div>
          </div>
          <select className="border rounded-md px-2 py-1" value={a} onChange={(e) => setA(e.target.value)}>
            <option value="">Seleccionar</option>
            {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>

        {kind !== "INHERIT" && (
          <div className="grid grid-cols-[1fr_auto] gap-2 items-center mb-2">
            <div>
              <div className="text-xs text-gray-600">Multiplicidad (A)</div>
              <div className="font-semibold min-h-[20px]">{aTipo}</div>
            </div>
            <select className="border rounded-md px-2 py-1" value={aTipo} onChange={(e) => setATipo(e.target.value)}>
              {SIDE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}

        {/* Entidad B */}
        <div className="grid grid-cols-[1fr_auto] gap-2 items-center mb-2">
          <div>
            <div className="text-xs text-gray-600">
              {kind === "INHERIT" ? "Padre (B)" : "Entidad B"}
            </div>
            <div className="font-semibold min-h-[20px]">{b ? nameOf(b) : "\u00A0"}</div>
          </div>
          <select className="border rounded-md px-2 py-1" value={b} onChange={(e) => setB(e.target.value)}>
            <option value="">Seleccionar</option>
            {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>

        {kind !== "INHERIT" && (
          <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
            <div>
              <div className="text-xs text-gray-600">Multiplicidad (B)</div>
              <div className="font-semibold min-h-[20px]">{bTipo}</div>
            </div>
            <select className="border rounded-md px-2 py-1" value={bTipo} onChange={(e) => setBTipo(e.target.value)}>
              {SIDE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}

        {/* Verbo */}
        {kind !== "INHERIT" && (
          <div className="mt-2">
            <label className="text-xs text-gray-600">Verbo (opcional)</label>
            <input
              className="w-full border rounded-md px-2 py-1 mt-1"
              value={verb}
              onChange={(e) => setVerb(e.target.value)}
              placeholder="Ej: gestiona, tiene, pertenece a…"
            />
          </div>
        )}

        {/* Dirección */}
        {kind !== "INHERIT" && (
          <div className="mt-2 grid grid-cols-[1fr_auto] gap-2 items-center">
            <div className="text-xs text-gray-600">Navegabilidad</div>
            <select
              className="border rounded-md px-2 py-1"
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
            >
              {DIR_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
        )}

        {/* Roles */}
        {kind !== "INHERIT" && (
          <div className="mt-2 grid grid-cols-1 gap-2">
            <div>
              <label className="text-xs text-gray-600">
                Rol en A (nombre del campo en B que referencia A)
              </label>
              <input
                className="w-full border rounded-md px-2 py-1 mt-1"
                value={roleA}
                onChange={(e) => setRoleA(e.target.value)}
                placeholder="p.ej. usuario, autor, propietario"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">
                Rol en B (nombre del campo en A que referencia B)
              </label>
              <input
                className="w-full border rounded-md px-2 py-1 mt-1"
                value={roleB}
                onChange={(e) => setRoleB(e.target.value)}
                placeholder="p.ej. roles, pedidos, items"
              />
            </div>
          </div>
        )}

        {/* JPA */}
        {kind !== "INHERIT" && (
          <>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={optionalA}
                  onChange={(e) => setOptionalA(e.target.checked)}
                />
                Optional (A)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={optionalB}
                  onChange={(e) => setOptionalB(e.target.checked)}
                />
                Optional (B)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={orphanRemoval}
                  onChange={(e) => setOrphanRemoval(e.target.checked)}
                />
                orphanRemoval
              </label>
              <div className="grid grid-cols-[auto_1fr] items-center gap-2">
                <span className="text-xs text-gray-600">Fetch</span>
                <select
                  className="border rounded-md px-2 py-1"
                  value={fetch}
                  onChange={(e) => setFetch(e.target.value)}
                >
                  {FETCH_OPTS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-2">
              <div className="text-xs text-gray-600 mb-1">Cascade</div>
              <div className="flex flex-wrap gap-2">
                {CASCADE_OPTS.map(c => (
                  <label key={c} className="text-sm border rounded px-2 py-1">
                    <input
                      type="checkbox"
                      className="mr-1"
                      checked={cascade.includes(c)}
                      onChange={() => toggleCascade(c)}
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>

            {direction === "BIDI" && (
              <div className="mt-2 grid grid-cols-[auto_1fr] items-center gap-2">
                <div className="text-xs text-gray-600">Lado dueño</div>
                <select
                  className="border rounded-md px-2 py-1"
                  value={owning}
                  onChange={(e) => setOwning(e.target.value)}
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                </select>
              </div>
            )}
          </>
        )}

        {/* N–M: JoinTable */}
        {kind !== "INHERIT" && isNM && (
          <div className="mt-2 grid gap-2">
            <div>
              <label className="text-xs text-gray-600">Nombre de tabla intermedia</label>
              <input
                className="w-full border rounded-md px-2 py-1 mt-1"
                value={joinTable}
                onChange={(e) => setJoinTable(e.target.value)}
                placeholder="Ej: usuario_rol"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-600">JoinColumn (FK a A)</label>
                <input
                  className="w-full border rounded-md px-2 py-1 mt-1"
                  value={joinColumnA}
                  onChange={(e) => setJoinColumnA(e.target.value)}
                  placeholder="p.ej. usuario_id"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">InverseJoinColumn (FK a B)</label>
                <input
                  className="w-full border rounded-md px-2 py-1 mt-1"
                  value={joinColumnB}
                  onChange={(e) => setJoinColumnB(e.target.value)}
                  placeholder="p.ej. rol_id"
                />
              </div>
            </div>
          </div>
        )}

        {/* Herencia: estrategia */}
        {kind === "INHERIT" && (
          <div className="mt-2 grid grid-cols-[auto_1fr] items-center gap-2">
            <div className="text-xs text-gray-600">Estrategia</div>
            <select
              className="border rounded-md px-2 py-1"
              value={inheritStrategy}
              onChange={(e) => setInheritStrategy(e.target.value)}
            >
              {INHERIT_STRATEGY.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        )}

        {/* Reglas / errores */}
        <div className="mt-2 text-sm">
          {same && <div className="text-red-600">La Entidad A y B deben ser distintas.</div>}
          {decision.error && kind !== "INHERIT" && <div className="text-amber-600">{decision.error}</div>}
          {editingId && decision.mode === "NM" && (
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
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm">
                    <div className="font-semibold">
                      {nameOf(e.source)} <span className="text-gray-700">{e.data?.mA || ""}</span>
                      {" "}→{" "}
                      <span className="text-gray-700">{e.data?.mB || ""}</span> {nameOf(e.target)}
                    </div>
                    <div className="text-xs text-gray-600 flex flex-col gap-0.5 mt-1">
                      <span>Tipo: <code>{e.data?.relKind || "ASSOC"}</code>{e.data?.relType ? `, ${e.data.relType}` : ""}</span>
                      <span>Dirección: <code>{e.data?.direction || "A->B"}</code></span>
                      {e.data?.verb ? <span>Verbo: <code>{e.data.verb}</code></span> : null}
                      {(e.data?.roleA || e.data?.roleB) && (
                        <span>Roles: A=<code>{e.data.roleA || "-"}</code>, B=<code>{e.data.roleB || "-"}</code></span>
                      )}
                      {e.data?.join && (
                        <span>JoinTable: <code>{e.data.join.table || "-"}</code> (join=<code>{e.data.join.joinColumn || "-"}</code>, inverse=<code>{e.data.join.inverseJoinColumn || "-"}</code>)</span>
                      )}
                      {e.data?.relKind === "INHERIT" && e.data?.inheritStrategy && (
                        <span>Estrategia herencia: <code>{e.data.inheritStrategy}</code></span>
                      )}
                      <span>Fetch: <code>{e.data?.fetch || "DEFAULT"}</code>, Cascade: <code>{(e.data?.cascade || []).join(", ") || "-"}</code>{e.data?.orphanRemoval ? ", orphanRemoval" : ""}</span>
                      {e.data?.direction === "BIDI" && <span>Lado dueño: <code>{e.data?.owning || "A"}</code></span>}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      className="px-2 py-1 rounded-md border text-sm hover:bg-gray-50"
                      onClick={() => startEditFromEdge(e)}
                    >
                      Editar
                    </button>
                    <button
                      title="Eliminar relación"
                      className="px-2 py-1 rounded-md border text-sm text-red-600 hover:bg-red-50"
                      onClick={() => onDeleteEdge?.(e.id)}
                    >
                      🗑️
                    </button>
                    {onOpenIA && (
                      <button
                        onClick={() => onOpenIA({
                          scope: "relation-edit",
                          edgeId: e.id,
                          current: {
                            aName: nameOf(e.source),
                            bName: nameOf(e.target),
                            ...e.data,
                          }
                        })}
                        className="px-2 py-1 rounded-md border bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm"
                        title="Sugerencias IA para esta relación"
                      >
                        IA
                      </button>
                    )}
                  </div>
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
