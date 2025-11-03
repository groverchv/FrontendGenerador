// src/views/proyectos/Diagramador/SubDiagrama/NodoClase.jsx
import React from "react";
import { Handle, Position } from "reactflow";

/**
 * NodoClase
 * Dibuja la tarjeta de entidad/clase con sus atributos.
 */
export default function NodoClase({ data }) {
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
      <Handle type="target" position={Position.Left} id="l" />
      <Handle type="source" position={Position.Right} id="r" />
      <Handle type="target" position={Position.Top} id="t" />
      <Handle type="source" position={Position.Bottom} id="b" />
    </div>
  );
}
