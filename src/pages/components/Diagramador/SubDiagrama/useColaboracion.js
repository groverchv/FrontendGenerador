// src/views/proyectos/Diagramador/SubDiagrama/useColaboracion.js
import { useMemo, useRef, useCallback, useEffect } from "react";
import { addEdge } from "reactflow";
import { debounce, throttle, findBestHandle, updateNodesWithHandleUsage } from "./utils";

/**
 * Maneja snapshots, cursores y suscripciones STOMP.
 * Devuelve handlers listos para pasar a ReactFlow y acciones de snapshot.
 */
export default function useColaboracion({
  sock,
  projectId,
  nodes,
  edges,
  setNodes,
  setEdges,
  rfOnNodesChange,
  rfOnEdgesChange,
}) {
  const clientIdRef = useRef(
    Math.random().toString(36).slice(2) + Date.now().toString(36)
  );
  const versionRef = useRef(null);

  const topicUpdates = useMemo(() => `/topic/projects/${projectId}`, [projectId]);
  const topicCursors = useMemo(() => `/topic/projects/${projectId}/cursors`, [projectId]);
  const destUpdate = useMemo(() => `/app/projects/${projectId}/update`, [projectId]);
  const destCursor = useMemo(() => `/app/projects/${projectId}/cursor`, [projectId]);

  const publishSnapshot = useCallback(() => {
    if (!sock) return;
    sock.send(destUpdate, {
      type: "diagram.snapshot",
      clientId: clientIdRef.current,
      baseVersion: versionRef.current,
      name: "Principal",
      nodes: JSON.stringify(nodes),
      edges: JSON.stringify(edges),
    });
  }, [sock, nodes, edges, destUpdate]);

  const scheduleSnapshot = useMemo(
    () => debounce(publishSnapshot, 250),
    [publishSnapshot]
  );

  // ---- cursores con throttle
  const lastSeqRef = useRef(new Map());
  const seqCounterRef = useRef(0);

  const sendMoveThrottled = useMemo(
    () =>
      throttle((id, x, y) => {
        if (!sock) return;
        const seq = ++seqCounterRef.current;
        sock.send(destCursor, {
          type: "diagram.move",
          clientId: clientIdRef.current,
          id,
          x,
          y,
          ts: Date.now(),
          seq,
        });
      }, 60),
    [sock, destCursor]
  );

  // ---- suscripciones
  useEffect(() => {
    if (!sock || !projectId) return;

    const subUpdates = sock.subscribe(topicUpdates, (msg) => {
      if (!msg) return;
      if (msg.clientId === clientIdRef.current) return;
      if (typeof msg.nodes === "string" && typeof msg.edges === "string") {
        try {
          const n = JSON.parse(msg.nodes);
          const e = JSON.parse(msg.edges);
          if (Array.isArray(n) && Array.isArray(e)) {
            // Actualiza nodos con uso de handles
            const updatedNodes = updateNodesWithHandleUsage(n, e);
            setNodes(updatedNodes);
            setEdges(e);
            versionRef.current = msg.version ?? versionRef.current;
          }
        } catch {
          // Ignorar errores de parseo
        }
      }
    });

    const subCursors = sock.subscribe(topicCursors, (msg) => {
      const isMove = msg?.type === "diagram.move" || msg?.t === "c";
      if (!isMove) return;
      if (msg.clientId === clientIdRef.current) return;

      const id = String(msg.id);
      const x = Number(msg.x);
      const y = Number(msg.y);
      if (!id || Number.isNaN(x) || Number.isNaN(y)) return;

      if (typeof msg.seq === "number") {
        const prev = lastSeqRef.current.get(id) ?? -1;
        if (msg.seq <= prev) return;
        lastSeqRef.current.set(id, msg.seq);
      }

      setNodes((ns) => {
        const map = new Map(ns.map((n) => [n.id, n]));
        const n = map.get(id);
        if (!n || !n.position) return ns;
        map.set(id, { ...n, position: { x, y } });
        return Array.from(map.values());
      });
    });

    const offConnect = sock.onConnect(() => {
      try {
        sock.send(destUpdate, {
          type: "diagram.snapshot",
          clientId: clientIdRef.current,
          baseVersion: versionRef.current,
          name: "Principal",
          nodes: JSON.stringify(nodes),
          edges: JSON.stringify(edges),
        });
      } catch {
        // Ignorar errores
      }
    });

    return () => {
      try { sock.unsubscribe(subUpdates); } catch { /* ignore */ }
      try { sock.unsubscribe(subCursors); } catch { /* ignore */ }
      try { offConnect?.(); } catch { /* ignore */ }
    };
  }, [sock, projectId, topicUpdates, topicCursors, destUpdate, nodes, edges, setNodes, setEdges]);

  // Actualiza el uso de handles cuando cambian los edges
  useEffect(() => {
    setNodes((ns) => updateNodesWithHandleUsage(ns, edges));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edges.length]);

  // ---- handlers para ReactFlow
  const onNodesChange = useCallback(
    (changes) => {
      for (const ch of changes) {
        if (ch.type === "position" && ch.dragging && ch.position) {
          sendMoveThrottled(ch.id, ch.position.x, ch.position.y);
        }
      }
      rfOnNodesChange(changes);
      const onlyDragMoves = changes.every((c) => c.type === "position" && c.dragging);
      if (!onlyDragMoves) scheduleSnapshot();
    },
    [rfOnNodesChange, sendMoveThrottled, scheduleSnapshot]
  );

  const onEdgesChange = useCallback(
    (changes) => {
      rfOnEdgesChange(changes);
      
      // Si hay eliminaciones, actualiza el uso de handles
      const hasRemoval = changes.some(ch => ch.type === 'remove');
      if (hasRemoval) {
        setNodes((ns) => updateNodesWithHandleUsage(ns, edges.filter(e => 
          !changes.some(ch => ch.type === 'remove' && ch.id === e.id)
        )));
      }
      
      scheduleSnapshot();
    },
    [rfOnEdgesChange, setNodes, edges, scheduleSnapshot]
  );

  const onConnect = useCallback(
    (params) => {
      // Si no hay handles específicos, busca el mejor disponible
      const sourceHandle = params.sourceHandle || findBestHandle(params.source, edges, true);
      const targetHandle = params.targetHandle || findBestHandle(params.target, edges, false);
      
      setEdges((eds) => {
        const newEdge = { 
          ...params, 
          sourceHandle,
          targetHandle,
          animated: true, 
          type: "uml", 
          data: {} 
        };
        return addEdge(newEdge, eds);
      });
      
      // Actualiza el uso de handles en los nodos
      setNodes((ns) => updateNodesWithHandleUsage(ns, [...edges, { 
        source: params.source, 
        target: params.target,
        sourceHandle,
        targetHandle 
      }]));
      
      scheduleSnapshot();
    },
    [setEdges, setNodes, edges, scheduleSnapshot]
  );

  const onNodeDragStop = useCallback(() => {
    publishSnapshot();
  }, [publishSnapshot]);

  return {
    publishSnapshot,
    scheduleSnapshot,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeDragStop,
  };
}
