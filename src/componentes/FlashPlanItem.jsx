import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import { useAuth } from '../context/AuthContext';
import FlashPlanViewer from './FlashPlanViewer';

const FlashPlanItem = ({ flashPlan }) => {
  const [showViewer, setShowViewer] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState('Usuario');
  const { currentUser } = useAuth();

  // Verificar si el usuario actual ya vio este Flash Plan
  const hasViewed = flashPlan.viewers?.includes(currentUser?.uid) || flashPlan.userId === currentUser?.uid;

  // Obtener el nombre real del usuario desde la colección perfil
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        // Si userName no está vacío, usarlo
        if (flashPlan.userName && flashPlan.userName.trim() && flashPlan.userName !== '') {
          setUserDisplayName(flashPlan.userName);
          return;
        }

        // Si userName está vacío, buscar en la colección perfil
        if (flashPlan.userId) {
          const perfilRef = doc(db, 'perfil', flashPlan.userId);
          const perfilSnap = await getDoc(perfilRef);
          
          if (perfilSnap.exists()) {
            const perfilData = perfilSnap.data();
            const nombre = perfilData.nombre || perfilData.displayName || perfilData.name;
            if (nombre && nombre.trim()) {
              setUserDisplayName(nombre);
              return;
            }
          }
        }

        // Como último recurso, usar email si está disponible
        if (flashPlan.userEmail) {
          setUserDisplayName(flashPlan.userEmail.split('@')[0]);
        } else {
          setUserDisplayName('Usuario');
        }
      } catch (error) {
        console.error('Error obteniendo nombre de usuario:', error);
        setUserDisplayName('Usuario');
      }
    };

    fetchUserName();
  }, [flashPlan.userId, flashPlan.userName]);

  // Calcular tiempo restante usando timestamp
  const getTimeRemaining = () => {
    const now = new Date();
    const flashPlanDate = flashPlan.timestamp?.toDate();
    
    if (!flashPlanDate) return '0h';
    
    const hoursPassed = (now - flashPlanDate) / (1000 * 60 * 60);
    const hoursRemaining = 24 - hoursPassed;
    
    if (hoursRemaining <= 0) return '0h';
    if (hoursRemaining < 1) return '<1h';
    return `${Math.floor(hoursRemaining)}h`;
  };

  return (
    <>
      <div className="flex-shrink-0 cursor-pointer" onClick={() => setShowViewer(true)}>
        {/* Avatar con anillo de color y preview de contenido */}
        <div className={`w-16 h-16 rounded-full p-0.5 ${hasViewed ? 'bg-gray-500' : 'bg-gradient-to-br from-pink-500 to-purple-500'}`}>
          <div className="w-full h-full rounded-full overflow-hidden bg-white relative">
            {/* Preview de imagen si existe */}
            {flashPlan.imageUrl ? (
              <div className="relative w-full h-full">
                <img 
                  src={flashPlan.imageUrl} 
                  alt={userDisplayName}
                  className="w-full h-full object-cover"
                />
                {/* Overlay con contenido de texto si existe */}
                {flashPlan.content && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-white text-xs font-bold text-center px-1 truncate">
                      {flashPlan.content.substring(0, 20)}...
                    </div>
                  </div>
                )}
              </div>
            ) : flashPlan.content ? (
              // Solo texto sin imagen
              <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center p-2">
                <div className="text-white text-xs font-bold text-center leading-tight">
                  {flashPlan.content.length > 30 
                    ? `${flashPlan.content.substring(0, 30)}...` 
                    : flashPlan.content
                  }
                </div>
              </div>
            ) : (
              // Sin contenido, mostrar avatar del usuario
              <div className="w-full h-full">
                {flashPlan.userPhoto ? (
                  <img 
                    src={flashPlan.userPhoto} 
                    alt={userDisplayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                    {userDisplayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Nombre y tiempo */}
        <div className="text-center mt-2">
          <p className="text-xs text-white font-medium truncate w-16">
            {userDisplayName}
          </p>
          <p className="text-xs text-gray-300">
            {getTimeRemaining()}
          </p>
        </div>
      </div>

      {/* Visor de Flash Plan */}
      {showViewer && (
        <FlashPlanViewer
          flashPlan={flashPlan}
          onClose={() => setShowViewer(false)}
        />
      )}
    </>
  );
};

export default FlashPlanItem;