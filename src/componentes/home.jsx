import React, { useEffect, useState } from 'react';
import PlanModal from './PlanModal';
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
  getDocs
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
  Settings
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import logoSinde from '../assets/logo-sindesparches.png';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";

// Utilidades para manejo de imágenes y datos
const ImageUtils = {
  // Comprimir imagen manteniendo calidad
  compressImage: (file, maxWidth = 800, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo aspect ratio
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        // Dibujar imagen redimensionada
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Convertir a blob con compresión
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  },

  // Convertir blob a base64 para almacenamiento
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

const Home = ({ user, onLogout }) => {
  const [planes, setPlanes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [comentarios, setComentarios] = useState({});
  const [ultimosComentarios, setUltimosComentarios] = useState({});
  const [cargandoComentarios, setCargandoComentarios] = useState({});
  const [modalComentarios, setModalComentarios] = useState({
    isOpen: false,
    planId: null,
    planTitle: ''
  });
  const [modalCrearPlan, setModalCrearPlan] = useState(false);

  const [showModal, setShowModal] = useState(false);
  
  const handlePlanCreated = (newPlan) => {
    console.log('Plan creado:', newPlan);
    // Actualizar tu lista de planes
  };
  
  // Estado mejorado para nuevo plan
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
      console.log('Agregando comentario a plan:', planId);
      console.log('Usuario actual:', user);
      
      const commentsRef = collection(db, 'planes', planId, 'comments');
      
      const nuevoComentario = {
        planId: planId,
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Usuario Anónimo',
        userProfileImageUrl: null,
        text: texto.trim(),
        timestamp: new Date(),
      };

      console.log('Datos del comentario:', nuevoComentario);

      const docRef = await addDoc(commentsRef, nuevoComentario);
      console.log('Comentario agregado con ID:', docRef.id);

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

  const abrirModalComentarios = async (plan) => {
    console.log('Abriendo modal para plan:', plan.id, plan.title);
    
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

  // Eliminar imagen
  const eliminarImagen = (index) => {
    setNuevoPlan(prev => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== index)
    }));
  };

  // Obtener ubicación actual
  const obtenerUbicacionActual = () => {
    getLocation();
  };

  // Efecto para actualizar ubicación cuando se obtiene
  useEffect(() => {
    if (location) {
      setNuevoPlan(prev => ({
        ...prev,
        latitude: location.latitude,
        longitude: location.longitude
      }));
      
      // Geocodificación inversa para obtener dirección
      geocodificarUbicacion(location.latitude, location.longitude);
    }
  }, [location]);

  // Geocodificación inversa
  const geocodificarUbicacion = async (lat, lng) => {
    try {
      // Usando un servicio de geocodificación (ejemplo con OpenStreetMap Nominatim)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        const address = data.display_name;
        const city = data.address?.city || data.address?.town || data.address?.village || '';
        const state = data.address?.state || '';
        
        setNuevoPlan(prev => ({
          ...prev,
          locationAddress: address,
          city: city,
          state: state,
          location: address // También actualizar el campo location principal
        }));
      }
    } catch (error) {
      console.error('Error en geocodificación:', error);
    }
  };

  // Validar formulario
  const validarFormulario = () => {
    const erroresTemp = {};
    
    if (!nuevoPlan.title.trim()) {
      erroresTemp.title = 'El título es obligatorio';
    }
    
    if (!nuevoPlan.description.trim()) {
      erroresTemp.description = 'La descripción es obligatoria';
    }
    
    if (!nuevoPlan.date) {
      erroresTemp.date = 'La fecha es obligatoria';
    }
    
    if (!nuevoPlan.time) {
      erroresTemp.time = 'La hora es obligatoria';
    }
    
    if (!nuevoPlan.location.trim()) {
      erroresTemp.location = 'La ubicación es obligatoria';
    }

    if (nuevoPlan.enableWhatsapp && !nuevoPlan.phoneNumber.trim()) {
      erroresTemp.phoneNumber = 'El número de teléfono es obligatorio si WhatsApp está habilitado';
    }
    
    setErrores(erroresTemp);
    return Object.keys(erroresTemp).length === 0;
  };

// 🔹 Función igual a la de móvil pero en JS
const uploadImagesToFirebase = async (imageFiles, userId, planId) => {
  const urls = [];
  for (let file of imageFiles) {
    try {
      const compressedBlob = await ImageUtils.compressImage(file);
      const imageName = `${crypto.randomUUID()}.jpg`;
      const storageRef = ref(storage, `planes/${userId}/${planId}/${imageName}`);
      const snapshot = await uploadBytes(storageRef, compressedBlob);
      const url = await getDownloadURL(snapshot.ref);
      urls.push(url);
    } catch (err) {
      console.error("❌ Error subiendo imagen:", err);
    }
  }
  return urls;
};

