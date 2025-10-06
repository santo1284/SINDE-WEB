// SuccessModal.jsx
import React from 'react';
import { CheckCircle, X } from 'lucide-react';

const SuccessModal = ({ isOpen, onClose, message, type = 'success' }) => {
  if (!isOpen) return null;

  const colors = {
    success: {
      bg: 'from-green-500 to-emerald-600',
      icon: 'text-green-500',
      text: 'text-green-700'
    },
    error: {
      bg: 'from-red-500 to-pink-600',
      icon: 'text-red-500',
      text: 'text-red-700'
    },
    info: {
      bg: 'from-blue-500 to-indigo-600',
      icon: 'text-blue-500',
      text: 'text-blue-700'
    }
  };

  const currentColors = colors[type] || colors.success;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-[scale-in_0.3s_ease-out]">
        {/* Header con gradiente */}
        <div className={`bg-gradient-to-r ${currentColors.bg} p-6 text-center`}>
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
            <CheckCircle className={`w-12 h-12 ${currentColors.icon}`} />
          </div>
          <h3 className="text-2xl font-bold text-white">
            {type === 'success' ? '¡Éxito!' : type === 'error' ? 'Error' : 'Información'}
          </h3>
        </div>

        {/* Contenido */}
        <div className="p-6 text-center">
          <p className={`${currentColors.text} text-lg font-medium`}>
            {message}
          </p>
        </div>

        {/* Botón */}
        <div className="p-6 pt-0">
          <button
            onClick={onClose}
            className={`w-full px-6 py-3 bg-gradient-to-r ${currentColors.bg} text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl`}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;