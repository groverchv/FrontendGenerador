import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProjectsApi } from "../../../api/projects";
import { DiagramsApi } from "../../../api/diagrams";

import ReactFlow, {
  Background,
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  Handle,
  Position,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";

/* ================== Helper fecha ================== */
/**
 * Formatea fecha ISO a formato legible local
 * @param {string} iso - Fecha en formato ISO
 * @returns {string} Fecha formateada
 */
function formatFecha(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return String(iso ?? "—");
  }
}

/**
 * Calcula tiempo relativo desde una fecha
 * @param {string} iso - Fecha en formato ISO
 * @returns {string} Tiempo relativo (ej: "hace 2 horas")
 */
function tiempoRelativo(iso) {
  if (!iso) return "";
  try {
    const fecha = new Date(iso);
    const ahora = new Date();
    const diffMs = ahora - fecha;
    
    const minutos = Math.floor(diffMs / 60000);
    const horas = Math.floor(diffMs / 3600000);
    const dias = Math.floor(diffMs / 86400000);
    const semanas = Math.floor(diffMs / 604800000);
    const meses = Math.floor(diffMs / 2592000000);
    
    if (minutos < 1) return "Ahora mismo";
    if (minutos < 60) return `Hace ${minutos} min`;
    if (horas < 24) return `Hace ${horas}h`;
    if (dias < 7) return `Hace ${dias}d`;
    if (semanas < 4) return `Hace ${semanas}sem`;
    if (meses < 12) return `Hace ${meses}m`;
    
    return formatFecha(iso);
  } catch {
    return "";
  }
}

/* ================== Nodo de clase (preview) ================== */
function ClassNode({ data }) {
  return (
    <div className="bg-white rounded-md border-2 border-teal-500 w-auto min-w-[120px] max-w-[220px]">
      <div className="bg-teal-500 text-white font-bold text-center px-1 py-0.5 text-[10px] truncate">
        {data.label || "Entidad"}
      </div>
      <div className="p-1 min-h-[18px]">
        {data.attrs?.length ? (
          <ul className="m-0 pl-3 list-disc text-[9px] leading-tight text-gray-700">
            {data.attrs.map((a, i) => (
              <li key={i}>
                {a.name}: <i>{a.type}</i>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-400 text-[9px]">Sin atributos…</div>
        )}
      </div>
      <Handle type="target" position={Position.Left} id="l" style={{ visibility: "hidden" }} />
      <Handle type="source" position={Position.Right} id="r" style={{ visibility: "hidden" }} />
    </div>
  );
}

/* ================== Edge UML (preview) ================== */
function UmlEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  markerEnd,
}) {
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
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
              fontSize: 9,
              color: "#374151",
              background: "rgba(255,255,255,0.7)",
              padding: "0 2px",
              borderRadius: 3,
            }}
          >
            {data.verb}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

