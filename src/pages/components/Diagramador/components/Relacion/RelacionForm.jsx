// src/views/proyectos/Diagramador/SubDiagrama/components/Relacion/RelacionForm.jsx
import React, { useEffect, useMemo, useState } from "react";

/** Multiplicidades válidas */
const SIDE_TYPES = ["0..1", "1", "0..*", "1..*", "*"];

/** Mapa de tipos de relación (UI) */
const REL_KIND_OPTS = [
  { value: "ASSOC", label: "Asociación" },
  { value: "AGGR",  label: "Agregación (◇)" },
  { value: "COMP",  label: "Composición (◆)" },
  { value: "INHERIT", label: "Herencia (A hereda de B)" },
  { value: "DEPEND",  label: "Dependencia" },
  { value: "NM",      label: "Entidad asociativa (N–M)" },
];

const MANY_SET = new Set(["0..*", "1..*", "*"]);
const isMany = (t) => MANY_SET.has(t);

const classify = (t) => {
  if (t === "1") return "ONE";
  if (t === "0..1") return "ZERO_ONE";
  if (isMany(t)) return "MANY";
  if (t === "N" || t === "0..N") return "MANY";
  return "ONE";
};

const normalizeLegacy = (v) => (v === "N" ? "*" : v === "0..N" ? "0..*" : v || "1");

function decideTipo(left, right) {
  if (!left || !right) return { error: "Selecciona ambos tipos." };
  const L = classify(left);
  const R = classify(right);
  if (L === "MANY" && R === "MANY") return { mode: "NM" };
  let key = null;
  if (L === "ONE" && R === "ONE") key = "1-1";
  else if (L === "ONE" && R === "MANY") key = "1-N";
  else if (L === "MANY" && R === "ONE") key = "N-1";
  else if (L === "ZERO_ONE" && R === "ONE") key = "0-1";
  else if (L === "ONE" && R === "ZERO_ONE") key = "1-0";
  else if (L === "ZERO_ONE" && R === "MANY") key = "0-N";
  else if (L === "MANY" && R === "ZERO_ONE") key = "N-0";
  if (!key) {
    return { error: "Combinación no soportada. Para N–M usa 0..*, 1..* o * en ambos lados." };
  }
  return { mode: "SIMPLE", tipo: key };
}

