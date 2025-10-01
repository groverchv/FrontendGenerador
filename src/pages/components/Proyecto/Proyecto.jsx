import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProjectsApi } from "../../../api/projects";
import { DiagramsApi } from "../../../api/diagrams";
import ReactFlow, {
  Background,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";

/* ---------- Nodo Entidad reutilizado ---------- */
function ClassNode({ data }) {
  return (
    <div className="bg-white rounded-md border-2 border-teal-500 w-auto min-w-[120px] max-w-[220px]">
      <div className="bg-teal-500 text-white font-bold text-center px-1 py-0.5 text-xs truncate">
        {data.label || "Entidad"}
      </div>
      <div className="p-1 min-h-[20px]">
        {data.attrs?.length ? (
          <ul className="m-0 pl-3 list-disc text-[10px] leading-tight text-gray-700">
            {data.attrs.map((a, i) => (
              <li key={i}>
                {a.name}: <i>{a.type}</i>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-400 text-[10px]">Sin atributos…</div>
        )}
      </div>
      <Handle type="target" position={Position.Left} id="l" style={{ visibility: "hidden" }} />
      <Handle type="source" position={Position.Right} id="r" style={{ visibility: "hidden" }} />
    </div>
  );
}

/* ---------- Relación UML reutilizada ---------- */
function UmlEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
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

/* ---------- Utilidades de localización (locale y zona horaria) ---------- */
const USER_LOCALE =
  (typeof navigator !== "undefined" && navigator.language) ? navigator.language : "es-BO";
const USER_TIMEZONE =
  (typeof Intl !== "undefined" &&
    Intl.DateTimeFormat &&
    Intl.DateTimeFormat().resolvedOptions().timeZone) || "America/La_Paz";

/* Ajuste visual fijo en horas (negativo para restar). En Bolivia (UTC-4): -4 */
const DISPLAY_OFFSET_HOURS =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_DISPLAY_OFFSET_HOURS !== undefined)
    ? Number(import.meta.env.VITE_DISPLAY_OFFSET_HOURS)
    : -4;

const MS_PER_HOUR = 3600000;
function applyOffset(date, hours) {
  return new Date(date.getTime() + hours * MS_PER_HOUR);
}

/* ---------- Formateo de fecha y hora (restando 4 horas) ---------- */
function formatFecha(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);

    // Restar horas para alinear con UTC-4 (o el valor configurado)
    const adjusted = applyOffset(d, DISPLAY_OFFSET_HOURS);

    return adjusted.toLocaleString(USER_LOCALE, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: USER_TIMEZONE, // fuerza la zona local detectada (fallback: America/La_Paz)
      // timeZoneName: "short",
    });
  } catch {
    return String(iso);
  }
}

/* ---------- Página de Proyectos ---------- */
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
            // 🔹 Cargar el diagrama asociado
            const d = await ProjectsApi.getDiagram(p.id);

            // 🔹 Además pedir al endpoint /api/diagrams/{id} para traer updatedAt
            const fullDiagram = await DiagramsApi.get(d.id);

            return {
              ...p,
              previewNodes: d.nodes ? JSON.parse(d.nodes) : [],
              previewEdges: d.edges ? JSON.parse(d.edges) : [],
              diagramEditedAt: fullDiagram.updatedAt, // 🔹 fecha de edición del diagrama
            };
          } catch {
            return { ...p, previewNodes: [], previewEdges: [], diagramEditedAt: null };
          }
        })
      );

      setProyectos(enriched);
    } catch (e) {
      console.error(e);
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
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Proyectos</h1>
        <button
          onClick={crearProyecto}
          className="px-3 py-2 rounded-md border bg-green-50 text-green-700 hover:bg-green-100"
        >
          + Nuevo proyecto
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {proyectos.map((p) => (
          <div
            key={p.id}
            className="group rounded-xl overflow-hidden border bg-white hover:shadow-md transition cursor-pointer"
            onClick={() => abrirProyecto(p)}
            title={p.name}
          >
            {/* Vista previa con ReactFlow */}
            <div className="aspect-[4/3] bg-gray-50 relative">
              {p.previewNodes.length > 0 ? (
                <ReactFlow
                  nodes={p.previewNodes}
                  edges={p.previewEdges}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  fitView
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={false}
                  zoomOnScroll={false}
                  zoomOnPinch={false}
                  zoomOnDoubleClick={false}
                  panOnDrag={false}
                >
                  <Background gap={12} size={1} />
                </ReactFlow>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                  Sin vista previa
                </div>
              )}

              {/* Botón eliminar */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  eliminarProyecto(p.id);
                }}
                className="absolute top-2 right-2 px-2 py-1 text-xs rounded-md bg-white/80 backdrop-blur border hover:bg-white hidden group-hover:block"
                title="Eliminar"
              >
                ✕
              </button>
            </div>

            {/* Info */}
            <div className="p-3">
              <div className="font-medium truncate">{p.name}</div>
              <div className="text-xs text-gray-500 mt-1">
                Creado: {formatFecha(p.createdAt)}
              </div>
              {p.diagramEditedAt && (
                <div className="text-[11px] text-gray-400 mt-0.5">
                  Diagrama editado: {formatFecha(p.diagramEditedAt)}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Nueva tarjeta */}
        <button
          onClick={crearProyecto}
          className="rounded-xl border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-500 flex flex-col items-center justify-center aspect-[4/3]"
          title="Crear proyecto"
        >
          <span className="text-3xl">＋</span>
          <span className="mt-1 text-sm">Nuevo proyecto</span>
        </button>
      </div>
    </div>
  );
}
