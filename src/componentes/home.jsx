import React, { useEffect, useState } from 'react';
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
import { v4 as uuidv4 } from "uuid";
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

  const newId = uuidv4();
  console.log("Nuevo ID único:", newId);

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

  // FUNCIÓN MEJORADA PARA MANEJAR IMÁGENES CON COMPRESIÓN
  const manejarImagenes = async (files) => {
    if (!files || files.length === 0) return;
    
    setSubiendoImagenes(true);
    
    try {
      const imagenesComprimidas = [];
      
      for (let file of Array.from(files)) {
        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
          console.warn(`Archivo ${file.name} no es una imagen válida`);
          continue;
        }

        // Validar tamaño (máximo 10MB)
        if (file.size > 10 * 1024 * 1024) {
          console.warn(`Archivo ${file.name} es demasiado grande`);
          continue;
        }

        // Comprimir imagen
        const compressedBlob = await ImageUtils.compressImage(file);
        
        // Subir a Firebase Storage
        const nombreArchivo = `planes/${user.uid}/${uuidv4()}_${file.name}`;
        const storageRef = ref(storage, nombreArchivo);
        const snapshot = await uploadBytes(storageRef, compressedBlob);
        const url = await getDownloadURL(snapshot.ref);
        
        imagenesComprimidas.push(url);
      }

      // Limitar a máximo 5 imágenes
      const imagenesFinales = [...nuevoPlan.imageUrls, ...imagenesComprimidas].slice(0, 5);
      
      setNuevoPlan(prev => ({
        ...prev,
        imageUrls: imagenesFinales
      }));

    } catch (error) {
      console.error('Error procesando imágenes:', error);
      setErrores(prev => ({ ...prev, imagenes: 'Error al procesar las imágenes' }));
    } finally {
      setSubiendoImagenes(false);
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

  // FUNCIÓN MEJORADA PARA CREAR PLAN
  const crearPlan = async (e) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      return;
    }
    
    setCreandoPlan(true);
    
    try {
      // Convertir fecha y hora a timestamp
      const fechaHora = new Date(`${nuevoPlan.date}T${nuevoPlan.time}`);
      
      const planData = {
        title: nuevoPlan.title.trim(),
        description: nuevoPlan.description.trim(),
        category: nuevoPlan.category || 'General',
        date: fechaHora,
        time: nuevoPlan.time,
        timeString: nuevoPlan.time,
        location: nuevoPlan.location.trim(),
        locationAddress: nuevoPlan.locationAddress,
        city: nuevoPlan.city,
        state: nuevoPlan.state,
        latitude: nuevoPlan.latitude,
        longitude: nuevoPlan.longitude,
        imageUrls: nuevoPlan.imageUrls,
        enableWhatsapp: nuevoPlan.enableWhatsapp,
        phoneNumber: nuevoPlan.phoneNumber.trim(),
        createdBy: user.uid,
        createdByName: user.displayName || user.email?.split('@')[0] || 'Usuario Anónimo',
        createdAt: serverTimestamp(),
        updatedAt: null,
        likes: [],
        participants: [],
        commentCount: 0,
        shares: 0,
        isActive: true
      };

      console.log('Creando plan con datos:', planData);
      const docRef = await addDoc(collection(db, 'planes'), planData);
      console.log('Plan creado con ID:', docRef.id);

      // Resetear formulario
      setNuevoPlan({
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
      
      setErrores({});
      setModalCrearPlan(false);
      alert('¡Plan creado exitosamente! 🎉');
      
    } catch (error) {
      console.error('Error al crear plan:', error);
      setErrores({ general: 'Error al crear el plan. Inténtalo nuevamente.' });
    } finally {
      setCreandoPlan(false);
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

      {/* MODAL MEJORADO PARA CREAR PLAN */}
      {modalCrearPlan && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-y-auto max-h-[90vh]">
            
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">📝 Crear Plan Increíble</h2>
              <button 
                onClick={() => setModalCrearPlan(false)} 
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={crearPlan} className="p-6 space-y-4">
              
              {/* Error general */}
              {errores.general && (
                <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg">
                  {errores.general}
                </div>
              )}

              {/* Título */}
              <div>
                <input 
                  type="text"
                  placeholder="Título del plan"
                  value={nuevoPlan.title}
                  onChange={(e) => setNuevoPlan({ ...nuevoPlan, title: e.target.value })}
                  className={`w-full p-3 border rounded-lg transition-colors ${
                    errores.title ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                  }`}
                  required
                />
                {errores.title && <p className="text-red-500 text-sm mt-1">{errores.title}</p>}
              </div>

              {/* Descripción */}
              <div>
                <textarea 
                  placeholder="Descripción del plan"
                  value={nuevoPlan.description}
                  onChange={(e) => setNuevoPlan({ ...nuevoPlan, description: e.target.value })}
                  className={`w-full p-3 border rounded-lg transition-colors ${
                    errores.description ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                  }`}
                  rows="3"
                  required
                />
                {errores.description && <p className="text-red-500 text-sm mt-1">{errores.description}</p>}
              </div>

              {/* Categoría */}
              <div>
                <select 
                  value={nuevoPlan.category}
                  onChange={(e) => setNuevoPlan({ ...nuevoPlan, category: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 transition-colors"
                >
                  <option value="">Seleccionar categoría</option>
                  <option value="Deporte">Deporte</option>
                  <option value="Cultura">Cultura</option>
                  <option value="Gastronomía">Gastronomía</option>
                  <option value="Naturaleza">Naturaleza</option>
                  <option value="Fiesta">Fiesta</option>
                  <option value="Estudio">Estudio</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              {/* Fecha y Hora */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <input 
                    type="date"
                    value={nuevoPlan.date}
                    onChange={(e) => setNuevoPlan({ ...nuevoPlan, date: e.target.value })}
                    className={`w-full p-3 border rounded-lg transition-colors ${
                      errores.date ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                    }`}
                    required
                  />
                  {errores.date && <p className="text-red-500 text-sm mt-1">{errores.date}</p>}
                </div>
                <div className="flex-1">
                  <input 
                    type="time"
                    value={nuevoPlan.time}
                    onChange={(e) => setNuevoPlan({ ...nuevoPlan, time: e.target.value })}
                    className={`w-full p-3 border rounded-lg transition-colors ${
                      errores.time ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                    }`}
                    required
                  />
                  {errores.time && <p className="text-red-500 text-sm mt-1">{errores.time}</p>}
                </div>
              </div>

              {/* Ubicación */}
              <div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="Dirección del plan"
                    value={nuevoPlan.location}
                    onChange={(e) => setNuevoPlan({ ...nuevoPlan, location: e.target.value })}
                    className={`flex-1 p-3 border rounded-lg transition-colors ${
                      errores.location ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                    }`}
                    required
                  />
                  <button 
                    type="button"
                    onClick={obtenerUbicacionActual}
                    className="px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                    title="Obtener ubicación actual"
                  >
                    📍
                  </button>
                  <button 
                    type="button"
                    onClick={abrirEnGoogleMaps}
                    className="px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                    disabled={!nuevoPlan.location.trim()}
                  >
                    Maps
                  </button>
                </div>
                {errores.location && <p className="text-red-500 text-sm mt-1">{errores.location}</p>}
                
                {/* Info adicional de ubicación */}
                {(nuevoPlan.city || nuevoPlan.state) && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg text-sm text-blue-700">
                    📍 {nuevoPlan.city && `Ciudad: ${nuevoPlan.city}`} 
                    {nuevoPlan.city && nuevoPlan.state && ' | '}
                    {nuevoPlan.state && `Departamento: ${nuevoPlan.state}`}
                  </div>
                )}
              </div>

              {/* WhatsApp */}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={nuevoPlan.enableWhatsapp}
                    onChange={(e) => setNuevoPlan({ ...nuevoPlan, enableWhatsapp: e.target.checked })}
                    className="w-4 h-4 text-green-600"
                  />
                  <span className="text-gray-700">🟢 Habilitar contacto por WhatsApp</span>
                </label>
                
                {nuevoPlan.enableWhatsapp && (
                  <div>
                    <input
                      type="tel"
                      placeholder="Número de WhatsApp (ej: +57 300 123 4567)"
                      value={nuevoPlan.phoneNumber}
                      onChange={(e) => setNuevoPlan({ ...nuevoPlan, phoneNumber: e.target.value })}
                      className={`w-full p-3 border rounded-lg transition-colors ${
                        errores.phoneNumber ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-green-500'
                      }`}
                    />
                    {errores.phoneNumber && <p className="text-red-500 text-sm mt-1">{errores.phoneNumber}</p>}
                  </div>
                )}
              </div>

              {/* Subir imágenes */}
              <div>
                <label className="block mb-2 text-gray-700 font-medium">
                  📸 Imágenes del plan (máximo 5)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    onChange={(e) => manejarImagenes(e.target.files)}
                    className="w-full"
                    disabled={subiendoImagenes || nuevoPlan.imageUrls.length >= 5}
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Formatos: JPG, PNG. Las imágenes se optimizarán automáticamente.
                  </p>
                </div>
                
                {errores.imagenes && <p className="text-red-500 text-sm mt-1">{errores.imagenes}</p>}
                
                {subiendoImagenes && (
                  <div className="flex items-center gap-2 mt-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm">Procesando imágenes...</span>
                  </div>
                )}
                
                {/* Preview de imágenes */}
                {nuevoPlan.imageUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {nuevoPlan.imageUrls.map((url, i) => (
                      <div key={i} className="relative group">
                        <img 
                          src={url} 
                          alt={`Preview ${i + 1}`} 
                          className="w-20 h-20 object-cover rounded-lg shadow-md"
                        />
                        <button 
                          type="button"
                          onClick={() => eliminarImagen(i)}
                          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botón enviar */}
              <button 
                type="submit" 
                disabled={creandoPlan || subiendoImagenes}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-bold hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {creandoPlan ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Creando plan...
                  </div>
                ) : (
                  "🚀 Crear Plan"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Botón crear plan mejorado */}
        <div className="text-center mb-12">
          <div className="relative">
            <button
              onClick={() => setModalCrearPlan(true)}
              className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white px-10 py-4 rounded-full font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 flex items-center gap-3 mx-auto relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 transform translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000"></div>
              <Plus className="w-6 h-6" />
              <span>¡Crear Plan Increíble!</span>
              <span className="text-2xl">✨</span>
            </button>
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