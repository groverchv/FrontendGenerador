// src/pages/components/Diagramador/components/AsistenteIA/PanelComandosRapidos.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 PANEL DE COMANDOS RÁPIDOS
// ═══════════════════════════════════════════════════════════════════════════════
// Componente que muestra botones de acceso rápido para operaciones CRUD comunes
// en el diagrama UML. Permite ejecutar comandos con un solo clic.

import React, { useState } from 'react';
import {
  FaPlus, FaEdit, FaTrash, FaLink, FaUnlink, FaProjectDiagram,
  FaDatabase, FaKey, FaCog, FaChevronRight, FaCode, FaLayerGroup,
  FaArrowRight, FaArrowsAlt, FaSitemap, FaBoxes
} from 'react-icons/fa';

/* ═══════════════════════════════════════════════════════════════════════════════
   📋 DEFINICIÓN DE COMANDOS RÁPIDOS
   ═══════════════════════════════════════════════════════════════════════════════ */

const CATEGORIAS_COMANDOS = {
  entidades: {
    titulo: 'Entidades',
    icono: FaDatabase,
    color: 'blue',
    comandos: [
      { texto: 'Crear entidad', icono: FaPlus, template: 'Crear entidad [nombre] con [atributo] [tipo]' },
      { texto: 'Renombrar entidad', icono: FaEdit, template: 'Renombrar entidad [viejo] a [nuevo]' },
      { texto: 'Eliminar entidad', icono: FaTrash, template: 'Eliminar entidad [nombre]' },
      { texto: 'Duplicar entidad', icono: FaLayerGroup, template: 'Duplicar entidad [nombre]' },
    ]
  },
  atributos: {
    titulo: 'Atributos',
    icono: FaKey,
    color: 'green',
    comandos: [
      { texto: 'Agregar atributo', icono: FaPlus, template: 'Agregar atributo [nombre] tipo [tipo] a [entidad]' },
      { texto: 'Agregar ID', icono: FaKey, template: 'Agregar id Long a [entidad]' },
      { texto: 'Renombrar atributo', icono: FaEdit, template: 'Renombrar atributo [viejo] a [nuevo] en [entidad]' },
      { texto: 'Cambiar tipo', icono: FaCog, template: 'Cambiar tipo de [atributo] a [tipo] en [entidad]' },
      { texto: 'Eliminar atributo', icono: FaTrash, template: 'Eliminar atributo [nombre] de [entidad]' },
    ]
  },
  relaciones: {
    titulo: 'Relaciones',
    icono: FaLink,
    color: 'purple',
    comandos: [
      { texto: 'Asociación', icono: FaArrowRight, template: '[Entidad1] tiene [Entidad2]' },
      { texto: 'Agregación', icono: FaBoxes, template: '[Todo] contiene [Parte]' },
      { texto: 'Composición', icono: FaLayerGroup, template: '[Todo] se compone de [Parte]' },
      { texto: 'Herencia', icono: FaSitemap, template: '[Hija] extiende [Padre]' },
      { texto: 'Dependencia', icono: FaArrowsAlt, template: '[Clase1] usa [Clase2]' },
      { texto: 'Eliminar relación', icono: FaUnlink, template: 'Eliminar relación entre [Entidad1] y [Entidad2]' },
    ]
  },
  sistemas: {
    titulo: 'Sistemas Completos',
    icono: FaProjectDiagram,
    color: 'amber',
    comandos: [
      { texto: 'Sistema de Ventas', icono: FaBoxes, template: 'Crear sistema de ventas' },
      { texto: 'Sistema de Biblioteca', icono: FaDatabase, template: 'Crear sistema de biblioteca' },
      { texto: 'Sistema de Hospital', icono: FaPlus, template: 'Crear sistema de hospital' },
      { texto: 'E-Commerce', icono: FaCode, template: 'Crear sistema de ecommerce' },
      { texto: 'Sistema Escolar', icono: FaLayerGroup, template: 'Crear sistema de escuela' },
      { texto: 'Restaurante', icono: FaSitemap, template: 'Crear sistema de restaurante' },
    ]
  }
};

/* ═══════════════════════════════════════════════════════════════════════════════
   🎨 COLORES POR CATEGORÍA
   ═══════════════════════════════════════════════════════════════════════════════ */

