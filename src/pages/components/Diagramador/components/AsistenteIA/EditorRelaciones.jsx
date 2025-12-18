// src/pages/components/Diagramador/components/AsistenteIA/EditorRelaciones.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// EDITOR DE RELACIONES
// ═══════════════════════════════════════════════════════════════════════════════
// Componente para crear y editar relaciones entre entidades.
// Soporta: Asociación, Agregación, Composición, Herencia, Dependencia

import React, { useState, useEffect } from 'react';
import {
  Plus, Pencil, Trash2, Save, X, Link, Unlink,
  Wand2, ArrowRight, ArrowLeft, ArrowLeftRight, GitBranch,
  ChevronDown, Check, Info
} from 'lucide-react';
import { 
  TIPOS_RELACIONES, 
  MULTIPLICIDADES,
} from './ReglasPromt';

/* ═══════════════════════════════════════════════════════════════════════════════
   🎨 ESTILOS POR TIPO DE RELACIÓN
   ═══════════════════════════════════════════════════════════════════════════════ */

const ESTILOS_RELACION = {
  ASSOCIATION: {
    color: 'blue',
    bgLight: 'bg-blue-50',
    bgDark: 'bg-blue-100',
    border: 'border-blue-300',
    text: 'text-blue-700',
    icon: '→'
  },
  AGGREGATION: {
    color: 'green',
    bgLight: 'bg-green-50',
    bgDark: 'bg-green-100',
    border: 'border-green-300',
    text: 'text-green-700',
    icon: '◇→'
  },
  COMPOSITION: {
    color: 'purple',
    bgLight: 'bg-purple-50',
    bgDark: 'bg-purple-100',
    border: 'border-purple-300',
    text: 'text-purple-700',
    icon: '◆→'
  },
  INHERITANCE: {
    color: 'amber',
    bgLight: 'bg-amber-50',
    bgDark: 'bg-amber-100',
    border: 'border-amber-300',
    text: 'text-amber-700',
    icon: '△'
  },
  DEPENDENCY: {
    color: 'gray',
    bgLight: 'bg-gray-50',
    bgDark: 'bg-gray-100',
    border: 'border-gray-300',
    text: 'text-gray-700',
    icon: '-->'
  }
};

/* ═══════════════════════════════════════════════════════════════════════════════
   🧩 COMPONENTE: SELECTOR DE TIPO DE RELACIÓN
   ═══════════════════════════════════════════════════════════════════════════════ */

