import {
  forwardRef,
  useMemo,
  useState,
  useImperativeHandle,
  useRef,
} from "react";
<<<<<<< HEAD
import "reactflow/dist/style.css";
import { addEdge, useNodesState, useEdgesState } from "reactflow";

import DiagramCanvas from "./SubDiagrama/DiagramCanvas";
import SidebarDock from "./SubDiagrama/SidebarDock";
import ClassNode from "./SubDiagrama/ClassNode";
import UmlEdge from "./SubDiagrama/UmlEdge";
import EntidadPanel from "./components/Entidad/EntidadPanel";
import RelacionarPanel from "./components/Relacion/RelacionarPanel";
import IAController from "./SubDiagrama/IAController";
=======
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

// Utils
import { findBestHandle, updateNodesWithHandleUsage } from "./SubDiagrama/utils";
>>>>>>> trabajo-temporal

// Tipos para ReactFlow - definidos fuera del componente para evitar warnings
const nodeTypes = { classNode: NodoClase };
const edgeTypes = { uml: AristaUML };

<<<<<<< HEAD
/* ---------- utilidades varias ---------- */
const throttle = (fn, wait = 60) => {
  let last = 0, t = null, lastArgs = null;
  return (...args) => {
    const now = Date.now();
    if (now - last >= wait) { last = now; fn(...args); }
    else { lastArgs = args; clearTimeout(t); t = setTimeout(() => { last = Date.now(); fn(...lastArgs); }, wait - (now - last)); }
  };
};
const debounce = (fn, wait = 250) => { let t = null; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); }; };

const toSnake = (s="") => (s||"").normalize("NFKD")
  .replace(/[\u0300-\u036f]/g,"").replace(/[^\w\s]/g,"").trim().replace(/\s+/g,"_").toLowerCase();
const inferIdType = (node) => (node?.data?.attrs||[]).find(a=>a.name?.toLowerCase()==="id")?.type || "Integer";
const midpoint = (a,b)=>({ x:((a?.position?.x??100)+(b?.position?.x??100))/2, y:((a?.position?.y??100)+(b?.position?.y??100))/2 });

const normalizeMult=(m)=>{ if(m==null)return"1"; const v=String(m).trim().replace(/\s/g,""); if(!v)return"1";
  if(["N","*","n"].includes(v))return"*"; if(v==="1..*"||v==="1.*"||/^\d+\.\.\*$/.test(v))return"1..*";
  if(v==="0..*"||v==="0.*")return"0..*"; if(v==="0..1"||v==="0.1")return"0..1"; if(v==="1")return"1"; return v; };
const decideRelType=(mA,mB)=>{ const A=normalizeMult(mA),B=normalizeMult(mB); const isMany=(x)=>x==="1..*"||x==="0..*"||x==="*";
  if(!isMany(A)&&!isMany(B))return"1-1"; if(!isMany(A)&&isMany(B))return"1-N"; if(isMany(A)&&!isMany(B))return"N-1";
  if(A==="0..1"&&!isMany(B))return"0-1"; if(!isMany(A)&&A==="1"&&B==="0..1")return"1-0"; if(A==="0..1"&&isMany(B))return"0-N";
  if(isMany(A)&&B==="0..1")return"N-0"; return"NM"; };

/* ---------- selector de puertos (8 handles) ---------- */
const PORTS = {
  "left-mid": { dir: [-1, 0] }, "right-mid": { dir: [1, 0] },
  "top-mid": { dir: [0, -1] }, "bottom-mid": { dir: [0, 1] },
  "top-left": { dir: [-1, -1] }, "top-right": { dir: [1, -1] },
  "bottom-left": { dir: [-1, 1] }, "bottom-right": { dir: [1, 1] },
};
const PORT_IDS = Object.keys(PORTS);
const usageCount = (nodeId, handleId, edges) =>
  edges.reduce((acc,e)=> acc + ((e.source===nodeId && e.sourceHandle===handleId)?1:0) + ((e.target===nodeId && e.targetHandle===handleId)?1:0), 0);
const pickHandle = (fromNode, toNode, edges) => {
  const fromCx=(fromNode?.position?.x??0)+120, fromCy=(fromNode?.position?.y??0)+60;
  const toCx=(toNode?.position?.x??0)+120, toCy=(toNode?.position?.y??0)+60;
  const dx=toCx-fromCx, dy=toCy-fromCy, len=Math.hypot(dx,dy)||1, vx=dx/len, vy=dy/len;
  const scored = PORT_IDS.map(id=>{ const [hx,hy]=PORTS[id].dir;
    const angleCost = 1 - (vx*hx + vy*hy) / Math.hypot(hx,hy);
    const usedTimes = usageCount(fromNode.id, id, edges);
    return { id, angleCost, usedTimes };
  });
  const free = scored.filter(s=>s.usedTimes===0).sort((a,b)=>a.angleCost-b.angleCost);
  if (free.length) return free[0].id;
  scored.sort((a,b)=>a.usedTimes-b.usedTimes || a.angleCost-b.angleCost);
  return scored[0].id;
};

