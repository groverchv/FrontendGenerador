// src/pages/components/Diagramador/components/AsistenteIA/Asistente.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// ASISTENTE IA PARA CREACIÓN Y EDICIÓN DE DIAGRAMAS UML
// ═══════════════════════════════════════════════════════════════════════════════
// Componente principal que permite crear y editar diagramas usando lenguaje
// natural. Soporta: crear entidades, agregar atributos, definir relaciones,
// generar sistemas completos, etc.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Wand2, X, Mic, MicOff, Eraser, 
  Send, Clock, Lightbulb, Info, ChevronDown,
  ChevronUp, Loader2, Check, AlertTriangle, Settings,
  Keyboard, Cpu, Code, GitBranch, Database
} from 'lucide-react';

import { parseComando, detectarIntencion, obtenerSugerencias } from './ParserComandos';
import { 
  EJEMPLOS_COMANDOS, 
  TIPOS_DATOS, 
  TIPOS_RELACIONES, 
  MULTIPLICIDADES,
  getAyudaContextual,
  buildInterpretPrompt,
} from './ReglasPromt';
import { getDeltaFromUserText } from '../../services/apiGemine';

/* ═══════════════════════════════════════════════════════════════════════════════
   📝 COMPONENTE PRINCIPAL: ASISTENTE IA
   ═══════════════════════════════════════════════════════════════════════════════ */

