import React from "react";
import { Handle, Position } from "reactflow";

/**
 * NodoClase con 10 puntos:
 *  - TARGET (entradas): l1, l2, l3, t1, t2  → 5
 *  - SOURCE (salidas):  r1, r2, r3, b1, b2  → 5
 *
 * data.usage = {
 *   target: { l1:0,l2:0,l3:0,t1:0,t2:0 },
 *   source: { r1:0,r2:0,r3:0,b1:0,b2:0 }
 * }
 *
 * Regla: mientras haya manijas libres en ese lado, NO se puede reutilizar una ya ocupada;
 * cuando las 5 de ese lado estén ocupadas, se permite reutilizar.
 */
export default function NodoClase({ data }) {
  const usage = data?.usage || { target: {}, source: {} };

  const sideAllUsed = (side) => {
    const m = usage?.[side] || {};
    const vals = Object.values(m);
    return vals.length > 0 && vals.every((c) => (c || 0) > 0);
  };

  const canUseTarget = (id) => {
    const m = usage?.target || {};
    if (sideAllUsed("target")) return true;
    return (m[id] || 0) === 0;
  };

  const canUseSource = (id) => {
    const m = usage?.source || {};
    if (sideAllUsed("source")) return true;
    return (m[id] || 0) === 0;
  };

  return (
    <div
      className="bg-white rounded-md border-2 border-teal-500 w-auto min-w-[220px] max-w-[360px]"
      style={{ willChange: "transform", transform: "translateZ(0)" }}
    >
      <div className="bg-teal-500 text-white font-bold text-center px-2 py-1">
        {data?.label || "Entidad"}
      </div>

      <div className="p-2 min-h-[60px]">
        {data?.attrs?.length ? (
          <ul className="m-0 pl-4 list-disc break-words whitespace-normal">
            {data.attrs.map((a, i) => (
              <li key={i}>
                {a.name}: <i>{a.type}</i>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-500">Sin atributos…</div>
        )}
      </div>

      {/* ===== TARGETS (entradas) ===== */}
      {/* Izquierda: 3 puntos */}
      <Handle id="l1" type="target" position={Position.Left}  style={{ top: "20%" }} isValidConnection={() => canUseTarget("l1")} isConnectable={canUseTarget("l1")} />
      <Handle id="l2" type="target" position={Position.Left}  style={{ top: "50%" }} isValidConnection={() => canUseTarget("l2")} isConnectable={canUseTarget("l2")} />
      <Handle id="l3" type="target" position={Position.Left}  style={{ top: "80%" }} isValidConnection={() => canUseTarget("l3")} isConnectable={canUseTarget("l3")} />
      {/* Arriba: 2 puntos */}
      <Handle id="t1" type="target" position={Position.Top}   style={{ left: "30%" }} isValidConnection={() => canUseTarget("t1")} isConnectable={canUseTarget("t1")} />
      <Handle id="t2" type="target" position={Position.Top}   style={{ left: "70%" }} isValidConnection={() => canUseTarget("t2")} isConnectable={canUseTarget("t2")} />

      {/* ===== SOURCES (salidas) ===== */}
      {/* Derecha: 3 puntos */}
      <Handle id="r1" type="source" position={Position.Right} style={{ top: "20%" }} isValidConnection={() => canUseSource("r1")} isConnectable={canUseSource("r1")} />
      <Handle id="r2" type="source" position={Position.Right} style={{ top: "50%" }} isValidConnection={() => canUseSource("r2")} isConnectable={canUseSource("r2")} />
      <Handle id="r3" type="source" position={Position.Right} style={{ top: "80%" }} isValidConnection={() => canUseSource("r3")} isConnectable={canUseSource("r3")} />
      {/* Abajo: 2 puntos */}
      <Handle id="b1" type="source" position={Position.Bottom} style={{ left: "30%" }} isValidConnection={() => canUseSource("b1")} isConnectable={canUseSource("b1")} />
      <Handle id="b2" type="source" position={Position.Bottom} style={{ left: "70%" }} isValidConnection={() => canUseSource("b2")} isConnectable={canUseSource("b2")} />
    </div>
  );
}
