import React from "react";
import Sidebar from "../sidebar/sidebar";

/** Contenedor del sidebar (derecha en desktop, bottom-sheet en móvil) */
export default function SidebarDock({
  activeTab,
  setActiveTab,
  addEntity,
  clearAll,
  persistNow,
  handleGenerate,
  openIA,
  children,
}) {
  return (
    <div className="md:h-full h-[42vh] md:relative fixed bottom-0 left-0 right-0 bg-white shadow-lg md:shadow-none border-t md:border-l z-20 overflow-y-auto">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onAddEntity={addEntity}
        onClear={clearAll}
        onExport={persistNow}
        onGenerate={handleGenerate}
        onOpenIA={openIA}
      >
        {children}
      </Sidebar>
    </div>
  );
}
