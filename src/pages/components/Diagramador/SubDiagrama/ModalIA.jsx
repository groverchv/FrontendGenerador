// src/views/proyectos/Diagramador/SubDiagrama/ModalIA.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// MODAL DE ASISTENTE PARA DIAGRAMAS UML
// ═══════════════════════════════════════════════════════════════════════════════
// Este componente integra el nuevo sistema de Asistente con capacidades
// completas de CRUD para entidades, atributos y relaciones.

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Wand2, X, Mic, MicOff, Eraser,
  Send, Clock, Lightbulb, Info, ChevronDown,
  ChevronUp, Loader2, Check, AlertTriangle, Settings,
  Keyboard, Cpu, Code, GitBranch, Database, Star
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 INSTRUCCIONES DEL SISTEMA PARA LA IA
// ═══════════════════════════════════════════════════════════════════════════════
const SYSTEM_INSTRUCTIONS = `
# 🤖 ASISTENTE IA PARA DIAGRAMAS UML - INSTRUCCIONES

Eres un asistente experto en modelado UML y bases de datos. Tu trabajo es interpretar
comandos en lenguaje natural y generar acciones estructuradas para modificar diagramas.

## ACCIONES DISPONIBLES:

### 1. ENTIDADES (add_entity, remove_entity, rename_entity)
\`\`\`json
{ "action": "add_entity", "name": "Usuario", "attrs": [{"name": "id", "type": "Long"}, {"name": "nombre", "type": "String"}] }
{ "action": "remove_entity", "name": "Usuario" }
{ "action": "rename_entity", "from": "Usuario", "to": "Cliente" }
\`\`\`

### 2. ATRIBUTOS (add_attr, remove_attr, update_attr)
\`\`\`json
{ "action": "add_attr", "entity": "Usuario", "name": "email", "type": "String" }
{ "action": "remove_attr", "entity": "Usuario", "name": "email" }
{ "action": "update_attr", "entity": "Usuario", "oldName": "email", "newName": "correo", "type": "String" }
\`\`\`

### 3. RELACIONES (add_relation, remove_relation)
Tipos: ASSOC (asociación), AGGR (agregación), COMP (composición), INHERIT (herencia), DEPEND (dependencia)
\`\`\`json
{ "action": "add_relation", "from": "Usuario", "to": "Pedido", "mA": "1", "mB": "*", "relKind": "ASSOC", "verb": "realiza" }
{ "action": "add_relation", "from": "Factura", "to": "DetalleFactura", "mA": "1", "mB": "*", "relKind": "COMP" }
{ "action": "add_relation", "from": "Admin", "to": "Usuario", "relKind": "INHERIT" }
{ "action": "remove_relation", "from": "Usuario", "to": "Pedido" }
\`\`\`

### 4. RELACIONES N-M (add_relation_nm)
\`\`\`json
{ "action": "add_relation_nm", "entityA": "Usuario", "entityB": "Rol", "joinTable": "Usuario_Rol" }
\`\`\`

## TIPOS DE DATOS VÁLIDOS:
- Primitivos: String, Integer, Long, Double, Float, Boolean, BigDecimal
- Fechas: LocalDate, LocalDateTime, LocalTime, Date
- Colecciones: List, Set, Map
- Especiales: UUID, byte[]

## MULTIPLICIDADES:
- "1" = Exactamente uno
- "*" = Muchos (0 o más)
- "0..1" = Cero o uno
- "1..*" = Uno o más

## EJEMPLOS DE INTERPRETACIÓN:

Usuario dice: "Crear entidad Usuario con nombre y email"
→ { "action": "add_entity", "name": "Usuario", "attrs": [{"name": "id", "type": "Long"}, {"name": "nombre", "type": "String"}, {"name": "email", "type": "String"}] }

Usuario dice: "Usuario tiene muchos Pedidos"
→ { "action": "add_relation", "from": "Usuario", "to": "Pedido", "mA": "1", "mB": "*", "relKind": "ASSOC", "verb": "tiene" }

Usuario dice: "Admin extiende Usuario"
→ { "action": "add_relation", "from": "Admin", "to": "Usuario", "relKind": "INHERIT" }

Usuario dice: "Factura se compone de DetalleFactura"
→ { "action": "add_relation", "from": "Factura", "to": "DetalleFactura", "mA": "1", "mB": "*", "relKind": "COMP" }

## RESPUESTA:
Responde SOLO con JSON válido. Formato:
{
  "actions": [ ... array de acciones ... ],
  "explanation": "Breve explicación de lo que se hizo"
}
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 EJEMPLOS DE COMANDOS POR CATEGORÍA
// ═══════════════════════════════════════════════════════════════════════════════
const EJEMPLOS_COMANDOS = {
  "🏗️ Entidades": [
    "Crear entidad Usuario con nombre String y email String",
    "Crear entidad Producto(id Long, nombre String, precio BigDecimal)",
    "Renombrar entidad Usuario a Cliente",
    "Eliminar entidad Temporal",
  ],
  "📝 Atributos": [
    "Agregar atributo telefono String a Usuario",
    "Agregar id Long como clave primaria a Producto",
    "Cambiar tipo de precio a Double en Producto",
    "Eliminar atributo temporal de Usuario",
  ],
  "🔗 Relaciones": [
    "Relacionar de Usuario a Pedido",
    "Relacionar Cliente con Direccion",
    "Herencia de Empleado a Persona",
    "Herencia de Admin a Usuario",
    "Componente de DetallePedido a Pedido",
    "Composición de Item a Factura",
    "Agregación de Profesor a Departamento",
    "Dependencia de Controller a Service",
  ],
  "🔄 N-M": [
    "Crear relación muchos a muchos entre Usuario y Rol",
    "Estudiante y Curso con tabla intermedia Inscripcion",
  ],
  "🏢 Sistemas": [
    "Crear sistema de ventas completo",
    "Crear sistema de biblioteca",
    "Crear sistema de hospital",
    "Crear diagrama de e-commerce",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function ModalIA({ open, onClose, onSubmit, currentModel }) {
  // Estados
  const [texto, setTexto] = useState("");
  const [grabando, setGrabando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [mostrarEjemplos, setMostrarEjemplos] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [categoriaActiva, setCategoriaActiva] = useState("🏗️ Entidades");

  // Referencias
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);

  // Cargar historial
  useEffect(() => {
    const saved = localStorage.getItem("ia_historial_comandos");
    if (saved) {
      try {
        setHistorial(JSON.parse(saved).slice(0, 15));
      } catch {
        // Ignorar
      }
    }
  }, []);

  // Guardar en historial
  const guardarHistorial = useCallback((cmd, exito) => {
    const nuevo = [
      { texto: cmd, fecha: new Date().toISOString(), exito },
      ...historial.filter((h) => h.texto !== cmd),
    ].slice(0, 15);
    setHistorial(nuevo);
    localStorage.setItem("ia_historial_comandos", JSON.stringify(nuevo));
  }, [historial]);

  // Inicializar reconocimiento de voz
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.lang = "es-ES";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          final += e.results[i][0].transcript;
        }
      }
      if (final) {
        setTexto((prev) => (prev ? prev + " " : "") + final.trim());
      }
    };

    rec.onerror = () => setGrabando(false);
    rec.onend = () => setGrabando(false);

    recognitionRef.current = rec;

    return () => {
      try {
        rec.stop();
      } catch {
        // Ignorar
      }
    };
  }, []);

  // Toggle grabación
  const toggleGrabacion = () => {
    if (!recognitionRef.current) {
      setError("Tu navegador no soporta reconocimiento de voz");
      return;
    }

    if (grabando) {
      recognitionRef.current.stop();
      setGrabando(false);
    } else {
      try {
        recognitionRef.current.start();
        setGrabando(true);
        setError(null);
      } catch (err) {
        setError("No se pudo iniciar el micrófono: " + err.message);
      }
    }
  };

  // Procesar comando
  const procesarComando = async () => {
    if (!texto.trim() || procesando) return;

    setProcesando(true);
    setError(null);
    setResultado(null);

    // Detener grabación si está activa
    if (grabando && recognitionRef.current) {
      recognitionRef.current.stop();
      setGrabando(false);
    }

    try {
      const result = await onSubmit(texto.trim());

      if (result === false) {
        setError("No se pudo procesar el comando. Intenta ser más específico.");
        guardarHistorial(texto, false);
      } else {
        setResultado({
          mensaje: "¡Comando ejecutado correctamente!",
          exito: true,
        });
        guardarHistorial(texto, true);

        // Limpiar después de éxito
        setTimeout(() => {
          setTexto("");
          setResultado(null);
        }, 1500);
      }
    } catch (err) {
      setError(err.message || "Error al procesar el comando");
      guardarHistorial(texto, false);
    } finally {
      setProcesando(false);
    }
  };

  // Usar ejemplo
  const usarEjemplo = (ejemplo) => {
    setTexto(ejemplo);
    setMostrarEjemplos(false);
    textareaRef.current?.focus();
  };

  // Usar comando del historial
  const usarHistorial = (cmd) => {
    setTexto(cmd);
    setMostrarHistorial(false);
    textareaRef.current?.focus();
  };

  // Manejar teclas
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      procesarComando();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* ═══ HEADER ═══ */}
        <div className="bg-slate-800 text-white p-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-xl">Asistente de Diagramas</h3>
                <p className="text-sm text-slate-400">
                  Crea y edita tu diagrama UML con lenguaje natural
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              disabled={procesando}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stats del modelo actual */}
          {currentModel && (
            <div className="mt-3 flex gap-4 text-sm">
              <span className="bg-white/10 px-3 py-1 rounded-full">
                {currentModel.entities?.length || 0} entidades
              </span>
              <span className="bg-white/10 px-3 py-1 rounded-full">
                {currentModel.relations?.length || 0} relaciones
              </span>
            </div>
          )}
        </div>

        {/* ═══ CONTENT ═══ */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Botones de ayuda */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setMostrarEjemplos(!mostrarEjemplos);
                setMostrarHistorial(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                mostrarEjemplos
                  ? "bg-amber-100 text-amber-700 ring-2 ring-amber-300"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Lightbulb className={`w-4 h-4 ${mostrarEjemplos ? "text-amber-500" : ""}`} />
              Ver Ejemplos
            </button>

            <button
              onClick={() => {
                setMostrarHistorial(!mostrarHistorial);
                setMostrarEjemplos(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                mostrarHistorial
                  ? "bg-slate-200 text-slate-700 ring-2 ring-slate-300"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Clock className="w-4 h-4" />
              Historial ({historial.length})
            </button>
          </div>

          {/* Panel de ejemplos */}
          {mostrarEjemplos && (
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
              <div className="flex items-center gap-2 mb-3">
                <Star className="text-amber-500 w-4 h-4" />
                <h4 className="font-semibold text-amber-800">Ejemplos de Comandos</h4>
              </div>

              {/* Tabs de categorías */}
              <div className="flex flex-wrap gap-2 mb-3 border-b border-amber-200 pb-3">
                {Object.keys(EJEMPLOS_COMANDOS).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoriaActiva(cat)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      categoriaActiva === cat
                        ? "bg-slate-800 text-white shadow-md"
                        : "bg-white text-amber-700 hover:bg-amber-100"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Lista de ejemplos */}
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {EJEMPLOS_COMANDOS[categoriaActiva]?.map((ej, i) => (
                  <button
                    key={i}
                    onClick={() => usarEjemplo(ej)}
                    className="w-full text-left p-3 bg-white rounded-xl border border-amber-100 hover:border-amber-300 hover:shadow-md transition-all group"
                  >
                    <code className="text-amber-700 text-sm">{ej}</code>
                    <span className="float-right text-xs text-amber-400 opacity-0 group-hover:opacity-100">
                      Click para usar
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Panel de historial */}
          {mostrarHistorial && historial.length > 0 && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Comandos Recientes
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {historial.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => usarHistorial(h.texto)}
                    className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all ${
                      h.exito
                        ? "bg-green-100 hover:bg-green-200 border border-green-200"
                        : "bg-red-100 hover:bg-red-200 border border-red-200"
                    }`}
                  >
                    {h.exito ? (
                      <Check className="text-green-600 flex-shrink-0 w-4 h-4" />
                    ) : (
                      <AlertTriangle className="text-red-600 flex-shrink-0 w-4 h-4" />
                    )}
                    <span className="flex-1 truncate text-sm">{h.texto}</span>
                    <span className="text-xs opacity-60">
                      {new Date(h.fecha).toLocaleTimeString()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Textarea principal */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Escribe tu comando en lenguaje natural...

Ejemplos:
• "Crear entidad Usuario con nombre, email y password"
• "Usuario tiene muchos Pedidos"
• "Admin extiende Usuario"
• "Crear sistema de ventas completo"

Presiona Enter para ejecutar o Shift+Enter para nueva línea`}
              className={`w-full p-4 pr-28 border-2 rounded-2xl resize-none focus:outline-none transition-all min-h-[160px] text-gray-800 ${
                grabando
                  ? "border-red-400 bg-red-50 ring-4 ring-red-200"
                  : "border-gray-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
              }`}
              disabled={procesando}
            />

            {/* Botones flotantes */}
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button
                onClick={toggleGrabacion}
                disabled={procesando}
                className={`p-3 rounded-xl transition-all shadow-lg ${
                  grabando
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                title={grabando ? "Detener dictado" : "Dictar comando"}
              >
                {grabando ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>

              <button
                onClick={() => setTexto("")}
                disabled={!texto || procesando}
                className="p-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all disabled:opacity-50 shadow-lg"
                title="Limpiar"
              >
                <Eraser className="w-5 h-5" />
              </button>
            </div>

            {/* Indicador de grabación */}
            {grabando && (
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm animate-pulse">
                <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                Grabando...
              </div>
            )}
          </div>

          {/* Resultado o error */}
          {resultado && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3 animate-fadeIn">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="text-green-600 w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-green-700">{resultado.mensaje}</p>
                <p className="text-sm text-green-600">El diagrama ha sido actualizado</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-red-600 w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-red-700">Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <Info className="text-gray-400 mt-0.5 flex-shrink-0 w-4 h-4" />
              <div>
                <p className="font-medium text-gray-700 mb-1">Consejos:</p>
                <ul className="space-y-1 text-xs">
                  <li>
                    • <kbd className="px-1.5 py-0.5 bg-gray-200 rounded">Enter</kbd> para ejecutar, <kbd className="px-1.5 py-0.5 bg-gray-200 rounded">Shift+Enter</kbd> para nueva línea
                  </li>
                  <li>• Usa el micrófono para dictar comandos por voz</li>
                  <li>• Entiende español: "texto" → String, "numero" → Integer, "precio" → BigDecimal</li>
                  <li>• Puedes crear sistemas completos: "crear sistema de ventas"</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ FOOTER ═══ */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <Keyboard className="text-gray-400 w-4 h-4" />
            <span>Enter para enviar</span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={procesando}
              className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={procesarComando}
              disabled={procesando || !texto.trim()}
              className="px-6 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg"
            >
              {procesando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

