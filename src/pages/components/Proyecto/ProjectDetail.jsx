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

    // Sockend ya conoce la baseURL y usa SockJS
    const s = new Sockend({ debug: false });

    (async () => {
      try {
        await s.connect();
        if (!active) return;
        setSock(s);

        // 1) Suscripción a presencia
        const presenceTopic = `/topic/projects/${id}/presence`;
        presenceSubRef.current = s.subscribe(presenceTopic, (msg) => {
          if (msg && (msg.__system === "presence" || typeof msg.online === "number")) {
            setOnlineCount(msg.online);
          }
        });

        // 2) Entrar a la sala (y re-entrar cuando reconecte)
        const enter = () => s.send(`/app/projects/${id}/presence.enter`, "", { critical: true });
        enter();
        const off = s.onConnect(() => enter());

        // Cleanup del callback de reconexión
        return () => {
          try {
            off?.();
          } catch {}
        };
      } catch (err) {
        console.error("WS connect error:", err);
      }
    })();

    return () => {
      active = false;
      try {
        s.send(`/app/projects/${id}/presence.leave`, "");
      } catch {}
      try {
        if (presenceSubRef.current) s.unsubscribe(presenceSubRef.current);
      } catch {}
      try {
        s.close();
      } catch {}
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
