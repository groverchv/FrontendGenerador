// src/pages/components/Diagramador/components/ApiKeyConfig.jsx
// Componente para gestionar múltiples API keys de Gemini desde la UI
import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaKey, FaTimes, FaCheck, FaExternalLinkAlt, FaInfoCircle, 
  FaPlus, FaTrash, FaEdit, FaSave, FaSync, FaCheckCircle, 
  FaExclamationCircle, FaQuestionCircle 
} from 'react-icons/fa';
import { 
  getApiKeys, 
  addApiKey, 
  updateApiKey, 
  deleteApiKey, 
  selectApiKey, 
  getSelectedApiKey, 
  getApiStatus, 
  clearFailedKeys 
} from '../../services/apiGemine';

const ApiKeyConfig = ({ isOpen, onClose, onConfigured }) => {
  const [keys, setKeys] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editValue, setEditValue] = useState('');
  const [status, setStatus] = useState(null);
  const [testingId, setTestingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [keyStatuses, setKeyStatuses] = useState({}); // Estado de cada key después de test

  // Cargar keys al abrir
  const loadKeys = useCallback(() => {
    const allKeys = getApiKeys();
    setKeys(allKeys);
    const selected = getSelectedApiKey();
    if (selected) {
      setSelectedId(selected.id);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadKeys();
      setStatus(null);
      setShowAddForm(false);
      setEditingId(null);
    }
  }, [isOpen, loadKeys]);

  // Probar una API key
  const handleTestKey = async (key) => {
    if (!key?.key) return;
    
    setTestingId(key.id);
    setStatus({ type: 'loading', message: `Probando ${key.name}...` });

    try {
      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key.key.trim())}`;
      const response = await fetch(testUrl);
      
      if (response.ok) {
        setKeyStatuses(prev => ({ ...prev, [key.id]: 'success' }));
        setStatus({ type: 'success', message: `✅ ${key.name}: API key válida` });
      } else {
        const error = await response.json().catch(() => ({}));
        setKeyStatuses(prev => ({ ...prev, [key.id]: 'error' }));
        
        if (error?.error?.message?.includes('expired')) {
          setStatus({ type: 'error', message: `❌ ${key.name}: API key expirada` });
        } else if (error?.error?.message?.includes('invalid')) {
          setStatus({ type: 'error', message: `❌ ${key.name}: API key inválida` });
        } else {
          setStatus({ type: 'error', message: `❌ ${key.name}: ${error?.error?.message || 'Error desconocido'}` });
        }
      }
    } catch {
      setKeyStatuses(prev => ({ ...prev, [key.id]: 'error' }));
      setStatus({ type: 'error', message: `❌ ${key.name}: Error de conexión` });
    } finally {
      setTestingId(null);
    }
  };

  // Agregar nueva key
  const handleAddKey = () => {
    if (!newKeyValue.trim()) {
      setStatus({ type: 'error', message: 'Por favor ingresa una API key' });
      return;
    }

    const newKey = addApiKey({
      name: newKeyName.trim() || `Key ${keys.length + 1}`,
      key: newKeyValue.trim(),
    });

    loadKeys();
    setNewKeyName('');
    setNewKeyValue('');
    setShowAddForm(false);
    setStatus({ type: 'success', message: `✅ Key "${newKey.name}" agregada` });
    
    // Auto-seleccionar si es la primera key no-default
    if (keys.length === 1) {
      handleSelectKey(newKey.id);
    }
  };

  // Seleccionar key para usar
  const handleSelectKey = (keyId) => {
    selectApiKey(keyId);
    setSelectedId(keyId);
    const key = keys.find(k => k.id === keyId);
    setStatus({ type: 'success', message: `✅ Usando: ${key?.name || 'Key seleccionada'}` });
    
    if (onConfigured) {
      onConfigured(key?.key);
    }
  };

  // Eliminar key
  const handleDeleteKey = (keyId) => {
    const key = keys.find(k => k.id === keyId);
    if (key?.isDefault) {
      setStatus({ type: 'error', message: '❌ No se puede eliminar la key por defecto' });
      return;
    }

    if (window.confirm(`¿Eliminar "${key?.name}"?`)) {
      deleteApiKey(keyId);
      loadKeys();
      setStatus({ type: 'success', message: `🗑️ Key eliminada` });
    }
  };

  // Iniciar edición
  const handleStartEdit = (key) => {
    if (key.isDefault) {
      setStatus({ type: 'error', message: '❌ No se puede editar la key por defecto' });
      return;
    }
    setEditingId(key.id);
    setEditName(key.name);
    setEditValue(key.key);
  };

  // Guardar edición
  const handleSaveEdit = () => {
    if (!editValue.trim()) {
      setStatus({ type: 'error', message: 'La API key no puede estar vacía' });
      return;
    }

    updateApiKey(editingId, {
      name: editName.trim() || 'Key sin nombre',
      key: editValue.trim(),
    });

    loadKeys();
    setEditingId(null);
    setStatus({ type: 'success', message: '✅ Key actualizada' });
  };

  // Toggle estado activo/inactivo
  const handleToggleActive = (key) => {
    updateApiKey(key.id, { active: !key.active });
    loadKeys();
  };

  // Reiniciar sistema
  const handleResetSystem = () => {
    clearFailedKeys();
    setKeyStatuses({});
    setStatus({ type: 'success', message: '🔄 Sistema reiniciado' });
  };

  if (!isOpen) return null;

  const apiStatus = getApiStatus();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FaKey className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Gestionar API Keys de Gemini</h3>
              <p className="text-sm text-gray-500">
                {apiStatus.availableKeys}/{apiStatus.totalKeys} keys disponibles
                {apiStatus.failedKeys > 0 && ` • ${apiStatus.failedKeys} fallidas`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetSystem}
              className="text-gray-400 hover:text-blue-600 p-2"
              title="Reiniciar sistema"
            >
              <FaSync className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Lista de Keys */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-gray-700">Tus API Keys</h4>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <FaPlus className="w-3 h-3" />
                Agregar Key
              </button>
            </div>

            {/* Formulario para agregar nueva key */}
            {showAddForm && (
              <div className="bg-blue-50 rounded-lg p-4 space-y-3 border border-blue-200">
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Nombre (ej: Key Personal, Key Trabajo)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="text"
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  placeholder="API Key (AIzaSy...)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddKey}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  >
                    <FaPlus className="inline w-3 h-3 mr-1" />
                    Agregar
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Lista de keys existentes */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className={`border rounded-lg p-3 transition-colors ${
                    selectedId === key.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : key.active 
                        ? 'border-gray-200 hover:border-gray-300' 
                        : 'border-gray-200 bg-gray-50 opacity-60'
                  }`}
                >
                  {editingId === key.id ? (
                    /* Modo edición */
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                        placeholder="Nombre"
                      />
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm font-mono"
                        placeholder="API Key"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                        >
                          <FaSave className="inline w-3 h-3 mr-1" />
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2 py-1 bg-gray-200 rounded text-xs"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Modo visualización */
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Radio button para seleccionar */}
                        <input
                          type="radio"
                          name="selectedKey"
                          checked={selectedId === key.id}
                          onChange={() => handleSelectKey(key.id)}
                          disabled={!key.active}
                          className="w-4 h-4 text-blue-600"
                        />
                        
                        {/* Info de la key */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {key.name}
                            </span>
                            {key.isDefault && (
                              <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">
                                Por defecto
                              </span>
                            )}
                            {/* Indicador de estado */}
                            {keyStatuses[key.id] === 'success' && (
                              <FaCheckCircle className="w-3.5 h-3.5 text-green-500" title="Válida" />
                            )}
                            {keyStatuses[key.id] === 'error' && (
                              <FaExclamationCircle className="w-3.5 h-3.5 text-red-500" title="Error" />
                            )}
                            {!keyStatuses[key.id] && (
                              <FaQuestionCircle className="w-3.5 h-3.5 text-gray-400" title="Sin probar" />
                            )}
                          </div>
                          <span className="text-xs text-gray-500 font-mono">
                            {key.key.slice(0, 15)}...{key.key.slice(-4)}
                          </span>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleTestKey(key)}
                          disabled={testingId === key.id}
                          className="p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-50"
                          title="Probar key"
                        >
                          {testingId === key.id ? (
                            <span className="animate-spin">⏳</span>
                          ) : (
                            <FaCheck className="w-3.5 h-3.5" />
                          )}
                        </button>
                        
                        {!key.isDefault && (
                          <>
                            <button
                              onClick={() => handleStartEdit(key)}
                              className="p-1.5 text-gray-400 hover:text-yellow-600"
                              title="Editar"
                            >
                              <FaEdit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteKey(key.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600"
                              title="Eliminar"
                            >
                              <FaTrash className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        
                        {/* Toggle activo/inactivo */}
                        <button
                          onClick={() => handleToggleActive(key)}
                          className={`ml-2 w-10 h-5 rounded-full transition-colors ${
                            key.active ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                          title={key.active ? 'Desactivar' : 'Activar'}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                            key.active ? 'translate-x-5' : 'translate-x-0.5'
                          }`} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Status Message */}
          {status && (
            <div className={`rounded-lg p-3 text-sm ${
              status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
              status.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
              'bg-gray-50 text-gray-700 border border-gray-200'
            }`}>
              {status.message}
            </div>
          )}

          {/* Instrucciones */}
          <div className="bg-blue-50 rounded-lg p-4 text-sm">
            <div className="flex items-start gap-2">
              <FaInfoCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-800 mb-2">Cómo obtener tu API key gratuita:</p>
                <ol className="list-decimal ml-4 space-y-1 text-blue-700">
                  <li>Visita Google AI Studio</li>
                  <li>Inicia sesión con tu cuenta de Google</li>
                  <li>Haz clic en <strong>"Create API key"</strong></li>
                  <li>Copia la key y agrégala aquí</li>
                </ol>
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-3 text-blue-600 hover:text-blue-800 font-medium"
                >
                  Ir a Google AI Studio <FaExternalLinkAlt className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Info sobre fallback automático */}
          <div className="bg-amber-50 rounded-lg p-3 text-sm border border-amber-200">
            <p className="text-amber-800">
              <strong>💡 Tip:</strong> Si la key seleccionada falla (tokens agotados, expirada, etc.), 
              el sistema automáticamente usará la siguiente key activa disponible.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={() => {
              const selected = keys.find(k => k.id === selectedId);
              if (selected && onConfigured) {
                onConfigured(selected.key);
              }
              onClose();
            }}
            disabled={!selectedId}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaCheck className="w-4 h-4" />
            Usar Key Seleccionada
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyConfig;
