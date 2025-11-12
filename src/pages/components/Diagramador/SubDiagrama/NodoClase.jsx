import React from "react";
import { Handle, Position } from "reactflow";

/**
 * NodoClase con 12 puntos bidireccionales (cada uno puede ser source O target):
 *  - HANDLES: tl, l1, l2, bl, t1, t2, t3, t4, tr, r1, r2, br → 12 puntos
 *
 * Cada handle funciona tanto como entrada (target) como salida (source),
 * permitiendo que las relaciones se conecten desde cualquier punto hacia cualquier punto.
 *
 * Esto facilita el escaneo de imágenes y hace el comportamiento más natural e idéntico
 * al escanear una imagen.
 */
export default function NodoClase({ data }) {
  // Siempre permitir conexiones (handles bidireccionales)
  const canConnect = () => true;

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

      {/* ===== HANDLES BIDIRECCIONALES - 12 puntos (source Y target) ===== */}
      
      {/* Esquina superior izquierda */}
      <Handle id="tl" type="source" position={Position.Left} style={{ top: "0%" }} isValidConnection={canConnect} isConnectable />
      <Handle id="tl-t" type="target" position={Position.Left} style={{ top: "0%" }} isValidConnection={canConnect} isConnectable />
      
      {/* Izquierda: 2 puntos centrales */}
      <Handle id="l1" type="source" position={Position.Left} style={{ top: "33%" }} isValidConnection={canConnect} isConnectable />
      <Handle id="l1-t" type="target" position={Position.Left} style={{ top: "33%" }} isValidConnection={canConnect} isConnectable />
      
      <Handle id="l2" type="source" position={Position.Left} style={{ top: "67%" }} isValidConnection={canConnect} isConnectable />
      <Handle id="l2-t" type="target" position={Position.Left} style={{ top: "67%" }} isValidConnection={canConnect} isConnectable />
      
      {/* Esquina inferior izquierda */}
      <Handle id="bl" type="source" position={Position.Left} style={{ top: "100%" }} isValidConnection={canConnect} isConnectable />
      <Handle id="bl-t" type="target" position={Position.Left} style={{ top: "100%" }} isValidConnection={canConnect} isConnectable />
      
      {/* Arriba: 4 puntos centrales */}
      <Handle id="t1" type="source" position={Position.Top} style={{ left: "20%" }} isValidConnection={canConnect} isConnectable />
      <Handle id="t1-t" type="target" position={Position.Top} style={{ left: "20%" }} isValidConnection={canConnect} isConnectable />
      
      <Handle id="t2" type="source" position={Position.Top} style={{ left: "40%" }} isValidConnection={canConnect} isConnectable />
      <Handle id="t2-t" type="target" position={Position.Top} style={{ left: "40%" }} isValidConnection={canConnect} isConnectable />
      
      <Handle id="t3" type="source" position={Position.Top} style={{ left: "60%" }} isValidConnection={canConnect} isConnectable />
      <Handle id="t3-t" type="target" position={Position.Top} style={{ left: "60%" }} isValidConnection={canConnect} isConnectable />
      
      <Handle id="t4" type="source" position={Position.Top} style={{ left: "80%" }} isValidConnection={canConnect} isConnectable />
      <Handle id="t4-t" type="target" position={Position.Top} style={{ left: "80%" }} isValidConnection={canConnect} isConnectable />
      
      {/* Esquina superior derecha */}
      <Handle id="tr" type="source" position={Position.Right} style={{ top: "0%" }} isValidConnection={canConnect} isConnectable />
      <Handle id="tr-t" type="target" position={Position.Right} style={{ top: "0%" }} isValidConnection={canConnect} isConnectable />
      
      {/* Derecha: 2 puntos centrales */}
      <Handle id="r1" type="source" position={Position.Right} style={{ top: "33%" }} isValidConnection={canConnect} isConnectable />
      <Handle id="r1-t" type="target" position={Position.Right} style={{ top: "33%" }} isValidConnection={canConnect} isConnectable />
      
      <Handle id="r2" type="source" position={Position.Right} style={{ top: "67%" }} isValidConnection={canConnect} isConnectable />
      <Handle id="r2-t" type="target" position={Position.Right} style={{ top: "67%" }} isValidConnection={canConnect} isConnectable />
      
      {/* Esquina inferior derecha */}
      <Handle id="br" type="source" position={Position.Right} style={{ top: "100%" }} isValidConnection={canConnect} isConnectable />
      <Handle id="br-t" type="target" position={Position.Right} style={{ top: "100%" }} isValidConnection={canConnect} isConnectable />
      
      {/* Abajo: 4 puntos centrales */}
      <Handle id="b1" type="source" position={Position.Bottom} style={{ left: "20%" }} isValidConnection={canConnect} isConnectable />
      <Handle id="b1-t" type="target" position={Position.Bottom} style={{ left: "20%" }} isValidConnection={canConnect} isConnectable />
      
      <Handle id="b2" type="source" position={Position.Bottom} style={{ left: "40%" }} isValidConnection={canConnect} isConnectable />
      <Handle id="b2-t" type="target" position={Position.Bottom} style={{ left: "40%" }} isValidConnection={canConnect} isConnectable />
      
      <Handle id="b3" type="source" position={Position.Bottom} style={{ left: "60%" }} isValidConnection={canConnect} isConnectable />
      <Handle id="b3-t" type="target" position={Position.Bottom} style={{ left: "60%" }} isValidConnection={canConnect} isConnectable />
      
      <Handle id="b4" type="source" position={Position.Bottom} style={{ left: "80%" }} isValidConnection={canConnect} isConnectable />
      <Handle id="b4-t" type="target" position={Position.Bottom} style={{ left: "80%" }} isValidConnection={canConnect} isConnectable />
    </div>
  );
}