const Diagramador = forwardRef(function Diagramador({ projectId, projectName, sock }, ref) {
  const iaRef = useRef(null);

  const nodeTypes = useMemo(()=>({ classNode: ClassNode }),[]);
  const edgeTypes = useMemo(()=>({ uml: UmlEdge }),[]);

=======
const Diagramador = forwardRef(function Diagramador(
  { projectId, projectName, sock },
  ref
) {
  // Estado base
>>>>>>> trabajo-temporal
  const [nodes, setNodes, rfOnNodesChange] = useNodesState([]);
  const [edges, setEdges, rfOnEdgesChange] = useEdgesState([]);

  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState("entidad");

<<<<<<< HEAD
  // STOMP/meta
  const clientIdRef = useRef(Math.random().toString(36).slice(2)+Date.now().toString(36));
  const versionRef = useRef(null);

  const topicUpdates = useMemo(()=>`/topic/projects/${projectId}`,[projectId]);
  const topicCursors = useMemo(()=>`/topic/projects/${projectId}/cursors`,[projectId]);
  const destUpdate   = useMemo(()=>`/app/projects/${projectId}/update`,[projectId]);
  const destCursor   = useMemo(()=>`/app/projects/${projectId}/cursor`,[projectId]);

  const lastSeqRef = useRef(new Map());
  const seqCounterRef = useRef(0);

  const publishSnapshot = useCallback(()=>{
    if (!sock) return;
    sock.send(destUpdate,{
      type:"diagram.snapshot",
      clientId: clientIdRef.current,
      baseVersion: versionRef.current,
      name: "Principal",
      nodes: JSON.stringify(nodes),
      edges: JSON.stringify(edges),
    });
  },[sock,nodes,edges,destUpdate]);

  const scheduleSnapshot = useMemo(()=>debounce(publishSnapshot,250),[publishSnapshot]);

  /* ---- carga inicial ---- */
  useEffect(()=>{
    if (!projectId) return;
    (async()=>{
      try{
        const d = await ProjectsApi.getDiagram(projectId);
        const n = d.nodes ? JSON.parse(d.nodes) : [];
        let e = d.edges ? JSON.parse(d.edges) : [];
        const nameToKind = { "Asociación":"ASSOC","Agregación":"AGGR","Composición":"COMP","Herencia":"INHERIT","Dependencia":"DEPEND" };
        e = e.map(edge => {
          const labelIsType = nameToKind[edge.label];
          if (labelIsType && !edge.data?.relKind) {
            return { ...edge, label: edge.data?.verb || "", data: { ...(edge.data||{}), relKind: labelIsType } };
          }
          return edge;
        });
        setNodes(n); setEdges(e);
        versionRef.current = d.version ?? null;
      }catch(err){ console.error("No se pudo cargar el diagrama", err); }
    })();
  },[projectId,setNodes,setEdges]);

  /* ---- guardar ---- */
  const persistNow = useCallback(async()=>{
    try{
      if(!projectId) return;
      await ProjectsApi.updateDiagram(projectId,{
        name:"Principal",
        nodes: JSON.stringify(nodes),
        edges: JSON.stringify(edges),
        viewport: null,
      });
      publishSnapshot();
      alert("✅ Diagrama guardado correctamente.");
    }catch(e){ console.error("Error guardando", e); alert("❌ Error guardando cambios en el diagrama."); }
  },[projectId,nodes,edges,publishSnapshot]);

  /* ---- entidades ---- */
  const addEntity = () => {
    const id = String(Date.now());
    setNodes(ns => ns.concat({
      id, type:"classNode",
      position:{ x:100+ns.length*40, y:100+ns.length*30 },
      data:{ label:`Entidad${ns.length+1}`, attrs:[] },
    }));
    setSelectedId(id);
    scheduleSnapshot();
  };
  const updateEntity = (id, updater) => {
    setNodes(ns => ns.map(n => n.id===id ? ({ ...n, data:{ ...n.data, ...updater(n.data) } }) : n));
    scheduleSnapshot();
  };
  const removeEntity = (id) => {
    setNodes(ns => ns.filter(n => n.id!==id));
    setEdges(es => es.filter(e => e.source!==id && e.target!==id));
    scheduleSnapshot();
  };

  /* ---- NM ---- */
  const addRelationNM = (aId,bId,joinNameOpt) => {
    const A = nodes.find(n=>n.id===aId), B = nodes.find(n=>n.id===bId);
    if (!A || !B) return;

    const joinName = (joinNameOpt && joinNameOpt.trim()) || `${toSnake(A.data?.label||A.id)}_${toSnake(B.data?.label||B.id)}`;
    const existent = nodes.find(n => (n.data?.label||"").toLowerCase()===joinName.toLowerCase());
    const joinId = existent?.id || "n"+Date.now();

    if (!existent) {
      const pos = midpoint(A,B);
      const tA = inferIdType(A), tB = inferIdType(B);
      setNodes(ns => ns.concat({
        id: joinId, type:"classNode", position:{ x:pos.x, y:pos.y },
        data:{ label:joinName, attrs:[
          { name:`${toSnake(A.data?.label||A.id)}_id`, type:tA },
          { name:`${toSnake(B.data?.label||B.id)}_id`, type:tB },
        ]},
      }));
    }

    setEdges(es =>
      es.filter(e => !((e.source===aId && e.target===bId) || (e.source===bId && e.target===aId)))
        .concat(
          {
            id:"e"+Date.now()+"-a",
            source:aId, target:joinId,
            sourceHandle:"right-mid", targetHandle:"left-mid",
            type:"uml", label:"",
            data:{ mA:"1..*", mB:"1", relType:"1-N", relKind:"ASSOC" },
            updatable:true,
          },
          {
            id:"e"+Date.now()+"-b",
            source:bId, target:joinId,
            sourceHandle:"right-mid", targetHandle:"left-mid",
            type:"uml", label:"",
            data:{ mA:"1..*", mB:"1", relType:"1-N", relKind:"ASSOC" },
            updatable:true,
          }
        )
    );
  };

  /* ---- crear relación simple ---- */
  const addEdgeSimple = (aId,bId,mA,mB,verb,meta={}) => {
    const relType = decideRelType(mA,mB);
    setEdges(es => {
      const A = nodes.find(n=>n.id===aId);
      const B = nodes.find(n=>n.id===bId);
      const sourceHandle = pickHandle(A,B,es);
      const targetHandle = pickHandle(B,A,es);
      const id = "e"+Date.now()+Math.random().toString(36).slice(2,6);
      return es.concat({
        id,
        source:aId, target:bId,
        sourceHandle, targetHandle,
        type:"uml", label: verb || "",
        data:{ mA:normalizeMult(mA), mB:normalizeMult(mB), verb:verb||"", relType, ...meta },
        updatable:true,   // 👈 habilita mover extremos
      });
    });
  };

  /* ---- ReactFlow handlers ---- */
  const onNodesChange = useCallback((changes)=>{
    for (const ch of changes) {
      if (ch.type==="position" && ch.dragging && ch.position) {
        // opcional: broadcast
      }
    }
    rfOnNodesChange(changes);
    const onlyDragMoves = changes.every(c => c.type==="position" && c.dragging);
    if (!onlyDragMoves) scheduleSnapshot();
  },[rfOnNodesChange,scheduleSnapshot]);

  const onEdgesChange = useCallback((changes)=>{
    rfOnEdgesChange(changes);
    scheduleSnapshot();
  },[rfOnEdgesChange,scheduleSnapshot]);

  // 👇 Permite “soltar” un extremo en otro handle u otra entidad
  const onEdgeUpdate = useCallback((oldEdge, newConn) => {
    setEdges((es) => {
      const nMap = new Map(nodes.map(n => [n.id, n]));
      const newSource = newConn.source ?? oldEdge.source;
      const newTarget = newConn.target ?? oldEdge.target;
      const A = nMap.get(newSource);
      const B = nMap.get(newTarget);

      // Si no viene el handle (soltaron en el body), escogemos uno libre
      const newSourceHandle = newConn.sourceHandle || (A && B ? pickHandle(A, B, es) : oldEdge.sourceHandle);
      const newTargetHandle = newConn.targetHandle || (A && B ? pickHandle(B, A, es) : oldEdge.targetHandle);

      return es.map(e =>
        e.id === oldEdge.id
          ? { ...e,
              source: newSource,
              target: newTarget,
              sourceHandle: newSourceHandle,
              targetHandle: newTargetHandle,
              updatable: true,
            }
          : e
      );
    });
    scheduleSnapshot();
  }, [nodes, scheduleSnapshot]);

  const onConnect = useCallback((params)=>{
    setEdges((eds)=>{
      const nMap = new Map(nodes.map(n=>[n.id,n]));
      const A = nMap.get(params.source);
      const B = nMap.get(params.target);
      const sourceHandle = params.sourceHandle || pickHandle(A,B,eds);
      const targetHandle = params.targetHandle || pickHandle(B,A,eds);
      return addEdge({
        ...params,
        sourceHandle, targetHandle,
        type:"uml",
        data:{ relKind:"ASSOC", mA:"1", mB:"1", verb:"" },
        label:"",
        updatable:true,   // 👈
      }, eds);
    });
    scheduleSnapshot();
  },[nodes,scheduleSnapshot]);

  /* ---- UI ---- */
  return (
    <div className="w-full h-[calc(100vh-56px)] md:grid md:grid-cols-[1fr_var(--sbw,320px)] overflow-hidden" style={{ "--sbw":"340px" }}>
      <div className="flex-1 h-full overflow-hidden bg-white">
        <DiagramCanvas
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onEdgeUpdate={onEdgeUpdate}   // 👈 importante
          onConnect={onConnect}
          onNodeClick={(_, node) => setSelectedId(node.id)}
        />
      </div>

      <SidebarDock
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        addEntity={addEntity}
        clearAll={() => { setNodes([]); setEdges([]); scheduleSnapshot(); }}
        persistNow={persistNow}
        handleGenerate={() => {}}
        openIA={() => iaRef.current?.open()}
      >
        {activeTab === "entidad" ? (
          <EntidadPanel
            node={nodes.find(n=>n.id===selectedId) || null}
            onChangeName={(name)=> updateEntity(selectedId, ()=>({ label:name })) }
            onNamePreview={(id,liveName)=> {
              setNodes(ns => ns.map(n => n.id===id ? { ...n, data:{ ...n.data, label: liveName } } : n));
            }}
            onAddAttr={(attr)=> updateEntity(selectedId, d => ({ attrs:[...(d.attrs||[]), attr] })) }
            onUpdateAttr={(index,value)=> updateEntity(selectedId, d => { const arr=[...(d.attrs||[])]; arr[index]=value; return { attrs:arr }; }) }
            onRemoveAttr={(index)=> updateEntity(selectedId, d => { const arr=[...(d.attrs||[])]; arr.splice(index,1); return { attrs:arr }; }) }
            onDelete={()=> removeEntity(selectedId)}
            onOpenIA={()=> iaRef.current?.open()}
          />
        ) : (
          <RelacionarPanel
            nodes={nodes}
            edges={edges}
            onRelacionSimple={({ sourceId, targetId, tipo, mA, mB, verb, meta }) => {
              setEdges((es) => {
                const A = nodes.find(n=>n.id===sourceId);
                const B = nodes.find(n=>n.id===targetId);
                const sourceHandle = pickHandle(A,B,es);
                const targetHandle = pickHandle(B,A,es);
                const id = "e"+Date.now();
                return es.concat({
                  id,
                  source: sourceId,
                  target: targetId,
                  sourceHandle,
                  targetHandle,
                  type:"uml",
                  label: verb || "",
                  data: { mA, mB, verb, relType: tipo, ...meta },
                  updatable: true,
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
                  const merged = { ...e, ...partial, data:{ ...e.data, ...partial.data }, updatable:true };
                  if (partial?.data?.verb !== undefined) merged.label = partial.data.verb || "";
                  return merged;
                })
              );
              scheduleSnapshot();
            }}
            onDeleteEdge={(edgeId) => { setEdges((es) => es.filter((e) => e.id !== edgeId)); scheduleSnapshot(); }}
            onOpenIA={() => iaRef.current?.open()}
          />
        )}
      </SidebarDock>

      {/* IA Controller */}
      <IAController
        ref={iaRef}
        nodes={nodes}
        setNodes={setNodes}
        edges={edges}
        setEdges={setEdges}
        scheduleSnapshot={scheduleSnapshot}
        addRelationNM={addRelationNM}
=======
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
  const { loading, saving, persistNow, exportJSON, exportPUML, importFromJSONText, importFromPUMLText } =
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
    <div className="w-full h-[calc(100vh-56px)] md:grid md:grid-cols-[1fr_420px] overflow-hidden relative">
      {(loading || saving) && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-50">
          <Spinner label={loading ? "Cargando diagrama..." : "Guardando cambios..."} />
        </div>
      )}
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
>>>>>>> trabajo-temporal
      />
    </div>
  );
});

export default Diagramador;
