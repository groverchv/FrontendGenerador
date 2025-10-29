import React from "react";
import RelacionCRUD from "./RelacionCRUD";

export default function RelacionarPanel({
  nodes,
  edges,
  onRelacionSimple,
  onRelacionNM,
  onUpdateEdge,
  onDeleteEdge,
  onOpenIA,
}) {
  return (
    <div className="flex flex-col gap-3">
      <RelacionCRUD
        nodes={nodes}
        edges={edges}
        onRelacionSimple={onRelacionSimple}
        onRelacionNM={onRelacionNM}
        onUpdateEdge={onUpdateEdge}
        onDeleteEdge={onDeleteEdge}
        onAskIA={onOpenIA}
      />
    </div>
  );
}
