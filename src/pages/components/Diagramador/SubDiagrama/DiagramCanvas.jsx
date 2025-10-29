import React from "react";
import ReactFlow, { MiniMap, Controls, Background, ConnectionLineType } from "reactflow";
import "reactflow/dist/style.css";

export default function DiagramCanvas(props) {
  return (
    <div className="flex-1 h-full overflow-hidden">
      {/* CSS integrado: z-index y visibilidad de edges */}
      <style>{`
        .react-flow__background { z-index: 0 !important; }
        .react-flow__edges { z-index: 1 !important; }
        .react-flow__nodes { z-index: 2 !important; }
        .react-flow__edge-textwrapper { z-index: 3 !important; pointer-events: none; }
        .react-flow__edge-path { stroke-opacity: 1 !important; }
      `}</style>

      <ReactFlow
        {...props}
        connectionLineType={ConnectionLineType.Straight}
        fitView
        style={{ width: "100%", height: "100%" }}
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}
