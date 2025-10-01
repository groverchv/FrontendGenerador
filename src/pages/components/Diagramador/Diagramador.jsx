// src/views/proyectos/Diagramador/Diagramador.jsx
import {
  forwardRef,
  useCallback,
  useMemo,
  useState,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
} from "reactflow";
import "reactflow/dist/style.css";

import Sidebar from "./sidebar/sidebar";
import EntidadPanel from "./components/entidad";
import RelacionarPanel from "./components/relacionar";
import Iaclase from "./components/iaclase";

import { buildPrompt } from "./generador/promt";
import { makeSkeleton } from "./generador/skeleton";
import { generateSpringBootCode } from "./services/gemine";
import { downloadAsZip } from "./generador/zip";

import { ProjectsApi } from "../../../api/projects";

/* ============== Utilidades ============== */
function throttle(fn, wait = 60) {
  let last = 0;
  let t = null;
  let lastArgs = null;
  return (...args) => {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn(...args);
    } else {
      lastArgs = args;
      clearTimeout(t);
      t = setTimeout(() => {
        last = Date.now();
        fn(...lastArgs);
      }, wait - (now - last));
    }
  };
}

function debounce(fn, wait = 250) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/* ================= EDGE UML ================= */
function UmlEdge(props) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    markerEnd,
  } = props;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        {data?.verb && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "none",
              fontSize: 12,
              color: "#374151",
              background: "rgba(255,255,255,0.6)",
              padding: "0 4px",
              borderRadius: 4,
            }}
          >
            {data.verb}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