/* ================== Mini visor con fitView real ================== */
function PreviewFlowInner({ nodes, edges, nodeTypes, edgeTypes }) {
  const instRef = useRef(null);

  const doFit = useCallback(() => {
    const i = instRef.current;
    if (!i) return;
    // permitir alejar mucho para diagramas grandes
    i.fitView({ padding: 0.08, includeHiddenNodes: true, minZoom: 0.01, maxZoom: 1 });
  }, []);

  const onInit = (instance) => {
    instRef.current = instance;
    // dar un microtiempo para que mida el contenedor
    requestAnimationFrame(() => doFit());
  };

  // re-encajar cuando cambien los datos
  useEffect(() => {
    if (!instRef.current) return;
    doFit();
  }, [nodes, edges, doFit]);

  // re-encajar si cambia el tamaño de la tarjeta
  useEffect(() => {
    const onResize = () => doFit();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [doFit]);

  return (
    <ReactFlow
      onInit={onInit}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      // preview = sin interacción
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      zoomOnScroll={false}
      zoomOnPinch={false}
      zoomOnDoubleClick={false}
      panOnDrag={false}
      // permitir mucho alejamiento
      minZoom={0.01}
      maxZoom={1}
      fitView={false}
      style={{ width: "100%", height: "100%" }}
    >
      <Background gap={12} size={1} />
    </ReactFlow>
  );
}

function PreviewFlow(props) {
  // Provider requerido por React Flow nuevas versiones
  return (
    <ReactFlowProvider>
      <PreviewFlowInner {...props} />
    </ReactFlowProvider>
  );
}

/* ================== Página de proyectos (grid) ================== */
export default function Proyecto() {
  const [proyectos, setProyectos] = useState([]);
  const navigate = useNavigate();

  const nodeTypes = useMemo(() => ({ classNode: ClassNode }), []);
  const edgeTypes = useMemo(() => ({ uml: UmlEdge }), []);

  const cargar = async () => {
    try {
      const list = await ProjectsApi.list();

      const enriched = await Promise.all(
        list.map(async (p) => {
          try {
            // Obtener diagrama con su información completa
            const diagram = await ProjectsApi.getDiagram(p.id);
            
            // Parsear nodes y edges para preview
            const previewNodes = diagram.nodes ? JSON.parse(diagram.nodes) : [];
            const previewEdges = diagram.edges ? JSON.parse(diagram.edges) : [];

            return {
              ...p,
              previewNodes,
              previewEdges,
              // Las fechas ya vienen del backend en el objeto proyecto
              // updatedAt viene de ProjectEntity
              // diagram también puede tener updatedAt de DiagramEntity
              diagramEditedAt: diagram.updatedAt || null,
            };
          } catch (err) {
            console.error(`Error cargando diagrama para proyecto ${p.id}:`, err);
            return { 
              ...p, 
              previewNodes: [], 
              previewEdges: [], 
              diagramEditedAt: null 
            };
          }
        })
      );

      setProyectos(enriched);
    } catch (e) {
      console.error("Error cargando proyectos:", e);
      alert("No se pudieron cargar los proyectos");
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const crearProyecto = async () => {
    const nombre = prompt("Nombre del proyecto:");
    if (!nombre) return;
    try {
      await ProjectsApi.create({
        name: nombre.trim(),
        packageBase: "com.example.app",
      });
      await cargar();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e.message;
      alert("No se pudo crear el proyecto: " + msg);
    }
  };

  const eliminarProyecto = async (id) => {
    if (!confirm("¿Eliminar este proyecto?")) return;
    try {
      await ProjectsApi.remove(id);
      setProyectos((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      alert("No se pudo eliminar: " + (e?.response?.data?.message || e.message));
    }
  };

  const abrirProyecto = (p) => navigate(`/proyectos/${p.id}`);

  return (
    <div className="p-3 md:p-4 lg:p-6 pb-20 md:pb-6">
      {/* Header responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
        <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-800">
          📂 Mis Proyectos
        </h1>
        <button
          onClick={crearProyecto}
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg border-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold shadow-md hover:shadow-lg hover:from-green-600 hover:to-emerald-600 transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-2"
        >
          <span className="text-lg">+</span>
          <span>Nuevo proyecto</span>
        </button>
      </div>

      {/* Grid responsive de proyectos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
        {proyectos.map((p) => (
          <div
            key={p.id}
            className="group rounded-xl overflow-hidden border-2 border-gray-200 bg-white hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer active:scale-[0.98]"
            onClick={() => abrirProyecto(p)}
            title={p.name}
          >
            {/* Vista previa con ReactFlow */}
            <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
              {p.previewNodes.length > 0 ? (
                <PreviewFlow
                  nodes={p.previewNodes}
                  edges={p.previewEdges}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                  <div className="text-3xl md:text-4xl mb-2">📊</div>
                  <div className="text-xs md:text-sm font-medium">Sin diagrama</div>
                </div>
              )}

              {/* Botón eliminar (visible en hover en desktop, siempre visible en móvil) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  eliminarProyecto(p.id);
                }}
                className="absolute top-2 right-2 p-1.5 md:p-2 text-xs md:text-sm rounded-lg bg-white/90 backdrop-blur-sm border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 shadow-md transition-all active:scale-90 md:opacity-0 md:group-hover:opacity-100 touch-manipulation"
                title="Eliminar proyecto"
                aria-label="Eliminar proyecto"
              >
                🗑️
              </button>
            </div>

            {/* Info del proyecto */}
            <div className="p-3 md:p-4 space-y-1.5 md:space-y-2">
              {/* Nombre del proyecto */}
              <div className="font-semibold text-sm md:text-base truncate text-gray-900" title={p.name}>
                {p.name}
              </div>
              
              {/* Fecha de creación del proyecto */}
              <div 
                className="flex items-center gap-1.5 text-xs text-gray-500"
                title={`Creado: ${formatFecha(p.createdAt)}`}
              >
                <svg className="w-3 h-3 md:w-3.5 md:h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="truncate">Creado: {tiempoRelativo(p.createdAt)}</span>
              </div>

              {/* Última modificación */}
              {(p.updatedAt || p.diagramEditedAt) && (
                <div 
                  className="flex items-center gap-1.5 text-xs text-amber-600"
                  title={`Última edición: ${formatFecha(p.diagramEditedAt || p.updatedAt)}`}
                >
                  <svg className="w-3 h-3 md:w-3.5 md:h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="truncate">
                    Editado: {tiempoRelativo(p.diagramEditedAt || p.updatedAt)}
                  </span>
                </div>
              )}

              {/* Contador de clases */}
              {p.previewNodes.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
                  </svg>
                  <span>{p.previewNodes.length} clase{p.previewNodes.length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Tarjeta para crear nuevo proyecto */}
        <button
          onClick={crearProyecto}
          className="rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-400 hover:text-blue-500 flex flex-col items-center justify-center aspect-[4/3] transition-all active:scale-95 touch-manipulation group"
          title="Crear nuevo proyecto"
          aria-label="Crear nuevo proyecto"
        >
          <span className="text-4xl md:text-5xl mb-2 group-hover:scale-110 transition-transform">＋</span>
          <span className="text-sm md:text-base font-semibold">Nuevo proyecto</span>
        </button>
      </div>

      {/* Mensaje si no hay proyectos */}
      {proyectos.length === 0 && (
        <div className="text-center py-12 md:py-16">
          <div className="text-5xl md:text-6xl mb-4">📁</div>
          <h2 className="text-lg md:text-xl font-semibold text-gray-700 mb-2">
            No tienes proyectos aún
          </h2>
          <p className="text-sm md:text-base text-gray-500 mb-6">
            Crea tu primer proyecto para comenzar
          </p>
          <button
            onClick={crearProyecto}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all active:scale-95 touch-manipulation"
          >
            + Crear mi primer proyecto
          </button>
        </div>
      )}
    </div>
  );
}

