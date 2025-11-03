// src/api/socketUtils.js

/**
 * Utilidades para mejorar el manejo de websockets
 */

export class ConnectionMonitor {
  constructor(debug = false) {
    this.debug = debug;
    this.startTime = null;
    this.reconnectCount = 0;
    this.lastError = null;
    this.connectionHistory = [];
  }

  onConnectAttempt(url) {
    this.startTime = Date.now();
    if (this.debug) {
      console.log(`[ConnectionMonitor] Intentando conectar a: ${url}`);
    }
  }

  onConnectSuccess(url) {
    const duration = Date.now() - this.startTime;
    this.connectionHistory.push({
      url,
      success: true,
      duration,
      timestamp: new Date().toISOString(),
    });
    
    if (this.debug) {
      console.log(`[ConnectionMonitor] ✅ Conectado en ${duration}ms`);
    }
    
    this.reconnectCount = 0;
  }

  onConnectFail(url, error) {
    const duration = Date.now() - this.startTime;
    this.lastError = error;
    this.connectionHistory.push({
      url,
      success: false,
      duration,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    
    if (this.debug) {
      console.warn(`[ConnectionMonitor] ❌ Falló en ${duration}ms:`, error.message);
    }
  }

  onReconnect() {
    this.reconnectCount++;
    if (this.debug) {
      console.log(`[ConnectionMonitor] 🔄 Reconexión #${this.reconnectCount}`);
    }
  }

  getStats() {
    const successful = this.connectionHistory.filter(c => c.success);
    const failed = this.connectionHistory.filter(c => !c.success);
    
    return {
      totalAttempts: this.connectionHistory.length,
      successful: successful.length,
      failed: failed.length,
      reconnectCount: this.reconnectCount,
      lastError: this.lastError,
      avgConnectionTime: successful.length > 0
        ? successful.reduce((sum, c) => sum + c.duration, 0) / successful.length
        : 0,
    };
  }
}

/**
 * Cola de mensajes con prioridad y retry
 */
export class MessageQueue {
  constructor(maxRetries = 3, debug = false) {
    this.queue = [];
    this.maxRetries = maxRetries;
    this.debug = debug;
    this.sent = 0;
    this.failed = 0;
  }

  enqueue(destination, body, priority = 0) {
    const message = {
      destination,
      body,
      priority,
      retries: 0,
      timestamp: Date.now(),
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    };

    // Insertar en orden de prioridad
    const index = this.queue.findIndex(m => m.priority < priority);
    if (index === -1) {
      this.queue.push(message);
    } else {
      this.queue.splice(index, 0, message);
    }

    if (this.debug) {
      console.log(`[MessageQueue] Encolado (${this.queue.length} en cola):`, destination);
    }

    return message.id;
  }

  dequeue() {
    return this.queue.shift();
  }

  retry(message) {
    message.retries++;
    if (message.retries < this.maxRetries) {
      this.enqueue(message.destination, message.body, message.priority);
      return true;
    }
    this.failed++;
    if (this.debug) {
      console.error(`[MessageQueue] ❌ Mensaje descartado tras ${message.retries} intentos:`, message.destination);
    }
    return false;
  }

  markSent() {
    this.sent++;
    if (this.debug) {
      console.log(`[MessageQueue] ✅ Mensaje enviado. Total: ${this.sent}`);
    }
  }

  clear() {
    const count = this.queue.length;
    this.queue = [];
    if (this.debug && count > 0) {
      console.warn(`[MessageQueue] Cola limpiada (${count} mensajes descartados)`);
    }
  }

  get size() {
    return this.queue.length;
  }

  getStats() {
    return {
      pending: this.queue.length,
      sent: this.sent,
      failed: this.failed,
      oldestPending: this.queue[0]?.timestamp
        ? Date.now() - this.queue[0].timestamp
        : 0,
    };
  }
}

/**
 * Detector de latencia para optimizar throttle/debounce
 */
export class LatencyDetector {
  constructor(sampleSize = 10) {
    this.samples = [];
    this.sampleSize = sampleSize;
  }

  addSample(latencyMs) {
    this.samples.push(latencyMs);
    if (this.samples.length > this.sampleSize) {
      this.samples.shift();
    }
  }

  getAverageLatency() {
    if (this.samples.length === 0) return 0;
    return this.samples.reduce((sum, s) => sum + s, 0) / this.samples.length;
  }

  getRecommendedThrottle() {
    const avg = this.getAverageLatency();
    
    // Ajustar throttle según latencia
    if (avg < 50) return 30;        // Red excelente
    if (avg < 100) return 60;       // Red buena
    if (avg < 200) return 100;      // Red regular
    if (avg < 500) return 200;      // Red lenta
    return 300;                     // Red muy lenta
  }

  getQuality() {
    const avg = this.getAverageLatency();
    if (avg < 50) return "excellent";
    if (avg < 100) return "good";
    if (avg < 200) return "fair";
    if (avg < 500) return "poor";
    return "very-poor";
  }
}

/**
 * Validador de mensajes antes de enviar
 */
export class MessageValidator {
  static validate(destination, body) {
    const errors = [];

    if (!destination || typeof destination !== "string") {
      errors.push("Destination debe ser un string no vacío");
    }

    if (body === undefined || body === null) {
      errors.push("Body no puede ser undefined o null");
    }

    // Validar tamaño del mensaje (ej: max 1MB)
    const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
    const sizeKB = new Blob([bodyStr]).size / 1024;
    
    if (sizeKB > 1024) {
      errors.push(`Mensaje demasiado grande: ${sizeKB.toFixed(2)}KB (máx 1MB)`);
    }

    return {
      valid: errors.length === 0,
      errors,
      sizeKB,
    };
  }

  static canSend(destination, body) {
    return this.validate(destination, body).valid;
  }
}
