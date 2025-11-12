// src/views/proyectos/Diagramador/SubDiagrama/usePersistenciaYArchivo.js
import { useEffect, useCallback, useState } from "react";
import { ProjectsApi } from "../../../../api/projects";
import { DiagramsApi } from "../../../../api/diagrams";
import { downloadText, normalizeMult, decideRelType } from "./utils";
import { useToast } from "../../../../hooks/useToast";
import { 
  ERROR_MESSAGES, 
  SUCCESS_MESSAGES, 
  LAYOUT_CONFIG 
} from "../../../../constants";

/**
 * Hook personalizado para gestionar persistencia y operaciones de archivo
 * Maneja carga/guardado en API y export/import de JSON/PUML
 * 
 * @param {Object} props - Propiedades del hook
 * @param {string|number} props.projectId - ID del proyecto
 * @param {string} props.projectName - Nombre del proyecto
 * @param {Array} props.nodes - Array de nodos del diagrama
 * @param {Array} props.edges - Array de aristas del diagrama
 * @param {Function} props.setNodes - Función para actualizar nodos
 * @param {Function} props.setEdges - Función para actualizar aristas
 * @param {Function} props.publishSnapshot - Función para publicar snapshot via WebSocket
 * @param {Object} props.versionRef - Referencia mutable para versión del diagrama
 * @returns {Object} Funciones y estados de persistencia
 */
