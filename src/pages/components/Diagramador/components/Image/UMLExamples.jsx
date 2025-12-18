// src/pages/components/Diagramador/components/UMLExamples.jsx
import React, { useState } from 'react';
import { FaDownload, FaEye, FaCode } from 'react-icons/fa';

const UMLExamples = ({ onUseExample }) => {
  const [selectedExample, setSelectedExample] = useState(null);

  const examples = [
    {
      id: 'usuario',
      name: 'Clase Usuario',
      description: 'Ejemplo básico de una clase Usuario con campos comunes',
      umlText: `Usuario
---------
+ id: Integer
+ nombre: String
+ email: String
+ telefono: String
+ activo: Boolean
+ fechaCreacion: Date
---------
+ getId(): Integer
+ getNombre(): String
+ setEmail(email: String): void
+ estaActivo(): Boolean`,
      expectedResult: {
        className: 'Usuario',
        attributes: [
          { name: 'id', type: 'Integer', visibility: 'public' },
          { name: 'nombre', type: 'String', visibility: 'public' },
          { name: 'email', type: 'String', visibility: 'public' },
          { name: 'telefono', type: 'String', visibility: 'public' },
          { name: 'activo', type: 'Boolean', visibility: 'public' },
          { name: 'fechaCreacion', type: 'Date', visibility: 'public' }
        ],
        methods: [
          { name: 'getId', returnType: 'Integer', visibility: 'public' },
          { name: 'getNombre', returnType: 'String', visibility: 'public' },
          { name: 'setEmail', returnType: 'void', visibility: 'public' },
          { name: 'estaActivo', returnType: 'Boolean', visibility: 'public' }
        ]
      }
    },
    {
      id: 'producto',
      name: 'Clase Producto',
      description: 'Ejemplo de clase con diferentes tipos de visibilidad',
      umlText: `Producto
---------
- id: Integer
+ nombre: String
+ precio: Double
# categoria: String
~ activo: Boolean
---------
+ getId(): Integer
+ calcularDescuento(): Double
- validarPrecio(): Boolean
# obtenerCategoria(): String`,
      expectedResult: {
        className: 'Producto',
        attributes: [
          { name: 'id', type: 'Integer', visibility: 'private' },
          { name: 'nombre', type: 'String', visibility: 'public' },
          { name: 'precio', type: 'Double', visibility: 'public' },
          { name: 'categoria', type: 'String', visibility: 'protected' },
          { name: 'activo', type: 'Boolean', visibility: 'package' }
        ],
        methods: [
          { name: 'getId', returnType: 'Integer', visibility: 'public' },
          { name: 'calcularDescuento', returnType: 'Double', visibility: 'public' },
          { name: 'validarPrecio', returnType: 'Boolean', visibility: 'private' },
          { name: 'obtenerCategoria', returnType: 'String', visibility: 'protected' }
        ]
      }
    },
    {
      id: 'cliente',
      name: 'Clase Cliente',
      description: 'Ejemplo complejo con métodos con parámetros',
      umlText: `Cliente
---------
+ id: Integer
+ nombre: String
+ apellido: String
+ email: String
+ telefono: String
+ direccion: String
+ fechaRegistro: Date
---------
+ getNombreCompleto(): String
+ actualizarEmail(nuevoEmail: String): void
+ cambiarTelefono(telefono: String): Boolean
+ validarDatos(): Boolean
+ calcularAntiguedad(): Integer`,
      expectedResult: {
        className: 'Cliente',
        attributes: [
          { name: 'id', type: 'Integer', visibility: 'public' },
          { name: 'nombre', type: 'String', visibility: 'public' },
          { name: 'apellido', type: 'String', visibility: 'public' },
          { name: 'email', type: 'String', visibility: 'public' },
          { name: 'telefono', type: 'String', visibility: 'public' },
          { name: 'direccion', type: 'String', visibility: 'public' },
          { name: 'fechaRegistro', type: 'Date', visibility: 'public' }
        ],
        methods: [
          { name: 'getNombreCompleto', returnType: 'String', visibility: 'public' },
          { name: 'actualizarEmail', returnType: 'void', visibility: 'public', parameters: [{ name: 'nuevoEmail', type: 'String' }] },
          { name: 'cambiarTelefono', returnType: 'Boolean', visibility: 'public', parameters: [{ name: 'telefono', type: 'String' }] },
          { name: 'validarDatos', returnType: 'Boolean', visibility: 'public' },
          { name: 'calcularAntiguedad', returnType: 'Integer', visibility: 'public' }
        ]
      }
    }
  ];

  const generateSVG = (example) => {
    const lines = example.umlText.split('\n');
    const className = lines[0];
    const separatorIndex = lines.findIndex(line => line.includes('---'));
    const attributes = lines.slice(2, separatorIndex);
    const methods = lines.slice(separatorIndex + 1);

    const lineHeight = 20;
    const padding = 10;
    const headerHeight = 30;
    const width = 300;
    const height = headerHeight + (attributes.length + methods.length + 1) * lineHeight + padding * 2;

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .class-box { fill: white; stroke: #2563eb; stroke-width: 2; }
            .class-header { fill: #2563eb; }
            .class-name { fill: white; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-anchor: middle; }
            .class-text { fill: #1f2937; font-family: 'Courier New', monospace; font-size: 12px; }
            .separator { stroke: #2563eb; stroke-width: 1; }
          </style>
        </defs>
        
        <!-- Caja principal -->
        <rect class="class-box" x="0" y="0" width="${width}" height="${height}" rx="4"/>
        
        <!-- Header -->
        <rect class="class-header" x="0" y="0" width="${width}" height="${headerHeight}" rx="4"/>
        <rect class="class-header" x="0" y="2" width="${width}" height="${headerHeight-4}"/>
        
        <!-- Nombre de la clase -->
        <text class="class-name" x="${width/2}" y="22">${className}</text>
        
        <!-- Separador después del header -->
        <line class="separator" x1="0" y1="${headerHeight}" x2="${width}" y2="${headerHeight}"/>
        
        <!-- Atributos -->
        ${attributes.map((attr, i) => 
          `<text class="class-text" x="10" y="${headerHeight + padding + (i + 1) * lineHeight}">${attr}</text>`
        ).join('')}
        
        <!-- Separador entre atributos y métodos -->
        <line class="separator" x1="0" y1="${headerHeight + attributes.length * lineHeight + padding}" x2="${width}" y2="${headerHeight + attributes.length * lineHeight + padding}"/>
        
        <!-- Métodos -->
        ${methods.map((method, i) => 
          `<text class="class-text" x="10" y="${headerHeight + attributes.length * lineHeight + padding * 2 + (i + 1) * lineHeight}">${method}</text>`
        ).join('')}
      </svg>
    `;
  };

  const downloadSVG = (example) => {
    const svgContent = generateSVG(example);
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${example.name.replace(/\s+/g, '_')}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUseExample = (example) => {
    if (onUseExample) {
      onUseExample(example.expectedResult);
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Ejemplos de Clases UML</h3>
      <p className="text-sm text-gray-600 mb-6">
        Usa estos ejemplos para probar la funcionalidad de importación de imágenes. 
        Puedes descargar las imágenes SVG y subirlas como archivos, o usar directamente los datos.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {examples.map((example) => (
          <div key={example.id} className="border rounded-lg p-4 bg-white shadow-sm">
            <h4 className="font-semibold text-blue-600 mb-2">{example.name}</h4>
            <p className="text-sm text-gray-600 mb-3">{example.description}</p>
            
            {/* Preview del diagrama */}
            <div className="bg-gray-50 p-2 rounded mb-3 overflow-hidden">
              <div 
                className="text-xs transform scale-75 origin-top-left"
                dangerouslySetInnerHTML={{ __html: generateSVG(example) }}
              />
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedExample(selectedExample === example.id ? null : example.id)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                <FaEye className="w-3 h-3" />
                {selectedExample === example.id ? 'Ocultar' : 'Ver código'}
              </button>
              
              <button
                onClick={() => downloadSVG(example)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                <FaDownload className="w-3 h-3" />
                Descargar SVG
              </button>
              
              <button
                onClick={() => handleUseExample(example)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
              >
                <FaCode className="w-3 h-3" />
                Usar ejemplo
              </button>
            </div>

            {/* Código UML expandible */}
            {selectedExample === example.id && (
              <div className="mt-3 p-2 bg-gray-800 text-green-400 rounded text-xs font-mono overflow-x-auto">
                <pre>{example.umlText}</pre>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">💡 Cómo usar los ejemplos:</h4>
        <ol className="text-sm text-blue-700 space-y-1">
          <li>1. <strong>Descargar SVG:</strong> Descarga la imagen y súbela usando "Importar imagen" → "Desde Archivo"</li>
          <li>2. <strong>Usar ejemplo:</strong> Crea la clase directamente en el diagrama sin procesamiento de imagen</li>
          <li>3. <strong>Ver código:</strong> Examina la estructura UML para crear tus propios diagramas</li>
        </ol>
      </div>
    </div>
  );
};

export default UMLExamples;