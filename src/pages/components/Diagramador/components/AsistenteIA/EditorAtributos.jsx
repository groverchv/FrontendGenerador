// src/pages/components/Diagramador/components/AsistenteIA/EditorAtributos.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// EDITOR DE ATRIBUTOS
// ═══════════════════════════════════════════════════════════════════════════════
// Componente para editar atributos de una entidad con asistencia.
// Permite CRUD completo: crear, renombrar, cambiar tipo, eliminar atributos.

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Pencil, Trash2, Save, X, Key, Wand2,
  Lock, Unlock, ChevronUp, ChevronDown, Code, Check,
  AlertTriangle, Star, Database, Eye, EyeOff
} from 'lucide-react';
import { 
  TIPOS_DATOS, 
  normalizarTipo,
} from './ReglasPromt';

/* ═══════════════════════════════════════════════════════════════════════════════
   📋 TIPOS DE DATOS PLANOS PARA DROPDOWN
   ═══════════════════════════════════════════════════════════════════════════════ */

const TODOS_LOS_TIPOS = Object.values(TIPOS_DATOS).flat();

const TIPOS_COMUNES = [
  'String', 'Integer', 'Long', 'Double', 'BigDecimal', 
  'Boolean', 'LocalDate', 'LocalDateTime', 'UUID'
];

/* ═══════════════════════════════════════════════════════════════════════════════
   🎨 ICONOS POR TIPO DE DATO
   ═══════════════════════════════════════════════════════════════════════════════ */

const getIconoTipo = (tipo) => {
  const tipoNorm = normalizarTipo(tipo);
  if (tipoNorm === 'String') return '📝';
  if (['Integer', 'Long', 'Short', 'Byte'].includes(tipoNorm)) return '🔢';
  if (['Double', 'Float', 'BigDecimal'].includes(tipoNorm)) return '💰';
  if (tipoNorm === 'Boolean') return '✅';
  if (['LocalDate', 'LocalDateTime', 'LocalTime', 'Date'].includes(tipoNorm)) return '📅';
  if (['List', 'Set', 'Collection'].includes(tipoNorm)) return '📚';
  if (tipoNorm === 'UUID') return '🔑';
  return '📦';
};

/* ═══════════════════════════════════════════════════════════════════════════════
   🧩 COMPONENTE: FILA DE ATRIBUTO
   ═══════════════════════════════════════════════════════════════════════════════ */

