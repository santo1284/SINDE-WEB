import React, { useEffect, useState, useRef, useCallback } from 'react';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, getDownloadURL } from 'firebase/storage';
import { db } from '../firebase/firebase-config';
import { useAuth } from '../context/AuthContext';

const FlashPlanViewer = ({ flashPlan, onClose }) => {
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [userDisplayName, setUserDisplayName] = useState('Usuario');
  const [userPhotoURL, setUserPhotoURL] = useState(null);
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

  // Cargar foto y nombre del creador
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Cargar nombre
        let nombre = 'Usuario';
        if (flashPlan.createdByName && flashPlan.createdByName.trim()) {
          nombre = flashPlan.createdByName;
        } else if (flashPlan.userName && flashPlan.userName.trim()) {
          nombre = flashPlan.userName;
        } else if (flashPlan.userId) {
          const perfilRef = doc(db, 'perfil', flashPlan.userId);
          const perfilSnap = await getDoc(perfilRef);
          if (perfilSnap.exists()) {
            const perfilData = perfilSnap.data();
            nombre = perfilData.nombre || perfilData.displayName || nombre;
          }
        }
        setUserDisplayName(nombre);

        // Cargar foto de perfil
        let foto = null;
        
        if (flashPlan.createdByPhotoURL) {
          foto = flashPlan.createdByPhotoURL;
        } 
        else if (flashPlan.userPhoto) {
          foto = flashPlan.userPhoto;
        }
        else if (flashPlan.userId) {
          const perfilRef = doc(db, 'perfil', flashPlan.userId);
          const perfilSnap = await getDoc(perfilRef);
          if (perfilSnap.exists()) {
            const perfilData = perfilSnap.data();
            foto = perfilData.fotoURL;
          }
        }
        
        if (!foto && flashPlan.userId) {
          try {
            const storage = getStorage();
            const fotoRef = storageRef(storage, `profile_pictures/${flashPlan.userId}`);
            foto = await getDownloadURL(fotoRef);
          } catch (storageError) {
            console.log('No hay foto en Storage');
          }
        }
        
        setUserPhotoURL(foto);

      } catch (error) {
        console.error('Error cargando datos del usuario:', error);
      }
    };

    fetchUserData();
  }, [flashPlan]);

  // Marcar como visto (versión simple con viewers)
  useEffect(() => {
    const markAsViewed = async () => {
      if (
        currentUser && 
        flashPlan.userId !== currentUser.uid && 
        !flashPlan.viewers?.includes(currentUser.uid) &&
        !hasMarkedAsViewed.current
      ) {
        try {
          hasMarkedAsViewed.current = true;
          
          const flashPlanRef = doc(db, 'flashPlans', flashPlan.id);
          await updateDoc(flashPlanRef, {
            viewers: arrayUnion(currentUser.uid)
          });
          
        } catch (error) {
          console.error('Error marking as viewed:', error);
          hasMarkedAsViewed.current = false;
        }
      }
    };

    markAsViewed();
  }, [flashPlan.id, flashPlan.userId, flashPlan.viewers, currentUser?.uid]);

  // Progress bar y tiempo
  useEffect(() => {
    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + (100 / (DURATION / 100));
        if (newProgress >= 100) {
          setTimeout(() => handleClose(), 0);
          return 100;
        }
        return newProgress;
      });
    }, 100);

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

  // Calcular número de vistas
  const viewsCount = flashPlan.viewers?.length || 0;

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
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white ring-2 ring-white/50">
              {userPhotoURL ? (
                <img 
                  src={userPhotoURL} 
                  alt={userDisplayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                  {userDisplayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-white font-medium text-sm">
                {userDisplayName}
              </p>
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
          {flashPlan.imageUrl && (
            <div className="mb-4 rounded-lg overflow-hidden max-w-full">
              <img
                src={flashPlan.imageUrl}
                alt="Flash Plan"
                className="max-w-full max-h-64 object-cover"
              />
            </div>
          )}

          {flashPlan.content && (
            <div className="text-center">
              <p className="text-white text-lg leading-relaxed">
                {flashPlan.content}
              </p>
            </div>
          )}

          {!flashPlan.content && !flashPlan.imageUrl && (
            <div className="text-center">
              <p className="text-white text-lg opacity-75">
                Flash Plan sin contenido
              </p>
            </div>
          )}
        </div>

        {/* Footer con vistas - VERSIÓN SIMPLE */}
        <div className="absolute bottom-4 left-4 right-4">
          {flashPlan.userId === currentUser?.uid ? (
            <div className="w-full bg-white bg-opacity-20 text-white py-2 px-4 rounded-lg backdrop-blur-sm flex items-center justify-center gap-2">
              <span>👁️</span>
              <span className="font-medium">{viewsCount} vistas</span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-white text-xs">
              <span>{viewsCount} vistas</span>
              <span>
                {flashPlan.timestamp?.toDate().toLocaleString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit'
                }) || 'Sin fecha'}
              </span>
            </div>
          )}
        </div>

        {/* Indicadores */}
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