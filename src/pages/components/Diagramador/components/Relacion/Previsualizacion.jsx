import React, { useMemo } from "react";
import { suggestJoinName } from "./relationRules";

/**
 * Mini-diagrama de la relación seleccionada (versión compacta y estilizada).
 *
 * Props:
 * - kind, nodes, aId, bId, mA, mB, verb, isNM, joinName
 * - nameOverrides, ownerSide, superEnd
 * - height (default 140), size ("sm"|"md", default "sm")
 */
export default function Previsualizacion({
  kind = "ASSOCIATION",
  nodes = [],
  aId = "",
  bId = "",
  mA = "1",
  mB = "1",
  verb = "",
  isNM = false,
  joinName = "",
  nameOverrides = {},
  ownerSide = "A",
  superEnd = "B",
  height = 140,
  size = "sm",
}) {
  const getBaseName = (id) =>
    nodes.find((n) => n.id === id)?.data?.label ||
    nodes.find((n) => n.id === id)?.data?.name ||
    (id || "");

  const aName = useMemo(() => {
    if (!aId) return "Entidad A";
    return nameOverrides[aId]?.trim() || getBaseName(aId) || "Entidad A";
  }, [aId, nameOverrides, nodes]);

  const bName = useMemo(() => {
    if (!bId) return "Entidad B";
    return nameOverrides[bId]?.trim() || getBaseName(bId) || "Entidad B";
  }, [bId, nameOverrides, nodes]);

  const _joinName = useMemo(() => {
    if (!(isNM && kind === "ASSOCIATION")) return "";
    const base = joinName && joinName.trim()
      ? joinName.trim()
      : suggestJoinName(aName, bName);
    return base;
  }, [isNM, kind, joinName, aName, bName]);

  // Layout base (compacto)
  const W = 560;
  const H = Math.max(120, height);
  const boxW = size === "sm" ? 168 : 210;
  const boxH = size === "sm" ? 44 : 56;

  const leftX = 20;
  const rightX = W - boxW - 20;
  const centerY = H / 2 - boxH / 2;

  const joinW = size === "sm" ? 150 : 190;
  const joinX = (W - joinW) / 2;

  const truncate = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s);

  const leftLineStart = { x: leftX + boxW, y: centerY + boxH / 2 };
  const rightLineEnd = { x: rightX, y: centerY + boxH / 2 };
  const joinLeft = { x: joinX, y: centerY + boxH / 2 };
  const joinRight = { x: joinX + joinW, y: centerY + boxH / 2 };

  const hasSelection = aId && bId;

  // Marcadores
  const markerForDependency = "url(#arrow)";
  const markerTriangle = "url(#triangle)";
  const markerDiamondHollow = "url(#diamondHollow)";
  const markerDiamondFilled = "url(#diamondFilled)";
  const lineStrokeDash = kind === "DEPENDENCY" ? "6,6" : undefined;

  const aggrCompMarkerStart =
    (kind === "AGGREGATION" || kind === "COMPOSITION") && ownerSide === "A"
      ? (kind === "AGGREGATION" ? markerDiamondHollow : markerDiamondFilled)
      : null;

  const aggrCompMarkerEnd =
    (kind === "AGGREGATION" || kind === "COMPOSITION") && ownerSide === "B"
      ? (kind === "AGGREGATION" ? markerDiamondHollow : markerDiamondFilled)
      : null;

  const inhMarkerStart = superEnd === "A" ? markerTriangle : null;
  const inhMarkerEnd = superEnd === "B" ? markerTriangle : null;

  const KIND_CHIP = {
    ASSOCIATION: { text: "Asociación", emoji: "🔗" },
    AGGREGATION: { text: "Agregación", emoji: "◇" },
    COMPOSITION: { text: "Composición", emoji: "◆" },
    INHERITANCE: { text: "Herencia", emoji: "▲" },
    DEPENDENCY: { text: "Dependencia", emoji: "➜" },
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50/40 via-white to-white p-0.5">
      <div className="rounded-2xl bg-white p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">Previsualización</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full border bg-slate-50 text-slate-700">
              {KIND_CHIP[kind]?.emoji} {KIND_CHIP[kind]?.text}
            </span>
          </div>
          {!hasSelection && (
            <span className="text-xs text-slate-500">
              
            </span>
          )}
        </div>

        <div className="mt-2 rounded-xl bg-slate-50/60 ring-1 ring-slate-200/70 p-2">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            height={H}
            role="img"
            aria-label="Previsualización de relación"
          >
            <defs>
              {/* flecha */}
              <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L9,3 L0,6 z" fill="#64748b" />
              </marker>
              {/* triángulo (herencia) hueco */}
              <marker id="triangle" markerWidth="14" markerHeight="14" refX="13" refY="7" orient="auto" markerUnits="strokeWidth">
                <path d="M1,1 L13,7 L1,13 Z" fill="#fff" stroke="#64748b" strokeWidth="1.5" />
              </marker>
              {/* rombos */}
              <marker id="diamondHollow" markerWidth="14" markerHeight="14" refX="7" refY="7" orient="auto" markerUnits="strokeWidth">
                <path d="M7,1 L13,7 L7,13 L1,7 Z" fill="#fff" stroke="#64748b" strokeWidth="1.5" />
              </marker>
              <marker id="diamondFilled" markerWidth="14" markerHeight="14" refX="7" refY="7" orient="auto" markerUnits="strokeWidth">
                <path d="M7,1 L13,7 L7,13 L1,7 Z" fill="#64748b" />
              </marker>
            </defs>

            {/* Caja A */}
            <rect x={leftX} y={centerY} width={boxW} height={boxH} rx="12" ry="12" fill="#ffffff" stroke="#e5e7eb" />
            <text x={leftX + boxW / 2} y={centerY + (size === "sm" ? 26 : 30)} textAnchor="middle" fontWeight="700" fontSize={size === "sm" ? 12 : 14} fill="#0f172a">
              {truncate(aName || "Entidad A", size === "sm" ? 18 : 22)}
            </text>

            {/* Caja B */}
            <rect x={rightX} y={centerY} width={boxW} height={boxH} rx="12" ry="12" fill="#ffffff" stroke="#e5e7eb" />
            <text x={rightX + boxW / 2} y={centerY + (size === "sm" ? 26 : 30)} textAnchor="middle" fontWeight="700" fontSize={size === "sm" ? 12 : 14} fill="#0f172a">
              {truncate(bName || "Entidad B", size === "sm" ? 18 : 22)}
            </text>

            {/* Conectores según tipo */}
            {kind === "ASSOCIATION" && (!_joinName ? (
              <>
                <line x1={leftLineStart.x} y1={leftLineStart.y} x2={rightLineEnd.x} y2={rightLineEnd.y} stroke="#94a3b8" strokeWidth="2" />
                <text x={leftLineStart.x - 6} y={leftLineStart.y - 8} textAnchor="end" fontSize="11" fill="#334155">{mA}</text>
                <text x={rightLineEnd.x + 6} y={rightLineEnd.y - 8} textAnchor="start" fontSize="11" fill="#334155">{mB}</text>
                {verb?.trim() && (
                  <text x={(leftLineStart.x + rightLineEnd.x) / 2} y={leftLineStart.y - 12} textAnchor="middle" fontSize="11" fontStyle="italic" fill="#475569">
                    {truncate(verb.trim(), 24)}
                  </text>
                )}
              </>
            ) : (
              <>
                <rect x={joinX} y={centerY} width={joinW} height={boxH} rx="12" ry="12" fill="#ffffff" stroke="#e5e7eb" />
                <text x={joinX + joinW / 2} y={centerY + (size === "sm" ? 24 : 28)} textAnchor="middle" fontWeight="700" fontSize={size === "sm" ? 11 : 12} fill="#0f172a">
                  {truncate(_joinName || "tabla_intermedia", size === "sm" ? 20 : 24)}
                </text>
                <line x1={leftLineStart.x} y1={leftLineStart.y} x2={joinLeft.x} y2={joinLeft.y} stroke="#94a3b8" strokeWidth="2" />
                <text x={(leftLineStart.x + joinLeft.x) / 2} y={leftLineStart.y - 10} textAnchor="middle" fontSize="11" fill="#334155">{mA}</text>
                <line x1={joinRight.x} y1={joinRight.y} x2={rightLineEnd.x} y2={rightLineEnd.y} stroke="#94a3b8" strokeWidth="2" />
                <text x={(joinRight.x + rightLineEnd.x) / 2} y={rightLineEnd.y - 10} textAnchor="middle" fontSize="11" fill="#334155">{mB}</text>
                {verb?.trim() && (
                  <text x={W / 2} y={centerY - 10} textAnchor="middle" fontSize="11" fontStyle="italic" fill="#475569">
                    {truncate(verb.trim(), 24)}
                  </text>
                )}
              </>
            ))}

            {(kind === "AGGREGATION" || kind === "COMPOSITION") && (
              <>
                <line
                  x1={leftLineStart.x} y1={leftLineStart.y}
                  x2={rightLineEnd.x} y2={rightLineEnd.y}
                  stroke="#94a3b8" strokeWidth="2"
                  markerStart={ownerSide === "A" ? (kind === "AGGREGATION" ? markerDiamondHollow : markerDiamondFilled) : null}
                  markerEnd={ownerSide === "B" ? (kind === "AGGREGATION" ? markerDiamondHollow : markerDiamondFilled) : null}
                />
                <text x={leftLineStart.x - 6} y={leftLineStart.y - 8} textAnchor="end" fontSize="11" fill="#334155">{mA}</text>
                <text x={rightLineEnd.x + 6} y={rightLineEnd.y - 8} textAnchor="start" fontSize="11" fill="#334155">{mB}</text>
                {verb?.trim() && (
                  <text x={(leftLineStart.x + rightLineEnd.x) / 2} y={leftLineStart.y - 12} textAnchor="middle" fontSize="11" fontStyle="italic" fill="#475569">
                    {truncate(verb.trim(), 24)}
                  </text>
                )}
              </>
            )}

            {kind === "INHERITANCE" && (
              <>
                <line
                  x1={leftLineStart.x} y1={leftLineStart.y}
                  x2={rightLineEnd.x} y2={rightLineEnd.y}
                  stroke="#94a3b8" strokeWidth="2"
                  markerStart={inhMarkerStart}
                  markerEnd={inhMarkerEnd}
                />
                <text x={(leftLineStart.x + rightLineEnd.x) / 2} y={leftLineStart.y - 12} textAnchor="middle" fontSize="11" fill="#64748b">
                  Generalización
                </text>
              </>
            )}

            {kind === "DEPENDENCY" && (
              <>
                <line
                  x1={leftLineStart.x} y1={leftLineStart.y}
                  x2={rightLineEnd.x} y2={rightLineEnd.y}
                  stroke="#94a3b8" strokeWidth="2"
                  strokeDasharray={lineStrokeDash}
                  markerEnd={markerForDependency}
                />
                {verb?.trim() && (
                  <text x={(leftLineStart.x + rightLineEnd.x) / 2} y={leftLineStart.y - 12} textAnchor="middle" fontSize="11" fontStyle="italic" fill="#475569">
                    {truncate(verb.trim(), 24)}
                  </text>
                )}
              </>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
