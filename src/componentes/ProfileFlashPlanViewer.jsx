import React from 'react';
import { X, Eye, Clock, User } from 'lucide-react';

const ProfileFlashPlanViewer = ({ flashPlan, onClose, userName, userPhoto }) => {
  const getTimeInfo = () => {
    const createdTime = flashPlan.timestamp?.toDate?.()?.getTime() || flashPlan.timestamp?.seconds * 1000 || 0;
    const now = Date.now();
    const hoursPassed = (now - createdTime) / (1000 * 60 * 60);
    
    if (hoursPassed < 1) return 'Hace menos de 1 hora';
    if (hoursPassed < 24) return `Hace ${Math.floor(hoursPassed)} horas`;
    return 'Hace más de 24 horas';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm">
      {/* Botón cerrar */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-10 bg-white/10 backdrop-blur-xl hover:bg-white/20 text-white p-3 rounded-full transition-all duration-300 hover:scale-110"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Contenedor principal */}
      <div className="w-full max-w-2xl mx-4 relative">
        {/* Header con info del usuario */}
        <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 backdrop-blur-xl rounded-t-3xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt={userName}
                  className="w-14 h-14 rounded-full border-2 border-white/30 object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl border-2 border-white/30">
                  {userName?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div>
                <h3 className="text-white font-bold text-lg">{userName || 'Usuario'}</h3>
                <div className="flex items-center gap-2 text-white/70 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>{getTimeInfo()}</span>
                </div>
              </div>
            </div>

            {/* Contador de vistas */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl px-4 py-2 flex items-center gap-2">
              <Eye className="w-5 h-5 text-white" />
              <span className="text-white font-bold">{flashPlan.viewers?.length || 0}</span>
            </div>
          </div>
        </div>

        {/* Contenido del FlashPlan */}
        <div className="bg-white/5 backdrop-blur-xl rounded-b-3xl overflow-hidden border-x border-b border-white/20">
          {/* Imagen */}
          {flashPlan.imageUrl && (
            <div className="relative w-full max-h-[60vh] flex items-center justify-center bg-black">
              <img
                src={flashPlan.imageUrl}
                alt="FlashPlan"
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Texto del contenido */}
          {flashPlan.content && (
            <div className="p-6">
              <p className="text-white text-lg leading-relaxed">
                {flashPlan.content}
              </p>
            </div>
          )}

          {/* Footer con información adicional */}
          <div className="px-6 pb-6">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Publicado el:</span>
                <span className="text-white font-medium">
                  {flashPlan.timestamp?.toDate?.()?.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileFlashPlanViewer;