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
  smartSuggestAttrs
} from "./iaCoherencia";
import { applyAutoLayout, optimizeEdgeCrossings } from "./autoLayout";

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
    
    // Inicializar usage para tracking de handles
    const initialUsage = {
      target: { tl:0, l1:0, l2:0, bl:0, t1:0, t2:0, t3:0, t4:0, tr:0, r1:0, r2:0, br:0 },
      source: { tl2:0, l3:0, l4:0, bl2:0, b1:0, b2:0, b3:0, b4:0, tr2:0, r3:0, r4:0, br2:0 }
    };
    
    setNodes(ns => ns.concat({ 
      id, 
      type:"classNode", 
      position:{x,y}, 
      data:{ 
        label:name, 
        attrs: ensureCoherentAttrs(attrsFixed),
        usage: initialUsage
      }
    }));
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

  // Función para encontrar el siguiente handle libre en el estado ACTUAL
  const findFreeHandle = (nodeId, type, currentNodes) => {
    const node = currentNodes.find(n => n.id === nodeId);
    if (!node) return type === "source" ? "b1" : "t1"; // Default
    
    const usage = node.data?.usage || { target: {}, source: {} };
    const handles = type === "source" 
      ? ["b1", "b2", "b3", "b4", "l3", "l4", "r3", "r4", "tl2", "tr2", "bl2", "br2"]
      : ["t1", "t2", "t3", "t4", "l1", "l2", "r1", "r2", "tl", "tr", "bl", "br"];
    
    // Buscar el handle menos usado
    let minUsage = Infinity;
    let bestHandle = handles[0];
    
    for (const h of handles) {
      const count = usage[type]?.[h] || 0;
      if (count < minUsage) {
        minUsage = count;
        bestHandle = h;
      }
    }
    
    return bestHandle;
  };

  const addRelationSimple = (A,B,opts={}) => {
    const coh = cohereRelation({ aName:A, bName:B, ...opts });
    
    // Usar setNodes para acceder al estado actual de nodos
    setNodes(currentNodes => {
      // Buscar las entidades en el estado ACTUAL
      const aNode = currentNodes.find(n => norm(n?.data?.label) === norm(coh.aName));
      const bNode = currentNodes.find(n => norm(n?.data?.label) === norm(coh.bName));
      
      if (!aNode || !bNode) {
        console.warn(`[useIA] No se puede crear relación: entidad no encontrada (${coh.aName} → ${coh.bName})`);
        console.log(`[useIA] Entidades disponibles:`, currentNodes.map(n => n.data?.label));
        return currentNodes; // No modificar nodos
      }
      
      // Verificar duplicados en el estado actual de edges
      setEdges(currentEdges => {
        const alreadyExists = currentEdges.some(e => {
          const sameDirection = e.source === aNode.id && e.target === bNode.id;
          const reverseDirection = e.source === bNode.id && e.target === aNode.id;
          return sameDirection || reverseDirection;
        });
        
        if (alreadyExists) {
          console.warn(`[useIA] Relación duplicada ignorada: ${coh.aName} ↔ ${coh.bName}`);
          return currentEdges; // No modificar edges
        }
        
        // Encontrar handles libres
        const sourceHandle = findFreeHandle(aNode.id, "source", currentNodes);
        const targetHandle = findFreeHandle(bNode.id, "target", currentNodes);
        
        const id = "e" + Date.now() + Math.random().toString(36).slice(2,5);
        const newEdge = {
          id,
          source: aNode.id,
          target: bNode.id,
          sourceHandle,
          targetHandle,
          type: "uml",
          data: {
            mA: normalizeMultiplicity(coh.mA),
            mB: normalizeMultiplicity(coh.mB),
            verb: coh.verb || "",
            relType: opts.relType,
            relKind: coh.relKind || "ASSOC",
            owning: coh.owning,
            direction: coh.direction
          }
        };
        
        console.log(`[useIA] ✓ Relación creada: ${coh.aName} → ${coh.bName}`);
        return currentEdges.concat(newEdge);
      });
      
      // Actualizar contadores de uso de handles
      return currentNodes.map(n => {
        if (n.id === aNode.id) {
          const usage = n.data?.usage || { target: {}, source: {} };
          const sourceHandle = findFreeHandle(aNode.id, "source", currentNodes);
          return {
            ...n,
            data: {
              ...n.data,
              usage: {
                ...usage,
                source: {
                  ...usage.source,
                  [sourceHandle]: (usage.source?.[sourceHandle] || 0) + 1
                }
              }
            }
          };
        } else if (n.id === bNode.id) {
          const usage = n.data?.usage || { target: {}, source: {} };
          const targetHandle = findFreeHandle(bNode.id, "target", currentNodes);
          return {
            ...n,
            data: {
              ...n.data,
              usage: {
                ...usage,
                target: {
                  ...usage.target,
                  [targetHandle]: (usage.target?.[targetHandle] || 0) + 1
                }
              }
            }
          };
        }
        return n;
      });
    });
  };

  const addRelationNM = (A,B,joinNameOpt) => {
    // Usar setNodes para acceder al estado actual
    setNodes(currentNodes => {
      // Buscar las entidades A y B en el estado ACTUAL
      const aNode = currentNodes.find(n => norm(n?.data?.label) === norm(A));
      const bNode = currentNodes.find(n => norm(n?.data?.label) === norm(B));
      
      if(!aNode || !bNode) {
        console.warn(`[useIA] No se puede crear relación N-M: entidad no encontrada (${A} ↔ ${B})`);
        console.log(`[useIA] Entidades disponibles:`, currentNodes.map(n => n.data?.label));
        return currentNodes;
      }
      
      const joinName = joinNameOpt?.trim() || joinNameFor(aNode.data?.label, bNode.data?.label);
      const exist = currentNodes.find(n => norm(n?.data?.label) === norm(joinName));
      const joinId = exist?.id || ("n"+Date.now());
      
      if(!exist){
        const pos = { x: (aNode.position?.x + bNode.position?.x)/2 || 180,
                      y: (aNode.position?.y + bNode.position?.y)/2 || 180 };
        
        // Inicializar usage para la tabla intermedia
        const initialUsage = {
          target: { tl:0, l1:0, l2:0, bl:0, t1:0, t2:0, t3:0, t4:0, tr:0, r1:0, r2:0, br:0 },
          source: { tl2:0, l3:0, l4:0, bl2:0, b1:0, b2:0, b3:0, b4:0, tr2:0, r3:0, r4:0, br2:0 }
        };
        
        // Crear la tabla intermedia
        const newNode = {
          id: joinId, type:"classNode", position:pos,
          data:{ label: normalizeEntityName(joinName),
            attrs: ensureCoherentAttrs([
              { name:`${normalizeAttrName(aNode.data?.label)}_id`, type:"Integer" },
              { name:`${normalizeAttrName(bNode.data?.label)}_id`, type:"Integer" },
            ]),
            usage: initialUsage
          }
        };
        
        // Crear las relaciones usando setEdges con estado fresco
        setEdges(currentEdges => {
          const existsAJ = currentEdges.some(e => 
            (e.source === aNode.id && e.target === joinId) ||
            (e.source === joinId && e.target === aNode.id)
          );
          
          if (existsAJ) {
            console.log('[useIA] Relación N-M duplicada (A→Join):', aNode.data.label, '→', joinName);
            return currentEdges;
          }

          const handleA = findFreeHandle(aNode, 'source');
          const handleJ1 = findFreeHandle(newNode, 'target');

          const edgeAJ = {
            id: `e${aNode.id}-${joinId}`,
            source: aNode.id,
            target: joinId,
            sourceHandle: handleA,
            targetHandle: handleJ1,
            label: '1..*',
            type: 'custom',
            data: { mA:"1..*", mB:"1", relKind:"ASSOC", relType:"1-N" }
          };

          // Actualizar usage
          setNodes(updatedNodes => 
            updatedNodes.map(n => {
              if (n.id === aNode.id) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    usage: {
                      ...n.data.usage,
                      source: { ...n.data.usage.source, [handleA]: (n.data.usage.source[handleA] || 0) + 1 }
                    }
                  }
                };
              }
              if (n.id === joinId) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    usage: {
                      ...n.data.usage,
                      target: { ...n.data.usage.target, [handleJ1]: (n.data.usage.target[handleJ1] || 0) + 1 }
                    }
                  }
                };
              }
              return n;
            })
          );

          return currentEdges.concat(edgeAJ);
        });

        setEdges(currentEdges => {
          const existsBJ = currentEdges.some(e => 
            (e.source === bNode.id && e.target === joinId) ||
            (e.source === joinId && e.target === bNode.id)
          );
          
          if (existsBJ) {
            console.log('[useIA] Relación N-M duplicada (B→Join):', bNode.data.label, '→', joinName);
            return currentEdges;
          }

          const handleB = findFreeHandle(bNode, 'source');
          const handleJ2 = findFreeHandle(newNode, 'target');

          const edgeBJ = {
            id: `e${bNode.id}-${joinId}`,
            source: bNode.id,
            target: joinId,
            sourceHandle: handleB,
            targetHandle: handleJ2,
            label: '1..*',
            type: 'custom',
            data: { mA:"1..*", mB:"1", relKind:"ASSOC", relType:"1-N" }
          };

          // Actualizar usage
          setNodes(updatedNodes => 
            updatedNodes.map(n => {
              if (n.id === bNode.id) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    usage: {
                      ...n.data.usage,
                      source: { ...n.data.usage.source, [handleB]: (n.data.usage.source[handleB] || 0) + 1 }
                    }
                  }
                };
              }
              if (n.id === joinId) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    usage: {
                      ...n.data.usage,
                      target: { ...n.data.usage.target, [handleJ2]: (n.data.usage.target[handleJ2] || 0) + 1 }
                    }
                  }
                };
              }
              return n;
            })
          );

          return currentEdges.concat(edgeBJ);
        });
        
        return currentNodes.concat(newNode);
      }
      
      // Si ya existe, solo crear las relaciones con detección de duplicados
      setEdges(currentEdges => {
        const existsAJ = currentEdges.some(e => 
          (e.source === aNode.id && e.target === joinId) ||
          (e.source === joinId && e.target === aNode.id)
        );
        
        if (existsAJ) {
          console.log('[useIA] Relación N-M duplicada (A→Join existente):', aNode.data.label, '→', joinName);
          return currentEdges;
        }

        const handleA = findFreeHandle(aNode, 'source');
        const joinNode = currentNodes.find(n => n.id === joinId);
        const handleJ1 = findFreeHandle(joinNode, 'target');

        const edgeAJ = {
          id: `e${aNode.id}-${joinId}`,
          source: aNode.id,
          target: joinId,
          sourceHandle: handleA,
          targetHandle: handleJ1,
          label: '1..*',
          type: 'custom',
          data: { mA:"1..*", mB:"1", relKind:"ASSOC", relType:"1-N" }
        };

        setNodes(updatedNodes => 
          updatedNodes.map(n => {
            if (n.id === aNode.id) {
              return {
                ...n,
                data: {
                  ...n.data,
                  usage: {
                    ...n.data.usage,
                    source: { ...n.data.usage.source, [handleA]: (n.data.usage.source[handleA] || 0) + 1 }
                  }
                }
              };
            }
            if (n.id === joinId) {
              return {
                ...n,
                data: {
                  ...n.data,
                  usage: {
                    ...n.data.usage,
                    target: { ...n.data.usage.target, [handleJ1]: (n.data.usage.target[handleJ1] || 0) + 1 }
                  }
                }
              };
            }
            return n;
          })
        );

        return currentEdges.concat(edgeAJ);
      });

      setEdges(currentEdges => {
        const existsBJ = currentEdges.some(e => 
          (e.source === bNode.id && e.target === joinId) ||
          (e.source === joinId && e.target === bNode.id)
        );
        
        if (existsBJ) {
          console.log('[useIA] Relación N-M duplicada (B→Join existente):', bNode.data.label, '→', joinName);
          return currentEdges;
        }

        const handleB = findFreeHandle(bNode, 'source');
        const joinNode = currentNodes.find(n => n.id === joinId);
        const handleJ2 = findFreeHandle(joinNode, 'target');

        const edgeBJ = {
          id: `e${bNode.id}-${joinId}`,
          source: bNode.id,
          target: joinId,
          sourceHandle: handleB,
          targetHandle: handleJ2,
          label: '1..*',
          type: 'custom',
          data: { mA:"1..*", mB:"1", relKind:"ASSOC", relType:"1-N" }
        };

        setNodes(updatedNodes => 
          updatedNodes.map(n => {
            if (n.id === bNode.id) {
              return {
                ...n,
                data: {
                  ...n.data,
                  usage: {
                    ...n.data.usage,
                    source: { ...n.data.usage.source, [handleB]: (n.data.usage.source[handleB] || 0) + 1 }
                  }
                }
              };
            }
            if (n.id === joinId) {
              return {
                ...n,
                data: {
                  ...n.data,
                  usage: {
                    ...n.data.usage,
                    target: { ...n.data.usage.target, [handleJ2]: (n.data.usage.target[handleJ2] || 0) + 1 }
                  }
                }
              };
            }
            return n;
          })
        );

        return currentEdges.concat(edgeBJ);
      });
      
      return currentNodes;
    });
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
    
    // Contador de entidades nuevas y set para evitar duplicados
    let newEntitiesCount = 0;
    const processedEntities = new Set();
    
    // FASE 1: Procesar todas las acciones de entidades PRIMERO
    // Esto asegura que todas las entidades existan antes de crear relaciones
    for (const act of acts) {
      switch (act.op) {
        case "add_entity":
        case "update_entity": {
          // Evitar duplicados - procesar cada entidad solo una vez
          const normalizedName = normalizeEntityName(act.name);
          if (processedEntities.has(normalizedName)) {
            console.warn(`[useIA] Entidad duplicada ignorada: ${act.name}`);
            break;
          }
          processedEntities.add(normalizedName);
          
          const existed = !!findByName(act.name);
          upsertEntity(act.name, act.attrs || []);
          if (!existed) newEntitiesCount++;
          break;
        }
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
        case "add_relation_nm":
        case "add_relation_associative":
          // Crear la tabla intermedia primero (es una entidad)
          addRelationNM(act.a, act.b, act.joinName || act.name);
          newEntitiesCount++;
          break;
        default: break;
      }
    }
    
    // FASE 2: Procesar relaciones DESPUÉS de que React actualice el estado
    // Delay necesario para que findByName pueda encontrar las entidades recién creadas
    setTimeout(() => {
      console.log(`[useIA] FASE 2: Procesando relaciones...`);
      
      // Set para rastrear relaciones ya procesadas en este batch
      const processedRelations = new Set();
      
      // Función para crear una clave única de relación (bidireccional)
      const getRelationKey = (a, b) => {
        const sorted = [a, b].sort();
        return `${sorted[0]}|${sorted[1]}`;
      };
      
      // Ahora procesar todas las relaciones
      // En esta fase, todas las entidades ya existen en el estado actualizado
      for (const act of acts) {
        if (act.op === "add_relation") {
          // Verificar si ya procesamos esta relación en este batch
          const relKey = getRelationKey(act.a, act.b);
          if (processedRelations.has(relKey)) {
            console.warn(`[useIA] Relación duplicada en batch ignorada: ${act.a} ↔ ${act.b}`);
            continue;
          }
          
          console.log(`[useIA] Creando relación: ${act.a} → ${act.b}`);
          processedRelations.add(relKey);
          
          const coh = cohereRelation({
            aName: act.a, bName: act.b, relKind: act.relKind || "ASSOC",
            mA: act.mA, mB: act.mB, verb: act.verb, owning: act.owning, direction: act.direction,
            relType: act.relType
          });
          addRelationSimple(coh.aName, coh.bName, coh);
        } else if (act.op === "remove_relation") {
          removeRelationByNames(act.a, act.b);
        }
      }

      recohereGraph();
      
      // Aplicar auto-layout si se crearon 2 o más entidades nuevas (diagrama completo)
      // Esto organiza automáticamente el diagrama de forma profesional
      if (newEntitiesCount >= 2) {
        console.log(`[useIA] Aplicando auto-layout para ${newEntitiesCount} entidades nuevas`);
        
        // Pequeño delay adicional para que React actualice los edges también
        setTimeout(() => {
          setNodes(currentNodes => {
            setEdges(currentEdges => currentEdges); // Trigger para actualizar edges
            
            // Aplicar layout con los edges actualizados
            const layouted = applyAutoLayout(currentNodes, edges);
            const optimized = optimizeEdgeCrossings(layouted);
            return optimized;
          });
        }, 150);
      }
      
      scheduleSnapshot();
    }, 100); // Delay de 100ms para permitir que React actualice el estado de nodes
    
    return true;
  }

  return { handleIA };
}