// 🔹 Crear plan (idéntico flujo a móvil)
const crearPlan = async (e) => {
  e.preventDefault();
  if (!validarFormulario()) return;
  setCreandoPlan(true);

  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuario no autenticado");

    // ✅ Generar ID igual que en la app móvil
    const planId = uuidv4();

    // Subir imágenes
    const imagenesComprimidas = await uploadImagesToFirebase(
      nuevoPlan.imageUrls,
      user.uid,
      planId
    );

    // Crear objeto plan
    const planData = {
      id: planId, // 👈 importante, igual que en Kotlin
      userId: user.uid,
      createdAt: Date.now(), // 👈 en móvil usas System.currentTimeMillis()
      title: nuevoPlan.title.trim(),
      description: nuevoPlan.description.trim(),
      date: new Date(`${nuevoPlan.date}T${nuevoPlan.timeString}`).getTime(),
      timeString: nuevoPlan.timeString,
      location: nuevoPlan.location.trim(),
      latitude: nuevoPlan.latitude,
      longitude: nuevoPlan.longitude,
      locationAddress: nuevoPlan.locationAddress,
      city: nuevoPlan.city,
      state: nuevoPlan.state,
      imageUrls: imagenesComprimidas,
      enableWhatsapp: nuevoPlan.enableWhatsapp,
      phoneNumber: nuevoPlan.enableWhatsapp ? nuevoPlan.phoneNumber.trim() : "",
      likes: [],
      participants: [],
      commentCount: 0,
      shares: 0,
    };

    // ✅ Guardar con el mismo ID
    await setDoc(doc(db, "planes", planId), planData);

    console.log("✅ Plan creado con ID:", planId);
    alert("¡Plan creado exitosamente!");

    setNuevoPlan({});
    setErrores({});
    setModalCrearPlan(false);
  } catch (error) {
    console.error("❌ Error al crear plan:", error);
    setErrores({ general: "Error al crear el plan. Inténtalo nuevamente." });
  } finally {
    setCreandoPlan(false);
  }
};




