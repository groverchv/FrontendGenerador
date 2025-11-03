// src/views/proyectos/Diagramador/SubDiagrama/Diagramador.jsx
import {
  forwardRef,
  useMemo,
  useState,
  useImperativeHandle,
  useRef,
} from "react";
import { useNodesState, useEdgesState } from "reactflow";

// Subcomponentes (dejé tus mismas rutas)
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

const Diagramador = forwardRef(function Diagramador(
  { projectId, projectName, diagramId, sock },
  ref
) {
  // Tipos para ReactFlow
  const nodeTypes = useMemo(() => ({ classNode: NodoClase }), []);
  const edgeTypes = useMemo(() => ({ uml: AristaUML }), []);

  // Estado base
  const [nodes, setNodes, rfOnNodesChange] = useNodesState([]);
  const [edges, setEdges, rfOnEdgesChange] = useEdgesState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState("entidad");
  const [iaOpen, setIaOpen] = useState(false);

  // Colaboración (snapshots, cursores, handlers RF)
  const {
    publishSnapshot,
    scheduleSnapshot,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeDragStop,
  } = useColaboracion({
    sock, projectId, nodes, edges, setNodes, setEdges, rfOnNodesChange, rfOnEdgesChange,
  });

  // Persistencia + import/export
  const versionRef = useRef(null);
  const {
    persistNow, exportJSON, exportPUML, importFromJSONText, importFromPUMLText,
  } = usePersistenciaYArchivo({
    projectId, projectName, nodes, edges, setNodes, setEdges, publishSnapshot, versionRef,
  });

  // IA (acciones estructurales)
  const { handleIA } = useIA({
    nodes, edges, setNodes, setEdges, scheduleSnapshot,
  });

  // Generación de código (hook nuevo)
  const { handleGenerate } = useGeneracionCodigo({
    projectName,
    nodes,
    edges,
    // packageBase: "com.example.app", // opcional
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

  return (
    <div className="w-full h-[calc(100vh-56px)] md:grid md:grid-cols-[1fr_340px] overflow-hidden">
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
          setNodes((ns) =>
            ns.concat({
              id,
              type: "classNode",
              position: { x: 100 + ns.length * 40, y: 100 + ns.length * 30 },
              data: { label: `Entidad${ns.length + 1}`, attrs: [] },
            })
          );
          setSelectedId(id);
          scheduleSnapshot();
        }}
        onClear={() => { setNodes([]); setEdges([]); scheduleSnapshot(); }}
        onExport={persistNow}
        onGenerate={handleGenerate}
        onOpenIA={() => setIaOpen(true)}
        // CRUD de atributos
        onChangeName={(name) =>
          selectedId && setNodes(ns =>
            ns.map(n => n.id === selectedId ? { ...n, data: { ...n.data, label: name } } : n)
          )
        }
        onAddAttr={(attr) =>
          selectedId && setNodes(ns =>
            ns.map(n => n.id !== selectedId
              ? n
              : { ...n, data: { ...n.data, attrs: [...(n.data?.attrs || []), attr] } })
          )
        }
        onUpdateAttr={(index, value) =>
          selectedId && setNodes(ns =>
            ns.map(n => {
              if (n.id !== selectedId) return n;
              const arr = [...(n.data?.attrs || [])];
              arr[index] = value;
              return { ...n, data: { ...n.data, attrs: arr } };
            })
          )
        }
        onRemoveAttr={(index) =>
          selectedId && setNodes(ns =>
            ns.map(n => {
              if (n.id !== selectedId) return n;
              const arr = [...(n.data?.attrs || [])];
              arr.splice(index, 1);
              return { ...n, data: { ...n.data, attrs: arr } };
            })
          )
        }
        onDeleteEntity={() => {
          if (!selectedId) return;
          setNodes(ns => ns.filter(n => n.id !== selectedId));
          setEdges(es => es.filter(e => e.source !== selectedId && e.target !== selectedId));
          scheduleSnapshot();
        }}
        // Relaciones
        onRelacionSimple={({ sourceId, targetId, tipo, mA, mB, verb, meta }) => {
          const id = "e" + Date.now();
          setEdges((es) =>
            es.concat({
              id,
              source: sourceId,
              target: targetId,
              type: "uml",
              label: verb,
              data: { mA, mB, verb, relType: tipo, ...meta },
            })
          );
          scheduleSnapshot();
        }}
        onRelacionNM={({ aId, bId, nombreIntermedia }) => {
          alert("Usa el hook useIA.addRelationNM si quieres manejar NM aquí 🙂");
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
