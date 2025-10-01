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
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";

import Sidebar from "./sidebar/sidebar";
import EntidadPanel from "./components/entidad";
import RelacionarPanel from "./components/relacionar";

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

/* ====== Helpers N–N / nombres / posiciones ====== */
const toSnake = (s = "") =>
  (s || "")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .trim().replace(/\s+/g, "_")
    .toLowerCase();

const inferIdType = (node) => {
  const idAttr = (node?.data?.attrs || []).find(a => a.name?.toLowerCase() === "id");
  return idAttr?.type || "Integer";
};

const midpoint = (a, b) => ({
  x: ((a?.position?.x ?? 100) + (b?.position?.x ?? 100)) / 2,
  y: ((a?.position?.y ?? 100) + (b?.position?.y ?? 100)) / 2,
});

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
  } = props;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
  });

  let markerStart, markerEnd;
  if (data?.relKind === "INHERIT") {
    markerEnd = { type: MarkerType.ArrowClosed };
  } else {
    const dir = data?.direction || "A->B";
    if (dir === "A->B") markerEnd = { type: MarkerType.ArrowClosed };
    else if (dir === "B->A") markerStart = { type: MarkerType.ArrowClosed };
    else if (dir === "BIDI") {
      markerStart = { type: MarkerType.ArrowClosed };
      markerEnd = { type: MarkerType.ArrowClosed };
    }
  }

  const stereotype =
    data?.relKind === "COMP" ? "«comp»" :
    data?.relKind === "AGGR" ? "«agreg»" :
    data?.relKind === "INHERIT" ? "«extends»" : "";

  const diamondFor = data?.relKind === "COMP" ? "◆" : (data?.relKind === "AGGR" ? "◇" : "");
  const showDiamondA = !!diamondFor && (data?.owning || "A") === "A";
  const showDiamondB = !!diamondFor && (data?.owning || "A") === "B";

  const srcLabelX = sourceX * 0.9 + targetX * 0.1;
  const srcLabelY = sourceY * 0.9 + targetY * 0.1;
  const tgtLabelX = sourceX * 0.1 + targetX * 0.9;
  const tgtLabelY = sourceY * 0.1 + targetY * 0.9;

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerStart={markerStart} markerEnd={markerEnd} />

      <EdgeLabelRenderer>
        {(data?.verb || stereotype) && (
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
              whiteSpace: "nowrap",
            }}
          >
            {stereotype ? `${stereotype}${data?.verb ? " " : ""}` : ""}
            {data?.verb || ""}
          </div>
        )}

        {(data?.mA || data?.roleA || showDiamondA) && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${srcLabelX}px, ${srcLabelY}px)`,
              pointerEvents: "none",
              fontSize: 11,
              color: "#111827",
              background: "rgba(255,255,255,0.7)",
              padding: "0 4px",
              borderRadius: 4,
              whiteSpace: "nowrap",
            }}
          >
            {showDiamondA ? `${diamondFor} ` : ""}
            {data?.mA ? `[${data.mA}] ` : ""}
            {data?.roleA ? `${data.roleA}` : ""}
          </div>
        )}

        {(data?.mB || data?.roleB || showDiamondB) && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${tgtLabelX}px, ${tgtLabelY}px)`,
              pointerEvents: "none",
              fontSize: 11,
              color: "#111827",
              background: "rgba(255,255,255,0.7)",
              padding: "0 4px",
              borderRadius: 4,
              whiteSpace: "nowrap",
            }}
          >
            {showDiamondB ? `${diamondFor} ` : ""}
            {data?.mB ? `[${data.mB}] ` : ""}
            {data?.roleB ? `${data?.roleB}` : ""}
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

  // ---- Seq para movimientos
  const lastSeqRef = useRef(new Map());
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

  /* =================== Carga inicial =================== */
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

  /* =================== Persistencia explícita =================== */
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

  /* =================== Generar código =================== */
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
          meta: {
            relKind: e.data?.relKind,
            direction: e.data?.direction,
            roleA: e.data?.roleA,
            roleB: e.data?.roleB,
            owning: e.data?.owning,
            optionalA: e.data?.optionalA,
            optionalB: e.data?.optionalB,
            orphanRemoval: e.data?.orphanRemoval,
            fetch: e.data?.fetch,
            cascade: e.data?.cascade,
            join: e.data?.join,
            inheritStrategy: e.data?.inheritStrategy,
          },
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

  /* =================== MOVIMIENTOS: throttle =================== */
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

  /* =================== Suscripciones STOMP =================== */
  useEffect(() => {
    if (!sock || !projectId) return;

    const subUpdates = sock.subscribe(topicUpdates, (msg) => {
      if (!msg) return;
      if (msg.clientId === clientIdRef.current) return;

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

    const subCursors = sock.subscribe(topicCursors, (msg) => {
      const isMove = msg?.type === "diagram.move" || msg?.t === "c";
      if (!isMove) return;
      if (msg.clientId === clientIdRef.current) return;

      const id = String(msg.id);
      const x = Number(msg.x);
      const y = Number(msg.y);
      if (!id || Number.isNaN(x) || Number.isNaN(y)) return;

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

  /* =================== ENTIDADES =================== */
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

  /* =================== ReactFlow handlers =================== */
  const onNodesChange = useCallback(
    (changes) => {
      for (const ch of changes) {
        if (ch.type === "position" && ch.dragging && ch.position) {
          sendMoveThrottled(ch.id, ch.position.x, ch.position.y);
        }
      }
      rfOnNodesChange(changes);

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

  const onNodeDragStop = useCallback(() => {
    publishSnapshot();
  }, [publishSnapshot]);

  /* =================== UI =================== */
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
          onExport={persistNow}
          onGenerate={handleGenerate}
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
              /* --- Relación simple --- */
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
              /* --- Relación N–N: crea entidad intermedia y 2 edges 1..* → 1 --- */
              onRelacionNM={({ aId, bId, nombreIntermedia, meta }) => {
                const A = nodes.find(n => n.id === aId);
                const B = nodes.find(n => n.id === bId);
                if (!A || !B) { alert("No encuentro las entidades seleccionadas."); return; }

                const joinName = (nombreIntermedia?.trim())
                  || `${toSnake(A.data?.label || A.id)}_${toSnake(B.data?.label || B.id)}`;

                // ¿Ya existe una entidad con ese nombre?
                const existent = nodes.find(n => (n.data?.label || "").toLowerCase() === joinName.toLowerCase());
                const joinId = existent?.id || ("n" + Date.now());

                if (!existent) {
                  const pos = midpoint(A, B);
                  const tA = inferIdType(A);
                  const tB = inferIdType(B);

                  setNodes(ns => ns.concat({
                    id: joinId,
                    type: "classNode",
                    position: { x: pos.x, y: pos.y },
                    data: {
                      label: joinName,
                      attrs: [
                        { name: `${toSnake(A.data?.label || A.id)}_id`, type: tA },
                        { name: `${toSnake(B.data?.label || B.id)}_id`, type: tB },
                      ],
                    },
                  }));
                }

                // Quitar cualquier edge directo A<->B previo
                setEdges(es =>
                  es.filter(e =>
                    !((e.source === aId && e.target === bId) || (e.source === bId && e.target === aId))
                  )
                );

                // Añadir A -> join y B -> join
                const e1 = {
                  id: "e" + Date.now() + "-a",
                  source: aId,
                  target: joinId,
                  type: "uml",
                  data: { mA: "1..*", mB: "1", relType: "1-N", ...meta },
                };
                const e2 = {
                  id: "e" + Date.now() + "-b",
                  source: bId,
                  target: joinId,
                  type: "uml",
                  data: { mA: "1..*", mB: "1", relType: "1-N", ...meta },
                };

                setEdges(es => es.concat(e1, e2));
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
                scheduleSnapshot();
              }}
            />
          )}
        </Sidebar>
      </div>
    </div>
  );
});

export default Diagramador;
