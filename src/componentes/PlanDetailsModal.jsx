//planDetailsModal
import React, { useState, useEffect } from 'react';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { 
  X, 
  Heart, 
  MessageCircle, 
  Share2, 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  ChevronLeft, 
  ChevronRight,
  Send,
  Phone,
  Navigation,
  Users,
  ThumbsUp
} from 'lucide-react';
import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import { GoogleMap, Marker, DirectionsRenderer, useJsApiLoader } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '300px'
};

const VerPlan = ({ plan, user, isOpen, onClose, onOpenPerfilPublico }) => {
  // Estados
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [comentarios, setComentarios] = useState([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [directions, setDirections] = useState(null);
  const [travelTime, setTravelTime] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [creatorInfo, setCreatorInfo] = useState({ name: 'Usuario', photoURL: null });
  const [likingInProgress, setLikingInProgress] = useState(false);
  const [participatingInProgress, setParticipatingInProgress] = useState(false);

  // Hook para Google Maps
  const isLoaded = Boolean(window.google?.maps);

  // Inicializar Firebase Storage
  const storage = getStorage();

  // ✅ CÓDIGO CORREGIDO: Cargar información del creador
  useEffect(() => {
    const fetchCreatorInfo = async () => {
      // Verificar primero qué campo tiene el plan
      const creatorId = plan?.userId || plan?.creatorId;
      
     // console.log('🔍 Debug - Plan completo:', plan);
      //console.log('🔍 userId encontrado:', creatorId);
      
      if (!creatorId) {
      //  console.log('⚠️ No se encontró userId en el plan');
        setCreatorInfo({ 
          name: plan?.createdByName || plan?.creatorName || 'Usuario', 
          photoURL: null 
        });
        return;
      }

      try {
        // Obtener perfil desde Firestore
        const perfilRef = doc(db, 'perfil', creatorId);
        const perfilSnap = await getDoc(perfilRef);
        
        if (perfilSnap.exists()) {
          const profileData = perfilSnap.data();
        //  console.log('✅ Perfil encontrado:', profileData);
          
          let photoURL = profileData.fotoURL;
          
          // Si no hay foto en Firestore, intentar buscar en Storage
          if (!photoURL) {
            try {
              const fotoRef = ref(storage, `profile_pictures/${creatorId}`);
              photoURL = await getDownloadURL(fotoRef);
             // console.log('✅ Foto encontrada en Storage:', photoURL);
            } catch (storageError) {
             // console.log('ℹ️ No se encontró foto en Storage');
            }
          }
          
          setCreatorInfo({
            name: profileData.nombre || plan?.createdByName || 'Usuario',
            photoURL: photoURL
          });
        } else {
          //console.log('❌ No existe documento de perfil para este usuario');
          setCreatorInfo({ 
            name: plan?.createdByName || plan?.creatorName || 'Usuario', 
            photoURL: null 
          });
        }
      } catch (error) {
       // console.error('❌ Error obteniendo perfil del creador:', error);
        setCreatorInfo({ 
          name: plan?.createdByName || plan?.creatorName || 'Usuario', 
          photoURL: null 
        });
      }
    };

    if (isOpen) {
      fetchCreatorInfo();
    }
  }, [isOpen, plan?.userId, plan?.creatorId, plan?.createdByName, plan?.creatorName]);

  // Cargar ubicación del usuario y calcular ruta
  useEffect(() => {
    if (isOpen && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(userPos);
          
          if (plan.latitude && plan.longitude) {
            const planPos = { lat: plan.latitude, lng: plan.longitude };
            setMapCenter(planPos);
            
            const dist = calcularDistancia(
              userPos.lat, userPos.lng, 
              plan.latitude, plan.longitude
            );
            setDistance(dist.toFixed(1));

            if (isLoaded && window.google) {
              const directionsService = new window.google.maps.DirectionsService();
              directionsService.route({
                origin: userPos,
                destination: planPos,
                travelMode: window.google.maps.TravelMode.DRIVING,
              }, (result, status) => {
                if (status === 'OK') {
                  setDirections(result);
                  const route = result.routes[0];
                  const leg = route.legs[0];
                  setTravelTime(leg.duration.text);
                  setDistance(leg.distance.text);
                }
              });
            }
          }
        },
        (error) => console.log('Error obteniendo ubicación:', error)
      );
    }
  }, [isOpen, plan, isLoaded]);

  // Cargar comentarios en tiempo real
  useEffect(() => {
    if (!isOpen || !plan.id) return;

    const commentsRef = collection(db, 'planes', plan.id, 'comments');
    const q = query(commentsRef, orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const comentariosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setComentarios(comentariosData);
    });

    return () => unsubscribe();
  }, [isOpen, plan.id]);

  // Función para calcular distancia
  const calcularDistancia = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Navegación de imágenes
  const nextImage = () => {
    if (plan.imageUrls && plan.imageUrls.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === plan.imageUrls.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (plan.imageUrls && plan.imageUrls.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? plan.imageUrls.length - 1 : prev - 1
      );
    }
  };

  // Función optimizada para dar like
  const toggleLike = async () => {
    if (likingInProgress) return;
    
    setLikingInProgress(true);
    try {
      const planRef = doc(db, 'planes', plan.id);
      const yaDioLike = plan.likes?.includes(user.uid);
      
      await updateDoc(planRef, {
        likes: yaDioLike 
          ? arrayRemove(user.uid) 
          : arrayUnion(user.uid)
      });
    } catch (error) {
      console.error('Error al dar like:', error);
    } finally {
      setLikingInProgress(false);
    }
  };

  // Función optimizada para participar
  const toggleParticipation = async () => {
    if (participatingInProgress) return;
    
    setParticipatingInProgress(true);
    try {
      const planRef = doc(db, 'planes', plan.id);
      const yaParticipa = plan.participants?.includes(user.uid);
      
      await updateDoc(planRef, {
        participants: yaParticipa 
          ? arrayRemove(user.uid) 
          : arrayUnion(user.uid)
      });
    } catch (error) {
      console.error('Error al participar:', error);
    } finally {
      setParticipatingInProgress(false);
    }
  };

  // Agregar comentario
  const agregarComentario = async (e) => {
    e.preventDefault();
    if (!nuevoComentario.trim()) return;

    setEnviandoComentario(true);

    try {
      const commentsRef = collection(db, 'planes', plan.id, 'comments');
      await addDoc(commentsRef, {
        planId: plan.id,
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Usuario',
        text: nuevoComentario.trim(),
        timestamp: new Date()
      });

      const planRef = doc(db, 'planes', plan.id);
      await updateDoc(planRef, {
        commentCount: (plan.commentCount || 0) + 1
      });

      setNuevoComentario('');
    } catch (error) {
      console.error('Error al comentar:', error);
    } finally {
      setEnviandoComentario(false);
    }
  };

  // Compartir
  const compartir = () => {
    if (navigator.share) {
      navigator.share({
        title: plan.title,
        text: plan.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(
        `${plan.title}\n${plan.description}\n${window.location.href}`
      );
      alert('Enlace copiado al portapapeles');
    }
  };

  // Abrir WhatsApp
  const abrirWhatsApp = () => {
    if (plan.phoneNumber) {
      const mensaje = encodeURIComponent(
        `Hola! Vi tu plan "${plan.title}" y me interesa participar.`
      );
      const numeroLimpio = plan.phoneNumber.replace(/[^0-9]/g, '');
      const url = `https://wa.me/${numeroLimpio}?text=${mensaje}`;
      window.open(url, '_blank');
    }
  };

  // Formatear fecha
  const formatDate = (date) => {
    if (!date) return 'Fecha no disponible';
    
    let dateObj;
    if (typeof date === 'number') {
      dateObj = new Date(date);
    } else if (date.toDate) {
      dateObj = date.toDate();
    } else {
      dateObj = new Date(date);
    }
    
    return dateObj.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Crear URL del mapa
  const abrirEnGoogleMaps = () => {
    if (userLocation && plan.latitude && plan.longitude) {
      const url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${plan.latitude},${plan.longitude}`;
      window.open(url, '_blank');
    } else if (plan.location) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(plan.location)}`;
      window.open(url, '_blank');
    }
  };

  if (!isOpen || !plan) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        
        {/* Header mejorado */}
<div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 gap-4">
  
  {/* Foto de perfil del creador (lado izquierdo) - CLICKEABLE */}
  <div className="flex items-center gap-3 flex-shrink-0">
    <button
      onClick={() => {
        onClose();
        setTimeout(() => {
          if (onOpenPerfilPublico) {
            onOpenPerfilPublico(plan.userId);
          }
        }, 300);
      }}
      className="group flex items-center gap-3 hover:bg-white/10 rounded-2xl p-2 transition-all duration-300 cursor-pointer"
      title="Ver perfil de usuario"
    >
      <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center group-hover:ring-4 group-hover:ring-pink-400/50 transition-all">
        {creatorInfo.photoURL ? (
          <img 
            src={creatorInfo.photoURL} 
            alt={creatorInfo.name} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white font-bold">
            {(creatorInfo.name?.charAt(0) || 'U').toUpperCase()}
          </div>
        )}
      </div>
        
      <div className="text-left hidden sm:block">
        <p className="text-sm font-medium text-gray-900 group-hover:text-purple-600 transition-colors">
          {creatorInfo.name}
        </p>
        <p className="text-xs text-gray-500">Ver perfil</p>
      </div>
    </button>
  </div>

  {/* Título del plan (centro con flex) */}
  <div className="flex-1 text-center min-w-0 px-4">
    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate capitalize">
      {plan.title}
    </h2>
  </div>

  {/* Botón de cerrar (lado derecho) */}
  <button 
    onClick={onClose}
    className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
  >
    <X className="w-6 h-6 text-gray-500" />
  </button>
</div>

        {/* Resto del contenido igual... */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid lg:grid-cols-3 gap-6 p-6">
            
            {/* Columna 1: Imágenes y descripción */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Galería de imágenes */}
              {plan.imageUrls && plan.imageUrls.length > 0 && (
                <div className="relative">
                  <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden shadow-lg">
                    <img
                      src={plan.imageUrls[currentImageIndex]}
                      alt={`Imagen ${currentImageIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Navegación de imágenes */}
                    {plan.imageUrls.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                        
                        {/* Indicadores */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                          {plan.imageUrls.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`w-3 h-3 rounded-full transition-colors ${
                                index === currentImageIndex 
                                  ? 'bg-white' 
                                  : 'bg-white/50'
                              }`}
                            />
                          ))}
                        </div>

                        {/* Contador de imágenes */}
                        <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                          {currentImageIndex + 1} / {plan.imageUrls.length}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Descripción */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Descripción</h3>
                <p className="text-gray-700 leading-relaxed text-lg">{plan.description}</p>
              </div>
              
              {/* Mapa */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Ubicación y ruta
                </h3>
                
                {isLoaded && (mapCenter || userLocation) ? (
                  <div className="space-y-4">
                    <GoogleMap
                      mapContainerStyle={mapContainerStyle}
                      center={mapCenter || userLocation}
                      zoom={12}
                    >
                      {/* Marcador del usuario */}
                      {userLocation && (
                        <Marker 
                          position={userLocation} 
                          title="Tu ubicación"
                          icon={{
                            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="8" fill="#3B82F6"/>
                                <circle cx="12" cy="12" r="4" fill="white"/>
                              </svg>
                            `),
                            scaledSize: new window.google.maps.Size(24, 24)
                          }}
                        />
                      )}
                      
                      {/* Marcador del plan */}
                      {plan.latitude && plan.longitude && (
                        <Marker 
                          position={{ lat: plan.latitude, lng: plan.longitude }} 
                          title={plan.title}
                          icon={{
                            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="#EF4444"/>
                                <circle cx="12" cy="10" r="3" fill="white"/>
                              </svg>
                            `),
                            scaledSize: new window.google.maps.Size(32, 32)
                          }}
                        />
                      )}
                      
                      {/* Mostrar ruta */}
                      {directions && <DirectionsRenderer directions={directions} />}
                    </GoogleMap>
                    
                    {/* Info de distancia y tiempo */}
                    <div className="flex justify-between items-center bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-sm text-gray-600">
                        {distance && (
                          <span className="flex items-center gap-1">
                            <Navigation className="w-4 h-4" />
                            Distancia: {distance}
                          </span>
                        )}
                        {travelTime && (
                          <span className="flex items-center gap-1 mt-1">
                            <Clock className="w-4 h-4" />
                            Tiempo estimado: {travelTime}
                          </span>
                        )}
                      </div>
                      
                      <button
                        onClick={abrirEnGoogleMaps}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <Navigation className="w-4 h-4" />
                        Abrir en Maps
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-100 rounded-lg p-8 text-center">
                    <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Cargando mapa...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Columna 2: Detalles e interacciones */}
            <div className="space-y-6">
              
              {/* Detalles del plan */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Detalles del Plan</h3>
                
                <div className="space-y-4">
                  {/* Fecha */}
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-gray-900">{formatDate(plan.date)}</p>
                      {plan.timeString && (
                        <p className="text-sm text-gray-600">
                          <Clock className="w-4 h-4 inline mr-1" />
                          {plan.timeString}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ubicación */}
                  <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                    <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Ubicación</p>
                      <p className="text-sm text-gray-600">{plan.location}</p>
                    </div>
                  </div>

                  {/* WhatsApp */}
                  {plan.enableWhatsapp && plan.phoneNumber && (
                    <button
                      onClick={abrirWhatsApp}
                      className="w-full flex items-center justify-center gap-2 p-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                    >
                      <Phone className="w-5 h-5" />
                      Contactar por WhatsApp
                    </button>
                  )}
                </div>
              </div>

              {/* Estadísticas y acciones */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Interacciones</h3>
                
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">{plan.likes?.length || 0}</div>
                    <div className="text-sm text-gray-600">Likes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">{plan.participants?.length || 0}</div>
                    <div className="text-sm text-gray-600">Participantes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-500">{plan.commentCount || 0}</div>
                    <div className="text-sm text-gray-600">Comentarios</div>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={toggleLike}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                      plan.likes?.includes(user.uid)
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600'
                    }`}
                  >
                    <Heart 
                      className="w-5 h-5" 
                      fill={plan.likes?.includes(user.uid) ? 'currentColor' : 'none'}
                    />
                    Me gusta
                  </button>

                  <button
                    onClick={toggleParticipation}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                      plan.participants?.includes(user.uid)
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-600'
                    }`}
                  >
                    <Users className="w-5 h-5" />
                    {plan.participants?.includes(user.uid) ? 'Participando' : 'Participar'}
                  </button>
                </div>

                <button
                  onClick={compartir}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg font-medium transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                  Compartir Plan
                </button>
              </div>

              {/* Comentarios */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <MessageCircle className="w-5 h-5" />
                  Comentarios ({comentarios.length})
                </h3>

                {/* Lista de comentarios */}
                <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                  {comentarios.length > 0 ? (
                    comentarios.map((comentario) => (
                      <div key={comentario.id} className="bg-white rounded-lg p-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-xs">
                          {comentario.userPhotoURL ? (
                            <img 
                              src={comentario.userPhotoURL} 
                              alt={comentario.userName} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            (comentario.userName?.charAt(0) || 'U').toUpperCase()
                          )}
                        </div> 
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm text-gray-900">
                                {comentario.userName}
                              </span>
                              <span className="text-xs text-gray-500">
                                {comentario.timestamp?.toDate?.()?.toLocaleDateString() || 'Ahora'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{comentario.text}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 text-sm py-4">
                      No hay comentarios aún. ¡Sé el primero en comentar!
                    </p>
                  )}
                </div>

                {/* Formulario de comentario */}
                <form onSubmit={agregarComentario} className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                      {(user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
                    </div>
                    <textarea
                      value={nuevoComentario}
                      onChange={(e) => setNuevoComentario(e.target.value)}
                      placeholder="Escribe tu comentario..."
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
                      rows="2"
                      maxLength={500}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {nuevoComentario.length}/500 caracteres
                    </span>
                    <button
                      type="submit"
                      disabled={enviandoComentario || !nuevoComentario.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {enviandoComentario ? (
                        <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Comentar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerPlan;