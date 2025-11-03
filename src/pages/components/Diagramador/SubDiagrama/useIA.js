// src/views/proyectos/Diagramador/SubDiagrama/useIA.js
import { useMemo, useCallback } from "react";
import { buildPrompt2 } from "../generador/promt2";
import { getDeltaFromUserText } from "../services/iaDelta";
import {
  toSnake,
  inferIdType,
  midpoint,
  decideRelType,
  normalizeMult,
} from "./utils";

/**
 * Encapsula el modelo, acciones y la interacción con IA.
 * Devuelve handleIA y utilidades CRUD para entidades/relaciones.
 */
export default function useIA({
  nodes, edges, setNodes, setEdges, scheduleSnapshot,
}) {
  const findByName = useCallback(
    (name) =>
      nodes.find(n => (n.data?.label || "").toLowerCase() === String(name).toLowerCase()),
    [nodes]
  );

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

  const ensureEntity = useCallback((name, atts = []) => {
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
  }, [findByName, nodes.length, setNodes, scheduleSnapshot]);

  const addEdgeSimple = useCallback((aId, bId, mA, mB, verb) => {
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
  }, [setEdges]);

  const addRelationNM = useCallback((aId, bId, joinNameOpt) => {
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
  }, [nodes, setNodes, setEdges, findByName]);

  const removeRelationByNames = useCallback((aName, bName) => {
    const A = findByName(aName);
    const B = findByName(bName);
    if (!A || !B) return;
    setEdges(es => es.filter(e =>
      !((e.source === A.id && e.target === B.id) || (e.source === B.id && e.target === A.id))
    ));
  }, [findByName, setEdges]);

  const applyActions = useCallback((actions = []) => {
    for (const act of actions) {
      if (!act || !act.op) continue;

      if (act.op === "add_entity") ensureEntity(act.name, act.attrs || []);
      if (act.op === "update_entity") ensureEntity(act.name, act.attrs || []);
      if (act.op === "remove_entity") {
        const ex = findByName(act.name);
        if (ex) {
          setNodes(ns => ns.filter(n => n.id !== ex.id));
          setEdges(es => es.filter(e => e.source !== ex.id && e.target !== ex.id));
        }
      }
      if (act.op === "add_attr") ensureEntity(act.entity, [act.attr]);
      if (act.op === "rename_entity") {
        const ex = findByName(act.old);
        if (ex && act.name) {
          setNodes(ns => ns.map(n => n.id === ex.id ? { ...n, data: { ...n.data, label: act.name } } : n));
        }
      }
      if (act.op === "add_relation") {
        const aId = ensureEntity(act.a);
        const bId = ensureEntity(act.b);
        addEdgeSimple(aId, bId, act.mA || "1", act.mB || "1", act.verb || "");
      }
      if (act.op === "remove_relation") removeRelationByNames(act.a, act.b);
      if (act.op === "add_relation_nm") {
        const aId = ensureEntity(act.a);
        const bId = ensureEntity(act.b);
        addRelationNM(aId, bId, act.joinName);
      }
    }
    scheduleSnapshot?.();
  }, [ensureEntity, setNodes, setEdges, addEdgeSimple, addRelationNM, removeRelationByNames, scheduleSnapshot, findByName]);

  const handleIA = useCallback(async (userText) => {
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
    return true;
  }, [modelFromState, applyActions]);

  return {
    handleIA,
    applyActions,
    ensureEntity,
    addEdgeSimple,
    addRelationNM,
    removeRelationByNames,
  };
}