/* ================= Nodo Entidad ================= */
function ClassNode({ data }) {
  return (
    <div
      className="bg-white rounded-md border-2 border-teal-500 w-auto min-w-[220px] max-w-[360px]"
      style={{ willChange: "transform", transform: "translateZ(0)" }}
    >
      <div className="bg-teal-500 text-white font-bold text-center px-2 py-1">
        {data.label || "Entidad"}
      </div>
      <div className="p-2 min-h-[60px]">
        {data.attrs?.length ? (
          <ul className="m-0 pl-4 list-disc break-words whitespace-normal">
            {data.attrs.map((a, i) => (
              <li key={i}>
                {a.name}: <i>{a.type}</i>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-500">Sin atributos…</div>
        )}
      </div>
      <Handle type="target" position={Position.Left} id="l" />
      <Handle type="source" position={Position.Right} id="r" />
      <Handle type="target" position={Position.Top} id="t" />
      <Handle type="source" position={Position.Bottom} id="b" />
    </div>
  );
}

/* ================= Componente principal ================= */
const Diagramador = forwardRef(function Diagramador(
  { projectId, projectName, diagramId, sock },
  ref
) {
  const nodeTypes = useMemo(() => ({ classNode: ClassNode }), []);
  const edgeTypes = useMemo(() => ({ uml: UmlEdge }), []);

  const [nodes, setNodes, rfOnNodesChange] = useNodesState([]);
  const [edges, setEdges, rfOnEdgesChange] = useEdgesState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState("entidad");
  const [iaOpen, setIaOpen] = useState(false);

  // ---- Identidad y control de versión
  const clientIdRef = useRef(
    Math.random().toString(36).slice(2) + Date.now().toString(36)
  );
  const versionRef = useRef(null);

  // ---- STOMP topics/dests
  const topicUpdates = useMemo(() => `/topic/projects/${projectId}`, [projectId]);
  const topicCursors = useMemo(() => `/topic/projects/${projectId}/cursors`, [projectId]);
  const destUpdate = useMemo(() => `/app/projects/${projectId}/update`, [projectId]);
  const destCursor = useMemo(() => `/app/projects/${projectId}/cursor`, [projectId]);

  // ---- Seq para movimientos (evitar fuera de orden)
  const lastSeqRef = useRef(new Map()); // nodeId -> last seq recibido
  const seqCounterRef = useRef(0);

  // ---- Debounce de snapshots
  const publishSnapshot = useCallback(() => {
    if (!sock) return;
    const payload = {
      type: "diagram.snapshot",
      clientId: clientIdRef.current,
      baseVersion: versionRef.current,
      name: "Principal",
      nodes: JSON.stringify(nodes),
      edges: JSON.stringify(edges),
    };
    sock.send(destUpdate, payload);
  }, [sock, nodes, edges, destUpdate]);

  const scheduleSnapshot = useMemo(
    () => debounce(publishSnapshot, 250),
    [publishSnapshot]
  );

  // =================== Carga inicial ===================
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        const d = await ProjectsApi.getDiagram(projectId);
        setNodes(d.nodes ? JSON.parse(d.nodes) : []);
        setEdges(d.edges ? JSON.parse(d.edges) : []);
        versionRef.current = d.version ?? null;
      } catch (err) {
        console.error("No se pudo cargar el diagrama", err);
      }
    })();
  }, [projectId, setNodes, setEdges]);

  // =================== Persistencia explícita (botón Guardar) ===================
  const persistNow = useCallback(async () => {
    try {
      if (!projectId) return;
      await ProjectsApi.updateDiagram(projectId, {
        name: "Principal",
        nodes: JSON.stringify(nodes),
        edges: JSON.stringify(edges),
        viewport: null,
      });
      publishSnapshot();
      alert("✅ Diagrama guardado correctamente.");
    } catch (e) {
      console.error("Error guardando", e);
      alert("❌ Error guardando cambios en el diagrama.");
    }
  }, [projectId, nodes, edges, publishSnapshot]);

  // =================== Generar código ===================
  const handleGenerate = useCallback(async () => {
    try {
      const model = {
        projectName,
        packageBase: "com.example.app",
        entities: nodes.map((n) => ({
          name: n.data.label,
          attrs: n.data.attrs || [],
        })),
        relations: edges.map((e) => ({
          source: e.source,
          target: e.target,
          verb: e.data?.verb || "",
          mA: e.data?.mA,
          mB: e.data?.mB,
          relType: e.data?.relType,
        })),
      };

      const skeleton = makeSkeleton(projectName, "com.example.app");
      const promptText = buildPrompt(model, []);
      const delta = await generateSpringBootCode(promptText);
      const files = { ...skeleton, ...delta };

      const root = projectName.replace(/[^\w.-]+/g, "_");
      await downloadAsZip(files, `${root}.zip`, root);
      alert("📦 Proyecto generado y descargado.");
    } catch (err) {
      console.error(err);
      alert("Error al generar: " + err.message);
    }
  }, [projectName, nodes, edges]);

  useImperativeHandle(ref, () => ({ persistNow, handleGenerate }));

  // =================== MOVIMIENTOS: throttle ===================
  const sendMoveThrottled = useMemo(
    () =>
      throttle((id, x, y) => {
        if (!sock) return;
        const seq = ++seqCounterRef.current;
        sock.send(destCursor, {
          type: "diagram.move",
          clientId: clientIdRef.current,
          id,
          x,
          y,
          ts: Date.now(),
          seq,
        });
      }, 60),
    [sock, destCursor]
  );

  // =================== Suscripciones STOMP ===================
  useEffect(() => {
    if (!sock || !projectId) return;

    // Snapshots (autoridad servidor)
    const subUpdates = sock.subscribe(topicUpdates, (msg) => {
      if (!msg) return;
      if (msg.clientId === clientIdRef.current) return;

      // Acepta sólo si trae nodos/edges stringificadas
      if (typeof msg.nodes === "string" && typeof msg.edges === "string") {
        try {
          const n = JSON.parse(msg.nodes);
          const e = JSON.parse(msg.edges);
          if (Array.isArray(n) && Array.isArray(e)) {
            setNodes(n);
            setEdges(e);
            versionRef.current = msg.version ?? versionRef.current;
          }
        } catch {}
      }
    });

    // Movimientos de otros clientes (aplicar posición exacta)
    const subCursors = sock.subscribe(topicCursors, (msg) => {
      const isMove = msg?.type === "diagram.move" || msg?.t === "c";
      if (!isMove) return;
      if (msg.clientId === clientIdRef.current) return;

      const id = String(msg.id);
      const x = Number(msg.x);
      const y = Number(msg.y);
      if (!id || Number.isNaN(x) || Number.isNaN(y)) return;

      // descartar fuera de orden
      if (typeof msg.seq === "number") {
        const prev = lastSeqRef.current.get(id) ?? -1;
        if (msg.seq <= prev) return;
        lastSeqRef.current.set(id, msg.seq);
      }

      setNodes((ns) => {
        const map = new Map(ns.map((n) => [n.id, n]));
        const n = map.get(id);
        if (!n || !n.position) return ns;
        const updated = { ...n, position: { x, y } };
        map.set(id, updated);
        return Array.from(map.values());
      });
    });

    // Re-snapshot al reconectar
    const offConnect = sock.onConnect(() => {
      try {
        sock.send(destUpdate, {
          type: "diagram.snapshot",
          clientId: clientIdRef.current,
          baseVersion: versionRef.current,
          name: "Principal",
          nodes: JSON.stringify(nodes),
          edges: JSON.stringify(edges),
        });
      } catch {}
    });

    return () => {
      try { sock.unsubscribe(subUpdates); } catch {}
      try { sock.unsubscribe(subCursors); } catch {}
      try { offConnect?.(); } catch {}
    };
  }, [sock, projectId, topicUpdates, topicCursors, destUpdate, nodes, edges, setNodes, setEdges]);

  // =================== ENTIDADES ===================
  const addEntity = () => {
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
  };

  const updateEntity = (id, updater) => {
    setNodes((ns) =>
      ns.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...updater(n.data) } } : n
      )
    );
    scheduleSnapshot();
  };

  const removeEntity = (id) => {
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
    scheduleSnapshot();
  };

  // =================== ReactFlow handlers ===================
  const onNodesChange = useCallback(
    (changes) => {
      // Interceptar movimientos para emitir throttle
      for (const ch of changes) {
        if (ch.type === "position" && ch.dragging && ch.position) {
          sendMoveThrottled(ch.id, ch.position.x, ch.position.y);
        }
      }
      rfOnNodesChange(changes);

      // Si no es movimiento de drag, programa snapshot (add/remove/rename/etc.)
      const onlyDragMoves = changes.every(
        (c) => c.type === "position" && c.dragging
      );
      if (!onlyDragMoves) scheduleSnapshot();
    },
    [rfOnNodesChange, sendMoveThrottled, scheduleSnapshot]
  );

  const onEdgesChange = useCallback(
    (changes) => {
      rfOnEdgesChange(changes);
      scheduleSnapshot();
    },
    [rfOnEdgesChange, scheduleSnapshot]
  );

  const onConnect = useCallback(
    (params) => {
      setEdges((eds) =>
        addEdge({ ...params, animated: true, type: "uml", data: {} }, eds)
      );
      scheduleSnapshot();
    },
    [scheduleSnapshot]
  );

  const onNodeDragStop = useCallback((_, node) => {
    // Al soltar: snapshot inmediato para converger
    publishSnapshot();
  }, [publishSnapshot]);

  // =================== IA (demo simple) ===================
  const handleIA = async (texto) => {
    try {
      const instrucciones = texto.split("\n");
      let nuevosNodos = [...nodes];
      instrucciones.forEach((line) => {
        if (line.toLowerCase().includes("entidad")) {
          const nombre =
            line.match(/entidad\s+(\w+)/i)?.[1] || `Entidad${Date.now()}`;
          nuevosNodos.push({
            id: String(Date.now() + Math.random()),
            type: "classNode",
            position: {
              x: 100 + nuevosNodos.length * 40,
              y: 100 + nuevosNodos.length * 30,
            },
            data: { label: nombre, attrs: [] },
          });
        }
      });
      setNodes(nuevosNodos);
      scheduleSnapshot();
      setIaOpen(false);
      return true;
    } catch (err) {
      console.error("Error interpretando IA", err);
      return false;
    }
  };

  return (
    <div className="w-full h-[calc(100vh-56px)] md:grid md:grid-cols-[1fr_340px] overflow-hidden">
      {/* Lienzo */}
      <div className="flex-1 h-full overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={(_, node) => setSelectedId(node.id)}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          style={{ width: "100%", height: "100%" }}
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>

      {/* Sidebar */}
      <div className="md:h-full h-[40vh] md:relative fixed bottom-0 left-0 right-0 bg-white shadow-lg md:shadow-none border-t md:border-l z-20 overflow-y-auto">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onAddEntity={addEntity}
          onClear={() => {
            setNodes([]);
            setEdges([]);
            scheduleSnapshot();
          }}
          onOpenIA={() => setIaOpen(true)}
        >
          {activeTab === "entidad" ? (
            <EntidadPanel
              node={nodes.find((n) => n.id === selectedId) || null}
              onChangeName={(name) =>
                updateEntity(selectedId, () => ({ label: name }))
              }
              onAddAttr={(attr) =>
                updateEntity(selectedId, (d) => ({
                  attrs: [...(d.attrs || []), attr],
                }))
              }
              onUpdateAttr={(index, value) =>
                updateEntity(selectedId, (d) => {
                  const arr = [...(d.attrs || [])];
                  arr[index] = value;
                  return { attrs: arr };
                })
              }
              onRemoveAttr={(index) =>
                updateEntity(selectedId, (d) => {
                  const arr = [...(d.attrs || [])];
                  arr.splice(index, 1);
                  return { attrs: arr };
                })
              }
              onDelete={() => removeEntity(selectedId)}
            />
          ) : (
            <RelacionarPanel
              nodes={nodes}
              edges={edges}
              onRelacionSimple={({ sourceId, targetId, tipo, mA, mB, verb }) => {
                const id = "e" + Date.now();
                setEdges((es) =>
                  es.concat({
                    id,
                    source: sourceId,
                    target: targetId,
                    type: "uml",
                    label: verb,
                    data: { mA, mB, verb, relType: tipo },
                  })
                );
                scheduleSnapshot();
              }}
              onRelacionNM={({ aId, bId, nombreIntermedia }) => {
                const id = "e" + Date.now();
                setEdges((es) =>
                  es.concat({
                    id,
                    source: aId,
                    target: bId,
                    type: "uml",
                    data: {
                      mA: "N",
                      mB: "N",
                      relType: "NM",
                      verb: nombreIntermedia || "",
                    },
                  })
                );
                scheduleSnapshot();
              }}
              onUpdateEdge={(edgeId, partial) => {
                setEdges((es) =>
                  es.map((e) =>
                    e.id === edgeId
                      ? {
                          ...e,
                          ...partial,
                          data: { ...e.data, ...partial.data },
                        }
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
          )}
        </Sidebar>
      </div>

      {/* Modal IA */}
      <Iaclase open={iaOpen} onClose={() => setIaOpen(false)} onSubmit={handleIA} />
    </div>
  );
});

export default Diagramador;
