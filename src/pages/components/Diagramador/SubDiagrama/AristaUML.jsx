// src/views/proyectos/Diagramador/SubDiagrama/AristaUML.jsx
import React from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "reactflow";

/**
 * data:
 *  - relKind: "ASSOC" | "INHERIT" | "DEPEND" | "AGGR" | "COMP"
 *  - direction: "A->B" | "B->A"
 *  - owning: "A" | "B"
 *  - strokeWidth?: number
 *  - stroke?: string
 *  - markerScale?: number
 *  - labelsBesideMarker?: boolean  (true = número junto a la figura)
 *  - roleA, roleB, mA, mB, verb
 */
export default function AristaUML(props) {
  const {
    id,
    sourceX, sourceY,
    targetX, targetY,
    sourcePosition, targetPosition,
    data,
  } = props;

  const kind        = data?.relKind    ?? "ASSOC";
  const dir         = data?.direction  ?? "A->B";
  const owning      = data?.owning     ?? "A";
  const strokeWidth = data?.strokeWidth ?? 2;
  const stroke      = data?.stroke ?? "#444";
  const markerScale = data?.markerScale ?? 4.0;

  const labelsBesideMarker = data?.labelsBesideMarker ?? true; // <<— NUEVO

  const isDepend = kind === "DEPEND";
  const isInherit = kind === "INHERIT";
  const hasDiamondStart = (kind === "AGGR" || kind === "COMP") && owning === "A";
  const hasDiamondEnd   = (kind === "AGGR" || kind === "COMP") && owning === "B";
  const hasTriStart     = (isInherit && dir === "B->A") || (isDepend && dir === "B->A");
  const hasTriEnd       = (isInherit && dir === "A->B") || (isDepend && dir === "A->B");

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const angleRad = Math.atan2(uy, ux);
  const angleDeg = (angleRad * 180) / Math.PI;

  // Tamaños de marcadores
  const D = 6 * markerScale;       // semidiagonal del rombo
  const L = 2 * D;                 // largo rombo
  const T = 10 * markerScale;      // profundidad triángulo
  const GAP = 2 * markerScale;     // respiración

  // Offset del trazo para no atravesar la figura
  let startOffset = 0;
  let endOffset = 0;
  if (hasDiamondStart) startOffset = L + GAP;
  else if (hasTriStart) startOffset = T + GAP;

  if (hasDiamondEnd)   endOffset = L + GAP;
  else if (hasTriEnd)  endOffset = T + GAP;

  // Puntos del trazo (ya desplazados)
  const sx = sourceX + ux * startOffset;
  const sy = sourceY + uy * startOffset;
  const tx = targetX - ux * endOffset;
  const ty = targetY - uy * endOffset;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sx, sourceY: sy,
    targetX: tx, targetY: ty,
    sourcePosition, targetPosition,
  });

  /* ==================== Etiquetas ==================== */
  // Separación mínima del número respecto a la figura (alineado al costado)
  const ALONG_NEAR = 4;                // px después de la figura, a lo largo del trazo
  const NORMAL_NEAR = 10 + 2*markerScale; // px hacia un lado para que no tape la figura

  // (si se quiere el modo anterior “lejos”, usa estas distancias mayores)
  const ALONG_FAR = 26;
  const NORMAL_FAR = 22 + 8*markerScale;

  // Decide distancias según modo
  const alongStart = (labelsBesideMarker ? ALONG_NEAR : ALONG_FAR);
  const normalStart = (labelsBesideMarker ? NORMAL_NEAR : NORMAL_FAR);
  const alongEnd = (labelsBesideMarker ? ALONG_NEAR : ALONG_FAR);
  const normalEnd = (labelsBesideMarker ? NORMAL_NEAR : NORMAL_FAR);

  const tipStart = hasDiamondStart ? L : (hasTriStart ? T : 0);
  const tipEnd   = hasDiamondEnd   ? L : (hasTriEnd   ? T : 0);

  // Coloca la etiqueta A justo después del marcador del inicio
  const srcLabelX = sourceX + ux * (tipStart + GAP + alongStart) + nx * normalStart;
  const srcLabelY = sourceY + uy * (tipStart + GAP + alongStart) + ny * normalStart;

  // Coloca la etiqueta B justo antes del marcador del final
  const tgtLabelX = targetX - ux * (tipEnd + GAP + alongEnd) + nx * normalEnd;
  const tgtLabelY = targetY - uy * (tipEnd + GAP + alongEnd) + ny * normalEnd;

  /* ==================== Figuras ==================== */
  const DiamondPathStart = (
    <path
      d={`M 0 0 L ${D} ${-D} L ${L} 0 L ${D} ${D} Z`}
      fill={kind === "COMP" ? stroke : "white"}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
  const DiamondPathEnd = (
    <path
      d={`M 0 0 L ${-D} ${-D} L ${-L} 0 L ${-D} ${D} Z`}
      fill={kind === "COMP" ? stroke : "white"}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
  const TriangleStart = (
    <path
      d={`M 0 0 L ${T} ${-T} L ${T} ${T} Z`}
      fill="white"
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
  const TriangleEnd = (
    <path
      d={`M 0 0 L ${-T} ${-T} L ${-T} ${T} Z`}
      fill="white"
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke,
          strokeWidth,
          strokeLinecap: "round",
          ...(isDepend ? { strokeDasharray: "6 4" } : null),
        }}
      />

      {/* Marcadores sueltos, con la punta en el puerto */}
      <svg style={{ position: "absolute", overflow: "visible", pointerEvents: "none" }}>
        {(hasDiamondStart || hasTriStart) && (
          <g transform={`translate(${sourceX}, ${sourceY}) rotate(${angleDeg})`}>
            {hasDiamondStart ? DiamondPathStart : TriangleStart}
          </g>
        )}
        {(hasDiamondEnd || hasTriEnd) && (
          <g transform={`translate(${targetX}, ${targetY}) rotate(${angleDeg})`}>
            {hasDiamondEnd ? DiamondPathEnd : TriangleEnd}
          </g>
        )}
      </svg>

      {/* Etiquetas */}
      <EdgeLabelRenderer>
        {data?.verb && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "none",
              fontSize: 12,
              color: "#374151",
              background: "rgba(255,255,255,0.6)",
              padding: "0 4px",
              borderRadius: 4,
              whiteSpace: "nowrap",
            }}
          >
            {data.verb}
          </div>
        )}

        {(data?.mA || data?.roleA) && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${srcLabelX}px, ${srcLabelY}px)`,
              pointerEvents: "none",
              fontSize: 12,
              fontWeight: 500,
              color: "#111827",
              background: "rgba(255,255,255,0.95)",
              padding: "0 6px",
              borderRadius: 6,
              whiteSpace: "nowrap",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.06)",
            }}
          >
            {data?.mA ? `[${data.mA}] ` : ""}
            {data?.roleA || ""}
          </div>
        )}

        {(data?.mB || data?.roleB) && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${tgtLabelX}px, ${tgtLabelY}px)`,
              pointerEvents: "none",
              fontSize: 12,
              fontWeight: 500,
              color: "#111827",
              background: "rgba(255,255,255,0.95)",
              padding: "0 6px",
              borderRadius: 6,
              whiteSpace: "nowrap",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.06)",
            }}
          >
            {data?.mB ? `[${data.mB}] ` : ""}
            {data?.roleB || ""}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
