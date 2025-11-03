// Hook IA: ahora entiende "add_attrs_smart" y reemplaza listas genéricas por nombres reales.

import { getDeltaFromUserText } from "../services/apiGemine";
import { buildPrompt2 } from "../generador/promt2";
import {
  ensureCoherentAttrs,
  normalizeEntityName,
  normalizeAttrName,
  normalizeType,
  normalizeMultiplicity,
  cohereRelation,
  joinNameFor,
  isSameEdge,
  smartSuggestAttrs
} from "./iaCoherencia";

const norm = (s="") => s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const isGeneric = (n="") => /^((atribu|propi|campo)[a-z]*)\d+$/i.test(n);

export default function useIA({ nodes, edges, setNodes, setEdges, scheduleSnapshot }) {
  const findByName = (name) => nodes.find(n => norm(n?.data?.label) === norm(name));

  const upsertEntity = (rawName, attrs=[]) => {
    const name = normalizeEntityName(rawName);
    const ex = findByName(name);
    const attrsFixed = ensureCoherentAttrs(attrs);
    if (ex) {
      const map = new Map((ex.data?.attrs || []).map(a => [norm(a.name), { ...a }]));
      for (const a of attrsFixed) {
        const k = norm(a.name);
        const incoming = { name: normalizeAttrName(a.name), type: normalizeType(a.type) };
        if (map.has(k)) map.set(k, { ...map.get(k), ...incoming });
        else map.set(k, incoming);
      }
      const merged = ensureCoherentAttrs(Array.from(map.values()));
      setNodes(ns => ns.map(n => n.id===ex.id ? { ...n, data:{ ...n.data, label:name, attrs: merged } } : n));
      return ex.id;
    }
    const id = "n" + Date.now() + Math.random().toString(36).slice(2, 6);
    const x = 120 + nodes.length * 40, y = 120 + nodes.length * 30;
    setNodes(ns => ns.concat({ id, type:"classNode", position:{x,y}, data:{ label:name, attrs: ensureCoherentAttrs(attrsFixed) }}));
    return id;
  };

  const setEntityAttrs = (rawName, attrs=[]) => {
    const name = normalizeEntityName(rawName);
    const ex = findByName(name); if (!ex) return;
    setNodes(ns => ns.map(n => n.id===ex.id ? { ...n, data:{ ...n.data, attrs: ensureCoherentAttrs(attrs) } } : n));
  };

  const removeAttr = (rawName, attrName) => {
    const name = normalizeEntityName(rawName);
    const ex = findByName(name); if (!ex) return;
    const out = (ex.data?.attrs || []).filter(a => norm(a.name) !== norm(attrName));
    setNodes(ns => ns.map(n => n.id===ex.id ? { ...n, data:{ ...n.data, attrs: ensureCoherentAttrs(out) } } : n));
  };

  const updateAttr = (rawName, oldName, next={}) => {
    const name = normalizeEntityName(rawName);
    const ex = findByName(name); if (!ex) return;
    const arr = (ex.data?.attrs || []).map(a => {
      if (norm(a.name) !== norm(oldName)) return a;
      const nn = next.name ? normalizeAttrName(next.name) : a.name;
      const tt = next.type ? normalizeType(next.type) : a.type;
      return { name: nn, type: tt };
    });
    setNodes(ns => ns.map(n => n.id===ex.id ? { ...n, data:{ ...n.data, attrs: ensureCoherentAttrs(arr) } } : n));
  };

  const edgeExists = (candidate) => edges.some(e => isSameEdge(e, candidate));
  const addEdgeCoherent = ({ aId, bId, data }) => {
    const candidate = { source:aId, target:bId, type:"uml", data:{ ...data } };
    if (edgeExists(candidate)) return;
    const id = "e" + Date.now() + Math.random().toString(36).slice(2,5);
    setEdges(es => es.concat({ id, ...candidate }));
  };

  const addRelationSimple = (A,B,opts={}) => {
    const coh = cohereRelation({ aName:A, bName:B, ...opts });
    const aId = upsertEntity(coh.aName);
    const bId = upsertEntity(coh.bName);
    addEdgeCoherent({
      aId, bId,
      data:{
        mA: normalizeMultiplicity(coh.mA),
        mB: normalizeMultiplicity(coh.mB),
        verb: coh.verb || "",
        relType: opts.relType,
        relKind: coh.relKind || "ASSOC",
        owning: coh.owning,
        direction: coh.direction
      }
    });
  };

  const addRelationNM = (A,B,joinNameOpt) => {
    const aId = upsertEntity(A), bId = upsertEntity(B);
    const aNode = nodes.find(n=>n.id===aId) || findByName(A);
    const bNode = nodes.find(n=>n.id===bId) || findByName(B);
    if(!aNode || !bNode) return;
    const joinName = joinNameOpt?.trim() || joinNameFor(aNode.data?.label, bNode.data?.label);
    const exist = findByName(joinName);
    const joinId = exist?.id || ("n"+Date.now());
    if(!exist){
      const pos = { x: (aNode.position?.x + bNode.position?.x)/2 || 180,
                    y: (aNode.position?.y + bNode.position?.y)/2 || 180 };
      setNodes(ns => ns.concat({
        id: joinId, type:"classNode", position:pos,
        data:{ label: normalizeEntityName(joinName),
          attrs: ensureCoherentAttrs([
            { name:`${normalizeAttrName(aNode.data?.label)}_id`, type:"Integer" },
            { name:`${normalizeAttrName(bNode.data?.label)}_id`, type:"Integer" },
          ])
        }
      }));
    }
    addEdgeCoherent({ aId, bId: joinId, data:{ mA:"1..*", mB:"1", relKind:"ASSOC", relType:"1-N" } });
    addEdgeCoherent({ aId: bId, bId: joinId, data:{ mA:"1..*", mB:"1", relKind:"ASSOC", relType:"1-N" } });
  };

  const removeRelationByNames = (A,B) => {
    const a = findByName(A), b = findByName(B);
    if(!a||!b) return;
    setEdges(es => es.filter(e => !((e.source===a.id && e.target===b.id) || (e.source===b.id && e.target===a.id))));
  };

  /* ---------- Coerción y “smart attrs” ---------- */
  function replaceGenericAttrs(entityName, attrs) {
    const list = Array.isArray(attrs) ? attrs : [];
    const onlyGeneric = list.filter(a => isGeneric(a?.name||"")).length >= Math.ceil(list.length*0.7);
    if (!onlyGeneric) return ensureCoherentAttrs(list);
    const wanted = list.length;
    const suggested = smartSuggestAttrs(entityName, wanted);
    return ensureCoherentAttrs(suggested);
  }

  function coerceActions(actions=[]) {
    return actions.map(act => {
      if (!act || !act.op) return act;
      if (act.name) act.name = normalizeEntityName(act.name);
      if (act.old)  act.old  = normalizeEntityName(act.old);
      if (act.a)    act.a    = normalizeEntityName(act.a);
      if (act.b)    act.b    = normalizeEntityName(act.b);
      if (act.entity) act.entity = normalizeEntityName(act.entity);

      switch (act.op) {
        case "add_entity":
        case "update_entity": {
          const list = Array.isArray(act.attrs) ? act.attrs : [];
          const clean = list.map(x => ({
            name: normalizeAttrName(x?.name || ""),
            type: normalizeType(x?.type || "String"),
          }));
          act.attrs = replaceGenericAttrs(act.name, clean);
          break;
        }
        case "add_attr":
        case "update_attr": {
          act.attr = act.attr || {};
          if (act.old) act.old = normalizeAttrName(act.old);
          if (act.name) act.name = normalizeAttrName(act.name);
          act.attr.name = normalizeAttrName(act.attr.name || "");
          act.attr.type = normalizeType(act.attr.type || "String");
          break;
        }
        case "add_relation": {
          act.relKind = (act.relKind || "ASSOC").toUpperCase();
          act.mA = normalizeMultiplicity(act.mA);
          act.mB = normalizeMultiplicity(act.mB);
          if (act.owning && !["A","B"].includes(act.owning)) act.owning = "A";
          if (act.direction && !["A->B","B->A","BIDI"].includes(act.direction)) act.direction = "A->B";
          break;
        }
        case "add_relation_nm":
        case "add_relation_associative": {
          if (!act.joinName && act.a && act.b) act.joinName = joinNameFor(act.a, act.b);
          break;
        }
        case "add_attrs_smart": {
          act.count = Math.max(1, parseInt(act.count||0, 10) || 1);
          break;
        }
        default: break;
      }
      return act;
    });
  }

  function recohereGraph() {
    setNodes(ns => ns.map(n => ({
      ...n,
      data:{
        ...n.data,
        label: normalizeEntityName(n.data?.label || ""),
        attrs: ensureCoherentAttrs(n.data?.attrs || [])
      }
    })));
  }

  async function handleIA(userText) {
    const current = {
      entities: nodes.map(n=>({ id:n.id, name:n.data?.label, attrs:n.data?.attrs||[] })),
      relations: edges.map(e=>({ aId:e.source, bId:e.target, data:e.data||{} })),
      joinTables: []
    };

    const delta = await getDeltaFromUserText({
      text:userText, promptBuilder: buildPrompt2, currentModel: current
    });

    const acts = coerceActions(Array.isArray(delta?.actions) ? delta.actions : []);
    for (const act of acts) {
      switch (act.op) {
        case "add_entity":
        case "update_entity":
          upsertEntity(act.name, act.attrs || []);
          break;
        case "rename_entity": {
          const ex = findByName(act.old);
          if (ex && act.name) {
            setNodes(ns => ns.map(n => n.id===ex.id ? { ...n, data:{ ...n.data, label: act.name } } : n));
          }
          break;
        }
        case "remove_entity": {
          const ex = findByName(act.name);
          if (ex) {
            setNodes(ns => ns.filter(n => n.id !== ex.id));
            setEdges(es => es.filter(e => e.source !== ex.id && e.target !== ex.id));
          }
          break;
        }
        case "add_attr":
          upsertEntity(act.entity, [act.attr]);
          break;
        case "remove_attr":
          removeAttr(act.entity, act.name);
          break;
        case "update_attr":
          updateAttr(act.entity, act.old, act.attr || {});
          break;
        case "clear_attrs":
          setEntityAttrs(act.entity, []);
          break;
        case "add_attrs_smart": {
          const exId = upsertEntity(act.entity, []);
          const ex = findByName(act.entity);
          const existing = (ex?.data?.attrs || []);
          const have = new Set(existing.map(a => norm(a.name)));
          const pool = smartSuggestAttrs(act.entity, act.count + 10);
          const toAdd = [];
          for (const a of pool) {
            if (have.has(norm(a.name))) continue;
            toAdd.push(a);
            if (toAdd.length >= act.count) break;
          }
          const final = ensureCoherentAttrs(existing.concat(toAdd));
          setNodes(ns => ns.map(n => n.id===exId ? { ...n, data:{ ...n.data, attrs: final } } : n));
          break;
        }
        case "add_relation": {
          const coh = cohereRelation({
            aName: act.a, bName: act.b, relKind: act.relKind || "ASSOC",
            mA: act.mA, mB: act.mB, verb: act.verb, owning: act.owning, direction: act.direction,
            relType: act.relType
          });
          addRelationSimple(coh.aName, coh.bName, coh);
          break;
        }
        case "remove_relation":
          removeRelationByNames(act.a, act.b);
          break;
        case "add_relation_nm":
        case "add_relation_associative":
          addRelationNM(act.a, act.b, act.joinName || act.name);
          break;
        default: break;
      }
    }

    recohereGraph();
    scheduleSnapshot();
    return true;
  }

  return { handleIA };
}
