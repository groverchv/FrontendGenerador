// Hook IA: ahora entiende "add_attrs_smart" y reemplaza listas genéricas por nombres reales.

import { getDeltaFromUserText } from "../services/apiGemine";
import { buildPrompt2 } from "../components/AsistenteIA/ReglasPromt";
import {
  cohereRelation,
  ensureCoherentAttrs,
  joinNameFor,
  normalizeAttrName,
  normalizeEntityName,
  normalizeMultiplicity,
  normalizeType,
  smartSuggestAttrs,
} from "./iaCoherencia";
import { applyAutoLayout, optimizeEdgeCrossings } from "./autoLayout";
import { SOURCE_HANDLES, TARGET_HANDLES } from "../../../../constants";

const REL_KIND_ALIASES = new Map([
  // Valores canónicos (identidad)
  ["ASSOC", "ASSOC"],
  ["AGGR", "AGGR"],
  ["COMP", "COMP"],
  ["INHERIT", "INHERIT"],
  ["DEPEND", "DEPEND"],
  // Aliases para ASSOC
  ["ASSOCIATION", "ASSOC"],
  ["ASOCIACION", "ASSOC"],
  ["RELACION", "ASSOC"],
  ["RELATION", "ASSOC"],
  // Aliases para AGGR
  ["AGGREGATION", "AGGR"],
  ["AGREGACION", "AGGR"],
  ["AGREGATE", "AGGR"],
  ["AGREGADO", "AGGR"],
  // Aliases para COMP
  ["COMPOSITION", "COMP"],
  ["COMPOSICION", "COMP"],
  ["COMPOSITE", "COMP"],
  // Aliases para INHERIT
  ["INHERITANCE", "INHERIT"],
  ["HERENCIA", "INHERIT"],
  ["GENERALIZACION", "INHERIT"],
  ["GENERALIZATION", "INHERIT"],
  // Aliases para DEPEND
  ["DEPENDENCY", "DEPEND"],
  ["DEPENDENCIA", "DEPEND"],
]);

const normalizeRelKind = (raw) => {
  if (!raw) return "ASSOC";
  const base = String(raw).trim().toUpperCase();
  const ascii = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return REL_KIND_ALIASES.get(base) || REL_KIND_ALIASES.get(ascii) || "ASSOC";
};
const norm = (s = "") => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, "");
const isGeneric = (n = "") => /^((atribu|propi|campo)[a-z]*)\d+$/i.test(n);

// Función mejorada para buscar entidad por nombre flexible
// Acepta "clase 1", "Clase1", "class1", "Class1" y encuentra la entidad correcta
const findNodeByFlexibleName = (nodes, searchName) => {
  const normalizedSearch = norm(searchName);

  // 1. Búsqueda exacta normalizada
  let found = nodes.find(n => norm(n?.data?.label) === normalizedSearch);
  if (found) return found;

  // 2. Normalizar "clase 1" a "clase1" y buscar
  const withoutSpaces = normalizedSearch.replace(/\s+/g, "");
  found = nodes.find(n => norm(n?.data?.label).replace(/\s+/g, "") === withoutSpaces);
  if (found) return found;

  // 3. Buscar ignorando prefijos comunes (class, clase, entity, entidad)
  const withoutPrefix = normalizedSearch.replace(/^(class|clase|entity|entidad)/i, "").trim();
  if (withoutPrefix) {
    found = nodes.find(n => {
      const label = norm(n?.data?.label).replace(/^(class|clase|entity|entidad)/i, "").trim();
      return label === withoutPrefix || label.replace(/\s+/g, "") === withoutPrefix.replace(/\s+/g, "");
    });
  }

  return found;
};

