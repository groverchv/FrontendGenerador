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
    if (!SR) {
      setSupported(false);
      return;
    }
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
        if (e.results[i].isFinal) {
          finalChunk += transcript;
        } else {
          interimChunk += transcript;
        }
      }

      if (finalChunk) {
        const needsSpace = text && !text.endsWith(" ");
        setText((prev) => prev + (needsSpace ? " " : "") + finalChunk.trim());
      }
      setInterim(interimChunk);
    };

    rec.onerror = (e) => {
      setErrorMsg(e.error || "Error de reconocimiento de voz.");
      setListening(false);
    };

    rec.onend = () => {
      setListening(false);
      setInterim("");
    };

    recognitionRef.current = rec;

    return () => {
      try {
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.stop();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;

  const stopListening = () => {
    const rec = recognitionRef.current;
    if (rec) {
      try { rec.stop(); } catch {}
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
      try {
        setListening(true);
        rec.start();
      } catch (err) {
        setListening(false);
        setErrorMsg("No se pudo iniciar el micrófono. " + (err?.message || ""));
      }
    }
  };

  const handleSubmit = async () => {
    const payload = text.trim();
    if (!payload) return;

    // Detenemos el dictado mientras enviamos
    if (listening) stopListening();

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const result = await Promise.resolve(onSubmit?.(payload));
      // Regla: si devuelve false => fallo
      if (result === false) {
        setErrorMsg("No se pudo generar con IA.");
        return; // NO limpiamos
      }
      // Éxito: limpiamos entrada
      setText("");
      setInterim("");
    } catch (err) {
      setErrorMsg(err?.message || "Error al generar con IA.");
      // NO limpiamos en error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
      <div className="bg-white w-[720px] max-w-[95vw] rounded-xl shadow-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Generar/Completar diagrama con IA</h3>
          <button
            onClick={onClose}
            className="px-2 py-1 rounded-md border hover:bg-gray-50"
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleListening}
              disabled={!supported || isSubmitting}
              className={`px-3 py-1.5 rounded-md border font-medium transition
                ${listening ? "bg-red-50 border-red-300 text-red-700" : "hover:bg-gray-50"}
                ${!supported || isSubmitting ? "opacity-60 cursor-not-allowed" : ""}`}
              title={supported ? (listening ? "Detener dictado" : "Empezar dictado") : "Reconocimiento de voz no soportado"}
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
          placeholder={`Ejemplos:
- Crea Usuario(id Integer, nombre String, telefono Integer) y Entidad2(id Integer, nombre String, numero Integer)
- Relación Usuario 1–N Entidad2 (verbo: tiene)
- Agrega relación N–M entre Usuario y Rol con join Usuario_Rol
- Añade atributo estado Boolean a Usuario`}
          value={text + (interim ? (text && !text.endsWith(" ") ? " " : "") + interim : "")}
          onChange={(e) => {
            setText(e.target.value);
            setInterim("");
          }}
          disabled={isSubmitting}
        />

        {errorMsg && (
          <div className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2">
            {errorMsg}
          </div>
        )}

        <div className="mt-3 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border hover:bg-gray-50 disabled:opacity-60"
            disabled={isSubmitting}
          >
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
          Sugerencia: habla en frases como “Crear entidad Producto con id Integer, nombre String…”.
          Si ves “Grabando…”, el dictado está activo. Pausa con el mismo botón.
        </div>
      </div>
    </div>
  );
}