// FUNCIÓN MEJORADA PARA MANEJAR IMÁGENES
const manejarImagenes = async (files) => {
  if (!files || files.length === 0) return;

  try {
    // Aquí NO subimos todavía, solo guardamos los File
    const nuevasImagenes = Array.from(files).filter(
      (file) => file.type.startsWith("image/") && file.size <= 10 * 1024 * 1024
    );

    // Guardamos los files en el estado (para subirlos después en crearPlan)
    setNuevoPlan((prev) => ({
      ...prev,
      imageUrls: [...prev.imageUrls, ...nuevasImagenes].slice(0, 5),
    }));
  } catch (error) {
    console.error("Error procesando imágenes:", error);
    setErrores((prev) => ({
      ...prev,
      imagenes: "Error al procesar las imágenes",
    }));
  }
};


  // Abrir en Google Maps
  const abrirEnGoogleMaps = () => {
    if (nuevoPlan.location.trim()) {
      const encodedLocation = encodeURIComponent(nuevoPlan.location);
      window.open(`https://maps.google.com/maps?q=${encodedLocation}`, '_blank');
    } else {
      alert('Primero escribe una dirección');
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
      const fechaA = a.date?.toDate?.() || new Date(a.date);
      const fechaB = b.date?.toDate?.() || new Date(b.date);
      return fechaB - fechaA; 
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* HEADER */}
      <header className="bg-gradient-to-b from-black/80 to-transparent text-white top-0 z-50 shadow-xl sticky">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Logo y nombre */}
          <div className="flex items-center gap-3">
            <img src={logoSinde} alt="Logo" className="h-12 w-12" />
            <div className="hidden md:block">
              <h1 className="text-xl font-bold">SindesParches</h1>
              <p className="text-xs text-gray-300">¡Encuentra tu parche perfecto!</p>
            </div>
          </div>

          {/* Barra de búsqueda centrada */}
          <div className="hidden md:flex flex-1 justify-center px-8">
            <div className="relative w-full max-w-2xl">
              <input
                type="text"
                placeholder="¿Qué parche buscas hoy? 🔍"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/90 backdrop-blur-sm border border-white/20 rounded-full shadow-lg focus:ring-2 focus:ring-pink-500 focus:outline-none transition-all duration-300 text-gray-800 placeholder:text-gray-500"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Información del usuario y acciones */}
          <div className="flex items-center gap-3">
            {/* Info del usuario */}
            <div className="hidden md:flex items-center gap-3 mr-4">
              <div className="text-right">
                <p className="text-sm font-semibold">
                  {user?.displayName || user?.email?.split('@')[0] || 'Usuario'}
                </p>
                <p className="text-xs text-gray-300">
                  {user?.email}
                </p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {(user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2 items-center">
              {/* Perfil */}
              <button
                title="Mi Perfil"
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm p-3 rounded-full transition-all duration-200 hover:scale-110"
                onClick={() => alert('Perfil - Próximamente')}
              >
                <User className="w-5 h-5 text-white" />
              </button>

              {/* Notificaciones */}
              <button
                title="Notificaciones"
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm p-3 rounded-full transition-all duration-200 hover:scale-110 relative"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-5 h-5 text-white" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
              </button>

              {/* Configuración */}
              <button
                title="Configuración"
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm p-3 rounded-full transition-all duration-200 hover:scale-110"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <Settings className="w-5 h-5 text-white" />
              </button>

              {/* Cerrar Sesión */}
              <button
                title="Cerrar Sesión"
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 p-3 rounded-full transition-all duration-200 hover:scale-110 shadow-lg hover:shadow-xl"
              >
                <LogOut className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Barra de búsqueda móvil */}
        <div className="md:hidden px-6 pb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar parches..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/90 backdrop-blur-sm rounded-full text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </header>

      {/* MENU DESPLEGABLE */}
      {menuOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => setMenuOpen(false)}>
          <div 
            className="bg-white w-80 h-full shadow-2xl transform transition-transform duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Mi Cuenta</h3>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {(user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {user?.displayName || user?.email?.split('@')[0] || 'Usuario'}
                  </p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <nav className="space-y-4">
                <button className="w-full flex items-center gap-3 text-left p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <User className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-700">Mi Perfil</span>
                </button>
                
                <button className="w-full flex items-center gap-3 text-left p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <Bell className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-700">Notificaciones</span>
                </button>
                
                <button className="w-full flex items-center gap-3 text-left p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <Settings className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-700">Configuración</span>
                </button>
                
                <div className="border-t border-gray-200 pt-4">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 text-left p-3 hover:bg-red-50 rounded-lg transition-colors text-red-600 hover:text-red-700"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Cerrar Sesión</span>
                  </button>
                </div>
              </nav>
            </div>
          </div>
        </div>
      )}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">


        {/* Botón crear plan mejorado */}
        <div className="text-center mb-12">
          <div className="relative">
             <div>
              <button onClick={() => setShowModal(true)}
                className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white px-10 py-4 rounded-full font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 flex items-center gap-3 mx-auto relative overflow-hidden"
                >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 transform translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000"></div>
              <Plus className="w-6 h-6" />
              <span>¡Crear Plan Increíble!</span>
              <span className="text-2xl">✨</span>
              </button>


              <PlanModal 
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onPlanCreated={handlePlanCreated}
              />
            </div>
            <p className="text-white/80 mt-2 text-sm">Comparte tu idea y encuentra compañeros de aventura</p>
          </div>
        </div>

        <section className="mt-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              🎉 Planes Disponibles
              <span className="bg-pink-500 text-white text-sm px-3 py-1 rounded-full">
                {planesFiltrados.length}
              </span>
            </h2>
            
            {busqueda && (
              <div className="flex items-center gap-2 text-white/80">
                <span className="text-sm">Buscando:</span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                  "{busqueda}"
                </span>
                <button
                  onClick={() => setBusqueda('')}
                  className="text-white/60 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {planesFiltrados.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">😔</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {busqueda ? 'No encontramos planes con esa búsqueda' : 'No hay planes disponibles'}
              </h3>
              <p className="text-white/70 mb-8">
                {busqueda ? 'Intenta con otros términos o crea tu propio plan' : '¡Sé el primero en crear un plan increíble!'}
              </p>
              <button
                onClick={() => setModalCrearPlan(true)}
                className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-full font-semibold hover:scale-105 transition-transform"
              >
                Crear el Primer Plan 🚀
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {planesFiltrados.map((plan) => {
                const uniqueImages = [...new Set(plan.imageUrls || [])];
                const comentariosPlan = comentarios[plan.id] || [];
                const ultimoComentario = ultimosComentarios[plan.id];

                return (
                  <div
                    key={plan.id}
                    className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 hover:scale-105 group"
                  >
                    {/* Imágenes del plan */}
                    {uniqueImages.length > 0 && (
                      <div className="w-full h-64 mb-6 rounded-xl overflow-hidden">
                        {uniqueImages.length === 1 ? (
                          <img
                            src={uniqueImages[0]}
                            alt={plan.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
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
                      </div>
                    )}

                    {/* Contenido del plan */}
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                        {plan.title}
                      </h3>
                      
                      <p className="text-gray-600 line-clamp-3 leading-relaxed">
                        {plan.description}
                      </p>
                      
                      {/* Información de fecha, hora y ubicación */}
                      <div className="space-y-2">
                        {plan.date && (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(plan.date)}</span>
                            {plan.time && <span>• {plan.time}</span>}
                          </div>
                        )}

                        {plan.location && (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <MapPin className="w-4 h-4" />
                            <span className="truncate">{plan.location}</span>
                          </div>
                        )}

                        {plan.city && (
                          <div className="text-xs text-gray-400">
                            📍 {plan.city}{plan.state && `, ${plan.state}`}
                          </div>
                        )}

                        {/* WhatsApp contact */}
                        {plan.enableWhatsapp && plan.phoneNumber && (
                          <div className="mt-2">
                            <a
                              href={`https://wa.me/${plan.phoneNumber.replace(/\D/g, '')}?text=Hola! Vi tu plan "${plan.title}" en SindesParches y me interesa participar.`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105"
                            >
                              🟢 WhatsApp
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Acciones del plan */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-3">
                          {/* Like */}
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
                            className="flex items-center gap-1 text-red-500 hover:scale-110 transition-all duration-200"
                          >
                            <Heart
                              size={20}
                              fill={plan.likes?.includes(user.uid) ? 'red' : 'none'}
                              stroke={plan.likes?.includes(user.uid) ? 'red' : 'currentColor'}
                            />
                            <span className="text-sm font-medium">
                              {plan.likes?.length || 0}
                            </span>
                          </button>

                          {/* Participar */}
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
                            className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                              plan.participants?.includes(user.uid)
                                ? 'bg-green-500 text-white shadow-lg'
                                : 'bg-gray-100 text-gray-600 hover:bg-green-500 hover:text-white'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                            <span>{plan.participants?.length || 0}</span>
                          </button>
                        </div>

                        {/* Compartir */}
                        <button
                          onClick={() =>
                            navigator.share?.({
                              title: plan.title,
                              text: plan.description,
                            }) || alert('Función de compartir no disponible')
                          }
                          className="flex items-center gap-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-full transition-colors duration-200"
                        >
                          <Share2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Compartir</span>
                        </button>
                      </div>

                      {/* Comentarios */}
                      <div className="pt-2">
                        <button
                          onClick={() => abrirModalComentarios(plan)}
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>Ver comentarios</span>
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                            {plan.commentCount || 0}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Modal de comentarios */}
        {modalComentarios.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              {/* Header del Modal */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    💬 Comentarios
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
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600">Cargando comentarios...</span>
                    </div>
                  ) : comentarios[modalComentarios.planId]?.length > 0 ? (
                    <div className="space-y-4">
                      {comentarios[modalComentarios.planId].map((comentario) => {
                        console.log('Renderizando comentario:', comentario);
                        
                        return (
                          <div
                            key={comentario.id}
                            className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 hover:shadow-md transition-all duration-200"
                          >
                            <div className="flex items-start gap-3">
                              {/* Avatar del usuario */}
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                {(comentario.userName?.charAt(0) || 'A').toUpperCase()}
                              </div>
                              
                              {/* Contenido del comentario */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-semibold text-gray-900 truncate">
                                    {comentario.userName || 'Usuario Anónimo'}
                                  </span>
                                  <div className="flex items-center text-xs text-gray-500 gap-1">
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
                                <p className="text-gray-800 leading-relaxed break-words">
                                  {comentario.text}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="text-6xl mb-4">💬</div>
                      <h4 className="text-xl font-semibold text-gray-600 mb-2">
                        No hay comentarios aún
                      </h4>
                      <p className="text-gray-500 mb-6">
                        ¡Sé el primero en comentar sobre este plan!
                      </p>
                      <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
                        💡 Los comentarios aparecerán aquí en tiempo real
                      </div>
                    </div>
                  )}
                </div>

                {/* Formulario para agregar comentario */}
                <div className="border-t border-gray-200 p-6 bg-gradient-to-r from-blue-50 to-purple-50">
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
                    <div className="flex gap-3">
                      {/* Avatar del usuario actual */}
                      <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {(user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
                      </div>
                      
                      <div className="flex-1">
                        <textarea
                          name="comentario"
                          placeholder="Escribe tu comentario aquí... 💭"
                          className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none transition-all duration-200 placeholder:text-gray-400"
                          rows="3"
                          maxLength={500}
                        />
                        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                          <span>Máximo 500 caracteres</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        {comentarios[modalComentarios.planId]?.length || 0} comentarios
                      </span>
                      <button
                        type="submit"
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        <Send className="w-4 h-4" />
                        Comentar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Panel de notificaciones */}
      {showNotifications && (
        <div className="fixed top-20 right-6 bg-white rounded-xl shadow-2xl border border-gray-200 p-6 w-80 z-40">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">🔔 Notificaciones</h3>
            <button
              onClick={() => setShowNotifications(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <p className="text-sm text-gray-700">¡Bienvenido a SindesParches! 🎉</p>
              <p className="text-xs text-gray-500 mt-1">Hace 5 minutos</p>
            </div>
            <div className="text-center py-4 text-gray-500 text-sm">
              No tienes más notificaciones
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;