export default function usePersistenciaYArchivo({
  projectId,
  projectName,
  nodes,
  edges,
  setNodes,
  setEdges,
  publishSnapshot,
  versionRef,
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // -------- CARGA INICIAL
  useEffect(() => {
    if (!projectId) {
      console.warn('[usePersistenciaYArchivo] No hay projectId, omitiendo carga');
      return;
    }
    
    let isMounted = true;
    
    (async () => {
      try {
        setLoading(true);
        const d = await ProjectsApi.getDiagram(projectId);
        
        if (!isMounted) return; // Evitar actualización si componente desmontado
        
        // Validar y parsear nodes
        let parsedNodes = [];
        if (d.nodes && typeof d.nodes === 'string') {
          try {
            parsedNodes = JSON.parse(d.nodes);
            if (!Array.isArray(parsedNodes)) {
              console.warn('[usePersistenciaYArchivo] Nodes no es un array, usando array vacío');
              parsedNodes = [];
            }
          } catch (parseErr) {
            console.error('[usePersistenciaYArchivo] Error parseando nodes:', parseErr);
            parsedNodes = [];
          }
        }
        
        // Validar y parsear edges
        let parsedEdges = [];
        if (d.edges && typeof d.edges === 'string') {
          try {
            parsedEdges = JSON.parse(d.edges);
            if (!Array.isArray(parsedEdges)) {
              console.warn('[usePersistenciaYArchivo] Edges no es un array, usando array vacío');
              parsedEdges = [];
            }
          } catch (parseErr) {
            console.error('[usePersistenciaYArchivo] Error parseando edges:', parseErr);
            parsedEdges = [];
          }
        }
        
        setNodes(parsedNodes);
        setEdges(parsedEdges);
        versionRef.current = d.version ?? null;
      } catch (err) {
        if (!isMounted) return;
        console.error("[usePersistenciaYArchivo] Error cargando diagrama:", err);
        toast.error(ERROR_MESSAGES.LOAD_DIAGRAM_FAILED);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();
    
    return () => {
      isMounted = false;
    };
  }, [projectId, setNodes, setEdges, versionRef, toast]);

  // -------- GUARDAR
  const persistNow = useCallback(async () => {
    if (!projectId) {
      console.warn('[usePersistenciaYArchivo] No hay projectId, no se puede guardar');
      return;
    }
    
    try {
      // Validación previa básica
      const v = DiagramsApi.validate(nodes, edges);
      if (!v.valid) {
        const errorMsg = ERROR_MESSAGES.INVALID_DIAGRAM + ": " + v.errors.join(". ");
        toast.error(errorMsg);
        console.error('[usePersistenciaYArchivo]', errorMsg);
        return;
      }
      
      setSaving(true);
      
      // Serializar de forma segura
      let nodesStr, edgesStr;
      try {
        nodesStr = JSON.stringify(nodes);
        edgesStr = JSON.stringify(edges);
      } catch (serializeErr) {
        throw new Error(`Error serializando datos: ${serializeErr.message}`);
      }
      
      await ProjectsApi.updateDiagram(projectId, {
        name: "Principal",
        nodes: nodesStr,
        edges: edgesStr,
        viewport: null,
      });
      
      // Solo publicar snapshot si la función existe
      if (typeof publishSnapshot === 'function') {
        publishSnapshot();
      }
      
      toast.success(SUCCESS_MESSAGES.DIAGRAM_SAVED);
    } catch (e) {
      console.error("[usePersistenciaYArchivo] Error guardando:", e);
      toast.error(ERROR_MESSAGES.SAVE_DIAGRAM_FAILED);
    } finally {
      setSaving(false);
    }
  }, [projectId, nodes, edges, publishSnapshot, toast]);

  // -------- EXPORTS
  const exportJSON = useCallback(() => {
    try {
      if (!Array.isArray(nodes) || !Array.isArray(edges)) {
        toast.error("Datos de diagrama inválidos para exportar");
        return;
      }
      
      const payload = {
        version: versionRef.current ?? 1,
        projectId,
        projectName: projectName || "proyecto",
        savedAt: new Date().toISOString(),
        nodes,
        edges,
      };
      
      const safeName = (projectName || "proyecto")
        .replace(/[^\w.-]+/g, "_")
        .substring(0, 50); // Limitar longitud de nombre
      const file = `${safeName}.diagram.json`;
      
      downloadText(file, JSON.stringify(payload, null, 2));
      toast.success("JSON exportado correctamente");
    } catch (err) {
      console.error('[usePersistenciaYArchivo] Error exportando JSON:', err);
      toast.error("Error al exportar JSON");
    }
  }, [nodes, edges, projectId, projectName, versionRef, toast]);

  const exportPUML = useCallback(() => {
    try {
      if (!Array.isArray(nodes) || !Array.isArray(edges)) {
        toast.error("Datos de diagrama inválidos para exportar");
        return;
      }
      
      const classes = nodes.map(n => {
        const name = n.data?.label || n.id;
        const attrs = Array.isArray(n.data?.attrs) ? n.data.attrs : [];
        const attrsStr = attrs
          .map(a => {
            const attrName = a.name || "unnamed";
            const attrType = a.type || "String";
            return `  ${attrName}: ${attrType}`;
          })
          .join("\n");
        return `class ${name} {\n${attrsStr}\n}`;
      }).join("\n\n");

      const rels = edges
        .map(e => {
          const a = nodes.find(n => n.id === e.source);
          const b = nodes.find(n => n.id === e.target);
          if (!a || !b) return "";
          
          const A = a.data?.label || a.id;
          const B = b.data?.label || b.id;
          const mA = normalizeMult(e.data?.mA || "1");
          const mB = normalizeMult(e.data?.mB || "1");
          const verb = e.data?.verb || "";
          
          return `${A} "${mA}" -- "${mB}" ${B}${verb ? ` : ${verb}` : ""}`;
        })
        .filter(Boolean)
        .join("\n");

      const puml = `@startuml
skinparam classAttributeIconSize 0

${classes}

${rels}
@enduml
`;
      const safeName = (projectName || "proyecto")
        .replace(/[^\w.-]+/g, "_")
        .substring(0, 50);
      const file = `${safeName}.puml`;
      
      downloadText(file, puml);
      toast.success("PlantUML exportado correctamente");
    } catch (err) {
      console.error('[usePersistenciaYArchivo] Error exportando PUML:', err);
      toast.error("Error al exportar PlantUML");
    }
  }, [nodes, edges, projectName, toast]);

  // -------- IMPORTS
  const importFromPUMLText = useCallback(async (text) => {
    if (!text || typeof text !== 'string') {
      toast.error("Texto PUML inválido");
      return;
    }
    
    try {
      const cleaned = text
        .replace(/\/\*[^]*?\*\//g, "")
        .replace(/'[^]*?$/gm, "")
        .replace(/@startuml[^]*?\n/i, "")
        .replace(/@enduml[^]*$/i, "");

      // clases
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
            const mm = l.match(/^([A-Za-z_]\w*)\s*:\s*([^;{]+)$/);
            if (!mm) return null;
            return { name: mm[1], type: mm[2].trim() };
          })
          .filter(Boolean);
        foundClasses.push({ name, attrs });
      }

      // "class Foo" suelta
      const singleClassRegex = /^\s*(?:class|entity)\s+([A-Za-z_]\w*)\s*$/gm;
      let sm;
      while ((sm = singleClassRegex.exec(cleaned)) !== null) {
        const name = sm[1];
        if (!foundClasses.find(c => c.name === name)) {
          foundClasses.push({ name, attrs: [] });
        }
      }

      // construir nodos en grilla
      const { GRID_X, GRID_Y, COLUMNS, DEFAULT_X, DEFAULT_Y } = LAYOUT_CONFIG;
      const nodesMap = new Map();
      const newNodes = foundClasses.map((c, i) => {
        const id = "n_" + c.name;
        nodesMap.set(c.name, id);
        return {
          id,
          type: "classNode",
          position: { 
            x: DEFAULT_X + (i % COLUMNS) * GRID_X, 
            y: DEFAULT_Y + Math.floor(i / COLUMNS) * GRID_Y 
          },
          data: { 
            label: c.name, 
            attrs: c.attrs || [],
            usage: {
              target: {},
              source: {}
            }
          },
        };
      });

      // relaciones: A "mA" -- "mB" B : verbo
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

        if (!nodesMap.has(aName)) {
          nodesMap.set(aName, aId);
          newNodes.push({
            id: aId,
            type: "classNode",
            position: { 
              x: DEFAULT_X + (newNodes.length % COLUMNS) * GRID_X, 
              y: DEFAULT_Y + Math.floor(newNodes.length / COLUMNS) * GRID_Y 
            },
            data: { 
              label: aName, 
              attrs: [],
              usage: { target: {}, source: {} }
            },
          });
        }
        if (!nodesMap.has(bName)) {
          nodesMap.set(bName, bId);
          newNodes.push({
            id: bId,
            type: "classNode",
            position: { 
              x: DEFAULT_X + (newNodes.length % COLUMNS) * GRID_X, 
              y: DEFAULT_Y + Math.floor(newNodes.length / COLUMNS) * GRID_Y 
            },
            data: { 
              label: bName, 
              attrs: [],
              usage: { target: {}, source: {} }
            },
          });
        }

        const relType = decideRelType(mA, mB);
        newEdges.push({
          id: "e" + newEdges.length + "_" + Date.now(),
          source: aId,
          target: bId,
          type: "uml",
          data: { 
            mA: normalizeMult(mA || "1"), 
            mB: normalizeMult(mB || "1"), 
            verb, 
            relType 
          },
        });
      }

      setNodes(newNodes);
      setEdges(newEdges);

      if (projectId) {
        await ProjectsApi.updateDiagram(projectId, {
          name: "Principal",
          nodes: JSON.stringify(newNodes),
          edges: JSON.stringify(newEdges),
          viewport: null,
        });
        
        if (typeof publishSnapshot === 'function') {
          publishSnapshot();
        }
      }
      
      toast.success(SUCCESS_MESSAGES.PUML_IMPORTED);
    } catch (err) {
      console.error("[usePersistenciaYArchivo] Import PUML error:", err);
      toast.error(ERROR_MESSAGES.IMPORT_PUML_FAILED + ": " + (err?.message || "desconocido"));
    }
  }, [projectId, setNodes, setEdges, publishSnapshot, toast]);

  const importFromJSONText = useCallback(async (text) => {
    if (!text || typeof text !== 'string') {
      toast.error("Texto JSON inválido");
      return;
    }
    
    try {
      const data = JSON.parse(text);
      const n = Array.isArray(data.nodes) ? data.nodes : [];
      const e = Array.isArray(data.edges) ? data.edges : [];
      
      // Validar estructura básica
      const validation = DiagramsApi.validate(n, e);
      if (!validation.valid) {
        toast.error("JSON inválido: " + validation.errors.join(", "));
        return;
      }
      
      setNodes(n);
      setEdges(e);
      versionRef.current = (data.version ?? versionRef.current) || null;

      if (projectId) {
        await ProjectsApi.updateDiagram(projectId, {
          name: "Principal",
          nodes: JSON.stringify(n),
          edges: JSON.stringify(e),
          viewport: null,
        });
        
        if (typeof publishSnapshot === 'function') {
          publishSnapshot();
        }
      }
      
      toast.success(SUCCESS_MESSAGES.JSON_IMPORTED);
    } catch (err) {
      console.error("[usePersistenciaYArchivo] Import JSON error:", err);
      toast.error(ERROR_MESSAGES.IMPORT_JSON_FAILED + ": " + (err?.message || "desconocido"));
    }
  }, [projectId, setNodes, setEdges, publishSnapshot, versionRef, toast]);

  return {
    versionRef,
    loading,
    saving,
    persistNow,
    exportJSON,
    exportPUML,
    importFromJSONText,
    importFromPUMLText,
  };
}