const Asistente = ({ 
  open, 
  onClose, 
  onSubmit,
  currentModel = { entities: [], relations: [] },
  promptBuilder,
}) => {
  // Estados del componente
  const [texto, setTexto] = useState('');
  const [grabando, setGrabando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [mostrarAyuda, setMostrarAyuda] = useState(false);
  const [mostrarTipos, setMostrarTipos] = useState(false);
  const [sugerencias, setSugerencias] = useState([]);
  const [error, setError] = useState(null);
  const [modoIA, setModoIA] = useState('auto'); // 'auto', 'local', 'gemini'
  
  // Referencias
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  
  // Cargar historial del localStorage
  useEffect(() => {
    const saved = localStorage.getItem('asistente_historial');
    if (saved) {
      try {
        setHistorial(JSON.parse(saved).slice(0, 20));
      } catch {
        // Ignorar errores de parsing
      }
    }
  }, []);
  
  // Guardar historial
  const guardarHistorial = useCallback((comando, exito) => {
    const nuevoHistorial = [
      { texto: comando, fecha: new Date().toISOString(), exito },
      ...historial.filter(h => h.texto !== comando)
    ].slice(0, 20);
    
    setHistorial(nuevoHistorial);
    localStorage.setItem('asistente_historial', JSON.stringify(nuevoHistorial));
  }, [historial]);
  
  // Actualizar sugerencias mientras escribe
  useEffect(() => {
    if (texto.length > 2) {
      const nuevasSugerencias = obtenerSugerencias(texto, currentModel);
      setSugerencias(nuevasSugerencias);
    } else {
      setSugerencias([]);
    }
  }, [texto, currentModel]);
  
  // Inicializar reconocimiento de voz
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'es-ES';
      
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          setTexto(prev => prev + ' ' + finalTranscript);
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Error de reconocimiento:', event.error);
        setGrabando(false);
      };
      
      recognitionRef.current.onend = () => {
        setGrabando(false);
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);
  
  // Toggle grabación de voz
  const toggleGrabacion = () => {
    if (!recognitionRef.current) {
      setError('Tu navegador no soporta reconocimiento de voz');
      return;
    }
    
    if (grabando) {
      recognitionRef.current.stop();
      setGrabando(false);
    } else {
      recognitionRef.current.start();
      setGrabando(true);
    }
  };
  
  // Procesar el comando
  const procesarComando = async () => {
    if (!texto.trim()) return;
    
    setProcesando(true);
    setError(null);
    setResultado(null);
    
    try {
      let delta;
      
      // Intentar parsing local primero
      const resultadoLocal = parseComando(texto, currentModel);
      
      if (resultadoLocal.template) {
        // Es un template de sistema predefinido
        delta = await getDeltaFromUserText({
          text: texto,
          promptBuilder: promptBuilder || buildInterpretPrompt,
          currentModel
        });
      } else if (!resultadoLocal.needsAI && resultadoLocal.actions.length > 0 && modoIA !== 'gemini') {
        // Comando simple, usar parsing local
        delta = { actions: resultadoLocal.actions };
        setResultado({
          tipo: 'local',
          mensaje: resultadoLocal.explanation,
          acciones: resultadoLocal.actions.length
        });
      } else if (modoIA !== 'local') {
        // Comando complejo, usar IA
        delta = await getDeltaFromUserText({
          text: texto,
          promptBuilder: promptBuilder || buildInterpretPrompt,
          currentModel
        });
        setResultado({
          tipo: 'ia',
          mensaje: 'Procesado con IA',
          acciones: delta?.actions?.length || 0
        });
      } else {
        throw new Error('No se pudo interpretar el comando localmente');
      }
      
      if (delta && delta.actions && delta.actions.length > 0) {
        // Enviar las acciones al diagrama
        if (onSubmit) {
          onSubmit(delta);
        }
        guardarHistorial(texto, true);
        
        // Limpiar después de éxito
        setTimeout(() => {
          setTexto('');
          setResultado(prev => ({ ...prev, exito: true }));
        }, 500);
      } else {
        setError('No se generaron acciones. Intenta ser más específico.');
        guardarHistorial(texto, false);
      }
      
    } catch (err) {
      console.error('Error procesando comando:', err);
      setError(err.message || 'Error al procesar el comando');
      guardarHistorial(texto, false);
    } finally {
      setProcesando(false);
    }
  };
  
  // Usar comando del historial
  const usarHistorial = (comandoHistorial) => {
    setTexto(comandoHistorial);
    setMostrarHistorial(false);
    textareaRef.current?.focus();
  };
  
  // Usar ejemplo
  const usarEjemplo = (ejemplo) => {
    setTexto(ejemplo);
    setMostrarAyuda(false);
    textareaRef.current?.focus();
  };
  
  // Manejar teclas especiales
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      procesarComando();
    }
  };
  
  if (!open) return null;
  
  const intencion = detectarIntencion(texto);
  const ayudaContextual = getAyudaContextual(intencion === 'desconocido' ? null : intencion);
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* ═══ HEADER ═══ */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Asistente de Diagramas</h3>
              <p className="text-sm text-slate-400">
                {currentModel?.entities?.length || 0} entidades • {currentModel?.relations?.length || 0} relaciones
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Selector de modo */}
            <select
              value={modoIA}
              onChange={(e) => setModoIA(e.target.value)}
              className="bg-white/10 text-white text-sm rounded-lg px-2 py-1 border-none focus:ring-2 focus:ring-white/30"
            >
              <option value="auto" className="text-gray-800">Auto</option>
              <option value="local" className="text-gray-800">Solo Local</option>
              <option value="gemini" className="text-gray-800">Solo Gemini</option>
            </select>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* ═══ CONTENT ═══ */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Barra de herramientas de ayuda */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setMostrarAyuda(!mostrarAyuda)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                mostrarAyuda ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Lightbulb className="w-3 h-3" />
              Ejemplos
              {mostrarAyuda ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            
            <button
              onClick={() => setMostrarTipos(!mostrarTipos)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                mostrarTipos ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Database className="w-3 h-3" />
              Tipos de Datos
              {mostrarTipos ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            
            <button
              onClick={() => setMostrarHistorial(!mostrarHistorial)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                mostrarHistorial ? 'bg-slate-200 text-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Clock className="w-3 h-3" />
              Historial ({historial.length})
              {mostrarHistorial ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
          
          {/* Panel de ejemplos */}
          {mostrarAyuda && (
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 space-y-3">
              <h4 className="font-semibold text-amber-800 flex items-center gap-2">
                <Lightbulb className="text-amber-500 w-4 h-4" />
                {ayudaContextual.titulo}
              </h4>
              <p className="text-sm text-amber-600 bg-amber-100 px-3 py-2 rounded-lg">
                {ayudaContextual.tip}
              </p>
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                {ayudaContextual.ejemplos.map((ejemplo, i) => (
                  <button
                    key={i}
                    onClick={() => usarEjemplo(ejemplo)}
                    className="text-left text-sm p-2 bg-white rounded-lg hover:bg-amber-100 transition-colors border border-amber-100"
                  >
                    <code className="text-amber-700">{ejemplo}</code>
                  </button>
                ))}
              </div>
              
              {/* Categorías de ejemplos */}
              <div className="border-t border-amber-200 pt-3 mt-3">
                <p className="text-xs font-medium text-amber-600 mb-2">MÁS EJEMPLOS:</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(EJEMPLOS_COMANDOS).map(([cat, ejemplos]) => (
                    <button
                      key={cat}
                      onClick={() => usarEjemplo(ejemplos[0])}
                      className="text-xs px-2 py-1 bg-amber-200 text-amber-700 rounded hover:bg-amber-300"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Panel de tipos de datos */}
          {mostrarTipos && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 space-y-3">
              <h4 className="font-semibold text-blue-800 flex items-center gap-2">
                <Database className="w-4 h-4" />
                Tipos de Datos Disponibles
              </h4>
              <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                {Object.entries(TIPOS_DATOS).map(([categoria, tipos]) => (
                  <div key={categoria} className="bg-white rounded-lg p-2 border border-blue-100">
                    <h5 className="font-medium text-xs text-blue-600 uppercase mb-1">{categoria}</h5>
                    <div className="flex flex-wrap gap-1">
                      {tipos.slice(0, 5).map((t) => (
                        <span key={t.nombre} className="text-xs bg-blue-100 px-1.5 py-0.5 rounded" title={t.descripcion}>
                          {t.nombre}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Tipos de relaciones */}
              <div className="border-t border-blue-200 pt-3">
                <h5 className="font-medium text-xs text-blue-600 uppercase mb-2">RELACIONES</h5>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(TIPOS_RELACIONES).map(([key, rel]) => (
                    <span 
                      key={key} 
                      className="text-xs bg-white px-2 py-1 rounded border border-blue-200"
                      title={rel.descripcion}
                    >
                      {rel.simbolo} {rel.nombre}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Panel de historial */}
          {mostrarHistorial && historial.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Comandos Recientes
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {historial.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => usarHistorial(h.texto)}
                    className={`w-full text-left text-sm p-2 rounded-lg flex items-center gap-2 ${
                      h.exito 
                        ? 'bg-green-100 hover:bg-green-200 text-green-800' 
                        : 'bg-red-100 hover:bg-red-200 text-red-800'
                    }`}
                  >
                    {h.exito ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    <span className="truncate flex-1">{h.texto}</span>
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
              placeholder="Escribe tu comando aquí...&#10;Ej: Crear entidad Usuario con nombre String y email String"
              className={`w-full p-4 pr-24 border-2 rounded-xl resize-none focus:outline-none focus:ring-2 transition-colors min-h-[120px] ${
                grabando 
                  ? 'border-red-400 focus:ring-red-300 bg-red-50' 
                  : 'border-gray-200 focus:border-purple-400 focus:ring-purple-200'
              }`}
              disabled={procesando}
            />
            
            {/* Indicador de intención detectada */}
            {texto && intencion !== 'desconocido' && (
              <div className="absolute top-2 right-2 text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
                {intencion.replace('_', ' ')}
              </div>
            )}
            
            {/* Botones flotantes */}
            <div className="absolute bottom-3 right-3 flex gap-2">
              <button
                onClick={toggleGrabacion}
                className={`p-2 rounded-full transition-colors ${
                  grabando 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={grabando ? 'Detener dictado' : 'Dictar comando'}
              >
                {grabando ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              
              <button
                onClick={() => setTexto('')}
                className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                title="Limpiar"
                disabled={!texto}
              >
                <Eraser className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Sugerencias de autocompletado */}
          {sugerencias.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-500">Sugerencias:</span>
              {sugerencias.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setTexto(texto + ' ' + s.valor)}
                  className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-purple-100 transition-colors"
                  title={s.descripcion}
                >
                  {s.valor}
                </button>
              ))}
            </div>
          )}
          
          {/* Resultado o error */}
          {resultado && (
            <div className={`rounded-xl p-4 flex items-start gap-3 ${
              resultado.exito 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-blue-50 border border-blue-200'
            }`}>
              {resultado.exito ? (
                <Check className="w-5 h-5 text-green-500 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-blue-500 mt-0.5" />
              )}
              <div>
                <p className={`font-medium ${resultado.exito ? 'text-green-700' : 'text-blue-700'}`}>
                  {resultado.exito ? '¡Comando ejecutado!' : resultado.mensaje}
                </p>
                <p className="text-sm opacity-75">
                  {resultado.acciones} accion(es) • Procesado {resultado.tipo === 'ia' ? 'con IA' : 'localmente'}
                </p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium text-red-700">Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}
          
          {/* Tips contextuales */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-700 mb-1">Tips de uso:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Usa <kbd className="px-1 bg-gray-200 rounded">Enter</kbd> para enviar, <kbd className="px-1 bg-gray-200 rounded">Shift+Enter</kbd> para nueva línea</li>
                  <li>• El micrófono permite dictar comandos por voz</li>
                  <li>• Puedes crear sistemas completos: "crear sistema de ventas"</li>
                  <li>• Los tipos en español se traducen: "texto" → String, "precio" → BigDecimal</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        {/* ═══ FOOTER ═══ */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-between items-center">
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <Keyboard className="w-3 h-3" />
            <span>Presiona Enter para enviar</span>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={procesarComando}
              disabled={procesando || !texto.trim()}
              className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
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
};

export default Asistente;
