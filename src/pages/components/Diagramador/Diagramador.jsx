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
  MarkerType,
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

import { buildPrompt2 } from "./generador/promt2";
import { getDeltaFromUserText } from "./services/iaDelta";

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

/* --- util descarga de texto como archivo --- */
function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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

/* ===== Multiplicidades ===== */
const normalizeMult = (m) => {
  if (m == null) return "1";
  const v = String(m).trim().replace(/\s/g, "");
  if (!v) return "1";
  if (v === "N" || v === "*" || v === "n") return "*";
  if (v === "1..*" || v === "1.*") return "1..*";
  if (v === "0..*" || v === "0.*") return "0..*";
  if (v === "0..1" || v === "0.1") return "0..1";
  if (v === "1") return "1";
  if (/^\d+\.\.\*$/.test(v)) return "1..*";
  return v; // deja pasar si vino algo custom
};

const decideRelType = (mA, mB) => {
  const A = normalizeMult(mA), B = normalizeMult(mB);
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

  /* =================== Exportar / Importar =================== */
  const exportJSON = useCallback(() => {
    const payload = {
      version: versionRef.current ?? 1,
      projectId,
      projectName,
      savedAt: new Date().toISOString(),
      nodes,
      edges,
    };
    const file = `${(projectName || "proyecto").replace(/[^\w.-]+/g, "_")}.diagram.json`;
    downloadText(file, JSON.stringify(payload, null, 2));
  }, [nodes, edges, projectId, projectName]);

  const exportPUML = useCallback(() => {
    const classes = nodes.map(n => {
      const name = n.data?.label || n.id;
      const attrs = (n.data?.attrs || [])
        .map(a => `  ${a.name}: ${a.type || "String"}`)
        .join("\n");
      return `class ${name} {\n${attrs}\n}`;
    }).join("\n\n");

    const rels = edges.map(e => {
      const a = nodes.find(n => n.id === e.source);
      const b = nodes.find(n => n.id === e.target);
      if (!a || !b) return "";
      const A = a.data?.label || a.id;
      const B = b.data?.label || b.id;
      const mA = normalizeMult(e.data?.mA || "1");
      const mB = normalizeMult(e.data?.mB || "1");
      const verb = e.data?.verb || "";
      return `${A} "${mA}" -- "${mB}" ${B}${verb ? ` : ${verb}` : ""}`;
    }).filter(Boolean).join("\n");

    const puml = `@startuml
skinparam classAttributeIconSize 0

${classes}

${rels}
@enduml
`;
    const file = `${(projectName || "proyecto").replace(/[^\w.-]+/g, "_")}.puml`;
    downloadText(file, puml);
  }, [nodes, edges, projectName]);

  // --------- IMPORTAR DESDE PUML ----------
  const importFromPUMLText = useCallback(async (text) => {
    try {
      // 1) Quitar comentarios y preámbulo/epílogo
      const cleaned = text
        .replace(/\/\*[^]*?\*\//g, "")   // /* comentarios */
        .replace(/'[^]*?$/gm, "")        // ' comentarios de línea
        .replace(/@startuml[^]*?\n/i, "") // remover encabezado
        .replace(/@enduml[^]*$/i, "");    // remover final

      // 2) Parsear clases
      const classRegex = /(?:class|entity)\s+([A-Za-z_]\w*)\s*\{([^]*?)\}/g;
      const foundClasses = [];
      let m;
      while ((m = classRegex.exec(cleaned)) !== null) {
        const name = m[1];
        const body = m[2] || "";
        const attrs = body
          .split(/\r?\n/)
          .map(l => l.trim())
          .filter(l => l && !l.startsWith("//") && !l.startsWith("'"))
          .map(l => {
            // formato esperado: nombre: Tipo
            const mm = l.match(/^([A-Za-z_]\w*)\s*:\s*([^;{]+)$/);
            if (!mm) return null;
            return { name: mm[1], type: mm[2].trim() };
          })
          .filter(Boolean);
        foundClasses.push({ name, attrs });
      }

      // 3) Si no hay bloques, intenta "class Nombre" en línea
      const singleClassRegex = /^\s*(?:class|entity)\s+([A-Za-z_]\w*)\s*$/gm;
      let sm;
      while ((sm = singleClassRegex.exec(cleaned)) !== null) {
        const name = sm[1];
        if (!foundClasses.find(c => c.name === name)) {
          foundClasses.push({ name, attrs: [] });
        }
      }

      // 4) Construir nodos (ubicar en grilla)
      const GRID_X = 260, GRID_Y = 160, COLS = 4;
      const nodesMap = new Map();
      const newNodes = foundClasses.map((c, i) => {
        const id = "n_" + c.name;
        nodesMap.set(c.name, id);
        return {
          id,
          type: "classNode",
          position: { x: 60 + (i % COLS) * GRID_X, y: 60 + Math.floor(i / COLS) * GRID_Y },
          data: { label: c.name, attrs: c.attrs || [] },
        };
      });

      // 5) Parsear relaciones:  A "mA" -- "mB" B : verbo
      // comillas en multiplicidades opcionales
      const relRegex = /^\s*([A-Za-z_]\w*)\s*("?)([^"]*?)\2\s*--\s*("?)([^"]*?)\4\s*([A-Za-z_]\w*)(?:\s*:\s*([^\n]+))?/gm;
      const newEdges = [];
      let r;
      while ((r = relRegex.exec(cleaned)) !== null) {
        const aName = r[1];
        const mA = r[3]?.trim();
        const mB = r[5]?.trim();
        const bName = r[6];
        const verb = (r[7] || "").trim();

        const aId = nodesMap.get(aName) || ("n_" + aName);
        const bId = nodesMap.get(bName) || ("n_" + bName);

        // Si aparecieron en relaciones pero no en clases, créalos sin attrs
        if (!nodesMap.has(aName)) {
          nodesMap.set(aName, aId);
          newNodes.push({
            id: aId,
            type: "classNode",
            position: { x: 60 + (newNodes.length % COLS) * GRID_X, y: 60 + Math.floor(newNodes.length / COLS) * GRID_Y },
            data: { label: aName, attrs: [] },
          });
        }
        if (!nodesMap.has(bName)) {
          nodesMap.set(bName, bId);
          newNodes.push({
            id: bId,
            type: "classNode",
            position: { x: 60 + (newNodes.length % COLS) * GRID_X, y: 60 + Math.floor(newNodes.length / COLS) * GRID_Y },
            data: { label: bName, attrs: [] },
          });
        }

        const relType = decideRelType(mA, mB);
        newEdges.push({
          id: "e" + newEdges.length + "_" + Date.now(),
          source: aId,
          target: bId,
          type: "uml",
          data: { mA: normalizeMult(mA || "1"), mB: normalizeMult(mB || "1"), verb, relType },
        });
      }

      setNodes(newNodes);
      setEdges(newEdges);

      // Persistir y notificar a otros
      await ProjectsApi.updateDiagram(projectId, {
        name: "Principal",
        nodes: JSON.stringify(newNodes),
        edges: JSON.stringify(newEdges),
        viewport: null,
      });
      publishSnapshot();
      alert("✅ PUML importado y guardado.");
    } catch (err) {
      console.error("Import PUML error:", err);
      alert("❌ No se pudo importar el .puml: " + (err?.message || "desconocido"));
    }
  }, [projectId, setNodes, setEdges, publishSnapshot]);

  const importFromJSONText = useCallback(async (text) => {
    try {
      const data = JSON.parse(text);
      const n = Array.isArray(data.nodes) ? data.nodes : [];
      const e = Array.isArray(data.edges) ? data.edges : [];
      setNodes(n);
      setEdges(e);
      versionRef.current = (data.version ?? versionRef.current) || null;

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
      alert("❌ No se pudo importar el JSON: " + (err?.message || "desconocido"));
    }
  }, [projectId, setNodes, setEdges, publishSnapshot]);

  useImperativeHandle(ref, () => ({
    persistNow,
    handleGenerate,
    exportJSON,
    exportPUML,
    importFromJSONText,
    importFromPUMLText,
  }));

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

  /* =================== Helpers IA (modelo + aplicar acciones) =================== */
  const modelFromState = useCallback(() => {
    const entities = nodes.map(n => ({
      id: n.id,
      name: n.data?.label || n.id,
      attrs: n.data?.attrs || []
    }));

    const relations = edges.map(e => ({
      aId: e.source,
      bId: e.target,
      aName: nodes.find(n => n.id === e.source)?.data?.label || e.source,
      bName: nodes.find(n => n.id === e.target)?.data?.label || e.target,
      mA: e.data?.mA, mB: e.data?.mB,
      verb: e.data?.verb || "",
      relType: e.data?.relType || ""
    }));

    return { entities, relations, joinTables: [] };
  }, [nodes, edges]);

  const findByName = (name) =>
    nodes.find(n => (n.data?.label || "").toLowerCase() === String(name).toLowerCase());

  const ensureEntity = (name, atts = []) => {
    const ex = findByName(name);
    if (ex) {
      if (atts?.length) {
        setNodes(ns => ns.map(n => {
          if (n.id !== ex.id) return n;
          const map = new Map((n.data?.attrs || []).map(a => [a.name.toLowerCase(), a]));
          for (const a of atts) {
            if (!a?.name) continue;
            const k = a.name.toLowerCase();
            if (map.has(k)) map.set(k, { ...map.get(k), type: a.type || map.get(k).type });
            else map.set(k, { name: a.name, type: a.type || "String" });
          }
          return { ...n, data: { ...n.data, attrs: Array.from(map.values()) } };
        }));
        scheduleSnapshot();
      }
      return ex.id;
    }
    const id = "n" + Date.now() + Math.random().toString(36).slice(2, 6);
    const x = 120 + nodes.length * 40;
    const y = 120 + nodes.length * 30;
    setNodes(ns => ns.concat({
      id,
      type: "classNode",
      position: { x, y },
      data: { label: name, attrs: atts || [] }
    }));
    scheduleSnapshot();
    return id;
  };

  const addEdgeSimple = (aId, bId, mA, mB, verb) => {
    const relType = decideRelType(mA, mB);
    const id = "e" + Date.now() + Math.random().toString(36).slice(2, 6);
    setEdges(es => es.concat({
      id,
      source: aId,
      target: bId,
      type: "uml",
      label: verb || "",
      data: { mA: normalizeMult(mA), mB: normalizeMult(mB), verb: verb || "", relType }
    }));
  };

  const addRelationNM = (aId, bId, joinNameOpt) => {
    const A = nodes.find(n => n.id === aId);
    const B = nodes.find(n => n.id === bId);
    if (!A || !B) return;

    const joinName = (joinNameOpt && joinNameOpt.trim())
      || `${toSnake(A.data?.label || A.id)}_${toSnake(B.data?.label || B.id)}`;

    const existent = findByName(joinName);
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
          ]
        }
      }));
    }

    setEdges(es => es.filter(e =>
      !((e.source === aId && e.target === bId) || (e.source === bId && e.target === aId))
    ));

    const e1 = {
      id: "e" + Date.now() + "-a",
      source: aId, target: joinId,
      type: "uml",
      data: { mA: "1..*", mB: "1", relType: "1-N" }
    };
    const e2 = {
      id: "e" + Date.now() + "-b",
      source: bId, target: joinId,
      type: "uml",
      data: { mA: "1..*", mB: "1", relType: "1-N" }
    };
    setEdges(es => es.concat(e1, e2));
  };

  const removeRelationByNames = (aName, bName) => {
    const A = findByName(aName);
    const B = findByName(bName);
    if (!A || !B) return;
    setEdges(es => es.filter(e =>
      !((e.source === A.id && e.target === B.id) || (e.source === B.id && e.target === A.id))
    ));
  };

  const applyActions = useCallback((actions = []) => {
    for (const act of actions) {
      if (!act || !act.op) continue;

      if (act.op === "add_entity") {
        ensureEntity(act.name, act.attrs || []);
      }
      if (act.op === "update_entity") {
        ensureEntity(act.name, act.attrs || []);
      }
      if (act.op === "remove_entity") {
        const ex = findByName(act.name);
        if (ex) removeEntity(ex.id);
      }
      if (act.op === "add_attr") {
        ensureEntity(act.entity, [act.attr]);
      }
      if (act.op === "rename_entity") {
        const ex = findByName(act.old);
        if (ex && act.name) updateEntity(ex.id, () => ({ label: act.name }));
      }
      if (act.op === "add_relation") {
        const aId = ensureEntity(act.a);
        const bId = ensureEntity(act.b);
        addEdgeSimple(aId, bId, act.mA || "1", act.mB || "1", act.verb || "");
      }
      if (act.op === "remove_relation") {
        removeRelationByNames(act.a, act.b);
      }
      if (act.op === "add_relation_nm") {
        const aId = ensureEntity(act.a);
        const bId = ensureEntity(act.b);
        addRelationNM(aId, bId, act.joinName);
      }
    }
    scheduleSnapshot();
  }, [nodes, edges]); // eslint-disable-line react-hooks/exhaustive-deps

  /* =================== IA: abrir modal y ejecutar =================== */
  const handleIA = async (userText) => {
    try {
      const current = modelFromState();
      const delta = await getDeltaFromUserText({
        text: userText,
        promptBuilder: buildPrompt2,
        currentModel: current
      });
      if (!delta || !Array.isArray(delta.actions)) {
        alert("La IA no devolvió acciones válidas.");
        return false;
      }
      applyActions(delta.actions);
      setIaOpen(false);
      return true;
    } catch (err) {
      console.error("IA error:", err);
      alert("Error interpretando instrucciones: " + (err?.message || ""));
      return false;
    }
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
              onOpenIA={() => setIaOpen(true)}
            />
          ) : (
            <RelacionarPanel
              nodes={nodes}
              edges={edges}
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
              onRelacionNM={({ aId, bId, nombreIntermedia, meta }) => {
                const a = nodes.find(n => n.id === aId);
                const b = nodes.find(n => n.id === bId);
                if (!a || !b) return;
                addRelationNM(aId, bId, nombreIntermedia);
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
              onOpenIA={() => setIaOpen(true)}
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
