// src/views/proyectos/Diagramador/SubDiagrama/LienzoDeDiagrama.jsx
import React, { useEffect, useRef } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useReactFlow,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";

/** LÍMITES DE ZOOM Y PANEOS “GRANDES” */
const MIN_ZOOM = 0.02;          // ← permite ver “desde más atrás”
const MAX_ZOOM = 3;
const FIT_MIN_ZOOM = 0.03;      // ← usado por fitView para encajar todo
const TRANSLATE_EXTENT = [
  [-100000, -100000],
  [100000, 100000],
];

export default function LienzoDeDiagrama(props) {
  return (
    <ReactFlowProvider>
      <LienzoInner {...props} />
    </ReactFlowProvider>
  );
}

function LienzoInner({
  nodes,
  edges,
  nodeTypes,
  edgeTypes,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeDragStop,
  onNodeClick,
  onLastAction,         // opcional: recordar último lugar de acción
  shouldAutoFit = true,
}) {
  const rf = useReactFlow();
  const containerRef = useRef(null);

  const fitAll = (opts = {}) => {
    if (!shouldAutoFit) return;
    if (!nodes?.length) {
      rf.setViewport({ x: 0, y: 0, zoom: 1 });
      return;
    }
    rf.fitView({ padding: 0.2, minZoom: FIT_MIN_ZOOM, duration: 300, ...opts });
  };

  const rememberFromMouseEvent = (evt) => {
    if (!onLastAction || !evt?.clientX) return;
    onLastAction(rf.screenToFlowPosition({ x: evt.clientX, y: evt.clientY }));
  };
  const rememberFromNode = (_, node) => {
    if (!onLastAction || !node?.position) return;
    onLastAction({ x: node.position.x, y: node.position.y });
  };

  // Auto-fit al montar
  useEffect(() => {
    const t = setTimeout(() => fitAll(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fit cuando cambie cantidad de nodos/aristas
  useEffect(() => {
    fitAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes?.length, edges?.length]);

  // Auto-fit al cambiar tamaño del contenedor
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => fitAll({ duration: 150 }));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Valor inicial de última acción (centro del canvas)
  useEffect(() => {
    if (!onLastAction || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    onLastAction(
      rf.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Botón auxiliar para “alejar más” (opcional)
  const zoomOutMore = () => {
    const next = Math.max(MIN_ZOOM, rf.getZoom() * 0.6);
    rf.zoomTo(next);
  };

  return (
    <div ref={containerRef} className="flex-1 h-full overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={rememberFromMouseEvent}
        onPaneContextMenu={rememberFromMouseEvent}
        onNodeClick={(e, n) => {
          rememberFromMouseEvent(e);
          if (onNodeClick) onNodeClick(e, n);   // evitar ?.() por compatibilidad SWC
        }}
        onNodeDragStop={(e, n) => {
          rememberFromNode(e, n);
          if (onNodeDragStop) onNodeDragStop(e, n); // evitar ?.() por compatibilidad SWC
        }}
        /** ← Claves para ver “más atrás” */
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        translateExtent={TRANSLATE_EXTENT}
        fitView
        fitViewOptions={{ padding: 0.2, minZoom: FIT_MIN_ZOOM }}
        style={{ width: "100%", height: "100%" }}
      >
        <MiniMap />
        <Controls
          showFitView
          onFitView={() => fitAll({ minZoom: FIT_MIN_ZOOM })}
        />
        <Background />
      </ReactFlow>

      {/* Botón opcional para alejar aún más manualmente */}
      <button
        onClick={zoomOutMore}
        className="absolute right-2 bottom-2 px-2 py-1 rounded-md border bg-white/80 text-xs hover:bg-white"
        title="Alejar más"
      >
        − Alejar
      </button>
    </div>
  );
}