const SelectorTipoRelacion = ({ valor, onChange }) => {
  const [abierto, setAbierto] = useState(false);
  const estilo = ESTILOS_RELACION[valor] || ESTILOS_RELACION.ASSOCIATION;
  const tipoInfo = TIPOS_RELACIONES[valor] || TIPOS_RELACIONES.ASSOCIATION;
  
  return (
    <div className="relative">
      <button
        onClick={() => setAbierto(!abierto)}
        className={`w-full px-3 py-2 ${estilo.bgLight} ${estilo.border} border rounded-lg flex items-center justify-between hover:${estilo.bgDark} transition-colors`}
      >
        <span className={`flex items-center gap-2 ${estilo.text}`}>
          <span className="font-mono text-lg">{tipoInfo.simbolo}</span>
          <span className="font-medium">{tipoInfo.nombre}</span>
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>
      
      {abierto && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
          {Object.entries(TIPOS_RELACIONES).map(([key, tipo]) => {
            const est = ESTILOS_RELACION[key];
            return (
              <button
                key={key}
                onClick={() => { onChange(key); setAbierto(false); }}
                className={`w-full px-4 py-3 text-left hover:${est.bgLight} transition-colors border-b border-gray-100 last:border-0`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xl font-mono ${est.text}`}>{tipo.simbolo}</span>
                  <div className="flex-1">
                    <div className={`font-medium ${est.text}`}>{tipo.nombre}</div>
                    <div className="text-xs text-gray-500">{tipo.descripcion}</div>
                  </div>
                  {valor === key && <Check className="w-4 h-4 text-green-500" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   🧩 COMPONENTE: SELECTOR DE MULTIPLICIDAD
   ═══════════════════════════════════════════════════════════════════════════════ */

const SelectorMultiplicidad = ({ valor, onChange, label }) => {
  const [abierto, setAbierto] = useState(false);
  
  return (
    <div className="relative flex-1">
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      <button
        onClick={() => setAbierto(!abierto)}
        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg flex items-center justify-between hover:bg-gray-50 text-sm"
      >
        <span className="font-mono">{valor || '1'}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>
      
      {abierto && (
        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {Object.entries(MULTIPLICIDADES).map(([key, mult]) => (
            <button
              key={key}
              onClick={() => { onChange(mult.valor); setAbierto(false); }}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between text-sm"
            >
              <span className="font-mono font-medium">{mult.valor}</span>
              <span className="text-xs text-gray-500">{mult.descripcion}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   🧩 COMPONENTE: SELECTOR DE ENTIDAD
   ═══════════════════════════════════════════════════════════════════════════════ */

const SelectorEntidad = ({ valor, onChange, entidades, label, excluir }) => {
  const [abierto, setAbierto] = useState(false);
  const entidadesFiltradas = entidades.filter(e => e !== excluir);
  
  return (
    <div className="relative flex-1">
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      <button
        onClick={() => setAbierto(!abierto)}
        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg flex items-center justify-between hover:bg-gray-50"
      >
        <span className={valor ? 'text-gray-800 font-medium' : 'text-gray-400'}>
          {valor || 'Seleccionar...'}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>
      
      {abierto && (
        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {entidadesFiltradas.map((ent) => (
            <button
              key={ent}
              onClick={() => { onChange(ent); setAbierto(false); }}
              className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center gap-2"
            >
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              <span className="font-medium">{ent}</span>
            </button>
          ))}
          {entidadesFiltradas.length === 0 && (
            <div className="px-3 py-4 text-center text-gray-400 text-sm">
              No hay entidades disponibles
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   🧩 COMPONENTE: FORMULARIO DE RELACIÓN
   ═══════════════════════════════════════════════════════════════════════════════ */

const FormularioRelacion = ({ 
  relacion, 
  entidades, 
  onGuardar, 
  onCancelar,
  modoEdicion = false 
}) => {
  const [tipo, setTipo] = useState(relacion?.tipo || 'ASSOCIATION');
  const [origen, setOrigen] = useState(relacion?.origen || '');
  const [destino, setDestino] = useState(relacion?.destino || '');
  const [cardOrigen, setCardOrigen] = useState(relacion?.cardOrigen || '1');
  const [cardDestino, setCardDestino] = useState(relacion?.cardDestino || '*');
  const [etiqueta, setEtiqueta] = useState(relacion?.etiqueta || '');
  
  const estilo = ESTILOS_RELACION[tipo];
  const tipoInfo = TIPOS_RELACIONES[tipo];
  
  const handleGuardar = () => {
    if (!origen || !destino) return;
    
    onGuardar({
      tipo,
      origen,
      destino,
      cardOrigen: tipo === 'INHERITANCE' || tipo === 'DEPENDENCY' ? '' : cardOrigen,
      cardDestino: tipo === 'INHERITANCE' || tipo === 'DEPENDENCY' ? '' : cardDestino,
      etiqueta
    });
  };
  
  const intercambiar = () => {
    const temp = origen;
    setOrigen(destino);
    setDestino(temp);
    const tempCard = cardOrigen;
    setCardOrigen(cardDestino);
    setCardDestino(tempCard);
  };
  
  const valido = origen && destino && origen !== destino;
  
  return (
    <div className={`${estilo.bgLight} border ${estilo.border} rounded-xl p-4 space-y-4`}>
      {/* Tipo de relación */}
      <SelectorTipoRelacion valor={tipo} onChange={setTipo} />
      
      {/* Descripción del tipo */}
      <div className={`text-sm ${estilo.text} bg-white/50 px-3 py-2 rounded-lg flex items-start gap-2`}>
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>{tipoInfo.descripcion}</span>
      </div>
      
      {/* Entidades origen y destino */}
      <div className="flex items-end gap-2">
        <SelectorEntidad
          valor={origen}
          onChange={setOrigen}
          entidades={entidades}
          label={tipo === 'INHERITANCE' ? 'Clase hija' : 'Entidad origen'}
          excluir={destino}
        />
        
        <button
          onClick={intercambiar}
          className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 mb-0.5"
          title="Intercambiar"
        >
          <ArrowLeftRight className="w-4 h-4 text-gray-500" />
        </button>
        
        <SelectorEntidad
          valor={destino}
          onChange={setDestino}
          entidades={entidades}
          label={tipo === 'INHERITANCE' ? 'Clase padre' : 'Entidad destino'}
          excluir={origen}
        />
      </div>
      
      {/* Multiplicidades (solo para asociación, agregación, composición) */}
      {!['INHERITANCE', 'DEPENDENCY'].includes(tipo) && (
        <div className="flex gap-4">
          <SelectorMultiplicidad
            valor={cardOrigen}
            onChange={setCardOrigen}
            label={`Multiplicidad ${origen || 'origen'}`}
          />
          <SelectorMultiplicidad
            valor={cardDestino}
            onChange={setCardDestino}
            label={`Multiplicidad ${destino || 'destino'}`}
          />
        </div>
      )}
      
      {/* Etiqueta opcional */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Etiqueta (opcional)</label>
        <input
          type="text"
          value={etiqueta}
          onChange={(e) => setEtiqueta(e.target.value)}
          placeholder="Ej: pertenece a, contiene..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>
      
      {/* Vista previa */}
      <div className="bg-white rounded-lg p-3 border border-gray-200">
        <p className="text-xs text-gray-500 mb-2">Vista previa:</p>
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="px-3 py-1 bg-gray-100 rounded font-medium">{origen || '?'}</span>
          {cardOrigen && !['INHERITANCE', 'DEPENDENCY'].includes(tipo) && (
            <span className="text-xs text-gray-500">{cardOrigen}</span>
          )}
          <span className={`font-mono text-lg ${estilo.text}`}>{tipoInfo.simbolo}</span>
          {cardDestino && !['INHERITANCE', 'DEPENDENCY'].includes(tipo) && (
            <span className="text-xs text-gray-500">{cardDestino}</span>
          )}
          <span className="px-3 py-1 bg-gray-100 rounded font-medium">{destino || '?'}</span>
        </div>
        {etiqueta && (
          <p className="text-center text-xs text-gray-500 mt-1 italic">«{etiqueta}»</p>
        )}
      </div>
      
      {/* Botones */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onCancelar}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleGuardar}
          disabled={!valido}
          className={`px-4 py-2 ${estilo.bgDark} ${estilo.text} rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
        >
          <Save className="w-4 h-4" />
          {modoEdicion ? 'Actualizar' : 'Crear'} Relación
        </button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   🧩 COMPONENTE: TARJETA DE RELACIÓN
   ═══════════════════════════════════════════════════════════════════════════════ */

const TarjetaRelacion = ({ relacion, onEditar, onEliminar }) => {
  const estilo = ESTILOS_RELACION[relacion.tipo] || ESTILOS_RELACION.ASSOCIATION;
  const tipoInfo = TIPOS_RELACIONES[relacion.tipo] || TIPOS_RELACIONES.ASSOCIATION;
  
  return (
    <div className={`group ${estilo.bgLight} border ${estilo.border} rounded-lg p-3 hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-xl font-mono ${estilo.text}`}>{tipoInfo.simbolo}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-800">{relacion.origen}</span>
              {relacion.cardOrigen && (
                <span className="text-xs bg-white px-1.5 py-0.5 rounded border border-gray-200">
                  {relacion.cardOrigen}
                </span>
              )}
              <FaArrowRight className="w-3 h-3 text-gray-400" />
              {relacion.cardDestino && (
                <span className="text-xs bg-white px-1.5 py-0.5 rounded border border-gray-200">
                  {relacion.cardDestino}
                </span>
              )}
              <span className="font-medium text-gray-800">{relacion.destino}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs ${estilo.text}`}>{tipoInfo.nombre}</span>
              {relacion.etiqueta && (
                <span className="text-xs text-gray-500 italic">«{relacion.etiqueta}»</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
          <button
            onClick={() => onEditar(relacion)}
            className="p-2 text-blue-500 hover:bg-blue-100 rounded transition-colors"
            title="Editar"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEliminar(relacion)}
            className="p-2 text-red-500 hover:bg-red-100 rounded transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   📦 COMPONENTE PRINCIPAL: EDITOR DE RELACIONES
   ═══════════════════════════════════════════════════════════════════════════════ */

const EditorRelaciones = ({ 
  relaciones = [], 
  entidades = [],
  onChange,
  onSugerirIA
}) => {
  const [relacionesLocales, setRelacionesLocales] = useState(relaciones);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [relacionEditando, setRelacionEditando] = useState(null);
  const [sugerenciasIA, setSugerenciasIA] = useState([]);
  const [cargandoIA, setCargandoIA] = useState(false);
  
  // Sincronizar con props
  useEffect(() => {
    setRelacionesLocales(relaciones);
  }, [relaciones]);
  
  // Notificar cambios
  const notificarCambio = (nuevas) => {
    setRelacionesLocales(nuevas);
    if (onChange) onChange(nuevas);
  };
  
  // Crear nueva relación
  const handleCrear = (nuevaRelacion) => {
    notificarCambio([...relacionesLocales, nuevaRelacion]);
    setMostrarFormulario(false);
  };
  
  // Editar relación existente
  const handleEditar = (relacion) => {
    setRelacionEditando(relacion);
    setMostrarFormulario(true);
  };
  
  // Actualizar relación
  const handleActualizar = (relacionActualizada) => {
    const nuevas = relacionesLocales.map(r => 
      (r.origen === relacionEditando.origen && r.destino === relacionEditando.destino && r.tipo === relacionEditando.tipo)
        ? relacionActualizada
        : r
    );
    notificarCambio(nuevas);
    setMostrarFormulario(false);
    setRelacionEditando(null);
  };
  
  // Eliminar relación
  const handleEliminar = (relacion) => {
    if (window.confirm(`¿Eliminar la relación ${relacion.tipo} entre ${relacion.origen} y ${relacion.destino}?`)) {
      const nuevas = relacionesLocales.filter(r => 
        !(r.origen === relacion.origen && r.destino === relacion.destino && r.tipo === relacion.tipo)
      );
      notificarCambio(nuevas);
    }
  };
  
  // Solicitar sugerencias de IA
  const solicitarSugerenciasIA = async () => {
    if (!onSugerirIA) return;
    
    setCargandoIA(true);
    try {
      const sugerencias = await onSugerirIA(entidades, relacionesLocales);
      setSugerenciasIA(sugerencias || []);
    } catch (err) {
      console.error('Error obteniendo sugerencias:', err);
    } finally {
      setCargandoIA(false);
    }
  };
  
  // Agregar sugerencia de IA
  const agregarSugerencia = (sug) => {
    handleCrear(sug);
    setSugerenciasIA(sugerenciasIA.filter(s => 
      !(s.origen === sug.origen && s.destino === sug.destino)
    ));
  };
  
  // Cancelar formulario
  const handleCancelar = () => {
    setMostrarFormulario(false);
    setRelacionEditando(null);
  };
  
  // Agrupar relaciones por tipo
  const relacionesPorTipo = Object.keys(TIPOS_RELACIONES).reduce((acc, tipo) => {
    acc[tipo] = relacionesLocales.filter(r => r.tipo === tipo);
    return acc;
  }, {});
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-slate-500" />
          Relaciones
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
            {relacionesLocales.length}
          </span>
        </h4>
        
        <div className="flex items-center gap-2">
          {onSugerirIA && entidades.length >= 2 && (
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
            onClick={() => { setRelacionEditando(null); setMostrarFormulario(true); }}
            disabled={entidades.length < 2}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={entidades.length < 2 ? 'Necesitas al menos 2 entidades' : 'Agregar relación'}
          >
            <Plus className="w-3 h-3" />
            Agregar
          </button>
        </div>
      </div>
      
      {/* Contenido */}
      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {mostrarFormulario ? (
          <FormularioRelacion
            relacion={relacionEditando}
            entidades={entidades}
            onGuardar={relacionEditando ? handleActualizar : handleCrear}
            onCancelar={handleCancelar}
            modoEdicion={!!relacionEditando}
          />
        ) : relacionesLocales.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Link className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sin relaciones definidas</p>
            <p className="text-xs">Crea relaciones entre tus entidades</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(relacionesPorTipo).map(([tipo, rels]) => {
              if (rels.length === 0) return null;
              const estilo = ESTILOS_RELACION[tipo];
              const tipoInfo = TIPOS_RELACIONES[tipo];
              
              return (
                <div key={tipo}>
                  <h5 className={`text-xs font-medium ${estilo.text} mb-2 flex items-center gap-1`}>
                    <span>{tipoInfo.simbolo}</span>
                    {tipoInfo.nombre} ({rels.length})
                  </h5>
                  <div className="space-y-2">
                    {rels.map((rel, i) => (
                      <TarjetaRelacion
                        key={`${rel.origen}-${rel.destino}-${i}`}
                        relacion={rel}
                        onEditar={handleEditar}
                        onEliminar={handleEliminar}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Sugerencias */}
        {sugerenciasIA.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <h5 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <Wand2 className="w-3 h-3" />
              Sugerencias
            </h5>
            <div className="space-y-2">
              {sugerenciasIA.map((sug, i) => {
                const estilo = ESTILOS_RELACION[sug.tipo] || ESTILOS_RELACION.ASSOCIATION;
                const tipoInfo = TIPOS_RELACIONES[sug.tipo] || TIPOS_RELACIONES.ASSOCIATION;
                
                return (
                  <button
                    key={i}
                    onClick={() => agregarSugerencia(sug)}
                    className={`w-full ${estilo.bgLight} border ${estilo.border} rounded-lg p-3 text-left hover:shadow-md transition-all flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-mono ${estilo.text}`}>{tipoInfo.simbolo}</span>
                      <span className="font-medium">{sug.origen}</span>
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                      <span className="font-medium">{sug.destino}</span>
                      <span className={`text-xs ${estilo.text}`}>({tipoInfo.nombre})</span>
                    </div>
                    <Plus className="w-4 h-4 text-green-500" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorRelaciones;
