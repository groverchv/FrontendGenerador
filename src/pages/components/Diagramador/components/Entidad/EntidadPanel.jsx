import React, { useMemo, useState, useEffect } from "react";

// Tipos frecuentes en Spring Boot / JPA
const TYPE_OPTIONS = [
<<<<<<< HEAD
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
=======
  "String", "Boolean",
  "Byte", "Short", "Integer", "Long", "Float", "Double", "BigDecimal",
  "LocalDate", "LocalDateTime", "Instant", "OffsetDateTime",
  "UUID", "byte[]", "Text"
>>>>>>> trabajo-temporal
];

export default function EntidadPanel({
  node,
  onChangeName,
  onAddAttr,
  onUpdateAttr,
  onRemoveAttr,
  onDelete,
<<<<<<< HEAD
  onOpenIA,
  onNamePreview, // ← NUEVO: envía el nombre "en vivo" para la previsualización
=======
  onOpenIA // ← NUEVO: abre el modal IA (opcional)
>>>>>>> trabajo-temporal
}) {
  const [name, setName] = useState("");
  const [attrName, setAttrName] = useState("");
  const [attrType, setAttrType] = useState("String");

<<<<<<< HEAD
  useEffect(() => {
    setName(node?.data?.label || "");
  }, [node]);
=======
  useEffect(() => { setName(node?.data?.label || ""); }, [node]);
>>>>>>> trabajo-temporal

  const attrs = useMemo(() => node?.data?.attrs || [], [node]);

  if (!node) {
<<<<<<< HEAD
    return (
      <div style={{ color: "#667085" }}>
        Selecciona una entidad en el lienzo para editarla.
      </div>
    );
=======
    return <div style={{ color: "#667085" }}>Selecciona una entidad en el lienzo para editarla.</div>;
>>>>>>> trabajo-temporal
  }

  const canAdd = attrName.trim().length > 0;

  const addAttr = () => {
    if (!canAdd) return;
    onAddAttr?.({ name: attrName.trim(), type: attrType });
    setAttrName("");
  };

<<<<<<< HEAD
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
=======
  return (
    <div className="space-y-4">
      {/* Encabezado con título y botón IA */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span className="text-2xl">📦</span>
          Entidad
        </h3>
        {onOpenIA && (
          <button
            type="button"
            onClick={() => onOpenIA({
              scope: "entity",
              entityName: node?.data?.label || "",
              currentAttrs: attrs
            })}
            title="Sugerir/Completar atributos con IA"
            className="px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold text-sm shadow-md hover:shadow-lg hover:from-purple-600 hover:to-indigo-700 transition-all transform hover:scale-105"
          >
            ✨ IA
>>>>>>> trabajo-temporal
          </button>
        )}
      </div>

<<<<<<< HEAD
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
=======
      {/* Nombre de la entidad */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
        <label className="block text-sm font-semibold text-blue-900 mb-2">
          🏷️ Nombre de la entidad
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => onChangeName?.(name.trim() || node?.data?.label || "")}
          placeholder="Ej: Usuario, Producto, Pedido..."
          className="w-full border-2 border-blue-300 rounded-lg px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        />
      </div>

      {/* Lista de atributos */}
      <div className="bg-white p-4 rounded-xl border-2 border-gray-200">
        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="text-lg">📋</span>
          Atributos ({attrs.length})
        </label>
        
        {attrs.length ? (
          <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
            {attrs.map((a, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_auto_auto] gap-2 items-center p-2 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                <input
                  value={a.name}
                  onChange={(e) => onUpdateAttr?.(i, { ...a, name: e.target.value })}
                  placeholder="nombre"
                  className="w-full min-w-0 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                />
                <select
                  value={a.type}
                  onChange={(e) => onUpdateAttr?.(i, { ...a, type: e.target.value })}
                  className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 max-w-[110px]"
                >
                  {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <button 
                  onClick={() => onRemoveAttr?.(i)} 
                  title="Eliminar atributo"
                  className="px-2 py-1.5 rounded-md border-2 border-red-300 text-red-600 hover:bg-red-50 transition-all"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 mb-3">
            <div className="text-gray-400 text-3xl mb-1">📝</div>
            <div className="text-gray-500 text-sm font-medium">Sin atributos aún</div>
            <div className="text-gray-400 text-xs">Agrega tu primer atributo abajo</div>
          </div>
        )}

        {/* Formulario para añadir nuevo atributo */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
          <div className="text-xs font-semibold text-green-800 mb-2">➕ Nuevo atributo</div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              value={attrName}
              onChange={(e) => setAttrName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addAttr(); }}
              placeholder="nombre del atributo"
              className="w-full min-w-0 border border-green-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-green-400"
            />
            <select 
              value={attrType} 
              onChange={(e) => setAttrType(e.target.value)}
              className="border border-green-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-green-400 max-w-[110px]"
            >
              {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button
            disabled={!canAdd}
            onClick={addAttr}
            className="w-full mt-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold shadow-md hover:shadow-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
          >
            ✅ Añadir atributo
          </button>
        </div>
      </div>

      {/* Botón eliminar entidad */}
      <button
        onClick={onDelete}
        className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-red-100 to-pink-100 border-2 border-red-300 text-red-700 font-bold hover:from-red-200 hover:to-pink-200 transition-all transform hover:scale-[1.02]"
      >
        🗑️ Eliminar entidad
>>>>>>> trabajo-temporal
      </button>
    </div>
  );
}
