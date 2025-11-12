// src/views/proyectos/Diagramador/SubDiagrama/useColaboracion.js
import { useMemo, useRef, useCallback, useEffect } from "react";
import { addEdge } from "reactflow";
import { debounce, throttle, findBestHandle, updateNodesWithHandleUsage } from "./utils";
import { WS_PATHS, TIMING } from "../../../../constants";

/**
 * Hook personalizado para gestión de colaboración en tiempo real
 * Maneja snapshots, cursores y suscripciones STOMP/WebSocket
 * 
 * @param {Object} props - Propiedades del hook
 * @param {Object} props.sock - Cliente WebSocket/STOMP
 * @param {string|number} props.projectId - ID del proyecto
 * @param {Array} props.nodes - Array de nodos del diagrama
 * @param {Array} props.edges - Array de aristas del diagrama
 * @param {Function} props.setNodes - Función para actualizar nodos
 * @param {Function} props.setEdges - Función para actualizar aristas
 * @param {Function} props.rfOnNodesChange - Handler de cambios de nodos de ReactFlow
 * @param {Function} props.rfOnEdgesChange - Handler de cambios de aristas de ReactFlow
 * @returns {Object} Handlers y funciones de colaboración
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
  // Generar ID único para este cliente
  const clientIdRef = useRef(
    Math.random().toString(36).slice(2) + Date.now().toString(36)
  );
  const versionRef = useRef(null);

  // Validar que projectId existe
  if (!projectId) {
    console.warn('[useColaboracion] projectId no proporcionado');
  }

  // Construir rutas de WebSocket de forma segura
  const topicUpdates = useMemo(() => 
    projectId ? WS_PATHS.UPDATES_TOPIC(projectId) : null, 
    [projectId]
  );
  const topicCursors = useMemo(() => 
    projectId ? WS_PATHS.CURSORS_TOPIC(projectId) : null, 
    [projectId]
  );
  const destUpdate = useMemo(() => 
    projectId ? WS_PATHS.UPDATE_DEST(projectId) : null, 
    [projectId]
  );
  const destCursor = useMemo(() => 
    projectId ? WS_PATHS.CURSOR_DEST(projectId) : null, 
    [projectId]
  );

  /**
   * Publica un snapshot del diagrama actual via WebSocket
   */
  const publishSnapshot = useCallback(() => {
    if (!sock || !destUpdate || !projectId) {
      console.warn('[useColaboracion] No se puede publicar snapshot: faltan dependencias');
      return;
    }
    
    try {
      const payload = {
        type: "diagram.snapshot",
        clientId: clientIdRef.current,
        baseVersion: versionRef.current,
        name: "Principal",
        nodes: JSON.stringify(nodes),
        edges: JSON.stringify(edges),
      };
      
      sock.send(destUpdate, payload);
    } catch (err) {
      console.error('[useColaboracion] Error publicando snapshot:', err);
    }
  }, [sock, nodes, edges, destUpdate, projectId]);

  const scheduleSnapshot = useMemo(
    () => debounce(publishSnapshot, TIMING.DEBOUNCE_DEFAULT),
    [publishSnapshot]
  );

  // ---- cursores con throttle
  const lastSeqRef = useRef(new Map());
  const seqCounterRef = useRef(0);

  /**
   * Envía la posición de un cursor con throttling
   */
  const sendMoveThrottled = useMemo(
    () =>
      throttle((id, x, y) => {
        if (!sock || !destCursor) {
          return;
        }
        
        if (typeof x !== 'number' || typeof y !== 'number' || Number.isNaN(x) || Number.isNaN(y)) {
          console.warn('[useColaboracion] Coordenadas inválidas para cursor:', { id, x, y });
          return;
        }
        
        try {
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
        } catch (err) {
          console.error('[useColaboracion] Error enviando movimiento de cursor:', err);
        }
      }, TIMING.THROTTLE_CURSOR),
    [sock, destCursor]
  );

  // ---- suscripciones
  useEffect(() => {
    if (!sock || !projectId || !topicUpdates || !topicCursors || !destUpdate) {
      console.log('[useColaboracion] Faltan dependencias para suscripciones WebSocket');
      return;
    }

    let subUpdates, subCursors, offConnect;

    try {
      // Suscripción a actualizaciones del diagrama
      subUpdates = sock.subscribe(topicUpdates, (msg) => {
        if (!msg) return;
        if (msg.clientId === clientIdRef.current) return; // Ignorar propios mensajes
        
        try {
          if (typeof msg.nodes === "string" && typeof msg.edges === "string") {
            const n = JSON.parse(msg.nodes);
            const e = JSON.parse(msg.edges);
            
            if (Array.isArray(n) && Array.isArray(e)) {
              // Actualiza nodos con uso de handles
              const updatedNodes = updateNodesWithHandleUsage(n, e);
              setNodes(updatedNodes);
              setEdges(e);
              versionRef.current = msg.version ?? versionRef.current;
            }
          }
        } catch (parseErr) {
          console.error('[useColaboracion] Error parseando mensaje de actualización:', parseErr);
        }
      });

      // Suscripción a cursores de otros usuarios
      subCursors = sock.subscribe(topicCursors, (msg) => {
        const isMove = msg?.type === "diagram.move" || msg?.t === "c";
        if (!isMove) return;
        if (msg.clientId === clientIdRef.current) return; // Ignorar propios cursores

        const id = String(msg.id);
        const x = Number(msg.x);
        const y = Number(msg.y);
        
        if (!id || Number.isNaN(x) || Number.isNaN(y)) {
          return; // Datos inválidos
        }

        // Control de secuencia para evitar actualizaciones fuera de orden
        if (typeof msg.seq === "number") {
          const prev = lastSeqRef.current.get(id) ?? -1;
          if (msg.seq <= prev) return;
          lastSeqRef.current.set(id, msg.seq);
        }

        // Actualizar posición del nodo
        setNodes((ns) => {
          if (!Array.isArray(ns)) return ns;
          
          const map = new Map(ns.map((n) => [n.id, n]));
          const n = map.get(id);
          if (!n || !n.position) return ns;
          
          map.set(id, { ...n, position: { x, y } });
          return Array.from(map.values());
        });
      });

      // Handler de reconexión
      offConnect = sock.onConnect(() => {
        console.log('[useColaboracion] WebSocket reconectado, publicando snapshot');
        try {
          sock.send(destUpdate, {
            type: "diagram.snapshot",
            clientId: clientIdRef.current,
            baseVersion: versionRef.current,
            name: "Principal",
            nodes: JSON.stringify(nodes),
            edges: JSON.stringify(edges),
          });
        } catch (err) {
          console.error('[useColaboracion] Error en reconexión:', err);
        }
      });
    } catch (err) {
      console.error('[useColaboracion] Error en suscripciones:', err);
    }

    return () => {
      try { 
        if (subUpdates) sock.unsubscribe(subUpdates); 
      } catch (err) { 
        console.error('[useColaboracion] Error desuscribiendo updates:', err);
      }
      try { 
        if (subCursors) sock.unsubscribe(subCursors); 
      } catch (err) { 
        console.error('[useColaboracion] Error desuscribiendo cursors:', err);
      }
      try { 
        if (offConnect) offConnect(); 
      } catch (err) { 
        console.error('[useColaboracion] Error removiendo handler de conexión:', err);
      }
    };
  }, [sock, projectId, topicUpdates, topicCursors, destUpdate, nodes, edges, setNodes, setEdges]);

  // Actualiza el uso de handles cuando cambian los edges
  useEffect(() => {
    if (!Array.isArray(edges)) return;
    
    setNodes((ns) => {
      if (!Array.isArray(ns)) return ns;
      return updateNodesWithHandleUsage(ns, edges);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edges.length]);

  // ---- handlers para ReactFlow
  /**
   * Handler para cambios en los nodos
   */
  const onNodesChange = useCallback(
    (changes) => {
      if (!Array.isArray(changes)) {
        console.warn('[useColaboracion] changes no es un array');
        return;
      }
      
      try {
        // Enviar posiciones para cambios de drag
        for (const ch of changes) {
          if (ch.type === "position" && ch.dragging && ch.position) {
            sendMoveThrottled(ch.id, ch.position.x, ch.position.y);
          }
        }
        
        // Aplicar cambios a nodos
        if (typeof rfOnNodesChange === 'function') {
          rfOnNodesChange(changes);
        }
        
        // Programar snapshot solo si no son solo drags en progreso
        const onlyDragMoves = changes.every((c) => c.type === "position" && c.dragging);
        if (!onlyDragMoves) {
          scheduleSnapshot();
        }
      } catch (err) {
        console.error('[useColaboracion] Error en onNodesChange:', err);
      }
    },
    [rfOnNodesChange, sendMoveThrottled, scheduleSnapshot]
  );

  /**
   * Handler para cambios en las aristas
   */
  const onEdgesChange = useCallback(
    (changes) => {
      if (!Array.isArray(changes)) {
        console.warn('[useColaboracion] changes no es un array');
        return;
      }
      
      try {
        // Aplicar cambios a edges
        if (typeof rfOnEdgesChange === 'function') {
          rfOnEdgesChange(changes);
        }
        
        // Si hay eliminaciones, actualiza el uso de handles
        const hasRemoval = changes.some(ch => ch.type === 'remove');
        if (hasRemoval) {
          setNodes((ns) => {
            if (!Array.isArray(ns) || !Array.isArray(edges)) return ns;
            
            const remainingEdges = edges.filter(e => 
              !changes.some(ch => ch.type === 'remove' && ch.id === e.id)
            );
            return updateNodesWithHandleUsage(ns, remainingEdges);
          });
        }
        
        scheduleSnapshot();
      } catch (err) {
        console.error('[useColaboracion] Error en onEdgesChange:', err);
      }
    },
    [rfOnEdgesChange, setNodes, edges, scheduleSnapshot]
  );

  /**
   * Handler para nuevas conexiones entre nodos
   */
  const onConnect = useCallback(
    (params) => {
      if (!params || !params.source || !params.target) {
        console.warn('[useColaboracion] Parámetros de conexión inválidos');
        return;
      }
      
      try {
        // Si no hay handles específicos, busca el mejor disponible
        const sourceHandle = params.sourceHandle || findBestHandle(params.source, edges, true);
        const targetHandle = params.targetHandle || findBestHandle(params.target, edges, false);
        
        setEdges((eds) => {
          if (!Array.isArray(eds)) return eds;
          
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
        setNodes((ns) => {
          if (!Array.isArray(ns)) return ns;
          
          const newEdgeForUsage = { 
            source: params.source, 
            target: params.target,
            sourceHandle,
            targetHandle 
          };
          return updateNodesWithHandleUsage(ns, [...edges, newEdgeForUsage]);
        });
        
        scheduleSnapshot();
      } catch (err) {
        console.error('[useColaboracion] Error en onConnect:', err);
      }
    },
    [setEdges, setNodes, edges, scheduleSnapshot]
  );

  /**
   * Handler para cuando termina el drag de un nodo
   */
  const onNodeDragStop = useCallback(() => {
    try {
      publishSnapshot();
    } catch (err) {
      console.error('[useColaboracion] Error en onNodeDragStop:', err);
    }
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
