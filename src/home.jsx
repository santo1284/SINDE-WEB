import React, { useEffect, useState } from 'react';
import { 
  arrayUnion, 
  doc, 
  updateDoc,
  collection,
  onSnapshot,
  doc as firestoreDoc,
  updateDoc as firestoreUpdateDoc,
  arrayUnion as firestoreArrayUnion,
  arrayRemove,
  addDoc,
  query,
  orderBy,
  limit, 
  getDocs
} from 'firebase/firestore';
import { db, auth } from './firebase-config';
import {
  User,
  LogOut,
  Heart,
  Check,
  Share2,
  MessageCircle,
  Bell,
  Menu,
  Send,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
  Plus,
  MapPin,
  Calendar,
  Image,
  Upload,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import logoSinde from './assets/logo-sindesparches.png';

const Home = ({ user, onLogout }) => {
  const [planes, setPlanes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [comentarios, setComentarios] = useState({}); // Para almacenar comentarios por plan
  const [ultimosComentarios, setUltimosComentarios] = useState({}); // Últimos comentarios por plan
  const [cargandoComentarios, setCargandoComentarios] = useState({});
  const [modalComentarios, setModalComentarios] = useState({
    isOpen: false,
    planId: null,
    planTitle: ''
  });
//crear nuevo plan 
const [modalCrearPlan, setModalCrearPlan] = useState(false);
const [nuevoPlan, setNuevoPlan] = useState({
  title:'',
  description:'',
  category:'',
  date:'',
  time:'',
  location:'',
  imageUrls:[]
});

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onLogout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'No disponible';
    return new Date(dateValue).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // ✅ CORREGIDO: Cargar el último comentario de un plan
  const cargarUltimoComentario = async (planId) => {
    try {
      const commentsRef = collection(db, 'planes', planId, 'comments');
      // ✅ Usar 'timestamp' en lugar de 'createdAt'
      const q = query(commentsRef, orderBy('timestamp', 'desc'), limit(1));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const ultimoComentario = snapshot.docs[0].data();
        setUltimosComentarios(prev => ({
          ...prev,
          [planId]: ultimoComentario
        }));
      }
    } catch (error) {
      console.error('Error al cargar último comentario:', error);
    }
  };

  // ✅ CORREGIDO: Cargar todos los comentarios de un plan
  const cargarTodosLosComentarios = async (planId) => {
    if (cargandoComentarios[planId]) return;
    
    setCargandoComentarios(prev => ({ ...prev, [planId]: true }));
    
    try {
      const commentsRef = collection(db, 'planes', planId, 'comments');
      // ✅ Usar 'timestamp' en lugar de 'createdAt'
      const q = query(commentsRef, orderBy('timestamp', 'desc'));
      
      console.log('Cargando comentarios para plan:', planId);
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('Snapshot recibido, docs:', snapshot.docs.length);
        
        const comentariosData = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Comentario encontrado:', doc.id, data);
          return {
            id: doc.id,
            ...data
          };
        });
        
        console.log('Comentarios procesados:', comentariosData);
        
        setComentarios(prev => ({
          ...prev,
          [planId]: comentariosData
        }));
        
        setCargandoComentarios(prev => ({ ...prev, [planId]: false }));
      }, (error) => {
        console.error('Error en snapshot de comentarios:', error);
        setCargandoComentarios(prev => ({ ...prev, [planId]: false }));
      });

      // Guardar la función de desuscripción para limpiar después
      setComentarios(prev => ({
        ...prev,
        [`unsubscribe_${planId}`]: unsubscribe
      }));
      
    } catch (error) {
      console.error('Error al cargar comentarios:', error);
      setCargandoComentarios(prev => ({ ...prev, [planId]: false }));
    }
  };

  // ✅ CORREGIDO: Agregar comentario con estructura unificada
  const agregarComentario = async (planId, texto) => {
    if (!texto.trim()) return;

    try {
      console.log('Agregando comentario a plan:', planId);
      console.log('Usuario actual:', user);
      
      const commentsRef = collection(db, 'planes', planId, 'comments');
      
      // ✅ ESTRUCTURA UNIFICADA - Compatible con móvil
      const nuevoComentario = {
        planId: planId,                    // ← Agregar planId
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Usuario Anónimo',  // ← Cambiar a userName
        userProfileImageUrl: null,         // ← Agregar campo para imagen
        text: texto.trim(),               // ← Cambiar de "texto" a "text"
        timestamp: new Date(),            // ← Cambiar de "createdAt" a "timestamp"
      };

      console.log('Datos del comentario:', nuevoComentario);

      const docRef = await addDoc(commentsRef, nuevoComentario);
      console.log('Comentario agregado con ID:', docRef.id);

      // Actualizar el contador de comentarios en el plan principal
      const planRef = doc(db, 'planes', planId);
      const planActual = planes.find(p => p.id === planId);
      const nuevoConteo = (planActual.commentCount || 0) + 1;
      
      console.log('Actualizando contador de comentarios a:', nuevoConteo);
      
      await updateDoc(planRef, {
        commentCount: nuevoConteo,
        lastCommentAt: new Date()
      });

      console.log('Comentario y contador actualizados exitosamente');

    } catch (error) {
      console.error('Error detallado al agregar comentario:', error);
      
      if (error.code === 'permission-denied') {
        alert('No tienes permisos para comentar. Verifica que estés autenticado.');
      } else if (error.code === 'not-found') {
        alert('El plan no existe o fue eliminado.');
      } else {
        alert(`Error al agregar el comentario: ${error.message}`);
      }
    }
  };

  // Abrir modal de comentarios
  const abrirModalComentarios = async (plan) => {
    console.log('Abriendo modal para plan:', plan.id, plan.title);
    
    setModalComentarios({
      isOpen: true,
      planId: plan.id,
      planTitle: plan.title
    });
    
    // Cargar todos los comentarios
    await cargarTodosLosComentarios(plan.id);
  };

  // Cerrar modal de comentarios
  const cerrarModalComentarios = () => {
    setModalComentarios({
      isOpen: false,
      planId: null,
      planTitle: ''
    });
    
    // Limpiar suscripción si existe
    if (modalComentarios.planId && comentarios[`unsubscribe_${modalComentarios.planId}`]) {
      comentarios[`unsubscribe_${modalComentarios.planId}`]();
      setComentarios(prev => {
        const nuevo = { ...prev };
        delete nuevo[`unsubscribe_${modalComentarios.planId}`];
        return nuevo;
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'planes'), (snapshot) => {
      const planesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPlanes(planesData);
      
      // Cargar últimos comentarios para todos los planes
      planesData.forEach(plan => {
        if ((plan.commentCount || 0) > 0 && !ultimosComentarios[plan.id]) {
          cargarUltimoComentario(plan.id);
        }
      });
    });

    return () => {
      unsubscribe();
      // Limpiar todas las suscripciones de comentarios
      Object.keys(comentarios).forEach(key => {
        if (key.startsWith('unsubscribe_') && typeof comentarios[key] === 'function') {
          comentarios[key]();
        }
      });
    };
  }, []);

  const planesFiltrados = planes
    .filter((plan) =>
      plan.title?.toLowerCase().includes(busqueda.toLowerCase())
    )
    .sort((a, b) => {
      const fechaA = a.date?.toDate?.() || new Date(a.date);
      const fechaB = b.date?.toDate?.() || new Date(b.date);
      return fechaB - fechaA;
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <header className="bg-gradient-to-b from-black/80 to-transparent text-white top-0 z-50 shadow-xl">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <img src={logoSinde} alt="Logo" className="h-22 w-22" />
 {/* BARRA DE BÚSQUEDA */}
<div className="hidden md:flex flex-1 justify-center px-4">
  <div className="relative w-full max-w-lg">
    <input
      type="text"
      placeholder="Busca tu parche aquí"
      value={busqueda}
      onChange={(e) => setBusqueda(e.target.value)}
      className="w-full pl-40 pr-4 py-3 bg-white border border-gray-300 rounded-full shadow-sm focus:ring-2 focus:outline-none transition-all duration-200 text-gray-700"
    />
    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </div>
  </div>
</div>
</div>
          <div className="flex gap-2 items-center">
            <button
              title="Perfil"
              className="bg-pink-500 hover:bg-pink-600 p-3 rounded-full transition-colors"
              onClick={() => alert('Perfil')}
            >
              <User className="w-5 h-5 text-white" />
            </button>
            <button
              title="Notificaciones"
              className="bg-pink-500 hover:bg-pink-600 p-3 rounded-full transition-colors"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="w-5 h-5 text-white" />
            </button>
            <button
              title="Menú"
              className="bg-pink-500 hover:bg-pink-600 p-3 rounded-full transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Menu className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="bg-white text-black flex justify-center items-center gap-8 py-3 text-sm font-bold border-t border-gray-200 overflow-x-auto">
          <div className="flex items-center gap-2 whitespace-nowrap cursor-pointer hover:text-pink-600 transition-colors">
            🎓 <span>EDUCACIÓN</span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap cursor-pointer hover:text-pink-600 transition-colors">
            🏅 <span>DEPORTE</span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap cursor-pointer hover:text-pink-600 transition-colors">
            🎭 <span>CULTURA</span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap cursor-pointer hover:text-pink-600 transition-colors">
            🍳 <span>GASTRONOMÍA</span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap cursor-pointer hover:text-pink-600 transition-colors">
            🧳 <span>TURISMO</span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap cursor-pointer hover:text-pink-600 transition-colors">
            🌐 <span>RUMBA</span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap cursor-pointer hover:text-pink-600 transition-colors">
            🧸 <span>INFANTIL</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/*boton crear plan */}

        <div className="text-center mb-8">
          <button
            onClick={() => setModalCrearPlan(true)}
            className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white px-8 py-3 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2 mx-auto"
          >
             ¡Crear Plan! ✨
          </button>
        </div>

        <section className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-10">
            Planes disponibles
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {planesFiltrados.map((plan) => {
              const uniqueImages = [...new Set(plan.imageUrls || [])];
              const comentariosPlan = comentarios[plan.id] || [];
              const ultimoComentario = ultimosComentarios[plan.id];

              return (
                <div
                  key={plan.id}
                  className="bg-white p-6 rounded-xl shadow-md border border-gray-200"
                >
                  {uniqueImages.length > 0 && (
                    <div className="w-full h-60 mb-4">
                      {uniqueImages.length === 1 ? (
                        <img
                          src={uniqueImages[0]}
                          alt={plan.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Slider
                          dots
                          arrows
                          infinite
                          speed={500}
                          slidesToShow={1}
                          slidesToScroll={1}
                        >
                          {uniqueImages.map((url, index) => (
                            <div key={index}>
                              <img
                                src={url}
                                alt={`Imagen ${index + 1}`}
                                className="w-full h-60 object-cover rounded-lg"
                              />
                            </div>
                          ))}
                        </Slider>
                      )}
                    </div>
                  )}

                  <h3 className="text-xl font-semibold text-teal-700">
                    {plan.title}
                  </h3>
                  <p className="text-gray-600 mt-2">{plan.description}</p>
                  {plan.date && (
                    <p className="text-sm text-gray-500 mt-1">
                      Fecha del plan: {formatDate(plan.date)}
                    </p>
                  )}

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={async () => {
                        const planRef = doc(db, 'planes', plan.id);
                        const yaDioLike = plan.likes?.includes(user.uid);
                        await updateDoc(planRef, {
                          likes: yaDioLike
                            ? arrayRemove(user.uid)
                            : arrayUnion(user.uid),
                        });
                      }}
                      className="text-red-500 hover:scale-110 transition-transform"
                    >
                      <Heart
                        size={24}
                        fill={plan.likes?.includes(user.uid) ? 'red' : 'none'}
                        stroke={plan.likes?.includes(user.uid) ? 'red' : 'gray'}
                      />
                    </button>
                    {plan.likes?.length > 0 && (
                      <span className="text-sm text-gray-600">
                        {plan.likes.length}
                      </span>
                    )}

                    <button
                      onClick={async () => {
                        const planRef = doc(db, 'planes', plan.id);
                        const yaParticipa = plan.participants?.includes(user.uid);
                        await updateDoc(planRef, {
                          participants: yaParticipa
                            ? arrayRemove(user.uid)
                            : arrayUnion(user.uid),
                        });
                      }}
                      className={`flex items-center gap-1 px-3 py-2 rounded text-white text-sm ${
                        plan.participants?.includes(user.uid)
                          ? 'bg-indigo-600'
                          : 'bg-indigo-500 hover:bg-indigo-200'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      {plan.participants?.length || 0}
                    </button>

                    <button
                      onClick={() =>
                        navigator.share?.({
                          title: plan.title,
                          text: plan.description,
                        })
                      }
                      className="flex items-center gap-1 px-3 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm rounded"
                    >
                      <Share2 className="w-4 h-4" />
                      Compartir
                    </button>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => abrirModalComentarios(plan)}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Ver comentarios
                      <span className="ml-1 text-gray-500">
                        ({plan.commentCount || 0})
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ✅ MODAL DE COMENTARIOS CORREGIDO */}
        {modalComentarios.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              {/* Header del Modal */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Comentarios
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {modalComentarios.planTitle}
                  </p>
                </div>
                <button
                  onClick={cerrarModalComentarios}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Contenido del Modal */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Lista de Comentarios */}
                <div className="flex-1 overflow-y-auto p-6">
                  {cargandoComentarios[modalComentarios.planId] ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600">Cargando comentarios...</span>
                    </div>
                  ) : comentarios[modalComentarios.planId]?.length > 0 ? (
                    <div className="space-y-4">
                      {comentarios[modalComentarios.planId].map((comentario) => {
                        console.log('Renderizando comentario:', comentario);
                        
                        return (
                          <div
                            key={comentario.id}
                            className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              {/* Avatar del usuario */}
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                {/* ✅ Cambiar de comentario.nombre a comentario.userName */}
                                {(comentario.userName?.charAt(0) || 'A').toUpperCase()}
                              </div>
                              
                              {/* Contenido del comentario */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {/* ✅ Cambiar de comentario.nombre a comentario.userName */}
                                  <span className="font-semibold text-gray-900">
                                    {comentario.userName || 'Usuario Anónimo'}
                                  </span>
                                  <div className="flex items-center text-xs text-gray-500 gap-1">
                                    <Clock className="w-3 h-3" />
                                    {(() => {
                                      let fecha;
                                      // ✅ Cambiar de comentario.createdAt a comentario.timestamp
                                      if (comentario.timestamp?.seconds) {
                                        fecha = new Date(comentario.timestamp.seconds * 1000);
                                      } else if (comentario.timestamp?.toDate) {
                                        fecha = comentario.timestamp.toDate();
                                      } else {
                                        fecha = new Date(comentario.timestamp);
                                      }
                                      
                                      return fecha.toLocaleString('es-ES', {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      });
                                    })()}
                                  </div>
                                </div>
                                {/* ✅ Cambiar de comentario.texto a comentario.text */}
                                <p className="text-gray-800 leading-relaxed">
                                  {comentario.text}
                                </p>
                                
                                {/* Debug info - remover en producción */}
                                <div className="text-xs text-gray-400 mt-2 font-mono">
                                  ID: {comentario.id} | User: {comentario.userId}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h4 className="text-lg font-semibold text-gray-600 mb-2">
                        No hay comentarios aún
                      </h4>
                      <p className="text-gray-500">
                        ¡Sé el primero en comentar sobre este plan!
                      </p>
                      
                      {/* Debug info */}
                      <div className="mt-4 text-xs text-gray-400">
                        Plan ID: {modalComentarios.planId}<br/>
                        Comentarios cargados: {comentarios[modalComentarios.planId]?.length || 0}<br/>
                        Estado carga: {cargandoComentarios[modalComentarios.planId] ? 'Cargando' : 'Completo'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Formulario para agregar comentario */}
                <div className="border-t border-gray-200 p-6">
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const texto = e.target.comentario.value.trim();
                      if (!texto) return;

                      await agregarComentario(modalComentarios.planId, texto);
                      e.target.reset();
                    }}
                    className="flex gap-3"
                  >
                    <div className="flex-1 relative">
                      <textarea
                        name="comentario"
                        placeholder="Escribe tu comentario aquí..."
                        className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
                        rows="2"
                        maxLength={500}
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl"
                    >
                      <Send className="w-4 h-4" />
                      Enviar
                    </button>
                  </form>
                  
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                    <span>Máximo 500 caracteres</span>
                    <span>
                      {comentarios[modalComentarios.planId]?.length || 0} comentarios
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;