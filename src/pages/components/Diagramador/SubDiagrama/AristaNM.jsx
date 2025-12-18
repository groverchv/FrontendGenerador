// src/pages/components/Diagramador/SubDiagrama/AristaNM.jsx
// Edge personalizado para relaciones N-M con clase de asociación
// Dibuja: línea sólida entre entidades + línea punteada desde el centro hacia tabla intermedia

import React from "react";
import { BaseEdge, EdgeLabelRenderer, getStraightPath, useStore } from "reactflow";

/**
 * AristaNM - Edge especial para relaciones muchos-a-muchos
 * 
 * Props especiales en data:
 * - joinTableId: ID del nodo de la tabla intermedia
 * - mA, mB: multiplicidades en los extremos de la línea principal
 */
export default function AristaNM(props) {
    const {
        id,
        sourceX, sourceY,
        targetX, targetY,
        data,
    } = props;

    // Obtener la posición ACTUAL del nodo de la tabla intermedia usando useStore
    // Esto se actualiza automáticamente cuando el usuario mueve el nodo
    const joinTableNode = useStore((state) => {
        if (!data?.joinTableId) {
            console.log("⚠️ AristaNM: No hay joinTableId en data");
            return null;
        }
        const node = state.nodeInternals.get(data.joinTableId);
        if (!node) {
            console.log(`⚠️ AristaNM: No se encontró nodo con ID '${data.joinTableId}'`);
            console.log("   Nodos disponibles:", Array.from(state.nodeInternals.keys()));
        }
        return node;
    });

    // Validar coordenadas
    if (typeof sourceX !== 'number' || typeof sourceY !== 'number' ||
        typeof targetX !== 'number' || typeof targetY !== 'number') {
        console.error("❌ AristaNM: Coordenadas inválidas", { id, sourceX, sourceY, targetX, targetY });
        return null;
    }

    const strokeWidth = data?.strokeWidth ?? 2;
    const stroke = data?.stroke ?? "#444";

    // Calcular punto medio de la línea principal (donde sale la línea punteada)
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;

    // Posición DINÁMICA de la tabla intermedia
    // Se actualiza automáticamente cuando el usuario mueve el nodo
    const joinTableX = joinTableNode
        ? joinTableNode.position.x + (joinTableNode.width || 160) / 2
        : (data?.joinTablePosition?.x ?? midX) + 80;
    const joinTableY = joinTableNode
        ? joinTableNode.position.y
        : data?.joinTablePosition?.y ?? (midY + 150);

    // PATH 1: Línea principal horizontal/diagonal entre las entidades
    const [mainPath, labelX, labelY] = getStraightPath({
        sourceX, sourceY,
        targetX, targetY,
    });

    // PATH 2: Línea punteada vertical desde el centro hacia la tabla intermedia
    // Va desde el punto medio de la línea principal hasta el borde superior de la tabla
    const dottedPath = `M ${midX} ${midY} L ${joinTableX} ${joinTableY}`;

    // Calcular posiciones para las etiquetas de multiplicidad
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;

    const OFFSET = 25;
    const srcLabelX = sourceX + ux * OFFSET + nx * 15;
    const srcLabelY = sourceY + uy * OFFSET + ny * 15;
    const tgtLabelX = targetX - ux * OFFSET + nx * 15;
    const tgtLabelY = targetY - uy * OFFSET + ny * 15;

    return (
        <>
            {/* Línea principal SÓLIDA entre las entidades */}
            <BaseEdge
                id={id + "-main"}
                path={mainPath}
                style={{
                    stroke,
                    strokeWidth,
                    strokeLinecap: "round",
                }}
            />

            {/* Línea PUNTEADA desde el centro hacia la tabla intermedia */}
            <path
                d={dottedPath}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeDasharray="8 5"
                fill="none"
                style={{ pointerEvents: "none" }}
            />

            {/* Etiquetas de multiplicidad */}
            <EdgeLabelRenderer>
                {/* Multiplicidad lado A */}
                {data?.mA && (
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
                        {data.mA}
                    </div>
                )}

                {/* Multiplicidad lado B */}
                {data?.mB && (
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
                        {data.mB}
                    </div>
                )}

                {/* Etiqueta opcional en el centro */}
                {data?.verb && (
                    <div
                        style={{
                            position: "absolute",
                            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 15}px)`,
                            pointerEvents: "none",
                            fontSize: 11,
                            color: "#6b7280",
                            background: "rgba(255,255,255,0.8)",
                            padding: "0 4px",
                            borderRadius: 4,
                            whiteSpace: "nowrap",
                        }}
                    >
                        {data.verb}
                    </div>
                )}
            </EdgeLabelRenderer>
        </>
    );
}