export default function useIA({ nodes, edges, setNodes, setEdges, scheduleSnapshot }) {
  const findByName = (name) => findNodeByFlexibleName(nodes, name);

  const upsertEntity = (rawName, attrs = []) => {
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
      setNodes(ns => ns.map(n => n.id === ex.id ? { ...n, data: { ...n.data, label: name, attrs: merged } } : n));
      return ex.id;
    }
    const id = "n" + Date.now() + Math.random().toString(36).slice(2, 6);
    const x = 120 + nodes.length * 40, y = 120 + nodes.length * 30;

    // Inicializar usage para tracking de handles
    const initialUsage = {
      target: Object.fromEntries(TARGET_HANDLES.map(h => [h, 0])),
      source: Object.fromEntries(SOURCE_HANDLES.map(h => [h, 0])),
    };

    setNodes(ns => ns.concat({
      id,
      type: "classNode",
      position: { x, y },
      data: {
        label: name,
        attrs: ensureCoherentAttrs(attrsFixed),
        usage: initialUsage
      }
    }));
    return id;
  };

  const setEntityAttrs = (rawName, attrs = []) => {
    const name = normalizeEntityName(rawName);
    const ex = findByName(name); if (!ex) return;
    setNodes(ns => ns.map(n => n.id === ex.id ? { ...n, data: { ...n.data, attrs: ensureCoherentAttrs(attrs) } } : n));
  };

  const removeAttr = (rawName, attrName) => {
    const name = normalizeEntityName(rawName);
    const ex = findByName(name); if (!ex) return;
    const out = (ex.data?.attrs || []).filter(a => norm(a.name) !== norm(attrName));
    setNodes(ns => ns.map(n => n.id === ex.id ? { ...n, data: { ...n.data, attrs: ensureCoherentAttrs(out) } } : n));
  };

  const updateAttr = (rawName, oldName, next = {}) => {
    const name = normalizeEntityName(rawName);
    const ex = findByName(name); if (!ex) return;
    const arr = (ex.data?.attrs || []).map(a => {
      if (norm(a.name) !== norm(oldName)) return a;
      const nn = next.name ? normalizeAttrName(next.name) : a.name;
      const tt = next.type ? normalizeType(next.type) : a.type;
      return { name: nn, type: tt };
    });
    setNodes(ns => ns.map(n => n.id === ex.id ? { ...n, data: { ...n.data, attrs: ensureCoherentAttrs(arr) } } : n));
  };

  // Función para encontrar el siguiente handle libre en el estado ACTUAL
  const findFreeHandle = (nodeRef, type, nodesSnapshot = []) => {
    const handlePool = type === "source" ? SOURCE_HANDLES : TARGET_HANDLES;
    if (!nodeRef) return handlePool[0];

    const node =
      typeof nodeRef === "string"
        ? nodesSnapshot.find(n => n.id === nodeRef)
        : nodeRef;

    if (!node) return handlePool[0];

    const usageBucket =
      (node.data?.usage && (type === "source" ? node.data.usage.source : node.data.usage.target)) || {};

    let bestHandle = handlePool[0];
    let minUsage = Number.POSITIVE_INFINITY;

    for (const handle of handlePool) {
      const count = usageBucket[handle] || 0;
      if (count < minUsage) {
        minUsage = count;
        bestHandle = handle;
      }
    }

    return bestHandle;
  };

  const addRelationSimple = (A, B, opts = {}) => {
    // DEBUG: Log los valores entrantes para verificar relKind
    console.log(`[addRelationSimple] A="${A}", B="${B}", opts.relKind="${opts.relKind}"`);

    // Preservar explícitamente relKind de opts ANTES de llamar cohereRelation
    const inputRelKind = opts.relKind || "ASSOC";
    const coh = cohereRelation({ aName: A, bName: B, relKind: inputRelKind, ...opts });
    const relKind = normalizeRelKind(coh.relKind);

    console.log(`[addRelationSimple] relKind normalizado="${relKind}"`);


    // Variables para almacenar los handles seleccionados
    let selectedSourceHandle = null;
    let selectedTargetHandle = null;
    let foundANode = null;
    let foundBNode = null;

    // PASO 1: Obtener información de los nodos y preparar el edge
    setNodes(currentNodes => {
      // Usar findNodeByFlexibleName para mejor matching de nombres ("clase1" -> "Class1")
      foundANode = findNodeByFlexibleName(currentNodes, coh.aName);
      foundBNode = findNodeByFlexibleName(currentNodes, coh.bName);

      if (!foundANode || !foundBNode) {
        console.warn(`[useIA] No se puede crear relación: entidad no encontrada (${coh.aName} → ${coh.bName})`);
        console.log(`[useIA] Entidades disponibles:`, currentNodes.map(n => n.data?.label));
        return currentNodes;
      }

      // Pre-calcular handles libres
      selectedSourceHandle = findFreeHandle(foundANode.id, "source", currentNodes);
      selectedTargetHandle = findFreeHandle(foundBNode.id, "target", currentNodes);

      return currentNodes; // No modificar aún
    });

    // Si no se encontraron los nodos, salir
    if (!foundANode || !foundBNode) return;

    // PASO 2: Crear el edge PRIMERO
    setEdges(currentEdges => {
      const alreadyExists = currentEdges.some(e => {
        const sameDirection = e.source === foundANode.id && e.target === foundBNode.id;
        const reverseDirection = e.source === foundBNode.id && e.target === foundANode.id;
        return sameDirection || reverseDirection;
      });

      if (alreadyExists) {
        console.warn(`[useIA] Relación duplicada ignorada: ${coh.aName} ↔ ${coh.bName}`);
        return currentEdges;
      }

      const id = "e" + Date.now() + Math.random().toString(36).slice(2, 5);
      const newEdge = {
        id,
        source: foundANode.id,
        target: foundBNode.id,
        sourceHandle: selectedSourceHandle,
        targetHandle: selectedTargetHandle,
        type: "uml",
        data: {
          mA: normalizeMultiplicity(coh.mA),
          mB: normalizeMultiplicity(coh.mB),
          verb: coh.verb || "",
          relType: opts.relType,
          relKind,
          owning: coh.owning,
          direction: coh.direction,
        },
      };

      console.log(`[useIA] ✅ Edge creado:`, newEdge);
      const updatedEdges = currentEdges.concat(newEdge);
      console.log(`[useIA] 📊 Total edges después de agregar:`, updatedEdges.length);

      // CRÍTICO: Guardar inmediatamente después de crear el edge
      setTimeout(() => scheduleSnapshot(), 50);

      return updatedEdges;
    });

    // PASO 3: Actualizar contadores de uso de handles en los nodos
    setNodes(currentNodes => {
      return currentNodes.map(n => {
        if (n.id === foundANode.id) {
          const usage = n.data?.usage || { target: {}, source: {} };
          return {
            ...n,
            data: {
              ...n.data,
              usage: {
                ...usage,
                source: {
                  ...usage.source,
                  [selectedSourceHandle]: (usage.source?.[selectedSourceHandle] || 0) + 1,
                },
              },
            },
          };
        }

        if (n.id === foundBNode.id) {
          const usage = n.data?.usage || { target: {}, source: {} };
          return {
            ...n,
            data: {
              ...n.data,
              usage: {
                ...usage,
                target: {
                  ...usage.target,
                  [selectedTargetHandle]: (usage.target?.[selectedTargetHandle] || 0) + 1,
                },
              },
            },
          };
        }

        return n;
      });
    });
  };

  const addRelationNM = (A, B, joinNameOpt) => {
    // Usar setNodes para acceder al estado actual
    setNodes(currentNodes => {
      // Buscar las entidades A y B en el estado ACTUAL
      const aNode = currentNodes.find(n => norm(n?.data?.label) === norm(A));
      const bNode = currentNodes.find(n => norm(n?.data?.label) === norm(B));

      if (!aNode || !bNode) {
        console.warn(`[useIA] No se puede crear relación N-M: entidad no encontrada (${A} ↔ ${B})`);
        console.log(`[useIA] Entidades disponibles:`, currentNodes.map(n => n.data?.label));
        return currentNodes;
      }

      const joinName = joinNameOpt?.trim() || joinNameFor(aNode.data?.label, bNode.data?.label);
      const exist = currentNodes.find(n => norm(n?.data?.label) === norm(joinName));
      const joinId = exist?.id || ("n" + Date.now());

      if (!exist) {
        const pos = {
          x: (aNode.position?.x + bNode.position?.x) / 2 || 180,
          y: Math.max(aNode.position?.y || 100, bNode.position?.y || 100) + 150
        };

        // Inicializar usage para la tabla intermedia
        const initialUsage = {
          target: Object.fromEntries(TARGET_HANDLES.map(h => [h, 0])),
          source: Object.fromEntries(SOURCE_HANDLES.map(h => [h, 0])),
        };

        // Crear la tabla intermedia
        const newNode = {
          id: joinId, type: "classNode", position: pos,
          data: {
            label: normalizeEntityName(joinName),
            attrs: ensureCoherentAttrs([
              { name: `${normalizeAttrName(aNode.data?.label)}_id`, type: "Integer" },
              { name: `${normalizeAttrName(bNode.data?.label)}_id`, type: "Integer" },
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
            source: joinId,          // DESDE la tabla intermedia
            target: aNode.id,        // HACIA la entidad A
            sourceHandle: handleJ1,
            targetHandle: handleA,
            label: '0..*',
            type: 'uml',
            data: {
              mA: "*",       // Lado de la intermedia
              mB: "0..*",    // Lado de la entidad
              relKind: "DEPEND",  // LÍNEA PUNTEADA
              relType: "N-M",
              direction: "A->B",
              isNMRelation: true
            }
          };

          // Actualizar usage
          setNodes(updatedNodes =>
            updatedNodes.map(n => {
              if (n.id === aNode.id) {
                const usage = n.data?.usage || { target: {}, source: {} };
                return {
                  ...n,
                  data: {
                    ...n.data,
                    usage: {
                      ...usage,
                      source: {
                        ...usage.source,
                        [handleA]: (usage.source?.[handleA] || 0) + 1,
                      },
                    },
                  },
                };
              }
              if (n.id === joinId) {
                const usage = n.data?.usage || { target: {}, source: {} };
                return {
                  ...n,
                  data: {
                    ...n.data,
                    usage: {
                      ...usage,
                      target: {
                        ...usage.target,
                        [handleJ1]: (usage.target?.[handleJ1] || 0) + 1,
                      },
                    },
                  },
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
            source: joinId,          // DESDE la tabla intermedia
            target: bNode.id,        // HACIA la entidad B
            sourceHandle: handleJ2,
            targetHandle: handleB,
            label: '0..*',
            type: 'uml',
            data: {
              mA: "*",       // Lado de la intermedia
              mB: "0..*",    // Lado de la entidad
              relKind: "DEPEND",  // LÍNEA PUNTEADA
              relType: "N-M",
              direction: "A->B",
              isNMRelation: true
            }
          };

          // Actualizar usage
          setNodes(updatedNodes =>
            updatedNodes.map(n => {
              if (n.id === bNode.id) {
                const usage = n.data?.usage || { target: {}, source: {} };
                return {
                  ...n,
                  data: {
                    ...n.data,
                    usage: {
                      ...usage,
                      source: {
                        ...usage.source,
                        [handleB]: (usage.source?.[handleB] || 0) + 1,
                      },
                    },
                  },
                };
              }
              if (n.id === joinId) {
                const usage = n.data?.usage || { target: {}, source: {} };
                return {
                  ...n,
                  data: {
                    ...n.data,
                    usage: {
                      ...usage,
                      target: {
                        ...usage.target,
                        [handleJ2]: (usage.target?.[handleJ2] || 0) + 1,
                      },
                    },
                  },
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
          source: joinId,          // DESDE la tabla intermedia
          target: aNode.id,        // HACIA la entidad A
          sourceHandle: handleJ1,
          targetHandle: handleA,
          label: '0..*',
          type: 'uml',
          data: {
            mA: "*",
            mB: "0..*",
            relKind: "DEPEND",
            relType: "N-M",
            direction: "A->B",
            isNMRelation: true
          }
        };

        setNodes(updatedNodes =>
          updatedNodes.map(n => {
            if (n.id === aNode.id) {
              const usage = n.data?.usage || { target: {}, source: {} };
              return {
                ...n,
                data: {
                  ...n.data,
                  usage: {
                    ...usage,
                    source: {
                      ...usage.source,
                      [handleA]: (usage.source?.[handleA] || 0) + 1,
                    },
                  },
                },
              };
            }
            if (n.id === joinId) {
              const usage = n.data?.usage || { target: {}, source: {} };
              return {
                ...n,
                data: {
                  ...n.data,
                  usage: {
                    ...usage,
                    target: {
                      ...usage.target,
                      [handleJ1]: (usage.target?.[handleJ1] || 0) + 1,
                    },
                  },
                },
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
          source: joinId,          // DESDE la tabla intermedia
          target: bNode.id,        // HACIA la entidad B
          sourceHandle: handleJ2,
          targetHandle: handleB,
          label: '0..*',
          type: 'uml',
          data: {
            mA: "*",
            mB: "0..*",
            relKind: "DEPEND",
            relType: "N-M",
            direction: "A->B",
            isNMRelation: true
          }
        };

        setNodes(updatedNodes =>
          updatedNodes.map(n => {
            if (n.id === bNode.id) {
              const usage = n.data?.usage || { target: {}, source: {} };
              return {
                ...n,
                data: {
                  ...n.data,
                  usage: {
                    ...usage,
                    source: {
                      ...usage.source,
                      [handleB]: (usage.source?.[handleB] || 0) + 1,
                    },
                  },
                },
              };
            }
            if (n.id === joinId) {
              const usage = n.data?.usage || { target: {}, source: {} };
              return {
                ...n,
                data: {
                  ...n.data,
                  usage: {
                    ...usage,
                    target: {
                      ...usage.target,
                      [handleJ2]: (usage.target?.[handleJ2] || 0) + 1,
                    },
                  },
                },
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

  const removeRelationByNames = (A, B) => {
    const a = findByName(A), b = findByName(B);
    if (!a || !b) return;
    setEdges(es => es.filter(e => !((e.source === a.id && e.target === b.id) || (e.source === b.id && e.target === a.id))));
  };

  /* ---------- Coerción y “smart attrs” ---------- */
  function replaceGenericAttrs(entityName, attrs) {
    const list = Array.isArray(attrs) ? attrs : [];
    const onlyGeneric = list.filter(a => isGeneric(a?.name || "")).length >= Math.ceil(list.length * 0.7);
    if (!onlyGeneric) return ensureCoherentAttrs(list);
    const wanted = list.length;
    const suggested = smartSuggestAttrs(entityName, wanted);
    return ensureCoherentAttrs(suggested);
  }

  function coerceActions(actions = []) {
    return actions.map(act => {
      if (!act || !act.op) return act;
      if (act.name) act.name = normalizeEntityName(act.name);
      if (act.old) act.old = normalizeEntityName(act.old);
      if (act.a) act.a = normalizeEntityName(act.a);
      if (act.b) act.b = normalizeEntityName(act.b);
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
          act.relKind = normalizeRelKind(act.relKind);
          act.mA = normalizeMultiplicity(act.mA);
          act.mB = normalizeMultiplicity(act.mB);
          if (act.owning && !["A", "B"].includes(act.owning)) act.owning = "A";
          if (act.direction && !["A->B", "B->A", "BIDI"].includes(act.direction)) act.direction = "A->B";
          break;
        }
        case "add_relation_nm":
        case "add_relation_associative": {
          if (!act.joinName && act.a && act.b) act.joinName = joinNameFor(act.a, act.b);
          break;
        }
        case "add_attrs_smart": {
          act.count = Math.max(1, parseInt(act.count || 0, 10) || 1);
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
      data: {
        ...n.data,
        label: normalizeEntityName(n.data?.label || ""),
        attrs: ensureCoherentAttrs(n.data?.attrs || [])
      }
    })));
  }

  async function handleIA(userText) {
    const current = {
      entities: nodes.map(n => ({ id: n.id, name: n.data?.label, attrs: n.data?.attrs || [] })),
      relations: edges.map(e => ({ aId: e.source, bId: e.target, data: e.data || {} })),
      joinTables: []
    };

    // ══════════════════════════════════════════════════════════════════════════
    // PRIORIZAR PARSER LOCAL antes de usar Gemini IA
    // Esto garantiza que comandos simples como "agregacion de X a Y" se
    // parseen correctamente con el relKind correcto (AGGR, INHERIT, etc.)
    // ══════════════════════════════════════════════════════════════════════════
    let delta;

    // Importar parseComando dinámicamente para evitar circular dependencies
    const { parseComando } = await import("../components/AsistenteIA/ParserComandos");
    const resultadoLocal = parseComando(userText, current);

    if (!resultadoLocal.needsAI && resultadoLocal.actions.length > 0) {
      // El parser local pudo manejar el comando
      console.log(`[handleIA] ✅ Usando parser LOCAL: ${resultadoLocal.actions.length} acciones`, resultadoLocal.actions);
      delta = { actions: resultadoLocal.actions };
    } else {
      // Comando complejo o no reconocido, usar Gemini IA
      console.log(`[handleIA] 🤖 Usando Gemini IA (needsAI=${resultadoLocal.needsAI})`);
      delta = await getDeltaFromUserText({
        text: userText, promptBuilder: buildPrompt2, currentModel: current
      });
    }

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
            setNodes(ns => ns.map(n => n.id === ex.id ? { ...n, data: { ...n.data, label: act.name } } : n));
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
          setNodes(ns => ns.map(n => n.id === exId ? { ...n, data: { ...n.data, attrs: final } } : n));
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
            // Obtener edges actualizados del estado
            setEdges(currentEdges => {
              // Aplicar layout con los edges actualizados
              const layouted = applyAutoLayout(currentNodes, currentEdges);
              const optimized = optimizeEdgeCrossings(layouted);
              setNodes(optimized); // Actualizar nodos con layout
              return currentEdges; // Mantener edges sin cambios
            });
            return currentNodes; // No modificar nodes aquí, se hará dentro de setEdges
          });
        }, 150);
      }

      scheduleSnapshot();
    }, 100); // Delay de 100ms para permitir que React actualice el estado de nodes

    return true;
  }

  return { handleIA };
}
