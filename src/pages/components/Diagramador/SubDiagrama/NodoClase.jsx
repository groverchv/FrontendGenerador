import React from "react";
import { Handle, Position } from "reactflow";

/**
 * NodoClase con 24 puntos (12 target + 12 source):
 *  - TARGET (entradas): tl, l1, l2, bl, t1, t2, t3, t4, tr, r1, r2, br  → 12
 *  - SOURCE (salidas):  tl2, l3, l4, bl2, b1, b2, b3, b4, tr2, r3, r4, br2  → 12
 *
 * Incluye puntos en las 4 esquinas para mejor distribución.
 *
 * data.usage = {
 *   target: { tl:0, l1:0, l2:0, bl:0, t1:0, t2:0, t3:0, t4:0, tr:0, r1:0, r2:0, br:0 },
 *   source: { tl2:0, l3:0, l4:0, bl2:0, b1:0, b2:0, b3:0, b4:0, tr2:0, r3:0, r4:0, br2:0 }
 * }
 *
 * Regla: mientras haya manijas libres en ese lado, NO se puede reutilizar una ya ocupada;
 * cuando las 12 de ese lado estén ocupadas, se permite reutilizar.
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

      {/* ===== TARGETS (entradas) - 12 puntos ===== */}
      
      {/* Esquina superior izquierda */}
      <Handle id="tl" type="target" position={Position.Left} style={{ top: "0%" }} isValidConnection={() => canUseTarget("tl")} isConnectable={canUseTarget("tl")} />
      
      {/* Izquierda: 2 puntos centrales */}
      <Handle id="l1" type="target" position={Position.Left}  style={{ top: "33%" }} isValidConnection={() => canUseTarget("l1")} isConnectable={canUseTarget("l1")} />
      <Handle id="l2" type="target" position={Position.Left}  style={{ top: "67%" }} isValidConnection={() => canUseTarget("l2")} isConnectable={canUseTarget("l2")} />
      
      {/* Esquina inferior izquierda */}
      <Handle id="bl" type="target" position={Position.Left} style={{ top: "100%" }} isValidConnection={() => canUseTarget("bl")} isConnectable={canUseTarget("bl")} />
      
      {/* Arriba: 4 puntos centrales */}
      <Handle id="t1" type="target" position={Position.Top}   style={{ left: "20%" }} isValidConnection={() => canUseTarget("t1")} isConnectable={canUseTarget("t1")} />
      <Handle id="t2" type="target" position={Position.Top}   style={{ left: "40%" }} isValidConnection={() => canUseTarget("t2")} isConnectable={canUseTarget("t2")} />
      <Handle id="t3" type="target" position={Position.Top}   style={{ left: "60%" }} isValidConnection={() => canUseTarget("t3")} isConnectable={canUseTarget("t3")} />
      <Handle id="t4" type="target" position={Position.Top}   style={{ left: "80%" }} isValidConnection={() => canUseTarget("t4")} isConnectable={canUseTarget("t4")} />
      
      {/* Esquina superior derecha */}
      <Handle id="tr" type="target" position={Position.Right} style={{ top: "0%" }} isValidConnection={() => canUseTarget("tr")} isConnectable={canUseTarget("tr")} />
      
      {/* Derecha: 2 puntos centrales */}
      <Handle id="r1" type="target" position={Position.Right} style={{ top: "33%" }} isValidConnection={() => canUseTarget("r1")} isConnectable={canUseTarget("r1")} />
      <Handle id="r2" type="target" position={Position.Right} style={{ top: "67%" }} isValidConnection={() => canUseTarget("r2")} isConnectable={canUseTarget("r2")} />
      
      {/* Esquina inferior derecha */}
      <Handle id="br" type="target" position={Position.Right} style={{ top: "100%" }} isValidConnection={() => canUseTarget("br")} isConnectable={canUseTarget("br")} />

      {/* ===== SOURCES (salidas) - 12 puntos ===== */}
      
      {/* Esquina superior izquierda */}
      <Handle id="tl2" type="source" position={Position.Left} style={{ top: "0%" }} isValidConnection={() => canUseSource("tl2")} isConnectable={canUseSource("tl2")} />
      
      {/* Izquierda: 2 puntos centrales */}
      <Handle id="l3" type="source" position={Position.Left}  style={{ top: "33%" }} isValidConnection={() => canUseSource("l3")} isConnectable={canUseSource("l3")} />
      <Handle id="l4" type="source" position={Position.Left}  style={{ top: "67%" }} isValidConnection={() => canUseSource("l4")} isConnectable={canUseSource("l4")} />
      
      {/* Esquina inferior izquierda */}
      <Handle id="bl2" type="source" position={Position.Left} style={{ top: "100%" }} isValidConnection={() => canUseSource("bl2")} isConnectable={canUseSource("bl2")} />
      
      {/* Abajo: 4 puntos centrales */}
      <Handle id="b1" type="source" position={Position.Bottom} style={{ left: "20%" }} isValidConnection={() => canUseSource("b1")} isConnectable={canUseSource("b1")} />
      <Handle id="b2" type="source" position={Position.Bottom} style={{ left: "40%" }} isValidConnection={() => canUseSource("b2")} isConnectable={canUseSource("b2")} />
      <Handle id="b3" type="source" position={Position.Bottom} style={{ left: "60%" }} isValidConnection={() => canUseSource("b3")} isConnectable={canUseSource("b3")} />
      <Handle id="b4" type="source" position={Position.Bottom} style={{ left: "80%" }} isValidConnection={() => canUseSource("b4")} isConnectable={canUseSource("b4")} />
      
      {/* Esquina superior derecha */}
      <Handle id="tr2" type="source" position={Position.Right} style={{ top: "0%" }} isValidConnection={() => canUseSource("tr2")} isConnectable={canUseSource("tr2")} />
      
      {/* Derecha: 2 puntos centrales */}
      <Handle id="r3" type="source" position={Position.Right} style={{ top: "33%" }} isValidConnection={() => canUseSource("r3")} isConnectable={canUseSource("r3")} />
      <Handle id="r4" type="source" position={Position.Right} style={{ top: "67%" }} isValidConnection={() => canUseSource("r4")} isConnectable={canUseSource("r4")} />
      
      {/* Esquina inferior derecha */}
      <Handle id="br2" type="source" position={Position.Right} style={{ top: "100%" }} isValidConnection={() => canUseSource("br2")} isConnectable={canUseSource("br2")} />
    </div>
  );
}
