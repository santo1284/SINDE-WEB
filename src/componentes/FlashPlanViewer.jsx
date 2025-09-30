import React, { useEffect, useState, useRef, useCallback } from 'react';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import { useAuth } from '../context/AuthContext';

const FlashPlanViewer = ({ flashPlan, onClose }) => {
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [userDisplayName, setUserDisplayName] = useState('Usuario');
  const { currentUser } = useAuth();
  const DURATION = 5000;
  const hasMarkedAsViewed = useRef(false);
  const progressInterval = useRef(null);
  const timeInterval = useRef(null);

  // Memoizar onClose para evitar re-renders
  const handleClose = useCallback(() => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    if (timeInterval.current) clearInterval(timeInterval.current);
    onClose();
  }, [onClose]);

  // Obtener el nombre real del usuario
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        if (flashPlan.userName && flashPlan.userName.trim() && flashPlan.userName !== '') {
          setUserDisplayName(flashPlan.userName);
          return;
        }

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
  }, [flashPlan.userId, flashPlan.userName, flashPlan.userEmail]);

  // Marcar como visto - SEPARADO del efecto principal
  useEffect(() => {
    const markAsViewed = async () => {
      // Verificar condiciones antes de actualizar
      if (
        currentUser && 
        flashPlan.userId !== currentUser.uid && 
        !flashPlan.viewers?.includes(currentUser.uid) &&
        !hasMarkedAsViewed.current
      ) {
        try {
          hasMarkedAsViewed.current = true; // Marcar como procesado
          await updateDoc(doc(db, 'flashPlans', flashPlan.id), {
            viewers: arrayUnion(currentUser.uid)
          });
        } catch (error) {
          console.error('Error marking as viewed:', error);
          hasMarkedAsViewed.current = false; // Resetear en caso de error
        }
      }
    };

    markAsViewed();
  }, [flashPlan.id, flashPlan.userId, currentUser?.uid]);

  // Progress bar y tiempo - UN SOLO useEffect
  useEffect(() => {
    // Progress bar animation con ref
    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + (100 / (DURATION / 100));
        if (newProgress >= 100) {
          // Usar setTimeout para evitar setState durante render
          setTimeout(() => handleClose(), 0);
          return 100;
        }
        return newProgress;
      });
    }, 100);

    // Actualizar tiempo restante
    const updateTimeRemaining = () => {
      const now = new Date();
      const flashPlanDate = flashPlan.timestamp?.toDate();
      
      if (!flashPlanDate) {
        setTimeRemaining('Sin fecha');
        return;
      }
      
      const hoursPassed = (now - flashPlanDate) / (1000 * 60 * 60);
      const hoursRemaining = 24 - hoursPassed;
      
      if (hoursRemaining <= 0) {
        setTimeRemaining('Expirado');
      } else if (hoursRemaining < 1) {
        setTimeRemaining('Menos de 1h restante');
      } else {
        setTimeRemaining(`${Math.floor(hoursRemaining)}h restantes`);
      }
    };

    updateTimeRemaining();
    timeInterval.current = setInterval(updateTimeRemaining, 60000);

    // Cleanup function
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
      if (timeInterval.current) clearInterval(timeInterval.current);
    };
  }, [flashPlan.timestamp, handleClose]);

  const handleBackgroundClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50"
      onClick={handleBackgroundClick}
    >
      <div className="relative w-full max-w-md h-full max-h-[600px] bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg overflow-hidden">
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white bg-opacity-30">
          <div
            className="h-full bg-white transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white">
              {flashPlan.userPhoto ? (
                <img 
                  src={flashPlan.userPhoto} 
                  alt={userDisplayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                  {userDisplayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-white font-medium text-sm">{userDisplayName}</p>
              <p className="text-white text-xs opacity-75">{timeRemaining}</p>
            </div>
          </div>
          
          <button
            onClick={handleClose}
            className="text-white text-2xl hover:opacity-75"
          >
            ×
          </button>
        </div>

        {/* Contenido */}
        <div className="h-full flex flex-col justify-center items-center p-6 pt-20">
          {/* Imagen si existe */}
          {flashPlan.imageUrl && (
            <div className="mb-4 rounded-lg overflow-hidden max-w-full">
              <img
                src={flashPlan.imageUrl}
                alt="Flash Plan"
                className="max-w-full max-h-64 object-cover"
              />
            </div>
          )}

          {/* Texto del contenido */}
          {flashPlan.content && (
            <div className="text-center">
              <p className="text-white text-lg leading-relaxed">
                {flashPlan.content}
              </p>
            </div>
          )}

          {/* Si no hay contenido ni imagen */}
          {!flashPlan.content && !flashPlan.imageUrl && (
            <div className="text-center">
              <p className="text-white text-lg opacity-75">
                Flash Plan sin contenido
              </p>
            </div>
          )}
        </div>

        {/* Footer con información adicional */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center justify-between text-white text-xs">
            <span>{flashPlan.viewers?.length || 0} vistas</span>
            <span>
              {flashPlan.timestamp?.toDate().toLocaleString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
              }) || 'Sin fecha'}
            </span>
          </div>
        </div>

        {/* Indicadores de navegación */}
        <div className="absolute left-1/2 transform -translate-x-1/2 bottom-16">
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-white opacity-50"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashPlanViewer;