// src/views/proyectos/ProjectDetail/ProjectDetail.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ProjectsApi } from "../../../api/projects";
import { Sockend } from "../../../api/socket"; // SockJS + STOMP
import Diagramador from "../Diagramador/Diagramador";
import ProjectNavbar from "./ProjectNavbar";
import { useToast } from "../../../hooks/useToast";

export default function ProjectDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [project, setProject] = useState(null);
    const [diagramId, setDiagramId] = useState(null);

    const [sock, setSock] = useState(null);
    const [onlineCount, setOnlineCount] = useState(null);
    const [loading, setLoading] = useState(false); // Nuevo estado de carga
    const [saving, setSaving] = useState(false); // Nuevo estado de guardado

    const diagramadorRef = useRef();
    const presenceSubRef = useRef(null);
    const toast = useToast();

    // Input para importar archivo PUML/JSON
    const fileRef = useRef(null);

    // Input para importar imagen
    const imageFileRef = useRef(null);

    // Video para captura de cámara
    const videoRef = useRef(null);
    const [showCamera, setShowCamera] = useState(false);
    const [stream, setStream] = useState(null);

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
            toast.error("Formato no soportado. Usa .puml/.uml o .json exportados por la app.");
        }
        e.target.value = ""; // permite re-seleccionar el mismo archivo
    };

    // ---- Generar Flutter
    const handleGenerateFlutter = () => {
        toast.info("Generando código Flutter...");
        // Aquí implementarías la lógica para generar código Flutter
        // Por ejemplo: diagramadorRef.current?.generateFlutter();
    };

    // ---- Importar imagen desde archivo
    const handleImportImageFromFile = () => {
        imageFileRef.current?.click();
    };

    // ---- Cuando seleccionan imagen
    const onImageFileSelected = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Por favor selecciona un archivo de imagen válido.");
            e.target.value = "";
            return;
        }

        try {
            await diagramadorRef.current?.importFromImage(file);
            e.target.value = "";
        } catch (error) {
            console.error("Error al procesar la imagen:", error);
            toast.error("No se pudo procesar la imagen. Por favor intenta nuevamente.");
            e.target.value = "";
        }
    };

    // ---- Importar imagen desde cámara
    const handleImportImageFromCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
            });
            setStream(mediaStream);
            setShowCamera(true);

            // Asignar el stream al video cuando esté disponible
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            }, 100);
        } catch (err) {
            console.error("Error al acceder a la cámara:", err);
            toast.error("No se pudo acceder a la cámara. Verifica los permisos.");
        }
    };

    // ---- Capturar foto de la cámara
    const handleCapturePhoto = () => {
        if (!videoRef.current) return;

        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoRef.current, 0, 0);

        canvas.toBlob((blob) => {
            if (blob) {
                toast.info("Procesando imagen capturada...");
                // Aquí implementarías la lógica para procesar la imagen capturada
                // Por ejemplo: diagramadorRef.current?.processImage(blob);
                handleCloseCamera();
            }
        }, "image/jpeg");
    };

    // ---- Cerrar cámara
    const handleCloseCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
        setShowCamera(false);
    };

    // Limpiar stream al desmontar
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, [stream]);

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

                const enter = () =>
                    s.send(`/app/projects/${id}/presence.enter`, "", { critical: true });
                enter();
                const off = s.onConnect(() => enter());

                return () => {
                    try {
                        off?.();
                    } catch {
                        /* ignore */
                    }
                };
            } catch (err) {
                console.error("WS connect error:", err);
            }
        })();

        return () => {
            active = false;
            try {
                s.send(`/app/projects/${id}/presence.leave`, "");
            } catch {
                /* ignore */
            }
            try {
                if (presenceSubRef.current) s.unsubscribe(presenceSubRef.current);
            } catch {
                /* ignore */
            }
            try {
                s.close();
            } catch {
                /* ignore */
            }
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
                onExport={handleExport} // Exportar PUML
                onImport={handleImportClick} // Importar PUML/JSON
                onGenerateFlutter={handleGenerateFlutter} // Generar Flutter
                onImportImageFromCamera={handleImportImageFromCamera} // Cámara
                onImportImageFromFile={handleImportImageFromFile} // Archivo imagen
                isProcessingImage={loading} // Pasar el estado de carga
                isSaving={saving} // Pasar el estado de guardado
            />

            {/* input oculto para importar (PUML/JSON) */}
            <input
                ref={fileRef}
                type="file"
                accept=".puml,.uml,.json"
                className="hidden"
                onChange={onFileSelected}
            />

            {/* input oculto para importar imagen */}
            <input
                ref={imageFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onImageFileSelected}
            />

            {/* Modal de cámara */}
            {showCamera && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-4 max-w-2xl w-full mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Capturar imagen</h3>
                            <button
                                onClick={handleCloseCamera}
                                className="text-gray-500 hover:text-gray-700 text-2xl"
                            >
                                ×
                            </button>
                        </div>
                        <div className="relative bg-black rounded-lg overflow-hidden">
                            <video ref={videoRef} autoPlay playsInline className="w-full h-auto" />
                        </div>
                        <div className="flex justify-center gap-3 mt-4">
                            <button
                                onClick={handleCapturePhoto}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Capturar
                            </button>
                            <button
                                onClick={handleCloseCamera}
                                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 min-h-0">
                {diagramId ? (
                    <Diagramador
                        ref={diagramadorRef}
                        projectId={project.id}
                        projectName={project.name}
                        diagramId={diagramId}
                        sock={sock}
                        setLoading={setLoading} // Pasar setter de loading
                        setSaving={setSaving} // Pasar setter de saving
                    />
                ) : (
                    <div className="p-4 text-sm text-gray-500">Preparando diagrama…</div>
                )}
            </div>
        </div>
    );
}
