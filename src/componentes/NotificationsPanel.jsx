import React, { useState, useEffect } from 'react';
import { Bell, X, Clock, Heart, MessageCircle, UserPlus, Sparkles } from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/firebase-config';

const NotificationsPanel = ({ user, isOpen, onClose, onNavigateToPlan }) => {  // ✅ Nueva prop
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar notificaciones en tiempo real
  useEffect(() => {
    if (!isOpen || !user?.uid) return;

    setLoading(true);
    
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('recipientId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .sort((a, b) => {
        const dateA = a.timestamp || a.createdAt;
        const dateB = b.timestamp || b.createdAt;
        
        const timeA = dateA?.toDate?.() || new Date(dateA);
        const timeB = dateB?.toDate?.() || new Date(dateB);
        
        return timeB - timeA;
      });
      
      setNotifications(notificationsData);
      setLoading(false);
    }, (error) => {
      console.error('Error cargando notificaciones:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, user?.uid]);

  // ✅ Manejar clic en notificación
  const handleNotificationClick = async (notification) => {
    try {
      // Marcar como leída
      if (!notification.read) {
        await marcarComoLeida(notification.id);
      }

      // Si tiene planId, navegar al plan
      if (notification.planId && onNavigateToPlan) {
        // Obtener los datos del plan
        const planRef = doc(db, 'planes', notification.planId);
        const planSnap = await getDoc(planRef);
        
        if (planSnap.exists()) {
          const planData = {
            id: planSnap.id,
            ...planSnap.data()
          };
          
          // Cerrar el panel de notificaciones
          onClose();
          
          // Abrir el modal del plan
          onNavigateToPlan(planData);
        } else {
          console.log('El plan ya no existe');
          // Opcional: mostrar mensaje al usuario
        }
      }
    } catch (error) {
      console.error('Error navegando al plan:', error);
    }
  };

  // Marcar notificación como leída
  const marcarComoLeida = async (notificationId) => {
    try {
      const notifRef = doc(db, 'notifications', notificationId);
      await updateDoc(notifRef, {
        read: true,
        readAt: new Date()
      });
    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
    }
  };

  // Eliminar notificación
  const eliminarNotificacion = async (notificationId) => {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
      console.error('Error eliminando notificación:', error);
    }
  };

  // Obtener icono según tipo de notificación
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return <Heart className="w-5 h-5 text-red-400" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-400" />;
      case 'participant':
        return <UserPlus className="w-5 h-5 text-green-400" />;
      case 'welcome':
        return <Sparkles className="w-5 h-5 text-yellow-400" />;
      default:
        return <Bell className="w-5 h-5 text-purple-400" />;
    }
  };

  // Formatear tiempo relativo
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Ahora';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-24 right-6 bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 w-96 z-40 max-h-[32rem] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl flex items-center justify-center">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Notificaciones</h3>
            {notifications.length > 0 && (
              <p className="text-xs text-white/60">
                {notifications.filter(n => !n.read).length} sin leer
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-xl transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Lista de notificaciones */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin"></div>
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}  // ✅ Manejar clic
                className={`relative group rounded-2xl p-4 transition-all cursor-pointer ${
                  notification.read
                    ? 'bg-white/5 hover:bg-white/10'
                    : 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-l-4 border-blue-400 hover:from-blue-500/30 hover:to-purple-500/30'
                }`}
              >
                {/* Botón eliminar */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    eliminarNotificacion(notification.id);
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/20 rounded-lg"
                >
                  <X className="w-4 h-4 text-white/70" />
                </button>

                <div className="flex items-start gap-3">
                  {/* Icono */}
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium leading-snug mb-1">
                      {notification.message}
                    </p>
                    {notification.planTitle && (
                      <p className="text-white/70 text-sm truncate mb-2">
                        📍 {notification.planTitle}
                      </p>
                    )}
                    {notification.commentText && (
                      <p className="text-white/60 text-xs italic mb-2 line-clamp-2">
                        "{notification.commentText}"
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-white/60 text-xs">
                      <Clock className="w-3 h-3" />
                      {getTimeAgo(notification.timestamp || notification.createdAt)}
                    </div>
                  </div>

                  {/* Indicador de no leída */}
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0 mt-2 animate-pulse"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔔</div>
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
              <h4 className="text-lg font-bold text-white mb-2">
                No hay notificaciones
              </h4>
              <p className="text-white/60 text-sm">
                Te avisaremos cuando haya algo nuevo
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-white/20 p-4">
          <button
            onClick={() => {
              notifications.forEach(n => {
                if (!n.read) marcarComoLeida(n.id);
              });
            }}
            className="w-full py-2 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors text-sm font-medium"
          >
            Marcar todas como leídas
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationsPanel;