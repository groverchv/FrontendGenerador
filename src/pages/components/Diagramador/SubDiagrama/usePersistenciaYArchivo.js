// src/views/proyectos/Diagramador/SubDiagrama/usePersistenciaYArchivo.js
import { useEffect, useCallback, useState } from "react";
import { ProjectsApi } from "../../../../api/projects";
import { DiagramsApi } from "../../../../api/diagrams";
import { downloadText, normalizeMult, decideRelType } from "./utils";
import { useToast } from "../../../../hooks/useToast";

/**
 * Carga/guarda en API y maneja export/import JSON/PUML.
 * Requiere versionRef (ref mutable) para sincronizar versiones.
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
    setLoading, // Recibir setLoading como prop
    setSaving, // Recibir setSaving como prop
}) {
    const toast = useToast();
    // -------- CARGA INICIAL
    useEffect(() => {
        if (!projectId) return;
        (async () => {
            try {
                setLoading(true);
                const d = await ProjectsApi.getDiagram(projectId);
                setNodes(d.nodes ? JSON.parse(d.nodes) : []);
                setEdges(d.edges ? JSON.parse(d.edges) : []);
                versionRef.current = d.version ?? null;
            } catch (err) {
                console.error("No se pudo cargar el diagrama", err);
                toast.error("No se pudo cargar el diagrama. Revisa tu conexión.");
            } finally {
                setLoading(false);
            }
        })();
    }, [projectId, setNodes, setEdges, versionRef, toast, setLoading]);

    // -------- GUARDAR
    const persistNow = useCallback(async () => {
        try {
            if (!projectId) return;
            // Validación previa básica
            const v = DiagramsApi.validate(nodes, edges);
            if (!v.valid) {
                toast.error("No se puede guardar: " + v.errors.join(". "));
                return;
            }
            setSaving(true);
            await ProjectsApi.updateDiagram(projectId, {
                name: "Principal",
                nodes: JSON.stringify(nodes),
                edges: JSON.stringify(edges),
                viewport: null,
            });
            publishSnapshot?.();
            toast.success("Diagrama guardado correctamente.");
        } catch (e) {
            console.error("Error guardando", e);
            toast.error("Error guardando cambios en el diagrama.");
        } finally {
            setSaving(false);
        }
    }, [projectId, nodes, edges, publishSnapshot, toast, setSaving]);

    // -------- EXPORTS
    const exportJSON = useCallback(() => {
        const payload = {
            version: versionRef.current ?? 1,
            projectId,
            projectName,
            savedAt: new Date().toISOString(),
            nodes,
            edges,
        };
        const file = `${(projectName || "proyecto").replace(/[^\w.-]+/g, "_")}.diagram.json`;
        downloadText(file, JSON.stringify(payload, null, 2));
    }, [nodes, edges, projectId, projectName, versionRef]);

    const exportPUML = useCallback(() => {
        const classes = nodes
            .map((n) => {
                const name = n.data?.label || n.id;
                const attrs = (n.data?.attrs || [])
                    .map((a) => `  ${a.name}: ${a.type || "String"}`)
                    .join("\n");
                return `class ${name} {\n${attrs}\n}`;
            })
            .join("\n\n");

        const rels = edges
            .map((e) => {
                const a = nodes.find((n) => n.id === e.source);
                const b = nodes.find((n) => n.id === e.target);
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
        const file = `${(projectName || "proyecto").replace(/[^\w.-]+/g, "_")}.puml`;
        downloadText(file, puml);
    }, [nodes, edges, projectName]);

    // -------- IMPORTS
    const importFromPUMLText = useCallback(
        async (text) => {
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
                        .map((l) => l.trim())
                        .filter((l) => l && !l.startsWith("//") && !l.startsWith("'"))
                        .map((l) => {
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
                    if (!foundClasses.find((c) => c.name === name)) {
                        foundClasses.push({ name, attrs: [] });
                    }
                }

                // construir nodos en grilla
                const GRID_X = 260,
                    GRID_Y = 160,
                    COLS = 4;
                const nodesMap = new Map();
                const newNodes = foundClasses.map((c, i) => {
                    const id = "n_" + c.name;
                    nodesMap.set(c.name, id);
                    return {
                        id,
                        type: "classNode",
                        position: {
                            x: 60 + (i % COLS) * GRID_X,
                            y: 60 + Math.floor(i / COLS) * GRID_Y,
                        },
                        data: { label: c.name, attrs: c.attrs || [] },
                    };
                });

                // relaciones: A "mA" -- "mB" B : verbo
                const relRegex =
                    /^\s*([A-Za-z_]\w*)\s*("?)([^"]*?)\2\s*--\s*("?)([^"]*?)\4\s*([A-Za-z_]\w*)(?:\s*:\s*([^\n]+))?/gm;
                const newEdges = [];
                let r;
                while ((r = relRegex.exec(cleaned)) !== null) {
                    const aName = r[1];
                    const mA = r[3]?.trim();
                    const mB = r[5]?.trim();
                    const bName = r[6];
                    const verb = (r[7] || "").trim();

                    const aId = nodesMap.get(aName) || "n_" + aName;
                    const bId = nodesMap.get(bName) || "n_" + bName;

                    if (!nodesMap.has(aName)) {
                        nodesMap.set(aName, aId);
                        newNodes.push({
                            id: aId,
                            type: "classNode",
                            position: {
                                x: 60 + (newNodes.length % COLS) * GRID_X,
                                y: 60 + Math.floor(newNodes.length / COLS) * GRID_Y,
                            },
                            data: { label: aName, attrs: [] },
                        });
                    }
                    if (!nodesMap.has(bName)) {
                        nodesMap.set(bName, bId);
                        newNodes.push({
                            id: bId,
                            type: "classNode",
                            position: {
                                x: 60 + (newNodes.length % COLS) * GRID_X,
                                y: 60 + Math.floor(newNodes.length / COLS) * GRID_Y,
                            },
                            data: { label: bName, attrs: [] },
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
                            relType,
                        },
                    });
                }

                setNodes(newNodes);
                setEdges(newEdges);

                await ProjectsApi.updateDiagram(projectId, {
                    name: "Principal",
                    nodes: JSON.stringify(newNodes),
                    edges: JSON.stringify(newEdges),
                    viewport: null,
                });
                publishSnapshot?.();
                toast.success("PUML importado y guardado.");
            } catch (err) {
                console.error("Import PUML error:", err);
                toast.error("No se pudo importar el .puml: " + (err?.message || "desconocido"));
            }
        },
        [projectId, setNodes, setEdges, publishSnapshot, toast]
    );

    const importFromJSONText = useCallback(
        async (text) => {
            try {
                const data = JSON.parse(text);
                const n = Array.isArray(data.nodes) ? data.nodes : [];
                const e = Array.isArray(data.edges) ? data.edges : [];
                setNodes(n);
                setEdges(e);
                versionRef.current = (data.version ?? versionRef.current) || null;

                await ProjectsApi.updateDiagram(projectId, {
                    name: "Principal",
                    nodes: JSON.stringify(n),
                    edges: JSON.stringify(e),
                    viewport: null,
                });
                publishSnapshot?.();
                toast.success("Diagrama importado y guardado.");
            } catch (err) {
                console.error("Import JSON error:", err);
                toast.error("No se pudo importar el JSON: " + (err?.message || "desconocido"));
            }
        },
        [projectId, setNodes, setEdges, publishSnapshot, versionRef, toast]
    );

    // -------- IMPORT DESDE IMAGEN
    const importFromImage = useCallback(
        async (file) => {
            try {
                // Validar que sea una imagen
                const validImageTypes = ["image/png", "image/jpeg", "image/jpg"];
                if (!validImageTypes.includes(file.type)) {
                    toast.error(
                        "Formato de archivo no soportado. Por favor selecciona una imagen PNG o JPG."
                    );
                    return;
                }

                // Validar tamaño del archivo (máximo 10MB)
                const maxSize = 10 * 1024 * 1024; // 10MB
                if (file.size > maxSize) {
                    toast.error(
                        "El archivo es demasiado grande. Por favor selecciona una imagen menor a 10MB."
                    );
                    return;
                }

                setLoading(true);

                // Enviar la imagen al backend para procesamiento
                await ProjectsApi.uploadDiagramImage(projectId, file);

                toast.success(
                    "Imagen enviada para procesamiento. El diagrama se actualizará automáticamente."
                );
            } catch (err) {
                console.error("Import image error:", err);
                toast.error("No se pudo procesar la imagen: " + (err?.message || "desconocido"));
            } finally {
                setLoading(false);
            }
        },
        [projectId, setLoading, toast]
    );

    return {
        versionRef,
        // loading, // Ya no se devuelve, se gestiona externamente
        // saving, // Ya no se devuelve, se gestiona externamente
        persistNow,
        exportJSON,
        exportPUML,
        importFromJSONText,
        importFromPUMLText,
        importFromImage,
    };
}
