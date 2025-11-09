// src/pages/components/Diagramador/components/ImageProcessingModal.jsx
import React from 'react';
import { FaImage, FaRobot, FaCheck, FaSpinner } from 'react-icons/fa';

const ImageProcessingModal = ({ isOpen, onClose, stage, className, attributes, methods }) => {
  if (!isOpen) return null;

  const stages = [
    { key: 'uploading', label: 'Subiendo imagen', icon: FaImage },
    { key: 'processing', label: 'Analizando con IA', icon: FaRobot },
    { key: 'creating', label: 'Creando clase', icon: FaCheck }
  ];

  const getCurrentStageIndex = () => {
    return stages.findIndex(s => s.key === stage);
  };

  const currentStageIndex = getCurrentStageIndex();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Header fijo */}
        <div className="flex justify-between items-center p-6 pb-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Procesando Imagen UML</h3>
          {stage === 'completed' && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          )}
        </div>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {/* Indicador de progreso */}
          <div className="mb-6">
          {stages.map((stageInfo, index) => {
            const StageIcon = stageInfo.icon;
            const isActive = index === currentStageIndex;
            const isCompleted = index < currentStageIndex || stage === 'completed';
            const isError = stage === 'error';

            return (
              <div key={stageInfo.key} className="flex items-center mb-3">
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full mr-3
                  ${isActive ? 'bg-blue-100 text-blue-600' : ''}
                  ${isCompleted ? 'bg-green-100 text-green-600' : ''}
                  ${!isActive && !isCompleted ? 'bg-gray-100 text-gray-400' : ''}
                  ${isError && isActive ? 'bg-red-100 text-red-600' : ''}
                `}>
                  {isActive && stage !== 'error' ? (
                    <FaSpinner className="w-4 h-4 animate-spin" />
                  ) : (
                    <StageIcon className="w-4 h-4" />
                  )}
                </div>
                <span className={`
                  ${isActive ? 'text-blue-600 font-medium' : ''}
                  ${isCompleted ? 'text-green-600' : ''}
                  ${!isActive && !isCompleted ? 'text-gray-400' : ''}
                  ${isError && isActive ? 'text-red-600' : ''}
                `}>
                  {stageInfo.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Resultado de la extracción */}
        {stage === 'completed' && className && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-green-600 mb-2">
              ¡Diagrama extraído exitosamente!
            </h4>
            <div className="text-sm">
              <div className="mb-2">
                <span className="font-medium">Resumen:</span> {className}
              </div>
              {attributes && Array.isArray(attributes) && attributes.length > 0 && (
                <div className="mb-2">
                  <span className="font-medium">Clases detectadas:</span>
                  <ul className="ml-4 mt-1 space-y-1 max-h-48 overflow-y-auto pr-2">
                    {attributes.map((cls, i) => (
                      <li key={i} className="text-xs text-gray-700">
                        • {cls.className || cls.name} <span className="text-gray-500">({cls.attributes?.length || 0} atributos)</span>
                      </li>
                    ))}
                  </ul>
                  {attributes.length > 8 && (
                    <div className="text-xs text-gray-400 mt-1 italic">
                      ↕ Desliza para ver todas las clases
                    </div>
                  )}
                </div>
              )}
              {methods && Array.isArray(methods) && methods.length > 0 && (
                <div className="mb-2">
                  <span className="font-medium">Relaciones detectadas:</span>
                  <ul className="ml-4 mt-1 space-y-1 max-h-48 overflow-y-auto pr-2">
                    {methods.map((rel, i) => (
                      <li key={i} className="text-xs text-gray-700">
                        • {rel.from} → {rel.to} 
                        {rel.type && <span className="text-gray-500"> ({rel.type})</span>}
                        {rel.requiresJoinTable && <span className="text-purple-600 font-semibold"> [N-M]</span>}
                      </li>
                    ))}
                  </ul>
                  {methods.length > 8 && (
                    <div className="text-xs text-gray-400 mt-1 italic">
                      ↕ Desliza para ver todas las relaciones
                    </div>
                  )}
                </div>
              )}
              {!Array.isArray(attributes) && attributes && attributes.length > 0 && (
                <div className="mb-2">
                  <span className="font-medium">Atributos:</span> {attributes.length}
                </div>
              )}
              {!Array.isArray(methods) && methods && methods.length > 0 && (
                <div className="mb-2">
                  <span className="font-medium">Métodos:</span> {methods.length}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {stage === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="text-red-600 font-medium mb-1">Error al procesar la imagen</div>
            <div className="text-red-500 text-sm">
              Verifica que la imagen contenga un diagrama de clase UML válido
            </div>
          </div>
        )}
        </div>

        {/* Botones fijos en la parte inferior */}
        {(stage === 'completed' || stage === 'error') && (
          <div className="flex justify-end p-6 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {stage === 'completed' ? 'Continuar' : 'Cerrar'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageProcessingModal;