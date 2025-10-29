import React from "react";

/**
 * Botón de IA reutilizable para:
 * - sugerencias al crear una relación (scope: "relation", usa props.draft y props.candidates)
 * - sugerencias al editar una relación (scope: "relation-edit", usa props.current y props.edgeId)
 *
 * Props:
 * - onAsk(payload): función que recibe el payload para IA (normalmente tu onOpenIA)
 * - scope: "relation" | "relation-edit"
 * - candidates?: string[] (nombres de entidades)
 * - draft?: { aName, bName, mA, mB, verb, joinName }
 * - edgeId?: string
 * - current?: { aName, bName, mA, mB, verb, relType }
 * - label?: string (texto del botón)
 * - title?: string (tooltip)
 * - small?: boolean (estilo compacto)
 * - className?: string (clases extra)
 */
export default function RelacionIA({
  onAsk,
  scope,
  candidates = [],
  draft = null,
  edgeId = null,
  current = null,
  label = "IA",
  title = "Sugerencias IA",
  small = false,
  className = "",
}) {
  const handleClick = () => {
    onAsk?.({
      scope,
      candidates,
      draft,
      edgeId,
      current,
    });
  };

  const base =
    "rounded-md border bg-indigo-50 text-indigo-700 hover:bg-indigo-100";
  const sizes = small ? "px-2 py-1 text-sm" : "px-2 py-1";
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${base} ${sizes} ${className}`}
      title={title}
    >
      {label}
    </button>
  );
}
