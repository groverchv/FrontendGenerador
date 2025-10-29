// src/diagram/SubDiagrama/ClassNode.jsx
import React from "react";
import { Handle, Position } from "reactflow";

export default function ClassNode({ data }) {
  return (
    <div className="bg-white rounded-md border-2 border-teal-500 w-auto min-w-[220px] max-w-[380px] shadow-sm">
      <div className="bg-teal-500 text-white font-bold text-center px-2 py-1 truncate">
        {data.label || "Entidad"}
      </div>

      <div className="p-2 min-h-[60px] max-h-56 overflow-auto">
        {Array.isArray(data?.attrs) && data.attrs.length ? (
          <ul className="m-0 pl-4 list-disc break-words whitespace-normal">
            {data.attrs.map((a, i) => (
              <li key={i} className="leading-tight py-0.5">
                <span className="font-medium">{a.name}</span>
                {": "}
                <i>{a.type || "String"}</i>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-500">Sin atributos…</div>
        )}
      </div>

      {/* 8 handles */}
      <Handle type="target" id="left-mid" position={Position.Left} style={{ top: "50%" }} />
      <Handle type="source" id="right-mid" position={Position.Right} style={{ top: "50%" }} />

      <Handle type="target" id="top-left" position={Position.Top} style={{ left: "18%" }} />
      <Handle type="target" id="top-mid" position={Position.Top} style={{ left: "50%" }} />
      <Handle type="target" id="top-right" position={Position.Top} style={{ left: "82%" }} />

      <Handle type="source" id="bottom-left" position={Position.Bottom} style={{ left: "18%" }} />
      <Handle type="source" id="bottom-mid" position={Position.Bottom} style={{ left: "50%" }} />
      <Handle type="source" id="bottom-right" position={Position.Bottom} style={{ left: "82%" }} />
    </div>
  );
}
