import React from "react";
import { BaseEdge, EdgeLabelRenderer, MarkerType, getBezierPath } from "reactflow";

export default function AristaUML(props) {
  const {
    id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data,
  } = props;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
  });

  // Flechas según dirección o herencia
  let markerStart, markerEnd;
  if (data?.relKind === "INHERIT") {
    markerEnd = { type: MarkerType.ArrowClosed };
  } else {
    const dir = data?.direction || "A->B";
    if (dir === "A->B") markerEnd = { type: MarkerType.ArrowClosed };
    else if (dir === "B->A") markerStart = { type: MarkerType.ArrowClosed };
    else if (dir === "BIDI") {
      markerStart = { type: MarkerType.ArrowClosed };
      markerEnd = { type: MarkerType.ArrowClosed };
    }
  }

  // Estereotipo
  const stereotype =
    data?.relKind === "COMP" ? "«comp»" :
    data?.relKind === "AGGR" ? "«agreg»" :
    data?.relKind === "INHERIT" ? "«extends»" :
    data?.relKind === "DEPEND" ? "«dep»" : "";

  // Diamante textual en etiquetas laterales (lado dueño)
  const diamondFor = data?.relKind === "COMP" ? "◆" : (data?.relKind === "AGGR" ? "◇" : "");
  const showDiamondA = !!diamondFor && (data?.owning || "A") === "A";
  const showDiamondB = !!diamondFor && (data?.owning || "A") === "B";

  const srcLabelX = sourceX * 0.9 + targetX * 0.1;
  const srcLabelY = sourceY * 0.9 + targetY * 0.1;
  const tgtLabelX = sourceX * 0.1 + targetX * 0.9;
  const tgtLabelY = sourceY * 0.1 + targetY * 0.9;

  const isDepend = data?.relKind === "DEPEND";

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={isDepend ? { strokeDasharray: "6 4" } : undefined}
      />

      <EdgeLabelRenderer>
        {(data?.verb || stereotype) && (
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
            {stereotype ? `${stereotype}${data?.verb ? " " : ""}` : ""}
            {data?.verb || ""}
          </div>
        )}

        {(data?.mA || data?.roleA || showDiamondA) && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${srcLabelX}px, ${srcLabelY}px)`,
              pointerEvents: "none",
              fontSize: 11,
              color: "#111827",
              background: "rgba(255,255,255,0.7)",
              padding: "0 4px",
              borderRadius: 4,
              whiteSpace: "nowrap",
            }}
          >
            {showDiamondA ? `${diamondFor} ` : ""}
            {data?.mA ? `[${data.mA}] ` : ""}
            {data?.roleA ? `${data.roleA}` : ""}
          </div>
        )}

        {(data?.mB || data?.roleB || showDiamondB) && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${tgtLabelX}px, ${tgtLabelY}px)`,
              pointerEvents: "none",
              fontSize: 11,
              color: "#111827",
              background: "rgba(255,255,255,0.7)",
              padding: "0 4px",
              borderRadius: 4,
              whiteSpace: "nowrap",
            }}
          >
            {showDiamondB ? `${diamondFor} ` : ""}
            {data?.mB ? `[${data.mB}] ` : ""}
            {data?.roleB ? `${data?.roleB}` : ""}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
