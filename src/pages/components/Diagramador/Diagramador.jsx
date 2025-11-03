import {
  forwardRef,
  useMemo,
  useState,
  useImperativeHandle,
  useRef,
} from "react";
import { useNodesState, useEdgesState } from "reactflow";

// Subcomponentes
import LienzoDeDiagrama from "./SubDiagrama/LienzoDeDiagrama";
import NodoClase from "./SubDiagrama/NodoClase";
import AristaUML from "./SubDiagrama/AristaUML";
import PanelLateral from "./SubDiagrama/PanelLateral";
import ModalIA from "./SubDiagrama/ModalIA";

// Hooks
import useColaboracion from "./SubDiagrama/useColaboracion";
import usePersistenciaYArchivo from "./SubDiagrama/usePersistenciaYArchivo";
import useIA from "./SubDiagrama/useIA";
import useGeneracionCodigo from "./SubDiagrama/useGeneracionCodigo";

// Utils
import { findBestHandle, updateNodesWithHandleUsage } from "./SubDiagrama/utils";

// Tipos para ReactFlow - definidos fuera del componente para evitar warnings
const nodeTypes = { classNode: NodoClase };
const edgeTypes = { uml: AristaUML };

const Diagramador = forwardRef(function Diagramador(
  { projectId, projectName, sock },
  ref
) {
  // Estado base
  const [nodes, setNodes, rfOnNodesChange] = useNodesState([]);
  const [edges, setEdges, rfOnEdgesChange] = useEdgesState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState("entidad");
  const [iaOpen, setIaOpen] = useState(false);

  // Posición de la “última acción” del usuario (click/pane/drag stop)
  const lastActionRef = useRef({ x: 140, y: 120 });

  // Colaboración
  const {
    publishSnapshot,
    scheduleSnapshot,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeDragStop,
  } = useColaboracion({
    sock,
    projectId,
    nodes,
    edges,
    setNodes,
    setEdges,
    rfOnNodesChange,
    rfOnEdgesChange,
  });

  // Persistencia + import/export
  const versionRef = useRef(null);
  const { persistNow, exportJSON, exportPUML, importFromJSONText, importFromPUMLText } =
    usePersistenciaYArchivo({
      projectId,
      projectName,
      nodes,
      edges,
      setNodes,
      setEdges,
      publishSnapshot,
      versionRef,
    });

  // IA (acciones estructurales)
  const { handleIA } = useIA({
    nodes,
    edges,
    setNodes,
    setEdges,
    scheduleSnapshot,
  });

  // Generación de código
  const { handleGenerate } = useGeneracionCodigo({
    projectName,
    packageBase: "com.example.app",
    nodes,
    edges,
  });

  useImperativeHandle(ref, () => ({
    persistNow,
    handleGenerate,
    exportJSON,
    exportPUML,
    importFromJSONText,
    importFromPUMLText,
  }));

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) || null,
    [nodes, selectedId]
  );

  // Pequeño "jitter" para no encimar varias creaciones seguidas en el mismo punto
  const jitter = (n) => (n % 4) * 24;

  return (
    <div className="w-full h-[calc(100vh-56px)] md:grid md:grid-cols-[1fr_420px] overflow-hidden">
      {/* Lienzo */}
      <LienzoDeDiagrama
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={(_, node) => setSelectedId(node.id)}
        // ← guardamos dónde estuvo la última acción para crear ahí nuevas entidades
        onLastAction={(p) => (lastActionRef.current = p)}
      />

      {/* Panel lateral */}
      <PanelLateral
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedNode={selectedNode}
        nodes={nodes}
        edges={edges}
        onAddEntity={() => {
          const id = String(Date.now());
          const base = lastActionRef.current || { x: 100, y: 100 };
          setNodes((ns) =>
            ns.concat({
              id,
              type: "classNode",
              position: { x: base.x + jitter(ns.length), y: base.y + jitter(ns.length) },
              data: { label: `Entidad${ns.length + 1}`, attrs: [] },
            })
          );
          setSelectedId(id);
          scheduleSnapshot();
        }}
        onClear={() => {
          setNodes([]);
          setEdges([]);
          scheduleSnapshot();
        }}
        onExport={persistNow}
        onGenerate={handleGenerate}
        onOpenIA={() => setIaOpen(true)}
        // CRUD de atributos de la entidad seleccionada
        onChangeName={(name) =>
          selectedId &&
          setNodes((ns) =>
            ns.map((n) =>
              n.id === selectedId
                ? { ...n, data: { ...n.data, label: name } }
                : n
            )
          )
        }
        onAddAttr={(attr) =>
          selectedId &&
          setNodes((ns) =>
            ns.map((n) => {
              if (n.id !== selectedId) return n;
              return {
                ...n,
                data: { ...n.data, attrs: [...(n.data?.attrs || []), attr] },
              };
            })
          )
        }
        onUpdateAttr={(index, value) =>
          selectedId &&
          setNodes((ns) =>
            ns.map((n) => {
              if (n.id !== selectedId) return n;
              const arr = [...(n.data?.attrs || [])];
              arr[index] = value;
              return { ...n, data: { ...n.data, attrs: arr } };
            })
          )
        }
        onRemoveAttr={(index) =>
          selectedId &&
          setNodes((ns) =>
            ns.map((n) => {
              if (n.id !== selectedId) return n;
              const arr = [...(n.data?.attrs || [])];
              arr.splice(index, 1);
              return { ...n, data: { ...n.data, attrs: arr } };
            })
          )
        }
        onDeleteEntity={() => {
          if (!selectedId) return;
          setNodes((ns) => ns.filter((n) => n.id !== selectedId));
          setEdges((es) =>
            es.filter((e) => e.source !== selectedId && e.target !== selectedId)
          );
          scheduleSnapshot();
        }}
        // Relaciones
        onRelacionSimple={({ sourceId, targetId, tipo, mA, mB, verb, meta }) => {
          const id = "e" + Date.now();
          
          // Encuentra el mejor handle disponible para source y target
          const sourceHandle = findBestHandle(sourceId, edges, true);
          const targetHandle = findBestHandle(targetId, edges, false);
          
          setEdges((es) =>
            es.concat({
              id,
              source: sourceId,
              target: targetId,
              sourceHandle,
              targetHandle,
              type: "uml",
              label: verb,
              data: {
                mA,
                mB,
                verb,
                relType: tipo,
                ...meta, // relKind / owning / direction / cascade / orphanRemoval / inheritStrategy ...
              },
            })
          );
          
          // Actualiza el uso de handles en los nodos
          setNodes((ns) => updateNodesWithHandleUsage(ns, [...edges, {
            source: sourceId,
            target: targetId,
            sourceHandle,
            targetHandle,
          }]));
          
          scheduleSnapshot();
        }}
        onRelacionNM={({ aId, bId, nombreIntermedia }) => {
          // Crear entidad intermedia
          const intermediaId = String(Date.now());
          const nodeA = nodes.find(n => n.id === aId);
          const nodeB = nodes.find(n => n.id === bId);
          
          if (!nodeA || !nodeB) return;
          
          // Posición de la entidad intermedia (punto medio entre A y B)
          const midX = (nodeA.position.x + nodeB.position.x) / 2;
          const midY = (nodeA.position.y + nodeB.position.y) / 2;
          
          // Crear la entidad intermedia
          setNodes((ns) =>
            ns.concat({
              id: intermediaId,
              type: "classNode",
              position: { x: midX, y: midY },
              data: { 
                label: nombreIntermedia || `${nodeA.data.label}_${nodeB.data.label}`,
                attrs: [],
                usage: {
                  target: { tl: 0, l1: 0, l2: 0, bl: 0, t1: 0, t2: 0, t3: 0, t4: 0, tr: 0, r1: 0, r2: 0, br: 0 },
                  source: { tl2: 0, l3: 0, l4: 0, bl2: 0, b1: 0, b2: 0, b3: 0, b4: 0, tr2: 0, r3: 0, r4: 0, br2: 0 }
                }
              },
            })
          );
          
          // Crear primera relación: A -> Intermedia (1-N)
          const edge1Id = "e" + Date.now();
          const sourceHandle1 = findBestHandle(aId, edges, true);
          const targetHandle1 = findBestHandle(intermediaId, [], false);
          
          const edge1 = {
            id: edge1Id,
            source: aId,
            target: intermediaId,
            sourceHandle: sourceHandle1,
            targetHandle: targetHandle1,
            type: "uml",
            data: {
              mA: "1",
              mB: "*",
              relType: "1-N",
              relKind: "ASSOC",
              direction: "NONE",
            },
          };
          
          // Crear segunda relación: B -> Intermedia (1-N)
          const edge2Id = "e" + (Date.now() + 1);
          const sourceHandle2 = findBestHandle(bId, edges, true);
          const targetHandle2 = findBestHandle(intermediaId, [edge1], false);
          
          const edge2 = {
            id: edge2Id,
            source: bId,
            target: intermediaId,
            sourceHandle: sourceHandle2,
            targetHandle: targetHandle2,
            type: "uml",
            data: {
              mA: "1",
              mB: "*",
              relType: "1-N",
              relKind: "ASSOC",
              direction: "NONE",
            },
          };
          
          // Agregar ambas aristas
          setEdges((es) => es.concat([edge1, edge2]));
          
          // Actualizar el uso de handles en TODOS los nodos
          setNodes((ns) => updateNodesWithHandleUsage(ns, [...edges, edge1, edge2]));
          
          scheduleSnapshot();
        }}
        onUpdateEdge={(edgeId, partial) => {
          setEdges((es) =>
            es.map((e) =>
              e.id === edgeId
                ? { ...e, ...partial, data: { ...e.data, ...partial.data } }
                : e
            )
          );
          scheduleSnapshot();
        }}
        onDeleteEdge={(edgeId) => {
          setEdges((es) => es.filter((e) => e.id !== edgeId));
          
          // Actualiza el uso de handles después de eliminar
          const remainingEdges = edges.filter((e) => e.id !== edgeId);
          setNodes((ns) => updateNodesWithHandleUsage(ns, remainingEdges));
          
          scheduleSnapshot();
        }}
      />

      {/* Modal IA */}
      <ModalIA
        open={iaOpen}
        onClose={() => setIaOpen(false)}
        onSubmit={async (txt) => {
          const ok = await handleIA(txt);
          if (ok) setIaOpen(false);
          return ok;
        }}
      />
    </div>
  );
});

export default Diagramador;
