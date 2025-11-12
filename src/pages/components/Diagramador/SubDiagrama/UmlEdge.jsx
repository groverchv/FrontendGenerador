import React, { useMemo } from "react";
import { BaseEdge, EdgeLabelRenderer, getStraightPath } from "reactflow";

/** Normaliza el tipo a códigos internos. */
const normKind = (k) => {
  const s = String(k || "ASSOC").toUpperCase();
  if (s.includes("COMP")) return "COMP";
  if (s.includes("AGGR") || s.includes("AGREG")) return "AGGR";
  if (s.includes("INHER")) return "INHERIT";
  if (s.includes("DEP")) return "DEPEND";
  return "ASSOC";
};

// Colores por tipo
const COLOR_BY_KIND = {
  ASSOC:   "#374151", // gris oscuro
  AGGR:    "#111827",
  COMP:    "#111827",
  INHERIT: "#111827",
  DEPEND:  "#111827",
};

export default function UmlEdge(props) {
  const { id, sourceX, sourceY, targetX, targetY, data = {}, style } = props;

  const kind = normKind(data.relKind || data.kind);
  const owning = (data.owning || data.ownerSide || "A").toUpperCase(); // A | B

  // Path recto (no bezier)
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX, sourceY, targetX, targetY,
  });

  // Posiciones para multiplicidad
  const srcLabelX = sourceX * 0.88 + targetX * 0.12;
  const srcLabelY = sourceY * 0.88 + targetY * 0.12;
  const tgtLabelX = sourceX * 0.12 + targetX * 0.88;
  const tgtLabelY = sourceY * 0.12 + targetY * 0.88;

  // IDs únicos
  const ids = useMemo(() => {
    const base = `uml-${id}`;
    return {
      diamondHollow: `${base}-diamond-hollow`,
      diamondFilled: `${base}-diamond-filled`,
      triangleOpen: `${base}-triangle-open`,
    };
  }, [id]);

  // Estilo visible y “agarrable” (interactionWidth ↑)
  const baseStroke = COLOR_BY_KIND[kind] || "#374151";
  const edgeStyle =
    kind === "DEPEND"
      ? { stroke: baseStroke, strokeWidth: 1.8, strokeDasharray: "6 6", strokeLinecap: "round", ...style }
      : { stroke: baseStroke, strokeWidth: 1.8, strokeLinecap: "round", ...style };

  // Marcadores según tipo
  let markerStart, markerEnd;
  if (kind === "INHERIT") {
    markerEnd = `url(#${ids.triangleOpen})`;
  } else if (kind === "DEPEND") {
    markerEnd = `url(#${ids.triangleOpen})`;
  } else if (kind === "COMP") {
    if (owning === "A") markerStart = `url(#${ids.diamondFilled})`;
    else markerEnd = `url(#${ids.diamondFilled})`;
  } else if (kind === "AGGR") {
    if (owning === "A") markerStart = `url(#${ids.diamondHollow})`;
    else markerEnd = `url(#${ids.diamondHollow})`;
  }
  // ASSOC no tiene marcadores (solo una línea simple)

  return (
    <>
      {/* Definiciones de marcadores */}
      <defs>
        <marker id={ids.diamondHollow} markerWidth="18" markerHeight="18"
                refX="10" refY="9" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M10 2 L17 9 L10 16 L3 9 Z" fill="white" stroke="#111827" strokeWidth="1.5"/>
        </marker>
        <marker id={ids.diamondFilled} markerWidth="18" markerHeight="18"
                refX="10" refY="9" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M10 2 L17 9 L10 16 L3 9 Z" fill="#111827" stroke="#111827" strokeWidth="1.5"/>
        </marker>
        <marker id={ids.triangleOpen} markerWidth="20" markerHeight="20"
                refX="12" refY="10" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M3 18 L12 2 L21 18 Z" fill="white" stroke="#111827" strokeWidth="1.5"/>
        </marker>
      </defs>

      {/* Trazo principal con “hitbox” grande para poder arrastrar */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={edgeStyle}
        markerStart={markerStart}
        markerEnd={markerEnd}
        interactionWidth={24}   // 👈 facilita agarrar para mover extremos
      />

      {/* Verbo (etiqueta central) */}
      {data.verb && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: "rgba(255,255,255,0.9)",
              border: "1px solid #E5E7EB",
              borderRadius: 6,
              padding: "1px 6px",
              fontSize: 12,
              color: "#374151",
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            {data.verb}
          </div>
        </EdgeLabelRenderer>
      )}

      {/* Multiplicidades (cerca de extremos) */}
      <EdgeLabelRenderer>
        {(data.mA || data.roleA) && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${srcLabelX}px, ${srcLabelY}px)`,
              background: "rgba(255,255,255,0.85)",
              border: "1px solid #E5E7EB",
              borderRadius: 4,
              padding: "0 4px",
              fontSize: 11,
              color: "#111827",
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            {data.mA ? `[${data.mA}] ` : ""}
            {data.roleA || ""}
          </div>
        )}

        {(data.mB || data.roleB) && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${tgtLabelX}px, ${tgtLabelY}px)`,
              background: "rgba(255,255,255,0.85)",
              border: "1px solid #E5E7EB",
              borderRadius: 4,
              padding: "0 4px",
              fontSize: 11,
              color: "#111827",
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            {data.mB ? `[${data.mB}] ` : ""}
            {data.roleB || ""}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
