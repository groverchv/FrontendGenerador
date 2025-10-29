import {
  forwardRef,
  useCallback,
  useMemo,
  useState,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import "reactflow/dist/style.css";
import { addEdge, useNodesState, useEdgesState } from "reactflow";

import DiagramCanvas from "./SubDiagrama/DiagramCanvas";
import SidebarDock from "./SubDiagrama/SidebarDock";
import ClassNode from "./SubDiagrama/ClassNode";
import UmlEdge from "./SubDiagrama/UmlEdge";
import EntidadPanel from "./components/Entidad/EntidadPanel";
import RelacionarPanel from "./components/Relacion/RelacionarPanel";
import IAController from "./SubDiagrama/IAController";

import { ProjectsApi } from "../../../api/projects";

/* ---------------- Throttle/Debounce ---------------- */
const throttle = (fn, wait = 60) => {
  let last = 0,
    t = null,
    lastArgs = null;
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
};
const debounce = (fn, wait = 250) => {
  let t = null;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), wait);
  };
};

/* ====== Utilidades del modelo (inline) ====== */
const toSnake = (s = "") =>
  (s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase();

const inferIdType = (node) =>
  (node?.data?.attrs || []).find((a) => a.name?.toLowerCase() === "id")?.type ||
  "Integer";

const midpoint = (a, b) => ({
  x: ((a?.position?.x ?? 100) + (b?.position?.x ?? 100)) / 2,
  y: ((a?.position?.y ?? 100) + (b?.position?.y ?? 100)) / 2,
});

const normalizeMult = (m) => {
  if (m == null) return "1";
  const v = String(m).trim().replace(/\s/g, "");
  if (!v) return "1";
  if (["N", "*", "n"].includes(v)) return "*";
  if (v === "1..*" || v === "1.*" || /^\d+\.\.\*$/.test(v)) return "1..*";
  if (v === "0..*" || v === "0.*") return "0..*";
  if (v === "0..1" || v === "0.1") return "0..1";
  if (v === "1") return "1";
  return v;
};
const decideRelType = (mA, mB) => {
  const A = normalizeMult(mA),
    B = normalizeMult(mB);
  const isMany = (x) => x === "1..*" || x === "0..*" || x === "*";
  if (!isMany(A) && !isMany(B)) return "1-1";
  if (!isMany(A) && isMany(B)) return "1-N";
  if (isMany(A) && !isMany(B)) return "N-1";
  if (A === "0..1" && !isMany(B)) return "0-1";
  if (!isMany(A) && A === "1" && B === "0..1") return "1-0";
  if (A === "0..1" && isMany(B)) return "0-N";
  if (isMany(A) && B === "0..1") return "N-0";
  return "NM";
};

/* ====== NUEVO: puertos REALES del ClassNode + selector inteligente ====== */
// Deben coincidir con los <Handle id="..."> de ClassNode.jsx
const PORTS = {
  "left-mid": { dir: [-1, 0] },
  "right-mid": { dir: [1, 0] },
  "top-mid": { dir: [0, -1] },
  "bottom-mid": { dir: [0, 1] },
  "top-left": { dir: [-1, -1] },
  "top-right": { dir: [1, -1] },
  "bottom-left": { dir: [-1, 1] },
  "bottom-right": { dir: [1, 1] },
};
const PORT_IDS = Object.keys(PORTS);

const usageCount = (nodeId, handleId, edges) =>
  edges.reduce(
    (acc, e) =>
      acc +
      ((e.source === nodeId && e.sourceHandle === handleId) ? 1 : 0) +
      ((e.target === nodeId && e.targetHandle === handleId) ? 1 : 0),
    0
  );

/** Elige un puerto del nodo “fromNode” hacia “toNode”.
 *  1) Prioriza puertos LIBRES (used=0) ordenados por menor ángulo.
 *  2) Si todos ocupados, el de MENOR USO y mejor ángulo.
 */
const pickHandle = (fromNode, toNode, edges) => {
  const fromCx = (fromNode?.position?.x ?? 0) + 120;
  const fromCy = (fromNode?.position?.y ?? 0) + 60;
  const toCx = (toNode?.position?.x ?? 0) + 120;
  const toCy = (toNode?.position?.y ?? 0) + 60;

  const dx = toCx - fromCx,
    dy = toCy - fromCy;
  const len = Math.hypot(dx, dy) || 1;
  const vx = dx / len,
    vy = dy / len;

  const scored = PORT_IDS.map((id) => {
    const [hx, hy] = PORTS[id].dir;
    const angleCost = 1 - (vx * hx + vy * hy) / Math.hypot(hx, hy); // menor = mejor
    const usedTimes = usageCount(fromNode.id, id, edges);
    return { id, angleCost, usedTimes };
  });

  const free = scored
    .filter((s) => s.usedTimes === 0)
    .sort((a, b) => a.angleCost - b.angleCost);
  if (free.length) return free[0].id;

  scored.sort(
    (a, b) => a.usedTimes - b.usedTimes || a.angleCost - b.angleCost
  );
  return scored[0].id;
};
/* ======================================================================= */

const Diagramador = forwardRef(function Diagramador(
  { projectId, projectName, sock },
  ref
) {
  // ⬇️ ref para abrir/cerrar el modal IA (ARREGLA el error iaRef)
  const iaRef = useRef(null);

  const nodeTypes = useMemo(() => ({ classNode: ClassNode }), []);
  const edgeTypes = useMemo(() => ({ uml: UmlEdge }), []);

  const [nodes, setNodes, rfOnNodesChange] = useNodesState([]);
  const [edges, setEdges, rfOnEdgesChange] = useEdgesState([]);

  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState("entidad");

  // STOMP meta
  const clientIdRef = useRef(
    Math.random().toString(36).slice(2) + Date.now().toString(36)
  );
  const versionRef = useRef(null);

  const topicUpdates = useMemo(
    () => `/topic/projects/${projectId}`,
    [projectId]
  );
  const topicCursors = useMemo(
    () => `/topic/projects/${projectId}/cursors`,
    [projectId]
  );
  const destUpdate = useMemo(
    () => `/app/projects/${projectId}/update`,
    [projectId]
  );
  const destCursor = useMemo(
    () => `/app/projects/${projectId}/cursor`,
    [projectId]
  );

  const lastSeqRef = useRef(new Map());
  const seqCounterRef = useRef(0);

  const publishSnapshot = useCallback(() => {
    if (!sock) return;
    sock.send(destUpdate, {
      type: "diagram.snapshot",
      clientId: clientIdRef.current,
      baseVersion: versionRef.current,
      name: "Principal",
      nodes: JSON.stringify(nodes),
      edges: JSON.stringify(edges),
    });
  }, [sock, nodes, edges, destUpdate]);

  const scheduleSnapshot = useMemo(
    () => debounce(publishSnapshot, 250),
    [publishSnapshot]
  );

  /* ---------- Carga inicial con migración ---------- */
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        const d = await ProjectsApi.getDiagram(projectId);
        const n = d.nodes ? JSON.parse(d.nodes) : [];
        let e = d.edges ? JSON.parse(d.edges) : [];
        const nameToKind = {
          Asociación: "ASSOC",
          Agregación: "AGGR",
          Composición: "COMP",
          Herencia: "INHERIT",
          Dependencia: "DEPEND",
        };
        e = e.map((edge) => {
          const labelIsType = nameToKind[edge.label];
          if (labelIsType && !edge.data?.relKind) {
            return {
              ...edge,
              label: edge.data?.verb || "",
              data: { ...(edge.data || {}), relKind: labelIsType },
            };
          }
          return edge;
        });
        setNodes(n);
        setEdges(e);
        versionRef.current = d.version ?? null;
      } catch (err) {
        console.error("No se pudo cargar el diagrama", err);
      }
    })();
  }, [projectId, setNodes, setEdges]);

  /* ---------- Guardado ---------- */
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

  /* ---------- Export/Import JSON ---------- */
  const exportJSON = useCallback(() => {
    const payload = {
      version: versionRef.current ?? 1,
      projectId,
      projectName,
      savedAt: new Date().toISOString(),
      nodes,
      edges,
    };
    const file = `${(projectName || "proyecto").replace(
      /[^\w.-]+/g,
      "_"
    )}.diagram.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, projectId, projectName]);

  const importFromJSONText = useCallback(
    async (text) => {
      try {
        const data = JSON.parse(text);
        const n = Array.isArray(data.nodes) ? data.nodes : [];
        const e = Array.isArray(data.edges) ? data.edges : [];
        setNodes(n);
        setEdges(e);
        versionRef.current = data.version ?? versionRef.current ?? null;
        await ProjectsApi.updateDiagram(projectId, {
          name: "Principal",
          nodes: JSON.stringify(n),
          edges: JSON.stringify(e),
          viewport: null,
        });
        publishSnapshot();
        alert("✅ Diagrama importado y guardado.");
      } catch (err) {
        console.error("Import JSON error:", err);
        alert(
          "❌ No se pudo importar el JSON: " + (err?.message || "desconocido")
        );
      }
    },
    [projectId, setNodes, setEdges, publishSnapshot]
  );

  useImperativeHandle(ref, () => ({
    persistNow,
    handleGenerate: () => {}, // si no usas generación aquí
    exportJSON,
    importFromJSONText,
  }));

  /* ---------- Broadcast de movimientos ---------- */
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

  /* ---------- STOMP ---------- */
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
      try {
        sock.unsubscribe(subUpdates);
      } catch {}
      try {
        sock.unsubscribe(subCursors);
      } catch {}
      try {
        offConnect?.();
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
    setNodes,
    setEdges,
  ]);

  /* ---------- ENTIDADES ---------- */
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

  /* ---------- Relaciones ---------- */
  const addRelationNM = (aId, bId, joinNameOpt) => {
    const A = nodes.find((n) => n.id === aId);
    const B = nodes.find((n) => n.id === bId);
    if (!A || !B) return;

    const joinName =
      (joinNameOpt && joinNameOpt.trim()) ||
      `${toSnake(A.data?.label || A.id)}_${toSnake(B.data?.label || B.id)}`;

    const existent = nodes.find(
      (n) => (n.data?.label || "").toLowerCase() === joinName.toLowerCase()
    );
    const joinId = existent?.id || "n" + Date.now();

    if (!existent) {
      const pos = midpoint(A, B);
      const tA = inferIdType(A);
      const tB = inferIdType(B);
      setNodes((ns) =>
        ns.concat({
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
        })
      );
    }

    // quitar relación directa si existe y conectar a la tabla intermedia
    setEdges((es) =>
      es
        .filter(
          (e) =>
            !(
              (e.source === aId && e.target === bId) ||
              (e.source === bId && e.target === aId)
            )
        )
        .concat(
          {
            id: "e" + Date.now() + "-a",
            source: aId,
            target: joinId,
            sourceHandle: "right-mid",
            targetHandle: "left-mid",
            type: "uml",
            label: "",
            data: { mA: "1..*", mB: "1", relType: "1-N", relKind: "ASSOC" },
          },
          {
            id: "e" + Date.now() + "-b",
            source: bId,
            target: joinId,
            sourceHandle: "right-mid",
            targetHandle: "left-mid",
            type: "uml",
            label: "",
            data: { mA: "1..*", mB: "1", relType: "1-N", relKind: "ASSOC" },
          }
        )
    );
  };

  const addEdgeSimple = (aId, bId, mA, mB, verb, meta = {}) => {
    const relType = decideRelType(mA, mB);
    setEdges((es) => {
      const A = nodes.find((n) => n.id === aId);
      const B = nodes.find((n) => n.id === bId);
      const sourceHandle = pickHandle(A, B, es);
      const targetHandle = pickHandle(B, A, es);
      const id = "e" + Date.now() + Math.random().toString(36).slice(2, 6);
      return es.concat({
        id,
        source: aId,
        target: bId,
        sourceHandle,
        targetHandle,
        type: "uml",
        label: verb || "",
        data: {
          mA: normalizeMult(mA),
          mB: normalizeMult(mB),
          verb: verb || "",
          relType,
          ...meta,
        },
      });
    });
  };

  /* ---------- ReactFlow handlers ---------- */
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

  // Usa pickHandle para asignar puertos automáticamente
  const onConnect = useCallback(
    (params) => {
      setEdges((eds) => {
        const nMap = new Map(nodes.map((n) => [n.id, n]));
        const A = nMap.get(params.source);
        const B = nMap.get(params.target);
        const sourceHandle = params.sourceHandle || pickHandle(A, B, eds);
        const targetHandle = params.targetHandle || pickHandle(B, A, eds);
        return addEdge(
          {
            ...params,
            sourceHandle,
            targetHandle,
            type: "uml",
            data: { relKind: "ASSOC", mA: "1", mB: "1", verb: "" },
            label: "",
          },
          eds
        );
      });
      scheduleSnapshot();
    },
    [nodes, scheduleSnapshot]
  );

  const onNodeDragStop = useCallback(() => {
    publishSnapshot();
  }, [publishSnapshot]);

  /* -------------------- UI -------------------- */
  return (
    <div
      className="w-full h-[calc(100vh-56px)] md:grid md:grid-cols-[1fr_var(--sbw,320px)] overflow-hidden"
      style={{ "--sbw": "340px" }}
    >
      {/* Lienzo */}
      <div className="flex-1 h-full overflow-hidden bg-white">
        <DiagramCanvas
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
      </div>

      {/* Sidebar */}
      <SidebarDock
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        addEntity={addEntity}
        clearAll={() => {
          setNodes([]);
          setEdges([]);
          scheduleSnapshot();
        }}
        persistNow={persistNow}
        handleGenerate={() => {}}
        openIA={() => iaRef.current?.open()}
      >
        {activeTab === "entidad" ? (
          <EntidadPanel
            node={nodes.find((n) => n.id === selectedId) || null}
            onChangeName={(name) =>
              updateEntity(selectedId, () => ({ label: name }))
            }
            onNamePreview={(id, liveName) => {
              setNodes((ns) =>
                ns.map((n) =>
                  n.id === id
                    ? { ...n, data: { ...n.data, label: liveName } }
                    : n
                )
              );
            }}
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
            onOpenIA={() => iaRef.current?.open()}
          />
        ) : (
          <RelacionarPanel
            nodes={nodes}
            edges={edges}
            onRelacionSimple={({ sourceId, targetId, tipo, mA, mB, verb, meta }) => {
              setEdges((es) => {
                const A = nodes.find((n) => n.id === sourceId);
                const B = nodes.find((n) => n.id === targetId);
                const sourceHandle = pickHandle(A, B, es);
                const targetHandle = pickHandle(B, A, es);
                const id = "e" + Date.now();
                return es.concat({
                  id,
                  source: sourceId,
                  target: targetId,
                  sourceHandle,
                  targetHandle,
                  type: "uml",
                  label: verb || "",
                  data: { mA, mB, verb, relType: tipo, ...meta },
                });
              });
              scheduleSnapshot();
            }}
            onRelacionNM={({ aId, bId, nombreIntermedia }) => {
              addRelationNM(aId, bId, nombreIntermedia);
            }}
            onUpdateEdge={(edgeId, partial) => {
              setEdges((es) =>
                es.map((e) => {
                  if (e.id !== edgeId) return e;
                  const merged = {
                    ...e,
                    ...partial,
                    data: { ...e.data, ...partial.data },
                  };
                  if (partial?.data?.verb !== undefined) {
                    merged.label = partial.data.verb || "";
                  }
                  return merged;
                })
              );
              scheduleSnapshot();
            }}
            onDeleteEdge={(edgeId) => {
              setEdges((es) => es.filter((e) => e.id !== edgeId));
              scheduleSnapshot();
            }}
            onOpenIA={() => iaRef.current?.open()}
          />
        )}
      </SidebarDock>

      {/* IA Controller (modal) */}
      <IAController
        ref={iaRef}
        nodes={nodes}
        setNodes={setNodes}
        edges={edges}
        setEdges={setEdges}
        scheduleSnapshot={scheduleSnapshot}
        addRelationNM={addRelationNM}
      />
    </div>
  );
});

export default Diagramador;
