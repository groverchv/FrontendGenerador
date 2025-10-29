import React from "react";

/** Sidebar fijo y responsivo:
 *  - Móvil: 100% ancho (bottom-sheet si lo usas así).
 *  - Desktop: más angosto (240–340px) y con min-w-0 para evitar desbordes.
 */
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
      onClear?.();
    }
  };

  return (
    <aside
      className="
        w-full
        md:w-[240px] lg:w-[280px] xl:w-[320px] 2xl:w-[340px]
        min-w-0
        flex flex-col h-full bg-white border-r border-gray-100 flex-shrink-0
      "
    >
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
          className={`flex-1 px-3 py-2 text-sm sm:text-base ${
            activeTab === "entidad" ? "border-b-2 border-sky-500" : ""
          }`}
        >
          Entidad
        </button>
        <button
          onClick={() => setActiveTab("relacionar")}
          className={`flex-1 px-3 py-2 text-sm sm:text-base ${
            activeTab === "relacionar" ? "border-b-2 border-sky-500" : ""
          }`}
        >
          Relacionar
        </button>
      </div>

      {/* Contenido */}
      <div className="p-3 overflow-y-auto flex-1 min-w-0">{children}</div>
    </aside>
  );
}
