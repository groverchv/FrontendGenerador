import React from "react";
import ReactFlow, { MiniMap, Controls, Background, ConnectionLineType } from "reactflow";
import "reactflow/dist/style.css";

export default function DiagramCanvas(props) {
  return (
    <div className="flex-1 h-full overflow-hidden">
      <style>{`
        .react-flow__background { z-index: 0 !important; }
        .react-flow__edges { z-index: 1 !important; }
        .react-flow__nodes { z-index: 2 !important; }
        .react-flow__edge-textwrapper { z-index: 3 !important; pointer-events: none; }
      `}</style>

      <ReactFlow
        {...props}
        connectionLineType={ConnectionLineType.Straight}
        fitView
        edgesUpdatable       // 👈 permite mover extremos
        edgeUpdaterRadius={20}
        style={{ width: "100%", height: "100%" }}
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}
