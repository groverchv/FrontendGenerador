import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import Iaclase from "../components/Entidad/iaclase";
import { buildPrompt2 } from "../generador/promt2";
import { getDeltaFromUserText } from "../services/iaDelta";

/* ====== utilidades mínimas inline ====== */
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

/* ====== mismo selector de puertos que en Diagramador ====== */
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
    const angleCost = 1 - (vx * hx + vy * hy) / Math.hypot(hx, hy);
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
/* =========================================================== */

const IAController = forwardRef(function IAController(
  { nodes, setNodes, edges, setEdges, scheduleSnapshot, addRelationNM },
  ref
) {
  const [open, setOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
    close: () => setOpen(false),
  }));

  const ensureEntity = useCallback(
    (name, atts = []) => {
      const ex = nodes.find(
        (n) => (n.data?.label || "").toLowerCase() === String(name).toLowerCase()
      );
      if (ex) {
        if (atts?.length) {
          setNodes((ns) =>
            ns.map((n) => {
              if (n.id !== ex.id) return n;
              const map = new Map(
                (n.data?.attrs || []).map((a) => [a.name.toLowerCase(), a])
              );
              for (const a of atts) {
                if (!a?.name) continue;
                const k = a.name.toLowerCase();
                if (map.has(k))
                  map.set(k, { ...map.get(k), type: a.type || map.get(k).type });
                else map.set(k, { name: a.name, type: a.type || "String" });
              }
              return { ...n, data: { ...n.data, attrs: Array.from(map.values()) } };
            })
          );
          scheduleSnapshot();
        }
        return ex.id;
      }
      const id = "n" + Date.now() + Math.random().toString(36).slice(2, 6);
      const x = 120 + nodes.length * 40;
      const y = 120 + nodes.length * 30;
      setNodes((ns) =>
        ns.concat({
          id,
          type: "classNode",
          position: { x, y },
          data: { label: name, attrs: atts || [] },
        })
      );
      scheduleSnapshot();
      return id;
    },
    [nodes, setNodes, scheduleSnapshot]
  );

  // usa pickHandle para asignar puertos libres
  const addEdgeSimple = useCallback(
    (aId, bId, mA, mB, verb, meta = {}) => {
      const relKind = meta.relKind || "ASSOC";
      
      // Herencia y Dependencia NO usan multiplicidades
      const needsMultiplicity = relKind !== "INHERIT" && relKind !== "DEPEND";
      const relType = needsMultiplicity ? decideRelType(mA, mB) : undefined;
      
      // Usar setEdges con callback para tener acceso al estado actual de edges
      setEdges((currentEdges) => {
        // Usar setNodes callback para obtener nodos actualizados
        let sourceHandle, targetHandle;
        
        setNodes((currentNodes) => {
          const A = currentNodes.find((n) => n.id === aId);
          const B = currentNodes.find((n) => n.id === bId);
          
          // Validar que ambos nodos existan antes de crear la relación
          if (!A || !B) {
            console.error("⚠️ No se puede crear relación: nodo no encontrado", { 
              aId, 
              bId, 
              encontrados: { A: !!A, B: !!B }
            });
            return currentNodes; // Sin cambios en nodos
          }
          
          sourceHandle = pickHandle(A, B, currentEdges);
          targetHandle = pickHandle(B, A, currentEdges);
          
          return currentNodes; // Sin cambios en nodos
        });
        
        // Si no se pudieron determinar los handles, no crear la relación
        if (!sourceHandle || !targetHandle) {
          console.error("⚠️ No se pudieron determinar handles para la relación");
          return currentEdges;
        }
        
        const id = "e" + Date.now() + Math.random().toString(36).slice(2, 6);
        
        const edgeData = {
          verb: verb || "",
          relKind, // ✅ Asegurar que relKind siempre esté presente
          direction: meta.direction || "A->B",
          ...meta,
        };
        
        // Solo agregar multiplicidades si el tipo de relación las soporta
        if (needsMultiplicity) {
          edgeData.mA = normalizeMult(mA);
          edgeData.mB = normalizeMult(mB);
          edgeData.relType = relType;
        }
        
        console.log("✅ Relación creada:", { 
          id, 
          tipo: relKind,
          desde: aId,
          hasta: bId
        });
        
        const newEdge = {
          id,
          source: aId,
          target: bId,
          sourceHandle,
          targetHandle,
          type: "uml",
          label: verb || "",
          data: edgeData,
        };
        
        return currentEdges.concat(newEdge);
      });
      
      // Hacer snapshot después de crear la relación
      scheduleSnapshot();
    },
    [setEdges, setNodes, scheduleSnapshot]
  );

  const removeRelationByNames = useCallback(
    (aName, bName) => {
      const A = nodes.find(
        (n) => (n.data?.label || "").toLowerCase() === aName.toLowerCase()
      );
      const B = nodes.find(
        (n) => (n.data?.label || "").toLowerCase() === bName.toLowerCase()
      );
      if (!A || !B) return;
      setEdges((es) =>
        es.filter(
          (e) =>
            !(
              (e.source === A.id && e.target === B.id) ||
              (e.source === B.id && e.target === A.id)
            )
        )
      );
    },
    [nodes, setEdges]
  );

  const modelFromState = useCallback(() => {
    const entities = nodes.map((n) => ({
      id: n.id,
      name: n.data?.label || n.id,
      attrs: n.data?.attrs || [],
    }));
    const relations = edges.map((e) => ({
      aId: e.source,
      bId: e.target,
      aName: nodes.find((n) => n.id === e.source)?.data?.label || e.source,
      bName: nodes.find((n) => n.id === e.target)?.data?.label || e.target,
      mA: e.data?.mA,
      mB: e.data?.mB,
      verb: e.data?.verb || "",
      relType: e.data?.relType || "",
      relKind: e.data?.relKind || "ASSOC",
    }));
    return { entities, relations, joinTables: [] };
  }, [nodes, edges]);

  const applyActions = useCallback(
    (actions = []) => {
      if (!Array.isArray(actions) || actions.length === 0) return;
      
      // 🔹 FASE 1: Separar operaciones por tipo
      const entityOps = actions.filter(act => 
        act?.op && ['add_entity', 'update_entity', 'add_attr', 'rename_entity'].includes(act.op)
      );
      
      const removeEntityOps = actions.filter(act => act?.op === 'remove_entity');
      
      const relationOps = actions.filter(act => 
        act?.op && ['add_relation', 'remove_relation', 'add_relation_nm'].includes(act.op)
      );
      
      console.log("📊 IA: Procesando", {
        entidades: entityOps.length,
        relaciones: relationOps.length
      });
      
      // Crear/actualizar entidades primero (SINCRONO)
      for (const act of entityOps) {
        if (act.op === "add_entity") ensureEntity(act.name, act.attrs || []);
        if (act.op === "update_entity") ensureEntity(act.name, act.attrs || []);
        if (act.op === "add_attr") ensureEntity(act.entity, [act.attr]);
        if (act.op === "rename_entity") {
          const ex = nodes.find(
            (n) =>
              (n.data?.label || "").toLowerCase() ===
              String(act.old).toLowerCase()
          );
          if (ex && act.name) {
            setNodes((ns) =>
              ns.map((n) =>
                n.id === ex.id ? { ...n, data: { ...n.data, label: act.name } } : n
              )
            );
          }
        }
      }
      
      // 🔹 FASE 2: Procesar relaciones usando setNodes callback para asegurar nodos actualizados
      setNodes((currentNodes) => {
        // Procesar relaciones con los nodos actualizados
        for (const act of relationOps) {
          if (act.op === "add_relation") {
            // Buscar nodos en el estado actualizado
            const nodeA = currentNodes.find(
              (n) => (n.data?.label || "").toLowerCase() === String(act.a).toLowerCase()
            );
            const nodeB = currentNodes.find(
              (n) => (n.data?.label || "").toLowerCase() === String(act.b).toLowerCase()
            );
            
            if (!nodeA || !nodeB) {
              console.error("⚠️ Entidades no encontradas:", { 
                buscando: { a: act.a, b: act.b },
                encontrados: { a: !!nodeA, b: !!nodeB }
              });
              continue;
            }
            
            const relKind = act.relKind || "ASSOC";
            
            console.log("🔗 Creando relación:", { 
              tipo: relKind,
              desde: nodeA.data.label,
              hasta: nodeB.data.label
            });
            
            // Construir metadata según el tipo de relación
            const meta = {
              relKind,
              direction: act.direction || "A->B",
            };
            
            // Solo agregar owning si es Agregación o Composición
            if (relKind === "AGGR" || relKind === "COMP") {
              meta.owning = act.owning || "A";
            }
            
            // Herencia y Dependencia no usan multiplicidades
            const mA = (relKind === "INHERIT" || relKind === "DEPEND") ? undefined : (act.mA || "1");
            const mB = (relKind === "INHERIT" || relKind === "DEPEND") ? undefined : (act.mB || "1");
            
            addEdgeSimple(nodeA.id, nodeB.id, mA, mB, act.verb || "", meta);
          }
          if (act.op === "remove_relation") removeRelationByNames(act.a, act.b);
          if (act.op === "add_relation_nm") {
            const nodeA = currentNodes.find(
              (n) => (n.data?.label || "").toLowerCase() === String(act.a).toLowerCase()
            );
            const nodeB = currentNodes.find(
              (n) => (n.data?.label || "").toLowerCase() === String(act.b).toLowerCase()
            );
            if (nodeA && nodeB) {
              addRelationNM(nodeA.id, nodeB.id, act.joinName);
            }
          }
        }
        
        // Retornar los nodos sin cambios (solo usamos esto para leer el estado actualizado)
        return currentNodes;
      });
      
      // 🔹 FASE 3: Eliminar entidades al final
      for (const act of removeEntityOps) {
        const ex = nodes.find(
          (n) =>
            (n.data?.label || "").toLowerCase() ===
            String(act.name).toLowerCase()
        );
        if (ex) {
          setNodes((ns) => ns.filter((n) => n.id !== ex.id));
          setEdges((es) => es.filter((e) => e.source !== ex.id && e.target !== ex.id));
        }
      }
      
      // Snapshot después de todo
      setTimeout(() => scheduleSnapshot(), 150);
    },
    [nodes, ensureEntity, addEdgeSimple, removeRelationByNames, addRelationNM, scheduleSnapshot, setNodes, setEdges]
  );

  const handleIA = useCallback(
    async (userText) => {
      try {
        const current = modelFromState();
        const delta = await getDeltaFromUserText({
          text: userText,
          promptBuilder: buildPrompt2,
          currentModel: current,
        });
        if (!delta || !Array.isArray(delta.actions)) {
          alert("La IA no devolvió acciones válidas.");
          return false;
        }
        applyActions(delta.actions);
        setOpen(false);
        return true;
      } catch (err) {
        console.error("IA error:", err);
        alert("Error interpretando instrucciones: " + (err?.message || ""));
        return false;
      }
    },
    [modelFromState, applyActions]
  );

  return (
    <Iaclase open={open} onClose={() => setOpen(false)} onSubmit={handleIA} />
  );
});

export default IAController;
