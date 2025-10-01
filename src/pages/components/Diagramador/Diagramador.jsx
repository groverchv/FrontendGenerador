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

  // ---- Refs
  const posTsRef = useRef(new Map()); // nodeId -> ts último move (remoto)
  const lastSeqRef = useRef(new Map()); // nodeId -> seq último
  const seqCounterRef = useRef(0); // contador local cursores
  const isDraggingRef = useRef(false);
  const queuedPatchRef = useRef(null);
  const lastMoveRef = useRef(null); // última pos local (en drag)

  // rAF
  const rafSendIdRef = useRef(0); // envío local cada frame
  const rafApplyIdRef = useRef(0); // interpolación remota cada frame
  const peersRef = useRef(new Map()); // id -> { tx, ty }

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

  // =================== Persistencia explícita ===================
  const publishPatchNow = useCallback(() => {
    if (!sock) return;
    const payload = {
      clientId: clientIdRef.current,
      baseVersion: versionRef.current,
      name: "Principal",
      nodes: JSON.stringify(nodes),
      edges: JSON.stringify(edges),
    };
    try {
      sock.send(destUpdate, payload, { critical: true });
    } catch {}
  }, [sock, nodes, edges, destUpdate]);

  const persistNow = useCallback(async () => {
    try {
      if (projectId) {
        await ProjectsApi.updateDiagram(projectId, {
          name: "Principal",
          nodes: JSON.stringify(nodes),
          edges: JSON.stringify(edges),
          viewport: null,
        });
        publishPatchNow();
        alert("✅ Diagrama guardado correctamente.");
      }
    } catch (e) {
      console.error("Error guardando", e);
      alert("❌ Error guardando cambios en el diagrama.");
    }
  }, [projectId, nodes, edges, publishPatchNow]);

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

  // =================== Envío cursores: cada frame (rAF) ===================
  const startRafSender = useCallback(() => {
    if (rafSendIdRef.current) return;
    const loop = () => {
      const mv = lastMoveRef.current;
      if (mv && sock) {
        const seq = ++seqCounterRef.current;
        try {
          // Enviar SIN umbral y sin redondeo para máxima respuesta
          sock.send(destCursor, {
            t: "c", // compacto
            clientId: clientIdRef.current,
            id: mv.id,
            x: mv.x,
            y: mv.y,
            ts: performance.now(), // ms alta resolución
            seq,
          });
        } catch {}
      }
      rafSendIdRef.current = requestAnimationFrame(loop);
    };
    rafSendIdRef.current = requestAnimationFrame(loop);
  }, [sock, destCursor]);

  const stopRafSender = useCallback(() => {
    if (rafSendIdRef.current) {
      cancelAnimationFrame(rafSendIdRef.current);
      rafSendIdRef.current = 0;
    }
  }, []);

  // =================== Apply patch (merge por timestamp) ===================
  const applyPatch = useCallback(
    (msg) => {
      if (!msg) return;
      if (typeof msg.nodes !== "string" || typeof msg.edges !== "string") return;
      const patchTs = Number(msg.serverTs) || 0;
      try {
        const n = JSON.parse(msg.nodes);
        const e = JSON.parse(msg.edges);
        if (!Array.isArray(n) || !Array.isArray(e)) return;

        setNodes((prev) => {
          const prevById = new Map(prev.map((p) => [p.id, p]));
          return n.map((nn) => {
            const lastMoveTs = posTsRef.current.get(String(nn.id)) || 0;
            if (lastMoveTs > patchTs) {
              const old = prevById.get(nn.id);
              if (old?.position) return { ...nn, position: old.position };
            }
            return nn;
          });
        });
        setEdges(e);
        versionRef.current = msg.version ?? versionRef.current;
      } catch {}
    },
    [setNodes, setEdges]
  );

  // =================== Interpolación remota (rAF, más agresiva) ===================
  const applyRemoteSmooth = useCallback(() => {
    const ease = 0.7; // ⚡ más rápido (0..1)
    let changed = false;

    setNodes((ns) => {
      const map = new Map(ns.map((n) => [n.id, n]));
      peersRef.current.forEach((target, nodeId) => {
        const n = map.get(String(nodeId));
        if (!n || !n.position) return;
        const nx = n.position.x + (target.tx - n.position.x) * ease;
        const ny = n.position.y + (target.ty - n.position.y) * ease;
        // Umbral muy bajo para ver todo movimiento
        if (Math.abs(nx - n.position.x) > 0.02 || Math.abs(ny - n.position.y) > 0.02) {
          map.set(String(nodeId), { ...n, position: { x: nx, y: ny } });
          changed = true;
        }
      });
      return changed ? Array.from(map.values()) : ns;
    });

    if (changed) {
      rafApplyIdRef.current = requestAnimationFrame(applyRemoteSmooth);
    } else {
      rafApplyIdRef.current = 0;
    }
  }, [setNodes]);

  // =================== Suscripciones STOMP ===================
  useEffect(() => {
    if (!sock || !projectId) return;

    // Snapshots (autoridad servidor)
    const subUpdates = sock.subscribe(topicUpdates, (msg) => {
      if (!msg) return;
      if (msg.clientId === clientIdRef.current) return;
      if (isDraggingRef.current) {
        queuedPatchRef.current = msg;
        return;
      }
      applyPatch(msg);
    });

    // Cursores remotos (alta frecuencia)
    const subCursors = sock.subscribe(topicCursors, (msg) => {
      const isMove = msg?.type === "diagram.move" || msg?.t === "c";
      if (!isMove) return;
      if (msg.clientId === clientIdRef.current) return;

      const id = String(msg.id);
      const x = Number(msg.x);
      const y = Number(msg.y);
      if (!id || Number.isNaN(x) || Number.isNaN(y)) return;

      if (typeof msg.seq === "number") {
        const prevSeq = lastSeqRef.current.get(id) ?? -1;
        if (msg.seq <= prevSeq) return; // descarta viejo
        lastSeqRef.current.set(id, msg.seq);
      }
      if (typeof msg.ts === "number") {
        posTsRef.current.set(id, msg.ts);
      }

      const p = peersRef.current.get(id) || { tx: x, ty: y };
      p.tx = x;
      p.ty = y;
      peersRef.current.set(id, p);

      if (!rafApplyIdRef.current) {
        rafApplyIdRef.current = requestAnimationFrame(applyRemoteSmooth);
      }
    });

    // Resync on reconnect (snapshot crítico)
    const offConnect = sock.onConnect(() => {
      try {
        sock.send(
          destUpdate,
          {
            clientId: clientIdRef.current,
            baseVersion: versionRef.current,
            name: "Principal",
            nodes: JSON.stringify(nodes),
            edges: JSON.stringify(edges),
          },
          { critical: true }
        );
      } catch {}
    });

    return () => {
      try {
        sock.unsubscribe(subUpdates);
      } catch {}
      try {
        sock.unsubscribe(subCursors);
      } catch {}
      try {
        offConnect?.();
      } catch {}
      try {
        if (rafApplyIdRef.current) cancelAnimationFrame(rafApplyIdRef.current);
        rafApplyIdRef.current = 0;
      } catch {}
    };
  }, [
    sock,
    projectId,
    topicUpdates,
    topicCursors,
    destUpdate,
    nodes,
    edges,
    applyPatch,
    applyRemoteSmooth,
    setNodes,
  ]);

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
    setTimeout(publishPatchNow, 0);
  };

  const updateEntity = (id, updater) => {
    setNodes((ns) =>
      ns.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...updater(n.data) } } : n
      )
    );
    setTimeout(publishPatchNow, 0);
  };

  const removeEntity = (id) => {
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
    setTimeout(publishPatchNow, 0);
  };

  // =================== ReactFlow handlers ===================
  const onNodesChange = useCallback(
    (changes) => {
      rfOnNodesChange(changes);
    },
    [rfOnNodesChange]
  );

  const onEdgesChange = useCallback(
    (changes) => {
      rfOnEdgesChange(changes);
    },
    [rfOnEdgesChange]
  );

  const onConnect = useCallback(
    (params) => {
      setEdges((eds) =>
        addEdge({ ...params, animated: true, type: "uml", data: {} }, eds)
      );
      setTimeout(publishPatchNow, 0);
    },
    [publishPatchNow]
  );

  // Drag local
  const onNodeDrag = useCallback(
    (_, node) => {
      isDraggingRef.current = true;
      lastMoveRef.current = { id: node.id, x: node.position.x, y: node.position.y };
      startRafSender(); // cada frame
    },
    [startRafSender]
  );

  const onNodeDragStop = useCallback(() => {
    isDraggingRef.current = false;
    stopRafSender();
    publishPatchNow();
    if (queuedPatchRef.current) {
      applyPatch(queuedPatchRef.current);
      queuedPatchRef.current = null;
    }
  }, [stopRafSender, publishPatchNow, applyPatch]);

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
      setTimeout(publishPatchNow, 0);
      setIaOpen(false);
      return true;
    } catch (err) {
      console.error("Error interpretando IA", err);
      return false;
    }
  };

  // =================== Limpieza rAF si el componente se desmonta ===================
  useEffect(() => {
    return () => {
      try {
        if (rafSendIdRef.current) cancelAnimationFrame(rafSendIdRef.current);
        rafSendIdRef.current = 0;
      } catch {}
      try {
        if (rafApplyIdRef.current) cancelAnimationFrame(rafApplyIdRef.current);
        rafApplyIdRef.current = 0;
      } catch {}
    };
  }, []);

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
          onNodeDrag={onNodeDrag}
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
            setTimeout(publishPatchNow, 0);
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
                setTimeout(publishPatchNow, 0);
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
                setTimeout(publishPatchNow, 0);
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
                setTimeout(publishPatchNow, 0);
              }}
              onDeleteEdge={(edgeId) => {
                setEdges((es) => es.filter((e) => e.id !== edgeId));
                setTimeout(publishPatchNow, 0);
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
