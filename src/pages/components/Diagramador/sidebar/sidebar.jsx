import React from "react";

export default function Sidebar({
  activeTab,
  setActiveTab,
  onAddEntity,
  onClear,
  onOpenIA,
  children,
}) {
  const handleClear = () => {
    if (window.confirm("⚠️ ¿Seguro que deseas limpiar todo el diagrama?")) {
      onClear();
    }
  };

  return (
    <aside className="w-full md:w-[320px] lg:w-[340px] flex flex-col h-full">
      {/* Acciones */}
      <div className="flex flex-wrap md:flex-nowrap gap-2 px-3 py-2 border-b border-gray-100">
        <button
          onClick={onOpenIA}
          className="flex-1 md:flex-none px-2 py-1 rounded-md border bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
          title="Construir/Completar diagrama con IA"
        >
          🤖 IA
        </button>

        <button
          onClick={onAddEntity}
          className="flex-1 md:flex-none px-2 py-1 rounded-md border hover:bg-gray-50"
        >
          ＋ Entidad
        </button>

        <button
          onClick={handleClear}
          className="flex-1 md:flex-none px-2 py-1 rounded-md border hover:bg-red-50 text-red-600"
        >
          🗑️ Limpiar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setActiveTab("entidad")}
          className={`flex-1 px-4 py-2 ${
            activeTab === "entidad" ? "border-b-2 border-sky-500" : ""
          }`}
        >
          Entidad
        </button>
        <button
          onClick={() => setActiveTab("relacionar")}
          className={`flex-1 px-4 py-2 ${
            activeTab === "relacionar" ? "border-b-2 border-sky-500" : ""
          }`}
        >
          Relacionar
        </button>
      </div>

      <div className="p-3 overflow-y-auto flex-1">{children}</div>
    </aside>
  );
}
