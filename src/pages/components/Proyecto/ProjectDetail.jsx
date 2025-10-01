// src/views/proyectos/ProjectDetail/ProjectDetail.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ProjectsApi } from "../../../api/projects";
import { Sockend } from "../../../api/socket"; // SockJS + STOMP
import Diagramador from "../Diagramador/Diagramador";
import ProjectNavbar from "./ProjectNavbar";

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [diagramId, setDiagramId] = useState(null);

  const [sock, setSock] = useState(null);
  const [onlineCount, setOnlineCount] = useState(null);

  const diagramadorRef = useRef();
  const presenceSubRef = useRef(null);

  // Input para importar
  const fileRef = useRef(null);

  // ---- Exportar (PUML por defecto)
  const handleExport = () => {
    diagramadorRef.current?.exportPUML();
    // Si quieres JSON por defecto: diagramadorRef.current?.exportJSON();
  };

  // ---- Importar: abre file picker
  const handleImportClick = () => fileRef.current?.click();

  // ---- Cuando seleccionan archivo
  const onFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.toLowerCase();
    const text = await file.text();

    if (name.endsWith(".puml") || name.endsWith(".uml")) {
      await diagramadorRef.current?.importFromPUMLText(text);
    } else if (name.endsWith(".json")) {
      await diagramadorRef.current?.importFromJSONText(text);
    } else {
      alert("Formato no soportado. Usa .puml/.uml o .json exportados por la app.");
    }
    e.target.value = ""; // permite re-seleccionar el mismo archivo
  };

  // Carga proyecto + diagrama
  useEffect(() => {
    (async () => {
      try {
        const p = await ProjectsApi.get(id);
        setProject(p);
        const d = await ProjectsApi.getDiagram(id);
        setDiagramId(d.id ?? Number(id));
      } catch (e) {
        console.error(e);
        navigate("/proyectos");
      }
    })();
  }, [id, navigate]);

  // Conecta STOMP y maneja presencia
  useEffect(() => {
    let active = true;
    if (!id) return;

    const s = new Sockend({ debug: false });

    (async () => {
      try {
        await s.connect();
        if (!active) return;
        setSock(s);

        const presenceTopic = `/topic/projects/${id}/presence`;
        presenceSubRef.current = s.subscribe(presenceTopic, (msg) => {
          if (msg && (msg.__system === "presence" || typeof msg.online === "number")) {
            setOnlineCount(msg.online);
          }
        });

        const enter = () => s.send(`/app/projects/${id}/presence.enter`, "", { critical: true });
        enter();
        const off = s.onConnect(() => enter());

        return () => {
          try { off?.(); } catch {}
        };
      } catch (err) {
        console.error("WS connect error:", err);
      }
    })();

    return () => {
      active = false;
      try { s.send(`/app/projects/${id}/presence.leave`, ""); } catch {}
      try { if (presenceSubRef.current) s.unsubscribe(presenceSubRef.current); } catch {}
      try { s.close(); } catch {}
    };
  }, [id]);

  if (!project) {
    return (
      <div className="p-4">
        <button
          onClick={() => navigate("/proyectos")}
          className="px-3 py-2 rounded-md border hover:bg-gray-50"
        >
          ← Volver
        </button>
        <div className="text-gray-600 mt-2">Cargando…</div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col">
      <ProjectNavbar
        project={project}
        onlineCount={onlineCount}
        onSave={() => diagramadorRef.current?.persistNow()}
        onGenerate={() => diagramadorRef.current?.handleGenerate()}
        onExport={handleExport}          // Exportar PUML
        onImport={handleImportClick}     // Importar PUML/JSON
      />

      {/* input oculto para importar (PUML/JSON) */}
      <input
        ref={fileRef}
        type="file"
        accept=".puml,.uml,.json"
        className="hidden"
        onChange={onFileSelected}
      />

      <div className="flex-1 min-h-0">
        {diagramId ? (
          <Diagramador
            ref={diagramadorRef}
            projectId={project.id}
            projectName={project.name}
            diagramId={diagramId}
            sock={sock}
          />
        ) : (
          <div className="p-4 text-sm text-gray-500">Preparando diagrama…</div>
        )}
      </div>
    </div>
  );
}