const FilaAtributo = ({ 
  atributo, 
  indice,
  editando, 
  onEditar, 
  onGuardar, 
  onCancelar,
  onEliminar,
  onMover,
  totalAtributos
}) => {
  const [nombre, setNombre] = useState(atributo.nombre);
  const [tipo, setTipo] = useState(atributo.tipo);
  const [visibility, setVisibility] = useState(atributo.visibility || 'private');
  const [esPK, setEsPK] = useState(atributo.esPK || false);
  const [mostrarTipos, setMostrarTipos] = useState(false);
  
  const inputRef = useRef(null);
  
  useEffect(() => {
    if (editando && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editando]);
  
  const handleGuardar = () => {
    if (!nombre.trim()) return;
    onGuardar(indice, {
      ...atributo,
      nombre: nombre.trim(),
      tipo: normalizarTipo(tipo),
      visibility,
      esPK
    });
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleGuardar();
    } else if (e.key === 'Escape') {
      onCancelar();
    }
  };
  
  if (editando) {
    return (
      <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2">
          {/* Visibility */}
          <button
            onClick={() => setVisibility(v => v === 'private' ? 'public' : v === 'public' ? 'protected' : 'private')}
            className={`w-8 h-8 rounded flex items-center justify-center text-sm ${
              visibility === 'private' ? 'bg-red-100 text-red-600' :
              visibility === 'public' ? 'bg-green-100 text-green-600' :
              'bg-yellow-100 text-yellow-600'
            }`}
            title={`Visibilidad: ${visibility}`}
          >
            {visibility === 'private' ? '-' : visibility === 'public' ? '+' : '#'}
          </button>
          
          {/* Nombre */}
          <input
            ref={inputRef}
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 px-3 py-1.5 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Nombre del atributo"
          />
          
          {/* Es PK */}
          <button
            onClick={() => setEsPK(!esPK)}
            className={`w-8 h-8 rounded flex items-center justify-center ${
              esPK ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'
            }`}
            title={esPK ? 'Es clave primaria' : 'Marcar como PK'}
          >
            <Key className="w-3 h-3" />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Tipo de dato */}
          <div className="relative flex-1">
            <button
              onClick={() => setMostrarTipos(!mostrarTipos)}
              className="w-full px-3 py-1.5 border border-blue-300 rounded text-left flex items-center justify-between bg-white hover:bg-gray-50"
            >
              <span className="flex items-center gap-2">
                <span>{getIconoTipo(tipo)}</span>
                <span>{tipo}</span>
              </span>
              <Code className="w-3 h-3 text-gray-400" />
            </button>
            
            {mostrarTipos && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                <div className="p-2 border-b border-gray-100 text-xs font-medium text-gray-500 sticky top-0 bg-white">
                  Tipos comunes
                </div>
                {TIPOS_COMUNES.map(t => (
                  <button
                    key={t}
                    onClick={() => { setTipo(t); setMostrarTipos(false); }}
                    className="w-full px-3 py-1.5 text-left hover:bg-blue-50 flex items-center gap-2 text-sm"
                  >
                    <span>{getIconoTipo(t)}</span>
                    <span>{t}</span>
                  </button>
                ))}
                <div className="p-2 border-t border-gray-100 text-xs font-medium text-gray-500 sticky bg-white">
                  Todos los tipos
                </div>
                {TODOS_LOS_TIPOS.filter(t => !TIPOS_COMUNES.includes(t.nombre)).map(t => (
                  <button
                    key={t.nombre}
                    onClick={() => { setTipo(t.nombre); setMostrarTipos(false); }}
                    className="w-full px-3 py-1.5 text-left hover:bg-blue-50 flex items-center gap-2 text-sm"
                    title={t.descripcion}
                  >
                    <span>{getIconoTipo(t.nombre)}</span>
                    <span>{t.nombre}</span>
                    <span className="text-xs text-gray-400 ml-auto">{t.descripcion?.slice(0, 20)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Botones de acción */}
          <button
            onClick={handleGuardar}
            className="w-8 h-8 bg-green-500 text-white rounded flex items-center justify-center hover:bg-green-600"
            title="Guardar"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={onCancelar}
            className="w-8 h-8 bg-gray-300 text-gray-600 rounded flex items-center justify-center hover:bg-gray-400"
            title="Cancelar"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="group flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors">
      {/* Visibility indicator */}
      <span className={`w-6 h-6 rounded text-xs flex items-center justify-center ${
        atributo.visibility === 'private' ? 'bg-red-100 text-red-600' :
        atributo.visibility === 'public' ? 'bg-green-100 text-green-600' :
        'bg-yellow-100 text-yellow-600'
      }`}>
        {atributo.visibility === 'private' ? '-' : atributo.visibility === 'public' ? '+' : '#'}
      </span>
      
      {/* PK indicator */}
      {atributo.esPK && (
        <Key className="w-3 h-3 text-amber-500" title="Clave primaria" />
      )}
      
      {/* Nombre y tipo */}
      <span className="flex-1 font-mono text-sm">
        <span className="text-gray-800">{atributo.nombre}</span>
        <span className="text-gray-400 mx-1">:</span>
        <span className="text-blue-600">{atributo.tipo}</span>
      </span>
      
      {/* Icono del tipo */}
      <span className="text-xs opacity-50">{getIconoTipo(atributo.tipo)}</span>
      
      {/* Botones de acción (visibles en hover) */}
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
        {indice > 0 && (
          <button
            onClick={() => onMover(indice, indice - 1)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Mover arriba"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
        )}
        {indice < totalAtributos - 1 && (
          <button
            onClick={() => onMover(indice, indice + 1)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Mover abajo"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        )}
        <button
          onClick={() => onEditar(indice)}
          className="p-1 text-blue-400 hover:text-blue-600 rounded"
          title="Editar"
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          onClick={() => onEliminar(indice)}
          className="p-1 text-red-400 hover:text-red-600 rounded"
          title="Eliminar"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   📦 COMPONENTE PRINCIPAL: EDITOR DE ATRIBUTOS
   ═══════════════════════════════════════════════════════════════════════════════ */

const EditorAtributos = ({ 
  entidad, 
  atributos = [], 
  onChange,
  onSugerirIA
}) => {
  const [atributosLocales, setAtributosLocales] = useState(atributos);
  const [indiceEditando, setIndiceEditando] = useState(null);
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [sugerenciasIA, setSugerenciasIA] = useState([]);
  const [cargandoIA, setCargandoIA] = useState(false);
  
  // Sincronizar con props
  useEffect(() => {
    setAtributosLocales(atributos);
  }, [atributos]);
  
  // Notificar cambios al padre
  const notificarCambio = (nuevosAtributos) => {
    setAtributosLocales(nuevosAtributos);
    if (onChange) {
      onChange(nuevosAtributos);
    }
  };
  
  // Guardar atributo editado
  const handleGuardar = (indice, atributoActualizado) => {
    const nuevos = [...atributosLocales];
    nuevos[indice] = atributoActualizado;
    notificarCambio(nuevos);
    setIndiceEditando(null);
  };
  
  // Agregar nuevo atributo
  const handleAgregarNuevo = (nuevoAtributo) => {
    notificarCambio([...atributosLocales, nuevoAtributo]);
    setMostrarNuevo(false);
  };
  
  // Eliminar atributo
  const handleEliminar = (indice) => {
    if (window.confirm('¿Eliminar este atributo?')) {
      const nuevos = atributosLocales.filter((_, i) => i !== indice);
      notificarCambio(nuevos);
    }
  };
  
  // Mover atributo
  const handleMover = (desde, hacia) => {
    const nuevos = [...atributosLocales];
    const [movido] = nuevos.splice(desde, 1);
    nuevos.splice(hacia, 0, movido);
    notificarCambio(nuevos);
  };
  
  // Solicitar sugerencias de IA
  const solicitarSugerenciasIA = async () => {
    if (!onSugerirIA) return;
    
    setCargandoIA(true);
    try {
      const sugerencias = await onSugerirIA(entidad, atributosLocales);
      setSugerenciasIA(sugerencias || []);
    } catch (err) {
      console.error('Error obteniendo sugerencias:', err);
    } finally {
      setCargandoIA(false);
    }
  };
  
  // Agregar sugerencia de IA
  const agregarSugerencia = (sugerencia) => {
    const nuevoAtributo = {
      nombre: sugerencia.nombre,
      tipo: sugerencia.tipo,
      visibility: sugerencia.visibility || 'private',
      esPK: sugerencia.esPK || false
    };
    notificarCambio([...atributosLocales, nuevoAtributo]);
    setSugerenciasIA(sugerenciasIA.filter(s => s.nombre !== sugerencia.nombre));
  };
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-500" />
          Atributos de {entidad}
          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
            {atributosLocales.length}
          </span>
        </h4>
        
        <div className="flex items-center gap-2">
          {onSugerirIA && (
            <button
              onClick={solicitarSugerenciasIA}
              disabled={cargandoIA}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              {cargandoIA ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <Wand2 className="w-3 h-3" />
              )}
              Sugerir
            </button>
          )}
          
          <button
            onClick={() => setMostrarNuevo(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Agregar
          </button>
        </div>
      </div>
      
      {/* Lista de atributos */}
      <div className="p-2 max-h-64 overflow-y-auto">
        {atributosLocales.length === 0 && !mostrarNuevo ? (
          <div className="text-center py-6 text-gray-400">
            <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sin atributos</p>
            <p className="text-xs">Agrega atributos manualmente o con IA</p>
          </div>
        ) : (
          <div className="space-y-1">
            {atributosLocales.map((attr, i) => (
              <FilaAtributo
                key={`${attr.nombre}-${i}`}
                atributo={attr}
                indice={i}
                editando={indiceEditando === i}
                onEditar={setIndiceEditando}
                onGuardar={handleGuardar}
                onCancelar={() => setIndiceEditando(null)}
                onEliminar={handleEliminar}
                onMover={handleMover}
                totalAtributos={atributosLocales.length}
              />
            ))}
            
            {/* Formulario de nuevo atributo */}
            {mostrarNuevo && (
              <FilaAtributo
                atributo={{ nombre: '', tipo: 'String', visibility: 'private', esPK: false }}
                indice={atributosLocales.length}
                editando={true}
                onEditar={() => {}}
                onGuardar={(_, attr) => handleAgregarNuevo(attr)}
                onCancelar={() => setMostrarNuevo(false)}
                onEliminar={() => {}}
                onMover={() => {}}
                totalAtributos={0}
              />
            )}
          </div>
        )}
      </div>
      
      {/* Sugerencias */}
      {sugerenciasIA.length > 0 && (
        <div className="border-t border-gray-200 bg-slate-50 p-3">
          <h5 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
            <Star className="w-3 h-3" />
            Sugerencias
          </h5>
          <div className="flex flex-wrap gap-2">
            {sugerenciasIA.map((sug, i) => (
              <button
                key={i}
                onClick={() => agregarSugerencia(sug)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm hover:bg-slate-100 transition-colors"
              >
                <span>{getIconoTipo(sug.tipo)}</span>
                <span className="font-mono">
                  {sug.nombre}: <span className="text-blue-600">{sug.tipo}</span>
                </span>
                <Plus className="w-3 h-3 text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorAtributos;