function suggestJoinName(aName, bName) {
  const clean = (s) =>
    (s || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .toLowerCase();
  const [x, y] = [clean(aName), clean(bName)].sort();
  return `${x}_${y}`;
}

export default function RelacionForm({
  options = [],
  editing,
  cancelEdit,
  onCreateSimple,
  onCreateNM,
  onUpdateEdge,
  nameOf, // (id) => label
}) {
  // Estado
  const [a, setA] = useState("");
  const [aTipo, setATipo] = useState("1");
  const [b, setB] = useState("");
  const [bTipo, setBTipo] = useState("1");
  const [verb, setVerb] = useState("");
  const [relKind, setRelKind] = useState("ASSOC");
  const [owning, setOwning] = useState("A");
  const [direction, setDirection] = useState("A->B");
  const [interName, setInterName] = useState("");

  const same = a && b && a === b;
  const isNM = relKind === "NM";
  const isInherit = relKind === "INHERIT";
  const isDepend  = relKind === "DEPEND";
  const needsMult = !isInherit && !isDepend && !isNM;
  const needsOwning = relKind === "AGGR" || relKind === "COMP";
  const needsDirection = isDepend || !isInherit;

  useEffect(() => {
    if (!editing) return;
    setA(editing.a);
    setB(editing.b);
    setATipo(normalizeLegacy(editing.mA));
    setBTipo(normalizeLegacy(editing.mB));
    setVerb(editing.verb || "");
    setRelKind(editing.relKind || "ASSOC");
    setOwning(editing.owning || "A");
    setDirection(editing.direction || "A->B");
    setInterName("");
  }, [editing]);

  useEffect(() => {
    if (!editing && isNM && a && b && !interName) {
      setInterName(suggestJoinName(nameOf(a), nameOf(b)));
    }
    if (!isNM && interName) setInterName("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a, b, isNM]);

  const decision = useMemo(() => {
    if (!needsMult) return { mode: "SPECIAL" };
    return decideTipo(aTipo, bTipo);
  }, [needsMult, aTipo, bTipo]);

  const canCreate =
    !!a && !!b && !same &&
    (isNM || isInherit || isDepend || (needsMult && !decision.error));

  const canUpdate =
    !!editing &&
    !!a && !!b && !same &&
    (isInherit || isDepend || (needsMult && !decision.error)) &&
    !isNM;

  const clearForm = () => {
    setA(""); setB(""); setATipo("1"); setBTipo("1");
    setVerb(""); setRelKind("ASSOC"); setOwning("A");
    setDirection("A->B"); setInterName("");
    cancelEdit?.();
  };

  const crear = () => {
    if (!canCreate) return;
    if (isNM) {
      onCreateNM?.({
        aId: a,
        bId: b,
        nombreIntermedia: (interName || suggestJoinName(nameOf(a), nameOf(b))).trim(),
      });
      clearForm();
      return;
    }
    const meta = { relKind: isInherit ? "INHERIT" : isDepend ? "DEPEND" : relKind, direction, owning: needsOwning ? owning : undefined };
    const payload = {
      sourceId: a,
      targetId: b,
      tipo: needsMult ? decision.tipo : undefined,
      mA: needsMult ? aTipo : undefined,
      mB: needsMult ? bTipo : undefined,
      verb: verb.trim(),
      meta,
    };
    onCreateSimple?.(payload);
    clearForm();
  };

  const actualizar = () => {
    if (!canUpdate || !editing) return;
    const meta = { relKind: isInherit ? "INHERIT" : isDepend ? "DEPEND" : relKind, direction, owning: needsOwning ? owning : undefined };
    onUpdateEdge?.(editing.edgeId, {
      source: a,
      target: b,
      data: {
        relType: needsMult ? decision.tipo : undefined,
        mA: needsMult ? aTipo : undefined,
        mB: needsMult ? bTipo : undefined,
        verb: verb.trim(),
        ...meta,
      },
      label: verb.trim() || undefined,
    });
    clearForm();
  };

  const dirLabelAtoB = `${a ? nameOf(a) : "A"} → ${b ? nameOf(b) : "B"}`;
  const dirLabelBtoA = `${b ? nameOf(b) : "B"} → ${a ? nameOf(a) : "A"}`;

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="font-semibold">
          {editing ? "Editar relación" : "Nueva relación"}
        </div>
        {/* 🔕 Sin botón IA local */}
      </div>

      {/* Entidad A */}
      <div className="grid grid-cols-[1fr_auto] gap-2 items-center mt-2">
        <div>
          <div className="text-xs text-gray-600">Entidad A</div>
          <div className="font-semibold min-h-[20px]">{a ? nameOf(a) : "\u00A0"}</div>
        </div>
        <select className="border rounded-md px-2 py-1" value={a} onChange={(e) => setA(e.target.value)}>
          <option value="">Seleccionar</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>

      {/* Entidad B */}
      <div className="grid grid-cols-[1fr_auto] gap-2 items-center mt-2">
        <div>
          <div className="text-xs text-gray-600">Entidad B</div>
          <div className="font-semibold min-h-[20px]">{b ? nameOf(b) : "\u00A0"}</div>
        </div>
        <select className="border rounded-md px-2 py-1" value={b} onChange={(e) => setB(e.target.value)}>
          <option value="">Seleccionar</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>

      {/* Tipo de relación */}
      <div className="mt-2">
        <label className="text-xs text-gray-600">Tipo de relación</label>
        <select className="w-full border rounded-md px-2 py-1 mt-1" value={relKind} onChange={(e) => setRelKind(e.target.value)}>
          {REL_KIND_OPTS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
      </div>

      {/* Multiplicidades */}
      {needsMult && (
        <>
          <div className="grid grid-cols-[1fr_auto] gap-2 items-center mt-2">
            <div>
              <div className="text-xs text-gray-600">Multiplicidad ({a ? nameOf(a) : "A"})</div>
              <div className="font-semibold min-h-[20px]">{aTipo}</div>
            </div>
            <select className="border rounded-md px-2 py-1" value={aTipo} onChange={(e) => setATipo(e.target.value)}>
              {SIDE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
            <div>
              <div className="text-xs text-gray-600">Multiplicidad ({b ? nameOf(b) : "B"})</div>
              <div className="font-semibold min-h-[20px]">{bTipo}</div>
            </div>
            <select className="border rounded-md px-2 py-1" value={bTipo} onChange={(e) => setBTipo(e.target.value)}>
              {SIDE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </>
      )}

      {/* Verbo opcional */}
      {!isInherit && (
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

      {/* Owning side */}
      {needsOwning && (
        <div className="mt-2">
          <label className="text-xs text-gray-600">Lado contenedor (diamante)</label>
          <select className="w-full border rounded-md px-2 py-1 mt-1" value={owning} onChange={(e) => setOwning(e.target.value)}>
            <option value="A">{a ? nameOf(a) : "A"}</option>
            <option value="B">{b ? nameOf(b) : "B"}</option>
          </select>
        </div>
      )}

      {/* Dirección */}
      {needsDirection && (
        <div className="mt-2">
          <label className="text-xs text-gray-600">Dirección (flechas)</label>
          <select className="w-full border rounded-md px-2 py-1 mt-1" value={direction} onChange={(e) => setDirection(e.target.value)}>
            <option value="A->B">{dirLabelAtoB}</option>
            <option value="B->A">{dirLabelBtoA}</option>
            {!isDepend && <option value="BIDI">↔ Bidireccional</option>}
          </select>
        </div>
      )}

      {/* Entidad asociativa */}
      {isNM && !editing && (
        <div className="mt-2">
          <label className="text-xs text-gray-600">Nombre de entidad/tabla intermedia</label>
          <input
            className="w-full border rounded-md px-2 py-1 mt-1"
            value={interName}
            onChange={(e) => setInterName(e.target.value)}
            placeholder="Ej: usuario_rol"
          />
        </div>
      )}

      {/* Reglas / errores */}
      <div className="mt-2 text-sm">
        {same && <div className="text-red-600">La Entidad A y B deben ser distintas.</div>}
        {needsMult && decision.error && <div className="text-amber-600">{decision.error}</div>}
        {editing && isNM && <div className="text-amber-600">No se puede convertir a N–M desde edición. Crea una relación N–M nueva.</div>}
      </div>

      {/* Botones */}
      {editing ? (
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
    </>
  );
}
