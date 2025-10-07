// MisFavoritos.jsx - Versión Mejorada
import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, addDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import { Heart, ChevronLeft, Calendar, MapPin, MessageCircle, Check, Share2, Clock, Send, X } from 'lucide-react';
import PlanDetailsModal from './PlanDetailsModal';

function MisFavoritos({ user, onBack, onShowPerfil }) {
  const [planesFavoritos, setPlanesFavoritos] = useState([]);
  const [modalComentarios, setModalComentarios] = useState({
    isOpen: false,
    planId: null,
    planTitle: ''
  });
  const [comentarios, setComentarios] = useState({});
  const [cargandoComentarios, setCargandoComentarios] = useState({});
  
  // Estados para el modal de detalles del plan
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = onSnapshot(collection(db, 'planes'), (snapshot) => {
      const todosLosPlanes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const favoritos = todosLosPlanes.filter(plan => 
        plan.likes?.includes(user.uid)
      );

      setPlanesFavoritos(favoritos);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const formatDate = (dateValue) => {
    if (!dateValue) return 'No disponible';
    return new Date(dateValue).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const cargarTodosLosComentarios = async (planId) => {
    if (cargandoComentarios[planId]) return;
    setCargandoComentarios(prev => ({ ...prev, [planId]: true }));
    
    try {
      const commentsRef = collection(db, 'planes', planId, 'comments');
      const q = query(commentsRef, orderBy('timestamp', 'desc'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const comentariosData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setComentarios(prev => ({
          ...prev,
          [planId]: comentariosData
        }));
        
        setCargandoComentarios(prev => ({ ...prev, [planId]: false }));
      });

      setComentarios(prev => ({
        ...prev,
        [`unsubscribe_${planId}`]: unsubscribe
      }));
    } catch (error) {
      console.error('Error al cargar comentarios:', error);
      setCargandoComentarios(prev => ({ ...prev, [planId]: false }));
    }
  };

  const agregarComentario = async (planId, texto) => {
    if (!texto.trim()) return;

    try {
      const commentsRef = collection(db, 'planes', planId, 'comments');
      
      await addDoc(commentsRef, {
        planId: planId,
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Usuario Anónimo',
        userProfileImageUrl: null,
        text: texto.trim(),
        timestamp: new Date(),
      });

      const planRef = doc(db, 'planes', planId);
      const planActual = planesFavoritos.find(p => p.id === planId);
      const nuevoConteo = (planActual?.commentCount || 0) + 1;
      
      await updateDoc(planRef, {
        commentCount: nuevoConteo,
        lastCommentAt: new Date()
      });

      if (planActual && planActual.userId !== user.uid) {
        const notificationRef = collection(db, 'notifications');
        await addDoc(notificationRef, {
          recipientId: planActual.userId,
          senderId: user.uid,
          senderName: user.displayName || user.email?.split('@')[0] || 'Alguien',
          type: 'comment',
          message: `comentó en tu plan`,
          planTitle: planActual.title,
          planId: planId,
          commentText: texto.trim().substring(0, 50),
          read: false,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Error al agregar comentario:', error);
    }
  };

  const handleSharePlan = async (plan) => {
    const planUrl = `${window.location.origin}/plan/${plan.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: plan.title,
          text: plan.description,
          url: planUrl,
        });
      } else {
        await navigator.clipboard.writeText(planUrl);
        alert('Enlace copiado');
      }
    } catch (error) {
      console.log('Error al compartir:', error);
    }
  };

  // Función para abrir el modal de detalles del plan
  const abrirModalPlan = (plan) => {
    setSelectedPlan(plan);
    setIsPlanModalOpen(true);
  };

  // Función para manejar el toggle de like
  const handleToggleLike = async (e, plan) => {
    e.stopPropagation(); // Evitar que se abra el modal
    try {
      const planRef = doc(db, 'planes', plan.id);
      const yaDioLike = plan.likes?.includes(user.uid);
      
      await updateDoc(planRef, {
        likes: yaDioLike ? arrayRemove(user.uid) : arrayUnion(user.uid),
      });

      // Crear notificación si es un nuevo like y no es el propio plan
      if (!yaDioLike && plan.userId !== user.uid) {
        await addDoc(collection(db, 'notifications'), {
          recipientId: plan.userId,
          senderId: user.uid,
          senderName: user.displayName || user.email?.split('@')[0] || 'Alguien',
          type: 'like',
          message: 'le dio like a tu plan',
          planTitle: plan.title,
          planId: plan.id,
          read: false,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Error al dar like:', error);
    }
  };

  // Función para manejar participación
  const handleToggleParticipation = async (e, plan) => {
    e.stopPropagation();
    try {
      const planRef = doc(db, 'planes', plan.id);
      const yaParticipa = plan.participants?.includes(user.uid);
      
      await updateDoc(planRef, {
        participants: yaParticipa ? arrayRemove(user.uid) : arrayUnion(user.uid),
      });

      // Crear notificación si es nueva participación y no es el propio plan
      if (!yaParticipa && plan.userId !== user.uid) {
        await addDoc(collection(db, 'notifications'), {
          recipientId: plan.userId,
          senderId: user.uid,
          senderName: user.displayName || user.email?.split('@')[0] || 'Alguien',
          type: 'participant',
          message: 'quiere participar en tu plan',
          planTitle: plan.title,
          planId: plan.id,
          read: false,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Error al participar:', error);
    }
  };

  // Función para abrir modal de comentarios
  const abrirModalComentarios = (e, plan) => {
    e.stopPropagation();
    setModalComentarios({ isOpen: true, planId: plan.id, planTitle: plan.title });
    cargarTodosLosComentarios(plan.id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-pink-900 to-purple-900 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 lg:px-6 py-6">
        <div className="mb-8">
          <button onClick={onBack} className="group bg-white/10 backdrop-blur-xl border border-white/20 text-white px-6 py-3 rounded-2xl shadow-xl hover:bg-white/20 transition-all duration-300 flex items-center gap-3 font-medium hover:scale-105">
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Volver al inicio
          </button>
        </div>

        <div className="mb-12">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl">
              <Heart className="w-8 h-8 text-white fill-white" />
            </div>
            <h1 className="text-5xl font-black text-white">Me gusta</h1>
          </div>
          
          <div className="flex justify-end">
            <div className="bg-gradient-to-r from-red-500/20 to-pink-500/20 backdrop-blur-xl rounded-2xl px-6 py-3 border border-red-500/30">
              <span className="text-white font-bold text-xl">{planesFavoritos.length}</span>
              <span className="text-white/80 ml-2">planes que te gustan</span>
            </div>
          </div>
        </div>

        {planesFavoritos.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-8xl mb-6">💔</div>
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 border border-white/20 max-w-2xl mx-auto">
              <h4 className="text-2xl font-bold text-white mb-4">Aún no tienes planes que te gusten</h4>
              <p className="text-white/70 mb-8">Dale like a los planes que te interesen para verlos aquí</p>
              <button onClick={onBack} className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-transform shadow-2xl">
                Explorar Planes
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {planesFavoritos.map((plan) => {
              const uniqueImages = [...new Set(plan.imageUrls || [])];
              
              return (
                <div
                  key={plan.id}
                  onClick={() => abrirModalPlan(plan)}
                  className="bg-white/10 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105 cursor-pointer group"
                >
                  <div className="p-4 flex items-center gap-3 border-b border-white/10">
                    {plan.createdByPhotoURL ? (
                      <img 
                        src={plan.createdByPhotoURL} 
                        alt={plan.createdByName} 
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-white/30" 
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold ring-2 ring-white/30">
                        {(plan.createdByName?.charAt(0) || 'U').toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">
                        {plan.createdByName || 'Usuario'}
                      </p>
                      <p className="text-white/60 text-xs">
                        {plan.createdAt 
                          ? new Date(plan.createdAt).toLocaleDateString('es-ES', { 
                              day: '2-digit', 
                              month: 'short' 
                            }) 
                          : ''}
                      </p>
                    </div>
                  </div>

                  {uniqueImages.length > 0 && (
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={uniqueImages[0]} 
                        alt={plan.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    </div>
                  )}

                  <div className="p-4 space-y-3">
                    <h3 className="text-xl font-bold text-white line-clamp-2 group-hover:text-red-300 transition-colors">
                      {plan.title}
                    </h3>
                    
                    {plan.date && (
                      <div className="flex items-center gap-2 text-white/70 bg-white/5 rounded-xl p-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm font-medium">{formatDate(plan.date)}</span>
                      </div>
                    )}

                    {plan.location && (
                      <div className="flex items-center gap-2 text-white/70 bg-white/5 rounded-xl p-2">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm truncate font-medium">{plan.location}</span>
                      </div>
                    )}

                    <p className="text-white/80 text-sm line-clamp-2 leading-relaxed">
                      {plan.description}
                    </p>

                    <div className="flex items-center justify-between pt-3 border-t border-white/20 gap-1">
                      <button
                        onClick={(e) => handleToggleLike(e, plan)}
                        className="flex items-center gap-1 hover:bg-white/10 px-2 py-2 rounded-lg transition-colors"
                      >
                        <Heart className={`w-4 h-4 ${plan.likes?.includes(user.uid) ? 'fill-red-500 text-red-500' : 'text-white/70'}`} />
                        <span className="text-white/70 text-xs">{plan.likes?.length || 0}</span>
                      </button>

                      <button
                        onClick={(e) => handleToggleParticipation(e, plan)}
                        className={`flex items-center gap-1 px-2 py-2 rounded-lg ${plan.participants?.includes(user.uid) ? 'bg-green-500/20' : 'hover:bg-white/10'}`}
                      >
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-white font-bold text-xs">{plan.participants?.length || 0}</span>
                      </button>

                      <button
                        onClick={(e) => abrirModalComentarios(e, plan)}
                        className="flex items-center gap-1 hover:bg-white/10 px-2 py-2 rounded-lg transition-colors"
                      >
                        <MessageCircle className="w-4 h-4 text-white/70" />
                        <span className="text-white/70 text-xs">{plan.commentCount || 0}</span>
                      </button>

                      <button
                        onClick={(e) => handleSharePlan(e, plan)}
                        className="flex items-center gap-1 hover:bg-white/10 px-2 py-2 rounded-lg transition-colors"
                      >
                        <Share2 className="w-4 h-4 text-white/70" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Comentarios */}
      {modalComentarios.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-white/20">
            <div className="flex items-center justify-between p-6 border-b border-white/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">Comentarios</h3>
                  <p className="text-white/60 truncate">{modalComentarios.planTitle}</p>
                </div>
              </div>
              <button onClick={() => setModalComentarios({ isOpen: false, planId: null, planTitle: '' })} className="p-3 hover:bg-white/10 rounded-2xl transition-colors">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto p-6">
                {cargandoComentarios[modalComentarios.planId] ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-12 h-12 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin"></div>
                  </div>
                ) : comentarios[modalComentarios.planId]?.length > 0 ? (
                  <div className="space-y-4">
                    {comentarios[modalComentarios.planId].map((comentario) => (
                      <div key={comentario.id} className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold">
                            {(comentario.userName?.charAt(0) || 'A').toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-bold text-white">{comentario.userName || 'Usuario'}</span>
                              <div className="flex items-center text-white/60 text-sm gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(comentario.timestamp?.seconds * 1000 || comentario.timestamp).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            <p className="text-white">{comentario.text}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="text-8xl mb-6">💬</div>
                    <h4 className="text-2xl font-bold text-white mb-4">No hay comentarios</h4>
                  </div>
                )}
              </div>

              <div className="border-t border-white/20 p-6 bg-white/5">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const texto = e.target.comentario.value.trim();
                    if (!texto) return;
                    await agregarComentario(modalComentarios.planId, texto);
                    e.target.reset();
                  }}
                >
                  <div className="flex gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold">
                      {(user?.displayName?.charAt(0) || 'U').toUpperCase()}
                    </div>
                    <textarea
                      name="comentario"
                      placeholder="Escribe tu comentario..."
                      className="flex-1 p-4 bg-white/10 border border-white/30 rounded-2xl focus:outline-none focus:border-pink-400 resize-none text-white placeholder:text-white/50"
                      rows="3"
                      maxLength={500}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">{comentarios[modalComentarios.planId]?.length || 0} comentarios</span>
                    <button type="submit" className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl flex items-center gap-3 font-bold hover:scale-105 transition-all">
                      <Send className="w-5 h-5" />
                      Comentar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles del Plan */}
      {selectedPlan && (
        <PlanDetailsModal 
          plan={selectedPlan} 
          user={user} 
          isOpen={isPlanModalOpen} 
          onClose={() => {
            setIsPlanModalOpen(false);
            setSelectedPlan(null);
          }}
        />
      )}
    </div>
  );
}

export default MisFavoritos;