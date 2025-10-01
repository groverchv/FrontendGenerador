// src/api/socket.js
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client/dist/sockjs";
import api, { API_BASE_URL } from "./api"; // ajusta la ruta si tu axios vive en otro lado

// Base del backend (misma que axios)
const API_BASE = (api?.defaults?.baseURL || API_BASE_URL || window.location.origin).replace(
  /\/+$/,
  ""
);
const SOCKJS_URL = `${API_BASE}/ws`;

export class Sockend {
  constructor({
    debug = false,
    heartbeatOutgoing = 10000,
    heartbeatIncoming = 10000,
    reconnectDelay = 500, // ms
  } = {}) {
    this.debug = debug;
    this.heartbeatOutgoing = heartbeatOutgoing;
    this.heartbeatIncoming = heartbeatIncoming;
    this.reconnectDelay = reconnectDelay;

    this.client = null;
    this._connected = false;

    this._topicSubs = new Map(); // topic -> { stompSub, handlers:Set, idToHandler:Map }
    this._idToTopic = new Map(); // subId -> topic
    this._onConnectCbs = new Set();
    this._outbox = []; // [{ destination, body }]
  }

  async connect() {
    if (this.client && this._connected) return;

    this.client = new Client({
      // ⚡ Forzamos WebSocket puro (sin long-polling) para menor latencia
      webSocketFactory: () => new SockJS(SOCKJS_URL, undefined, { transports: ["websocket"] }),
      reconnectDelay: this.reconnectDelay,
      heartbeatIncoming: this.heartbeatIncoming,
      heartbeatOutgoing: this.heartbeatOutgoing,

      // Siempre función (evita "this.debug is not a function")
      debug: (msg) => {
        if (this.debug) console.log(msg);
      },

      onStompError: (frame) => {
        console.error("[Sockend] STOMP error:", frame.headers, frame.body);
      },
      onWebSocketClose: () => {
        this._connected = false;
        if (this.debug) console.log("[Sockend] websocket closed");
      },
    });

    return new Promise((resolve, reject) => {
      const to = setTimeout(() => reject(new Error("WS connect timeout")), 10000);

      this.client.onConnect = () => {
        clearTimeout(to);
        this._connected = true;

        // Re-suscribir temas existentes
        for (const topic of this._topicSubs.keys()) this._ensureTopicSubscription(topic);

        // Enviar mensajes pendientes
        this._flushOutbox();

        // Callbacks post-conexión
        for (const cb of this._onConnectCbs) {
          try {
            cb();
          } catch (e) {
            console.error("[Sockend] onConnect cb error", e);
          }
        }

        if (this.debug) console.log("[Sockend] connected");
        resolve();
      };

      this.client.activate();
    });
  }

  onConnect(cb) {
    this._onConnectCbs.add(cb);
    return () => this._onConnectCbs.delete(cb);
  }

  _ensureTopicSubscription(topic) {
    const bag = this._topicSubs.get(topic);
    if (!bag || bag.stompSub || !this.client || !this._connected) return;

    const stompSub = this.client.subscribe(topic, (frame) => {
      let payload = null;
      try {
        payload = JSON.parse(frame.body);
      } catch {
        payload = frame.body;
      }
      for (const h of bag.handlers) {
        try {
          h(payload);
        } catch (e) {
          console.error("[Sockend] handler error:", e);
        }
      }
    });

    bag.stompSub = stompSub;
    this._idToTopic.set(stompSub.id, topic);
  }

  subscribe(topic, handler) {
    if (!this._topicSubs.has(topic)) {
      this._topicSubs.set(topic, { stompSub: null, handlers: new Set(), idToHandler: new Map() });
    }
    const bag = this._topicSubs.get(topic);
    bag.handlers.add(handler);

    const id = `${topic}::${Math.random().toString(36).slice(2)}`;
    bag.idToHandler.set(id, handler);

    this._ensureTopicSubscription(topic);
    this._idToTopic.set(id, topic);
    return id;
  }

  unsubscribe(idOrTopic) {
    const topic = this._idToTopic.get(idOrTopic) || idOrTopic;
    const bag = this._topicSubs.get(topic);
    if (!bag) return;

    if (typeof idOrTopic === "string" && idOrTopic.includes("::")) {
      const h = bag.idToHandler.get(idOrTopic);
      if (h) {
        bag.handlers.delete(h);
        bag.idToHandler.delete(idOrTopic);
      }
    } else {
      bag.handlers.clear();
      bag.idToHandler.clear();
    }

    if (bag.handlers.size === 0) {
      if (bag.stompSub) {
        try {
          bag.stompSub.unsubscribe();
        } catch {}
      }
      this._topicSubs.delete(topic);
    }
    this._idToTopic.delete(idOrTopic);
  }

  send(destination, body, { critical = false } = {}) {
    const payload = typeof body === "string" ? body : JSON.stringify(body);

    if (!this.client || !this._connected) {
      if (critical) this._enqueue(destination, payload);
      return;
    }
    try {
      this.client.publish({ destination, body: payload });
    } catch (e) {
      if (critical) this._enqueue(destination, payload);
    }
  }

  _enqueue(destination, body) {
    // Last-write-wins por destino (ideal para snapshots/patches)
    const idx = this._outbox.findIndex((m) => m.destination === destination);
    if (idx >= 0) this._outbox[idx] = { destination, body };
    else this._outbox.push({ destination, body });
  }

  _flushOutbox() {
    if (!this._connected) return;
    while (this._outbox.length) {
      const { destination, body } = this._outbox.shift();
      try {
        this.client.publish({ destination, body });
      } catch {}
    }
  }

  close() {
    try {
      for (const [, bag] of this._topicSubs) {
        if (bag.stompSub) bag.stompSub.unsubscribe();
      }
    } catch {}
    this._topicSubs.clear();
    this._idToTopic.clear();
    this._onConnectCbs.clear();
    this._outbox = [];

    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    this._connected = false;
  }
}