const COLORES = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    header: 'bg-blue-100',
    headerText: 'text-blue-800',
    btnBg: 'bg-blue-100',
    btnHover: 'hover:bg-blue-200',
    btnText: 'text-blue-700'
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    header: 'bg-green-100',
    headerText: 'text-green-800',
    btnBg: 'bg-green-100',
    btnHover: 'hover:bg-green-200',
    btnText: 'text-green-700'
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    header: 'bg-purple-100',
    headerText: 'text-purple-800',
    btnBg: 'bg-purple-100',
    btnHover: 'hover:bg-purple-200',
    btnText: 'text-purple-700'
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    header: 'bg-amber-100',
    headerText: 'text-amber-800',
    btnBg: 'bg-amber-100',
    btnHover: 'hover:bg-amber-200',
    btnText: 'text-amber-700'
  }
};

/* ═══════════════════════════════════════════════════════════════════════════════
   🧩 COMPONENTE: BOTÓN DE COMANDO
   ═══════════════════════════════════════════════════════════════════════════════ */

const ComandoBtn = ({ comando, color, onClick }) => {
  const colores = COLORES[color];
  const Icono = comando.icono;
  
  return (
    <button
      onClick={() => onClick(comando.template)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${colores.btnBg} ${colores.btnHover} ${colores.btnText} border ${colores.border} hover:shadow-sm group`}
      title={comando.template}
    >
      <Icono className="w-3.5 h-3.5" />
      <span className="flex-1 text-left">{comando.texto}</span>
      <FaChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   🧩 COMPONENTE: CATEGORÍA DE COMANDOS
   ═══════════════════════════════════════════════════════════════════════════════ */

const CategoriaComandos = ({ datos, onClick, expandida, onToggle }) => {
  const colores = COLORES[datos.color];
  const Icono = datos.icono;
  
  return (
    <div className={`rounded-xl border overflow-hidden ${colores.border}`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-3 ${colores.header} ${colores.headerText} hover:opacity-80 transition-opacity`}
      >
        <div className="flex items-center gap-2 font-semibold">
          <Icono className="w-4 h-4" />
          {datos.titulo}
        </div>
        <FaChevronRight className={`w-4 h-4 transition-transform ${expandida ? 'rotate-90' : ''}`} />
      </button>
      
      {expandida && (
        <div className={`p-3 ${colores.bg} grid gap-2`}>
          {datos.comandos.map((cmd, i) => (
            <ComandoBtn key={i} comando={cmd} color={datos.color} onClick={onClick} />
          ))}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   📦 COMPONENTE PRINCIPAL: PANEL DE COMANDOS RÁPIDOS
   ═══════════════════════════════════════════════════════════════════════════════ */

const PanelComandosRapidos = ({ onSeleccionarComando, modo = 'vertical' }) => {
  const [categoriasExpandidas, setCategoriasExpandidas] = useState(['entidades']);
  
  const toggleCategoria = (cat) => {
    setCategoriasExpandidas(prev => 
      prev.includes(cat) 
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    );
  };
  
  if (modo === 'horizontal') {
    // Modo compacto horizontal (para barra de herramientas)
    return (
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {Object.entries(CATEGORIAS_COMANDOS).map(([key, cat]) => {
          const Icono = cat.icono;
          const colores = COLORES[cat.color];
          return (
            <div key={key} className="flex items-center gap-1">
              <span className={`text-xs ${colores.headerText} font-medium px-2`}>
                <Icono className="w-3 h-3 inline mr-1" />
                {cat.titulo}:
              </span>
              {cat.comandos.slice(0, 3).map((cmd, i) => (
                <button
                  key={i}
                  onClick={() => onSeleccionarComando(cmd.template)}
                  className={`px-2 py-1 text-xs rounded ${colores.btnBg} ${colores.btnHover} ${colores.btnText}`}
                  title={cmd.template}
                >
                  {cmd.texto}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    );
  }
  
  // Modo vertical completo
  return (
    <div className="space-y-3 p-4 bg-white rounded-xl shadow-lg border border-gray-200 max-w-sm">
      <h3 className="font-bold text-gray-800 flex items-center gap-2">
        <FaCode className="w-4 h-4 text-purple-500" />
        Comandos Rápidos
      </h3>
      
      <div className="space-y-2">
        {Object.entries(CATEGORIAS_COMANDOS).map(([key, datos]) => (
          <CategoriaComandos
            key={key}
            categoria={key}
            datos={datos}
            onClick={onSeleccionarComando}
            expandida={categoriasExpandidas.includes(key)}
            onToggle={() => toggleCategoria(key)}
          />
        ))}
      </div>
      
      <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
        💡 Tip: Los valores entre [ ] son placeholders que debes reemplazar
      </div>
    </div>
  );
};

export default PanelComandosRapidos;
