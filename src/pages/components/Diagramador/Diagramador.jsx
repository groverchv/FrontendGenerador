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
import Spinner from "../../../components/Spinner";

// Servicio para procesamiento de imágenes
import { processImageAndCreateEntity, processImageAndCreateDiagram } from "./services/imageProcessor";

// API centralizada
import { API_BASE_URL } from "../../../api/api";

// Utils
import { findBestHandle, updateNodesWithHandleUsage } from "./SubDiagrama/utils";
import { SOURCE_HANDLES, TARGET_HANDLES } from "../../../constants";

// ✅ DEFINIR TIPOS A NIVEL DE MÓDULO (fuera del componente)
// Esto garantiza que las referencias sean 100% estables
const NODE_TYPES = { classNode: NodoClase };
const EDGE_TYPES = { uml: AristaUML };

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

  // Posición de la "última acción" del usuario (click/pane/drag stop)
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
  const { loading, exportJSON, exportPUML, importFromJSONText, importFromPUMLText } =
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

  // Generación de código Spring Boot
  const { handleGenerate } = useGeneracionCodigo({
    projectName,
    packageBase: "com.example.app",
    nodes,
    edges,
  });

  // Generación de código Flutter
  const handleGenerateFlutter = async () => {
    try {
      const { generateFlutterApp } = await import("./generadorFlutter/generadorFlutter");

      // Mostrar notificación de inicio
      console.log("🚀 Iniciando generación de Flutter...");

      await generateFlutterApp({
        projectName,
        backendUrl: API_BASE_URL,
        nodes,
        edges,
        onProgress: ({ step, message }) => {
          console.log(`[Flutter ${step}] ${message}`);
        },
      });

      console.log("✅ Proyecto Flutter generado exitosamente");
    } catch (error) {
      console.error("❌ Error generando Flutter:", error);
      throw error; // Re-lanzar para que el componente padre lo maneje
    }
  };

  // Función para procesar imagen y crear entidad
  const handleProcessImage = async (imageFile) => {
    try {
      const result = await processImageAndCreateEntity(
        imageFile,
        // onSuccess
        ({ entityData }) => {
          console.log("Creando entidad desde imagen:", entityData);

          // Crear nueva entidad con los datos extraídos
          const id = String(Date.now());
          const base = lastActionRef.current || { x: 100, y: 100 };

          setNodes((ns) =>
            ns.concat({
              id,
              type: "classNode",
              position: {
                x: base.x + jitter(ns.length),
                y: base.y + jitter(ns.length)
              },
              data: {
                ...entityData,
                usage: {
                  target: Object.fromEntries(TARGET_HANDLES.map((h) => [h, 0])),
                  source: Object.fromEntries(SOURCE_HANDLES.map((h) => [h, 0])),
                }
              },
            })
          );

          setSelectedId(id);
          scheduleSnapshot();
        },
        // onError
        (error) => {
          console.error("Error procesando imagen:", error);
          throw error;
        }
      );

      return result;
    } catch (error) {
      console.error("Error en handleProcessImage:", error);
      throw error;
    }
  };

  // Función para procesar diagrama completo con múltiples clases y relaciones
  const handleProcessDiagram = async (imageFile) => {
    try {
      const result = await processImageAndCreateDiagram(
        imageFile,
        // onSuccess
        ({ diagramData }) => {
          console.log("Creando diagrama completo desde imagen:", diagramData);

          const newNodes = [];
          const newEdges = [];
          const nodeIdMap = {};

          // Crear nodos usando las posiciones detectadas de la imagen
          diagramData.nodes.forEach((nodeData) => {
            const id = String(Date.now() + Math.random());
            nodeIdMap[nodeData.id] = id;

            newNodes.push({
              id,
              type: "classNode",
              position: nodeData.position || { x: 100, y: 100 }, // Usar posición detectada
              data: {
                label: nodeData.label,
                attrs: nodeData.attrs,
                usage: {
                  // Inicializar contadores de uso de handles
                  target: Object.fromEntries(TARGET_HANDLES.map((h) => [h, 0])),
                  source: Object.fromEntries(SOURCE_HANDLES.map((h) => [h, 0])),
                }
              }
            });
          });

          // Crear aristas usando los handles y datos calculados en imageProcessor
          diagramData.edges.forEach((edgeData, index) => {
            const sourceId = nodeIdMap[edgeData.source];
            const targetId = nodeIdMap[edgeData.target];

            if (sourceId && targetId) {
              newEdges.push({
                id: `e${Date.now()}-${index}`,
                source: sourceId,
                target: targetId,
                sourceHandle: edgeData.sourceHandle || 'r1',
                targetHandle: edgeData.targetHandle || 'l1-t',
                type: edgeData.type || "uml",
                label: edgeData.label || "",
                data: edgeData.data || {
                  mA: "1",
                  mB: "1",
                  verb: "",
                  relType: "1-1",
                  relKind: "ASSOC",
                  direction: "NONE"
                }
              });
            }
          });

          // Agregar los nuevos nodos y aristas
          setNodes((ns) => ns.concat(newNodes));
          setEdges((es) => es.concat(newEdges));

          scheduleSnapshot();
        },
        // onError
        (error) => {
          console.error("Error procesando diagrama:", error);
          throw error;
        }
      );

      return result;
    } catch (error) {
      console.error("Error en handleProcessDiagram:", error);
      throw error;
    }
  };

  useImperativeHandle(ref, () => ({
    handleGenerate,
    handleGenerateFlutter,
    exportJSON,
    exportPUML,
    importFromJSONText,
    importFromPUMLText,
    processImage: handleProcessImage,
    processDiagram: handleProcessDiagram,
  }));

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) || null,
    [nodes, selectedId]
  );

  // Pequeño "jitter" para no encimar varias creaciones seguidas en el mismo punto
  const jitter = (n) => (n % 4) * 24;

  return (
    <div className="w-full h-[calc(100vh-56px)] md:grid md:grid-cols-[1fr_420px] overflow-hidden relative">
      {loading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-50">
          <Spinner label="Cargando diagrama..." />
        </div>
      )}
      {/* Lienzo */}
      <LienzoDeDiagrama
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
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
              data: {
                label: `Entidad${ns.length + 1}`,
                attrs: [],
                usage: {
                  target: Object.fromEntries(TARGET_HANDLES.map((h) => [h, 0])),
                  source: Object.fromEntries(SOURCE_HANDLES.map((h) => [h, 0])),
                }
              },
            })
          );
          setSelectedId(id);
          scheduleSnapshot();
        }}
        onClear={() => {
          setNodes([]);
          setEdges([]);
          setSelectedId(null); // Limpiar selección también
          scheduleSnapshot(); // Sincroniza automáticamente con otros usuarios
        }}
        onGenerate={handleGenerate}
        onOpenIA={() => setIaOpen(true)}
        // CRUD de atributos de la entidad seleccionada
        onChangeName={(name) => {
          if (!selectedId) return;
          setNodes((ns) =>
            ns.map((n) =>
              n.id === selectedId
                ? { ...n, data: { ...n.data, label: name } }
                : n
            )
          );
          scheduleSnapshot();
        }}
        onAddAttr={(attr) => {
          if (!selectedId) return;
          setNodes((ns) =>
            ns.map((n) => {
              if (n.id !== selectedId) return n;
              return {
                ...n,
                data: { ...n.data, attrs: [...(n.data?.attrs || []), attr] },
              };
            })
          );
          scheduleSnapshot();
        }}
        onUpdateAttr={(index, value) => {
          if (!selectedId) return;
          setNodes((ns) =>
            ns.map((n) => {
              if (n.id !== selectedId) return n;
              const arr = [...(n.data?.attrs || [])];
              arr[index] = value;
              return { ...n, data: { ...n.data, attrs: arr } };
            })
          );
          scheduleSnapshot();
        }}
        onRemoveAttr={(index) => {
          if (!selectedId) return;
          setNodes((ns) =>
            ns.map((n) => {
              if (n.id !== selectedId) return n;
              const arr = [...(n.data?.attrs || [])];
              arr.splice(index, 1);
              return { ...n, data: { ...n.data, attrs: arr } };
            })
          );
          scheduleSnapshot();
        }}
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

          console.log("🎯 Creando relación simple:", { sourceId, targetId, tipo, mA, mB, verb, meta });

          // Verifica que ambos nodos existen
          const sourceNode = nodes.find(n => n.id === sourceId);
          const targetNode = nodes.find(n => n.id === targetId);

          if (!sourceNode || !targetNode) {
            console.error("❌ No se encontraron los nodos:", { sourceId, targetId, sourceNode, targetNode });
            return;
          }

          console.log("✅ Nodos encontrados:", {
            source: { id: sourceNode.id, label: sourceNode.data?.label, position: sourceNode.position },
            target: { id: targetNode.id, label: targetNode.data?.label, position: targetNode.position }
          });

          // Encuentra el mejor handle disponible para source y target
          const sourceHandle = findBestHandle(sourceId, edges, true);
          const targetHandle = findBestHandle(targetId, edges, false);

          console.log("🔌 Handles seleccionados:", { sourceHandle, targetHandle });

          const newEdge = {
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
          };

          console.log("📦 Edge a crear:", newEdge);

          setEdges((es) => {
            const updated = es.concat(newEdge);
            console.log("✅ Edges actualizados:", updated);
            return updated;
          });

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
                  target: Object.fromEntries(TARGET_HANDLES.map((h) => [h, 0])),
                  source: Object.fromEntries(SOURCE_HANDLES.map((h) => [h, 0])),
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
        currentModel={{
          entities: nodes.map(n => ({ id: n.id, name: n.data?.label, attrs: n.data?.attrs || [] })),
          relations: edges.map(e => ({ source: e.source, target: e.target, type: e.data?.relKind || 'ASSOC' }))
        }}
      />
    </div>
  );
});

export default Diagramador;
