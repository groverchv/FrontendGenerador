import React, { useEffect, useRef, useState } from "react";

export default function Iaclase({ open, onClose, onSubmit }) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [interim, setInterim] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recognitionRef = useRef(null);
  const LANG = "es-BO";

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    setSupported(true);

    const rec = new SR();
    rec.lang = LANG;
    rec.interimResults = true;
    rec.continuous = true;

    rec.onresult = (e) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalChunk += transcript;
        else interimChunk += transcript;
      }
      if (finalChunk) {
        const needsSpace = text && !text.endsWith(" ");
        setText((prev) => prev + (needsSpace ? " " : "") + finalChunk.trim());
      }
      setInterim(interimChunk);
    };

    rec.onerror = (e) => { setErrorMsg(e.error || "Error de reconocimiento de voz."); setListening(false); };
    rec.onend = () => { setListening(false); setInterim(""); };

    recognitionRef.current = rec;
    return () => {
      try { rec.onresult = null; rec.onerror = null; rec.onend = null; rec.stop(); } catch (e) {
        console.warn("Error cleaning up speech recognition:", e);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;

  const stopListening = () => {
    const rec = recognitionRef.current;
    if (rec) { 
      try { 
        rec.stop(); 
      } catch (e) {
        console.warn("Error stopping recognition:", e);
      }
    }
    setListening(false);
    setInterim("");
  };

  const toggleListening = () => {
    if (!supported || isSubmitting) return;
    setErrorMsg("");
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening) {
      stopListening();
    } else {
      try { setListening(true); rec.start(); }
      catch (err) { setListening(false); setErrorMsg("No se pudo iniciar el micrófono. " + (err?.message || "")); }
    }
  };

  const handleSubmit = async () => {
    const payload = text.trim();
    if (!payload) return;
    if (listening) stopListening();
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const result = await Promise.resolve(onSubmit?.(payload));
      if (result === false) { setErrorMsg("No se pudo generar con IA."); return; }
      setText(""); setInterim("");
    } catch (err) {
      setErrorMsg(err?.message || "Error al generar con IA.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
      <div className="bg-white w-[720px] max-w-[95vw] rounded-xl shadow-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Generar/Completar diagrama con IA</h3>
          <button onClick={onClose} className="px-2 py-1 rounded-md border hover:bg-gray-50" disabled={isSubmitting}>✕</button>
        </div>

        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleListening}
              disabled={!supported || isSubmitting}
              className={`px-3 py-1.5 rounded-md border font-medium transition
                ${listening ? "bg-red-50 border-red-300 text-red-700" : "hover:bg-gray-50"}
                ${!supported || isSubmitting ? "opacity-60 cursor-not-allowed" : ""}`}
              title={supported ? (listening ? "Detener dictado" : "Empezar dictado") : "Web Speech API no soportada"}
            >
              {listening ? "🎙️ Grabando..." : "🎤 Dictar"}
            </button>

            <button
              onClick={() => { setText(""); setInterim(""); }}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-md border hover:bg-gray-50 disabled:opacity-60"
              title="Limpiar texto"
            >
              Limpiar
            </button>
          </div>

          {!supported && (
            <span className="text-sm text-amber-700">
              Tu navegador no soporta entrada por voz (Web Speech API).
            </span>
          )}
        </div>

        <textarea
          className="w-full h-52 border rounded-md p-2"
          placeholder={`🎯 CAPACIDADES COMPLETAS:

CRUD SIMPLE:
• Crear entidad Usuario(id Integer, nombre String, email String)
• Agregar atributo telefono String a Usuario
• Eliminar atributo email de Usuario
• Renombrar atributo telefono a celular
• Eliminar entidad Cliente

RELACIONES (5 tipos):
• Relación Usuario 1 - * Pedido (verbo: realiza)
• N-M Usuario y Rol join Usuario_Rol
• Herencia Empleado -> Persona
• Dependencia Servicio -> Repositorio
• Composición Pedido 1 - * DetallePedido [lado A]
• Eliminar relación entre Usuario y Rol

SISTEMAS COMPLETOS:
• Crear sistema de ventas
• Crear sistema de ecommerce
• Crear sistema de biblioteca
• Crear sistema de hospital
• Crear sistema de escuela
• Crear sistema de restaurante`}
          value={text + (interim ? (text && !text.endsWith(" ") ? " " : "") + interim : "")}
          onChange={(e) => { setText(e.target.value); setInterim(""); }}
          disabled={isSubmitting}
        />

        {errorMsg && (
          <div className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2">
            {errorMsg}
          </div>
        )}

        <div className="mt-3 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-md border hover:bg-gray-50 disabled:opacity-60" disabled={isSubmitting}>
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !text.trim()}
            className="px-4 py-2 rounded-md bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60"
          >
            {isSubmitting ? "Generando…" : "Generar con IA"}
          </button>
        </div>

        <div className="mt-2 text-xs text-gray-500">
          <strong>💡 Tip de dictado:</strong> Habla claramente, por ejemplo: "Crear entidad Producto con id Integer, nombre String y precio BigDecimal".
          <br />
          <strong>📌 Importante:</strong> El generador crea solo lo que pides. Para un sistema completo, di "crear sistema de ventas". Para una entidad simple, di "crear entidad Usuario".
        </div>
      </div>
    </div>
  );
}
