import React, { useEffect, useState } from 'react';
import PlanModal from './PlanModal';
import PlanDetailsModal from './PlanDetailsModal'
import FlashPlansSection from './FlashPlansSection';
import NotificationsPanel from './NotificationsPanel';
import { v4 as uuidv4 } from "uuid"; 
import { 
  arrayUnion, 
  doc, 
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  arrayRemove,
  query,
  orderBy,
  limit, 
  getDocs,
  setDoc,
  getDoc,
  where
} from 'firebase/firestore';
import { db, storage, auth } from '../firebase/firebase-config';
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
  ChevronRight,
  Settings,
  Eye,
  Phone,
  Sparkles,
  Star,
  Zap
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import logoSinde from '../assets/logo-sindesparches.png';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";
import PerfilPublico from './PerfilPublico';

// Utilidades para manejo de imágenes y datos
const ImageUtils = {
  compressImage: (file, maxWidth = 800, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  },

  blobToBase64: (blob) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }
};

// Hook personalizado para geolocalización
const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocalización no soportada');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (err) => setError('Error obteniendo ubicación: ' + err.message)
    );
  };

  return { location, error, getLocation };
};

const Home = ({ user, onLogout, onShowPerfil }) => {
  const [planes, setPlanes] = useState([]);
  const [perfilData, setPerfilData] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [comentarios, setComentarios] = useState({});
  const [ultimosComentarios, setUltimosComentarios] = useState({});
  const [cargandoComentarios, setCargandoComentarios] = useState({});
  
  // Estados para el comportamiento del header
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isFlashPlanOpen, setIsFlashPlanOpen] = useState(false);
  
  const [modalComentarios, setModalComentarios] = useState({
    isOpen: false,
    planId: null,
    planTitle: ''
  });

  const [modalCrearPlan, setModalCrearPlan] = useState(false);
  
  const [modalPlanDetails, setModalPlanDetails] = useState({
    isOpen: false,
    plan: null
  });

  const cerrarModalPlanDetails = () => {
    setModalPlanDetails({
      isOpen: false,
      plan: null
    });
  };

  const abrirModalPlanDetails = (plan) => {
    setModalPlanDetails({
      isOpen: true,
      plan: plan
    });
  };
  
  const handlePlanCreated = (newPlan) => {
    console.log('Plan creado:', newPlan);
    setModalCrearPlan(false);
  };
  
  const [nuevoPlan, setNuevoPlan] = useState({
    title: '',
    description: '',
    category: '',
    date: '',
    time: '',
    location: '',
    locationAddress: '',
    city: '',
    state: '',
    latitude: null,
    longitude: null,
    imageUrls: [],
    enableWhatsapp: false,
    phoneNumber: ''
  });

  const [creandoPlan, setCreandoPlan] = useState(false);
  const [subiendoImagenes, setSubiendoImagenes] = useState(false);
  const [errores, setErrores] = useState({});
  const { location, getLocation } = useGeolocation();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onLogout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Contar notificaciones sin leer
  useEffect(() => {
    if (!user?.uid) return;

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('recipientId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Control del header con scroll
  useEffect(() => {
    const controlHeader = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 10) {
        setIsHeaderVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsHeaderVisible(false);
      } else {
        setIsHeaderVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', controlHeader);

    return () => {
      window.removeEventListener('scroll', controlHeader);
    };
  }, [lastScrollY]);

// Cargar datos del perfil desde Firestore
useEffect(() => {
  let mounted = true;
  const fetchPerfil = async () => {
    try {
      if (!user?.uid) {
        if (mounted) setPerfilData(null);
        return;
      }
      const perfilRef = doc(db, "perfil", user.uid);
      const perfilSnap = await getDoc(perfilRef);
      if (mounted) {
        if (perfilSnap && perfilSnap.exists()) {
          setPerfilData(perfilSnap.data());
        } else {
          setPerfilData(null);
        }
      }
    } catch (error) {
     // console.error("Error obteniendo perfil:", error);
    }
  };

  fetchPerfil();
  return () => { mounted = false; };
}, [user?.uid]);

// Si no hay foto en Firestore, buscar en Storage
useEffect(() => {
  const fetchFoto = async () => {
    if (user?.uid && !perfilData?.fotoURL) {
      try {
        const fotoRef = ref(storage, `profile_pictures/${user.uid}`);
        const url = await getDownloadURL(fotoRef);
        setPerfilData((prev) => ({ ...prev, fotoURL: url }));
      } catch (error) {
        console.log("No se encontró foto en Storage:", error.message);
      }
    }
  };
  fetchFoto();
}, [user?.uid, perfilData]);

// Cargar fotos y nombres de creadores de planes antiguos
useEffect(() => {
  const actualizarPlanesAntiguos = async () => {
    const planesSinDatos = planes.filter(plan => 
      (!plan.createdByPhotoURL || !plan.createdByName) && plan.userId
    );

    if (planesSinDatos.length === 0) return;

   // console.log(`🔄 Actualizando ${planesSinDatos.length} planes...`);

    for (const plan of planesSinDatos) {
      try {
        const actualizaciones = {};
        let necesitaActualizar = false;

        if (!plan.createdByName && plan.userId) {
          const perfilRef = doc(db, 'perfil', plan.userId);
          const perfilSnap = await getDoc(perfilRef);
          
          if (perfilSnap.exists()) {
            actualizaciones.createdByName = perfilSnap.data().nombre || 'Usuario';
            necesitaActualizar = true;
          //  console.log(`✅ Nombre encontrado para plan ${plan.id}: ${actualizaciones.createdByName}`);
          }
        }

        if (!plan.createdByPhotoURL && plan.userId) {
          try {
            const fotoRef = ref(storage, `profile_pictures/${plan.userId}`);
            const url = await getDownloadURL(fotoRef);
            actualizaciones.createdByPhotoURL = url;
            necesitaActualizar = true;
           // console.log(`✅ Foto encontrada para plan ${plan.id}`);
          } catch (error) {
           // console.log(`ℹ️ No hay foto en Storage para plan ${plan.id}`);
          }
        }

        if (necesitaActualizar) {
          const planRef = doc(db, 'planes', plan.id);
          await updateDoc(planRef, actualizaciones);
         // console.log(`✅ Plan ${plan.id} actualizado`);
        }
      } catch (error) {
       // console.error(`❌ Error actualizando plan ${plan.id}:`, error);
      }
    }
  };

  if (planes.length > 0) {
    actualizarPlanesAntiguos();
  }
}, [planes]);

const formatDate = (dateValue) => {
  if (!dateValue) return 'No disponible';
  return new Date(dateValue).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const cargarUltimoComentario = async (planId) => {
  try {
    const commentsRef = collection(db, 'planes', planId, 'comments');
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

const cargarTodosLosComentarios = async (planId) => {
  if (cargandoComentarios[planId]) return;
  
  setCargandoComentarios(prev => ({ ...prev, [planId]: true }));
  
  try {
    const commentsRef = collection(db, 'planes', planId, 'comments');
    const q = query(commentsRef, orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const comentariosData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data
        };
      });
      
      setComentarios(prev => ({
        ...prev,
        [planId]: comentariosData
      }));
      
      setCargandoComentarios(prev => ({ ...prev, [planId]: false }));
    }, (error) => {
      console.error('Error en snapshot de comentarios:', error);
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
    
    const nuevoComentario = {
      planId: planId,
      userId: user.uid,
      userName: user.displayName || user.email?.split('@')[0] || 'Usuario Anónimo',
      userProfileImageUrl: null,
      text: texto.trim(),
      timestamp: new Date(),
    };

    await addDoc(commentsRef, nuevoComentario);

    const planRef = doc(db, 'planes', planId);
    const planActual = planes.find(p => p.id === planId);
    const nuevoConteo = (planActual.commentCount || 0) + 1;
    
    await updateDoc(planRef, {
      commentCount: nuevoConteo,
      lastCommentAt: new Date()
    });

    if (planActual.userId !== user.uid) {
      const notificationRef = collection(db, 'notifications');
      await addDoc(notificationRef, {
        recipientId: planActual.userId,
        senderId: user.uid,
        senderName: user.displayName || user.email?.split('@')[0] || 'Alguien',
        type: 'comment',
        message: `${user.displayName || user.email?.split('@')[0] || 'Alguien'} comentó en tu plan`,
        planTitle: planActual.title,
        planId: planId,
        commentText: texto.trim().substring(0, 50) + (texto.length > 50 ? '...' : ''),
        read: false,
        timestamp: new Date()
      });
    }
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

const abrirModalComentarios = async (plan) => {
  setModalComentarios({
    isOpen: true,
    planId: plan.id,
    planTitle: plan.title
  });
  
  await cargarTodosLosComentarios(plan.id);
};

const cerrarModalComentarios = () => {
  setModalComentarios({
    isOpen: false,
    planId: null,
    planTitle: ''
  });
  
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
    
    planesData.forEach(plan => {
      if ((plan.commentCount || 0) > 0 && !ultimosComentarios[plan.id]) {
        cargarUltimoComentario(plan.id);
      }
    });
  });

  return () => {
    unsubscribe();
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
    // Ordenar por fecha de creación, NO por la fecha del evento
    const fechaCreacionA = a.createdAt?.toDate?.() || a.timestamp?.toDate?.() || new Date(a.createdAt || a.timestamp || 0);
    const fechaCreacionB = b.createdAt?.toDate?.() || b.timestamp?.toDate?.() || new Date(b.createdAt || b.timestamp || 0);
    return fechaCreacionB - fechaCreacionA; // Más reciente primero
  });

// Estado para perfil público
const [perfilPublicoAbierto, setPerfilPublicoAbierto] = useState({
  isOpen: false,
  userId: null
});

  return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-900 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-pink-400/20 to-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
      </div>

     {/* HEADER MODERNO CON SCROLL */}
      <header className={`fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-xl border-b border-white/20 shadow-2xl transition-transform duration-300 ${
        isHeaderVisible && !modalCrearPlan && !modalPlanDetails.isOpen && !isFlashPlanOpen ? 'translate-y-0' : '-translate-y-full'
      }`}>
              <div className="flex items-center justify-between px-4 lg:px-8 py-4">
          
          {/* Logo y nombre con efecto glassmorphism */}
          <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
            <div className="relative">
              <img src={logoSinde} alt="Logo" className="h-12 w-12 lg:h-14 lg:w-14 rounded-2xl shadow-2xl" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full animate-pulse"></div>
            </div>
            <div className="hidden sm:block min-w-0">
              <h1 className="text-xl lg:text-2xl font-black text-white bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                SindesParches
              </h1>
              <p className="text-sm text-white/70 font-medium">¡Encuentra tu parche perfecto!</p>
            </div>
          </div>

          {/* Barra de búsqueda centrada con glassmorphism */}
          <div className="hidden lg:flex flex-1 justify-center px-8 max-w-2xl mx-auto">
            <div className="relative w-full group">
              <input
                type="text"
                placeholder="¿Qué parche épico buscas hoy? ✨"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl focus:ring-4 focus:ring-pink-500/50 focus:outline-none focus:bg-white/30 transition-all duration-300 text-white placeholder:text-white/70 text-sm font-medium"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 group-focus-within:text-pink-400 transition-colors">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Información del usuario con diseño moderno */}
          <div className="flex items-center gap-3 lg:gap-4">
            {/* Info del usuario con glassmorphism */}
            <button
              onClick={onShowPerfil}
              className="hidden xl:flex items-center gap-4 bg-white/10 backdrop-blur-xl rounded-2xl p-3 hover:bg-white/20 transition-all duration-300 group"
            >
              <div className="text-right min-w-0">
                <p className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors">
                  {perfilData?.nombre || user?.displayName || user?.email?.split('@')[0] || 'Usuario'}
                </p>
                <p className="text-xs text-white/60">{user?.email}</p>
              </div>

              <div className="relative">
                {perfilData?.fotoURL ? (
                  <img
                    src={perfilData.fotoURL}
                    alt="Avatar"
                    className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white/30 group-hover:ring-pink-400/50 transition-all duration-300"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg ring-2 ring-white/30 group-hover:ring-pink-400/50 transition-all duration-300">
                    {(perfilData?.nombre?.charAt(0) ||
                      user?.displayName?.charAt(0) ||
                      user?.email?.charAt(0) ||
                      'U').toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                  <Star className="w-3 h-3 text-white" />
                </div>
              </div>
            </button>

            {/* Botones de acción modernos */}
            <div className="flex gap-2 items-center">
              <button
                title="Mi Perfil"
                className="bg-white/10 backdrop-blur-xl hover:bg-white/20 p-3 rounded-2xl transition-all duration-300 hover:scale-110 hidden xs:block group"
                onClick={onShowPerfil}
              >
                <User className="w-5 h-5 text-white group-hover:text-pink-400 transition-colors" />
              </button>
              
             
              
              <button
                title="Notificaciones"
                className="bg-white/10 backdrop-blur-xl hover:bg-white/20 p-3 rounded-2xl transition-all duration-300 hover:scale-110 relative group"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-5 h-5 text-white group-hover:text-pink-400 transition-colors" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-pink-500 to-red-500 rounded-full animate-bounce flex items-center justify-center">
                    <span className="text-xs text-white font-bold">{unreadCount}</span>
                  </span>
                )}
              </button>

              <button
                title="Menu"
                className="bg-white/10 backdrop-blur-xl hover:bg-white/20 p-3 rounded-2xl transition-all duration-300 hover:scale-110 group"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {menuOpen ? (
                  <X className="w-5 h-5 text-white group-hover:text-pink-400 transition-colors" />
                ) : (
                  <Menu className="w-5 h-5 text-white group-hover:text-pink-400 transition-colors" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Barra de búsqueda móvil moderna */}
        <div className="lg:hidden px-4 pb-4">
          <div className="relative group">
            <input
              type="text"
              placeholder="Buscar parches épicos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/20 backdrop-blur-xl rounded-2xl text-white placeholder:text-white/70 focus:outline-none focus:ring-4 focus:ring-pink-500/50 text-sm font-medium border border-white/30"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
        </div>
      </header>

      {/* MENU LATERAL MODERNO */}
      {menuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end" onClick={() => setMenuOpen(false)}>
          <div className="bg-white/10 backdrop-blur-2xl w-80 h-full shadow-2xl transform transition-transform duration-500 ease-out border-l border-white/20" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Mi Cuenta</h3>
                <button onClick={() => setMenuOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-xl rounded-2xl p-4">
                {perfilData?.fotoURL ? (
                  <img src={perfilData.fotoURL} alt="Avatar" className="w-16 h-16 rounded-2xl object-cover" />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl">
                    {(perfilData?.nombre?.charAt(0) || user?.displayName?.charAt(0) || user?.email?.charAt(0) || "U").toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white text-lg">{perfilData?.nombre || user?.displayName || user?.email?.split("@")[0] || "Usuario"}</p>
                  <p className="text-white/60 text-sm">{user?.email}</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <nav className="space-y-3">
                {[
                  { icon: User, label: "Mi Perfil", action: onShowPerfil },
                  { icon: Bell, label: "Notificaciones", action: () => setShowNotifications(true) },
                  { icon: Heart, label: "Planes que me gustan", action: () => setShowLikedPlans(true) },
    
              
                ].map((item, index) => (
                  <button
                    key={index}
                    onClick={item.action}
                    className="w-full flex items-center gap-4 text-left p-4 hover:bg-white/10 rounded-2xl transition-all duration-300 group"
                  >
                    <item.icon className="w-6 h-6 text-white/70 group-hover:text-pink-400 transition-colors" />
                    <span className="text-white group-hover:text-pink-400 transition-colors font-medium">{item.label}</span>
                  </button>
                ))}

                <div className="border-t border-white/20 pt-4 mt-6">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 text-left p-4 hover:bg-red-500/20 rounded-2xl transition-all duration-300 text-red-400 hover:text-red-300 group"
                  >
                    <LogOut className="w-6 h-6" />
                    <span className="font-bold">Cerrar Sesión</span>
                  </button>
                </div>
              </nav>
            </div>
          </div>
        </div>
      )}

      <main className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 py-8" style={{ paddingTop: '180px' }}> 

        
        {/* Botón crear plan - versión original que se oculta al hacer scroll */}
        <div className={`text-center mb-12 transition-opacity duration-300 ${
            isHeaderVisible && !modalPlanDetails.isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}>
          <div className="relative inline-block group">
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300 animate-pulse"></div>
            <button 
              onClick={() => setModalCrearPlan(true)}
              className="relative bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-2xl hover:shadow-pink-500/25 transform hover:scale-105 transition-all duration-300 flex items-center gap-3 mx-auto group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -skew-x-12 transform translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000"></div>
              <div className="relative flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center group-hover:rotate-180 transition-transform duration-500">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-lg font-black">¡Crear Plan Épico!</span>
                <div className="text-2xl animate-bounce">🚀</div>
              </div>
            </button>
          </div>
        </div>

        {/* Botón flotante compacto - aparece al hacer scroll */}
        <div className={`fixed bottom-8 right-8 z-50 transition-all duration-300 ${
          !isHeaderVisible && !modalCrearPlan ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
        }`}>
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-300 animate-pulse"></div>
            <button 
              onClick={() => setModalCrearPlan(true)}
              className="relative bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white p-5 rounded-full font-black shadow-2xl hover:shadow-pink-500/25 transform hover:scale-110 transition-all duration-300 group overflow-hidden"
              title="Crear Plan Épico"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal */}
        <PlanModal 
          isOpen={modalCrearPlan}
          onClose={() => setModalCrearPlan(false)}
          onPlanCreated={handlePlanCreated}
          perfilData={perfilData}  // ✅ AGREGAR ESTA LÍNEA
        />
        {/* AGREGAR ESTO */}
        <FlashPlansSection 
          user={user}
          isOpen={isFlashPlanOpen}
          onClose={() => setIsFlashPlanOpen(false)}
          onOpen={() => setIsFlashPlanOpen(true)}
        />

{/* SECCIÓN DE PLANES CON DISEÑO MODERNO */}
<section>
  <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-12 gap-6">
    <div className="relative">
      {/* Línea decorativa superior */}
      <div className="absolute top-0 left-0 w-32 h-1 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"></div>

      <div className="pt-6 pb-4">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-4xl font-black text-white">
            Planes Épicos
          </h2>
        </div>
        <p className="text-white/70 text-base pl-16">
          Descubre aventuras increíbles cerca de ti
        </p>
      </div>

      {/* Línea decorativa inferior */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
    </div>

    {busqueda && (
      <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xl rounded-2xl px-6 py-3">
        <span className="text-white/80 font-medium">Buscando:</span>
        <span className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2 rounded-xl font-bold">
          "{busqueda}"
        </span>
        <button onClick={() => setBusqueda('')} className="text-white/60 hover:text-white p-1">
          <X className="w-5 h-5" />
        </button>
      </div>
    )}
  </div>

  {planesFiltrados.length === 0 ? (
    <div className="text-center py-20 px-4">
      <div className="text-8xl mb-6">😔</div>
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 max-w-2xl mx-auto border border-white/20">
        <h3 className="text-3xl font-black text-white mb-4">
          {busqueda ? 'No encontramos planes con esa búsqueda' : 'No hay planes disponibles'}
        </h3>
        <p className="text-white/70 mb-8 text-lg">
          {busqueda ? 'Intenta con otros términos o crea tu propio plan épico' : '¡Sé el primero en crear un plan increíble!'}
        </p>
        <button
          onClick={() => setModalCrearPlan(true)}
          className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-transform text-lg shadow-2xl"
        >
          Crear el Primer Plan 🚀
        </button>
      </div>
    </div>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
      {planesFiltrados.map((plan) => {
        const uniqueImages = [...new Set(plan.imageUrls || [])];

        return (
          <div
            key={plan.id}
            className="group relative bg-white/20 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/20 hover:bg-white/30 transition-all duration-500 hover:scale-105 hover:shadow-pink-500/25 overflow-hidden"
          >
          {/* Efecto de brillo en hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-purple-500/10 to-pink-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          {/* ✅ Info del creador */}
          <div className="relative z-10 flex items-center gap-3 mb-4 bg-white/10 backdrop-blur-xl rounded-2xl p-3 border border-white/10">
            {plan.createdByPhotoURL ? (
              <img
                src={plan.createdByPhotoURL}
                alt={plan.createdByName}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-white/30"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm ring-2 ring-white/30">
                {(plan.createdByName?.charAt(0) || 'U').toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate">
                {plan.createdByName || 'Usuario'}
              </p>
            </div>
          </div>

      {/* Imágenes del plan con diseño moderno */}
      {uniqueImages.length > 0 && (
        <div className="relative w-full h-64 mb-6 rounded-2xl overflow-hidden shadow-2xl">
          {uniqueImages.length === 1 ? (
            <img
              src={uniqueImages[0]}
              alt={plan.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <Slider
              dots={true}
              arrows={false}
              infinite
              speed={500}
              slidesToShow={1}
              slidesToScroll={1}
              autoplay={true}
              autoplaySpeed={3000}
            >
              {uniqueImages.map((url, index) => (
                <div key={index}>
                  <img
                    src={url}
                    alt={`Imagen ${index + 1}`}
                    className="w-full h-64 object-cover"
                  />
                </div>
              ))}
            </Slider>
          )}
          
          {/* Overlay con gradiente */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
        </div>
      )}

      {/* Contenido del plan con diseño moderno */}
      <div className="relative z-10 space-y-4">
        <h3 className="text-2xl font-black text-white group-hover:text-pink-300 transition-colors line-clamp-2">
          {plan.title}
        </h3>
        
        <p className="text-white/80 line-clamp-3 leading-relaxed">
          {plan.description}
        </p>
        
        {/* Información con iconos modernos */}
        <div className="space-y-3">
          {plan.date && (
            <div className="flex items-center gap-3 text-white/70 bg-white/5 rounded-xl p-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium">{formatDate(plan.date)}</span>
            </div>
          )}

          {plan.location && (
            <div className="flex items-center gap-3 text-white/70 bg-white/5 rounded-xl p-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium truncate">{plan.location}</span>
            </div>
          )}
        </div>

        {/* Botón de ver plan moderno */}
        <button
          onClick={() => abrirModalPlanDetails(plan)}
          className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-6 py-4 rounded-2xl font-bold transition-all duration-300 hover:scale-105 shadow-2xl"
        >
          <Eye className="w-5 h-5" />
          <span>Ver Plan Épico</span>
          <Sparkles className="w-5 h-5" />
        </button>

        {/* Acciones del plan con diseño moderno */}
        <div className="flex items-center justify-between pt-4 border-t border-white/20">
          <div className="flex items-center gap-3">
            {/* Like con animación */}
            <button
              onClick={async () => {
                const planRef = doc(db, 'planes', plan.id);
                const yaDioLike = plan.likes?.includes(user.uid);
                
                await updateDoc(planRef, {
                  likes: yaDioLike ? arrayRemove(user.uid) : arrayUnion(user.uid),
                });

                if (!yaDioLike && plan.userId !== user.uid) {
                  const notificationRef = collection(db, 'notifications');
                  await addDoc(notificationRef, {
                    recipientId: plan.userId,
                    senderId: user.uid,
                    senderName: user.displayName || user.email?.split('@')[0] || 'Alguien',
                    type: 'like',
                    message: `${user.displayName || user.email?.split('@')[0] || 'Alguien'} le dio like a tu plan`,
                    planTitle: plan.title,
                    planId: plan.id,
                    read: false,
                    timestamp: new Date()
                  });
                }
              }}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-xl hover:bg-red-500/20 px-4 py-2 rounded-xl transition-all duration-300 hover:scale-110 group"
            >
              <Heart
                className={`w-5 h-5 transition-all duration-300 ${
                  plan.likes?.includes(user.uid) 
                    ? 'fill-red-500 text-red-500 scale-110' 
                    : 'text-white/70 group-hover:text-red-400'
                }`}
              />
              <span className="text-white font-bold">{plan.likes?.length || 0}</span>
            </button>

            {/* Participar con animación */}
            <button
              onClick={async () => {
                const planRef = doc(db, 'planes', plan.id);
                const yaParticipa = plan.participants?.includes(user.uid);
                
                await updateDoc(planRef, {
                  participants: yaParticipa ? arrayRemove(user.uid) : arrayUnion(user.uid),
                });

                if (!yaParticipa && plan.userId !== user.uid) {
                  const notificationRef = collection(db, 'notifications');
                  await addDoc(notificationRef, {
                    recipientId: plan.userId,
                    senderId: user.uid,
                    senderName: user.displayName || user.email?.split('@')[0] || 'Alguien',
                    type: 'participant',
                    message: `${user.displayName || user.email?.split('@')[0] || 'Alguien'} quiere participar en tu plan`,
                    planTitle: plan.title,
                    planId: plan.id,
                    read: false,
                    timestamp: new Date()
                  });
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all duration-300 hover:scale-110 ${
                plan.participants?.includes(user.uid)
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-xl'
                  : 'bg-white/10 backdrop-blur-xl text-white/70 hover:bg-green-500/20 hover:text-green-400'
              }`}
            >
              <Check className="w-5 h-5" />
              <span>{plan.participants?.length || 0}</span>
            </button>
          </div>

          {/* WhatsApp y Compartir modernos */}
          <div className="flex items-center gap-2">
            {plan.enableWhatsapp && plan.phoneNumber && (
              <a
                href={`https://wa.me/${plan.phoneNumber.replace(/\D/g, '')}?text=Hola! Vi tu plan "${plan.title}" en SindesParches y me interesa participar.`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-green-500 hover:bg-green-600 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-xl"
              >
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.515"/>
                </svg>
              </a>
            )}
            
            <button
              onClick={() =>
                navigator.share?.({
                  title: plan.title,
                  text: plan.description,
                  url: window.location.href,
                }) || alert('Función de compartir no disponible')
              }
              className="w-10 h-10 bg-blue-500 hover:bg-blue-600 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-xl"
            >
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Comentarios modernos */}
        <div className="pt-3">
          <button
            onClick={() => abrirModalComentarios(plan)}
            className="flex items-center gap-3 text-white/70 hover:text-pink-400 hover:bg-white/10 px-4 py-3 rounded-xl transition-all duration-300 font-medium"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Ver comentarios</span>
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-3 py-1 rounded-xl text-sm font-bold">
              {plan.commentCount || 0}
            </div>
          </button>
        </div>
      </div>
    </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Modal de comentarios moderno */}
        {modalComentarios.isOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-white/20">
              {/* Header del Modal */}
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
                <button
                  onClick={cerrarModalComentarios}
                  className="p-3 hover:bg-white/10 rounded-2xl transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              {/* Contenido del Modal */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Lista de Comentarios */}
                <div className="flex-1 overflow-y-auto p-6">
                  {cargandoComentarios[modalComentarios.planId] ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-12 h-12 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin"></div>
                      <span className="ml-4 text-white font-medium">Cargando comentarios...</span>
                    </div>
                  ) : comentarios[modalComentarios.planId]?.length > 0 ? (
                    <div className="space-y-4">
                      {comentarios[modalComentarios.planId].map((comentario) => (
                        <div
                          key={comentario.id}
                          className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold">
                              {(comentario.userName?.charAt(0) || 'A').toUpperCase()}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-bold text-white">{comentario.userName || 'Usuario Anónimo'}</span>
                                <div className="flex items-center text-white/60 text-sm gap-1">
                                  <Clock className="w-3 h-3" />
                                  {(() => {
                                    let fecha;
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
                              <p className="text-white leading-relaxed break-words">
                                {comentario.text}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="text-8xl mb-6">💬</div>
                      <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
                        <h4 className="text-2xl font-bold text-white mb-4">No hay comentarios aún</h4>
                        <p className="text-white/70 mb-6">¡Sé el primero en comentar sobre este plan épico!</p>
                        <div className="bg-pink-500/20 rounded-2xl p-4 text-pink-300 text-sm">
                          💡 Los comentarios aparecerán aquí en tiempo real
                        </div>
                      </div>
                    </div>
                  )}
                </div>
 
                {/* Formulario para agregar comentario */}
                <div className="border-t border-white/20 p-6 bg-white/5">
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const texto = e.target.comentario.value.trim();
                      if (!texto) return;

                      await agregarComentario(modalComentarios.planId, texto);
                      e.target.reset();
                    }}
                    className="space-y-4"
                  >
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold flex-shrink-0">
                        {(user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
                      </div>
                      
                      <div className="flex-1">
                        <textarea
                          name="comentario"
                          placeholder="Escribe tu comentario épico aquí... ✨"
                          className="w-full p-4 bg-white/10 backdrop-blur-xl border border-white/30 rounded-2xl focus:outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/20 resize-none transition-all duration-300 text-white placeholder:text-white/50"
                          rows="3"
                          maxLength={500}
                        />
                        <div className="flex items-center justify-between mt-2 text-xs text-white/60">
                          <span>Máximo 500 caracteres</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 font-medium">
                        {comentarios[modalComentarios.planId]?.length || 0} comentarios
                      </span>
                      <button
                        type="submit"
                        className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-2xl transition-all duration-300 flex items-center gap-3 font-bold shadow-2xl hover:scale-105"
                      >
                        <Send className="w-5 h-5" />
                        <span>Comentar</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL COMPONENT */}
{modalPlanDetails.isOpen && modalPlanDetails.plan && (
  <PlanDetailsModal 
    plan={modalPlanDetails.plan} 
    user={user} 
    isOpen={modalPlanDetails.isOpen} 
    onClose={cerrarModalPlanDetails}
    onOpenPerfilPublico={(userId) => {
      setPerfilPublicoAbierto({ isOpen: true, userId });
    }}
  />
)}
      </main>


{perfilPublicoAbierto.isOpen && (
  <PerfilPublico
    userId={perfilPublicoAbierto.userId}
    currentUser={user}
    onClose={() => setPerfilPublicoAbierto({ isOpen: false, userId: null })}
  />
)}

       {/* Panel de notificaciones */}
      <NotificationsPanel 
        user={user}
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onNavigateToPlan={abrirModalPlanDetails} 
      />
    </div>
  );
};

export default Home;