import React, { useMemo, useState, useEffect } from "react";

// Tipos frecuentes en Spring Boot / JPA
const TYPE_OPTIONS = [
  "String",
  "Boolean",
  "Byte",
  "Short",
  "Integer",
  "Long",
  "Float",
  "Double",
  "BigDecimal",
  "LocalDate",
  "LocalDateTime",
  "Instant",
  "OffsetDateTime",
  "UUID",
  "byte[]",
  "Text",
];

export default function EntidadPanel({
  node,
  onChangeName,
  onAddAttr,
  onUpdateAttr,
  onRemoveAttr,
  onDelete,
  onOpenIA,
  onNamePreview, // ← NUEVO: envía el nombre "en vivo" para la previsualización
}) {
  const [name, setName] = useState("");
  const [attrName, setAttrName] = useState("");
  const [attrType, setAttrType] = useState("String");

  useEffect(() => {
    setName(node?.data?.label || "");
  }, [node]);

  const attrs = useMemo(() => node?.data?.attrs || [], [node]);

  if (!node) {
    return (
      <div style={{ color: "#667085" }}>
        Selecciona una entidad en el lienzo para editarla.
      </div>
    );
  }

  const canAdd = attrName.trim().length > 0;

  const addAttr = () => {
    if (!canAdd) return;
    onAddAttr?.({ name: attrName.trim(), type: attrType });
    setAttrName("");
  };

  // Debounce muy liviano para no spamear el padre
  // (si quieres, reemplaza por un hook de debounce real)
  let typingTimer = null;
  const notifyPreview = (value) => {
    if (!onNamePreview) return;
    if (typingTimer) clearTimeout(typingTimer);
    typingTimer = setTimeout(() => onNamePreview(node.id, value), 120);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Título + botón IA contextual */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 0 }}>Entidad</h3>
        {onOpenIA && (
          <button
            type="button"
            onClick={() =>
              onOpenIA({
                scope: "entity",
                entityName: node?.data?.label || "",
                currentAttrs: attrs,
              })
            }
            title="Sugerir/Completar atributos con IA"
            style={{
              padding: "4px 10px",
              borderRadius: 8,
              border: "1px solid #c7d2fe",
              background: "#eef2ff",
              color: "#3730a3",
              fontWeight: 600,
            }}
          >
            IA
          </button>
        )}
      </div>

      <label style={{ fontSize: 12 }}>Nombre</label>
      <input
        value={name}
        onChange={(e) => {
          const v = e.target.value;
          setName(v);
          notifyPreview(v); // ← manda el nombre en vivo para la previsualización
        }}
        onBlur={() => onChangeName?.(name.trim() || node?.data?.label || "")}
        placeholder="Ej: Usuario"
      />

      <div style={{ marginTop: 8 }}>
        <label style={{ fontSize: 12, display: "block" }}>Atributos</label>
        {attrs.length ? (
          <ul style={{ paddingLeft: 16, margin: 0 }}>
            {attrs.map((a, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 6,
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                }}
              >
                <input
                  value={a.name}
                  onChange={(e) =>
                    onUpdateAttr?.(i, { ...a, name: e.target.value })
                  }
                  style={{ width: 140 }}
                />
                <select
                  value={a.type}
                  onChange={(e) =>
                    onUpdateAttr?.(i, { ...a, type: e.target.value })
                  }
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => onRemoveAttr?.(i)}
                  title="Eliminar atributo"
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ color: "#888" }}>Sin atributos</div>
        )}
      </div>

      {/* fila de inputs */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={attrName}
          onChange={(e) => setAttrName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addAttr();
          }}
          placeholder="nombre atributo"
          style={{ flex: 1 }}
        />
        <select value={attrType} onChange={(e) => setAttrType(e.target.value)}>
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <button
        disabled={!canAdd}
        onClick={addAttr}
        style={{
          marginTop: 6,
          padding: "10px 14px",
          borderRadius: 10,
          background: canAdd ? "#2563eb" : "#93c5fd",
          color: "#fff",
          border: `1px solid ${canAdd ? "#1d4ed8" : "#93c5fd"}`,
          fontWeight: 700,
          cursor: canAdd ? "pointer" : "not-allowed",
          boxShadow: canAdd ? "0 2px 6px rgba(37,99,235,.35)" : "none",
        }}
      >
        Añadir
      </button>

      <button
        style={{
          marginTop: 12,
          background: "#fee2e2",
          border: "1px solid #fecaca",
          borderRadius: 6,
          padding: "8px 10px",
        }}
        onClick={onDelete}
      >
        Eliminar entidad
      </button>
    </div>
  );
}
