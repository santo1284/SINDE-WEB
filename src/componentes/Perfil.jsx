// Perfil.jsx - Versión Completa con Correcciones Responsive
import React, { useEffect, useState } from "react";
import { auth, db, storage } from "../firebase/firebase-config";
import {
doc,
getDoc,
updateDoc,
collection,
getDocs,
query,
where,
onSnapshot,
addDoc,
orderBy,
limit
} from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import EditarPerfilModal from "./EditarPerfil";
import PlanModal from "./PlanModal";
import PlanDetailsModal from "./PlanDetailsModal";
import CreateFlashPlan from "./CreateFlashPlan";
import ProfileFlashPlanViewer from "./ProfileFlashPlanViewer";
import { onAuthStateChanged } from "firebase/auth";
import { User, Phone, MapPin, Calendar, Mail, Check, Edit, Heart, Plus, Share2, MessageCircle, Eye, Clock, Send, X } from "lucide-react";

function Perfil({ onBack }) {
const [perfilData, setPerfilData] = useState(null);
const [planes, setPlanes] = useState([]);
const [flashPlans, setFlashPlans] = useState([]);
const [isEditing, setIsEditing] = useState(false);
const [activeTab, setActiveTab] = useState("info");
const [imageUrl, setImageUrl] = useState(null);
const [imageLoading, setImageLoading] = useState(true);
const [modalCrearPlan, setModalCrearPlan] = useState(false);
const [modalCrearFlashPlan, setModalCrearFlashPlan] = useState(false);
const [selectedFlashPlan, setSelectedFlashPlan] = useState(null);
const [user, setUser] = useState(null);
const [selectedPlan, setSelectedPlan] = useState(null);
const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
const [selectedPlanForComments, setSelectedPlanForComments] = useState(null);
const [commentText, setCommentText] = useState("");
const [planComments, setPlanComments] = useState({});
const [modalComentarios, setModalComentarios] = useState({
  isOpen: false,
  planId: null,
  planTitle: ''
});
const [comentarios, setComentarios] = useState({});
const [cargandoComentarios, setCargandoComentarios] = useState({});

// Estados para las interacciones de cada plan
const [planInteractions, setPlanInteractions] = useState({});

// Función para cargar todos los comentarios de un plan
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

// Función para agregar un comentario
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

  } catch (error) {
    console.error('Error al agregar comentario:', error);
    alert(`Error al agregar el comentario: ${error.message}`);
  }
};

// Función para compartir un plan
const handleSharePlan = async (plan) => {
  const planUrl = `${window.location.origin}/plan/${plan.id}`;
  const shareData = {
    title: plan.title || 'Plan en SindesParches',
    text: plan.description || 'Ven a este plan increíble',
    url: planUrl,
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      
      setPlanInteractions(prev => {
        const current = prev[plan.id] || {
          likes: 0,
          isLiked: false,
          shares: 0
        };
        return {
          ...prev,
          [plan.id]: {
            ...current,
            shares: current.shares + 1
          }
        };
      });
    } else {
      await navigator.clipboard.writeText(planUrl);
      alert('¡Enlace copiado al portapapeles!');
    }
  } catch (error) {
    console.log('Error al compartir:', error);
  }
};

// Función para abrir modal de comentarios
const handleOpenComments = (plan) => {
  setSelectedPlanForComments(plan);
  setIsCommentsModalOpen(true);
  setCommentText("");
};

// Función para enviar comentario
const handleSendComment = () => {
  if (!commentText.trim()) return;
  
  const newComment = {
    id: Date.now(),
    user: perfilData?.nombre || "Usuario",
    text: commentText,
    date: new Date(),
    avatar: imageUrl
  };
  
  setPlanComments(prev => ({
    ...prev,
    [selectedPlanForComments.id]: [
      ...(prev[selectedPlanForComments.id] || []),
      newComment
    ]
  }));
  
  setCommentText("");
  setIsCommentsModalOpen(false);
};

// Función para participar en un plan
const handleJoinPlan = (planId) => {
  setPlanInteractions(prev => {
    const current = prev[planId] || {
      likes: 0,
      isLiked: false,
      shares: 0,
      hasJoined: false
    };
    
    return {
      ...prev,
      [planId]: {
        ...current,
        hasJoined: !current.hasJoined
      }
    };
  });
};

// Calcular totales de me gustas REALES de Firebase
const getTotalLikes = () => {
  return planes.reduce((total, plan) => {
    return total + (plan.likes?.length || 0);
  }, 0);
};

// Función para manejar interacciones de un plan específico
const handlePlanInteraction = (planId, type) => {
  setPlanInteractions(prev => {
    const current = prev[planId] || {
      likes: 0,
      isLiked: false,
      participants: 1,
      hasJoined: false,
      comments: 0,
      shares: 0
    };

    const updated = { ...current };

    switch (type) {
      case 'like':
        if (updated.isLiked) {
          updated.likes -= 1;
          updated.isLiked = false;
        } else {
          updated.likes += 1;
          updated.isLiked = true;
        }
        break;
      case 'join':
        if (updated.hasJoined) {
          updated.participants -= 1;
          updated.hasJoined = false;
        } else {
          updated.participants += 1;
          updated.hasJoined = true;
        }
        break;
      case 'comment':
        updated.comments += 1;
        break;
      case 'share':
        updated.shares += 1;
        break;
    }

    return {
      ...prev,
      [planId]: updated
    };
  });
};

// Función para obtener las interacciones de un plan
const getPlanInteractions = (planId) => {
  return planInteractions[planId] || {
    likes: 0,
    isLiked: false,
    shares: 0,
    hasJoined: false
  };
};

// Función para cargar perfil
const fetchPerfil = async (currentUser) => {
try {
const perfilRef = doc(db, "perfil", currentUser.uid);
const perfilSnap = await getDoc(perfilRef);
if (perfilSnap.exists()) {
setPerfilData(perfilSnap.data());
}
  try {
    const storageRef = ref(storage, `profile_pictures/${currentUser.uid}`);
    const url = await getDownloadURL(storageRef);
    setImageUrl(url);
  } catch (storageErr) {
    console.log("No hay imagen en Storage:", storageErr?.code || storageErr?.message);
    setImageUrl(null);
  }
} catch (error) {
  console.error("Error cargando perfil:", error);
} finally {
  setImageLoading(false);
}
};

// Función para cargar flashPlans
const fetchFlashPlans = async (currentUser) => {
try {
const q = query(
collection(db, "flashPlans"),
where("userId", "==", currentUser.uid)
);
const flashSnap = await getDocs(q);
setFlashPlans(flashSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
} catch (error) {
console.error("Error cargando flashPlans:", error);
}
};

// Escuchar planes en tiempo real
const listenPlanes = (currentUser) => {
const q = query(collection(db, "planes"), where("userId", "==", currentUser.uid));
return onSnapshot(q, (snapshot) => {
const planesData = snapshot.docs.map((doc) => ({
id: doc.id,
...doc.data(),
}));
setPlanes(planesData);
});
};

// useEffect con onAuthStateChanged
useEffect(() => {
const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
if (currentUser) {
setUser(currentUser);
fetchPerfil(currentUser);
fetchFlashPlans(currentUser);
listenPlanes(currentUser);
} else {
setUser(null);
setPerfilData(null);
setPlanes([]);
setFlashPlans([]);
}
});
return () => unsubscribe();
}, []);

const mostrarInicial = () => {
return (
perfilData?.nombre?.charAt(0) ||
user?.displayName?.charAt(0) ||
user?.email?.charAt(0) ||
"U"
).toUpperCase();
};

const formatearFecha = () => {
const fechaData =
perfilData?.fechaAceptacionTerminos ||
perfilData?.fechaRegistro ||
perfilData?.createdAt ||
perfilData?.timestamp;
if (!fechaData) return "No disponible";
try {
  let fecha;
  if (typeof fechaData === "string") {
    fecha = new Date(fechaData);
  } else if (fechaData.seconds) {
    fecha = new Date(fechaData.seconds * 1000);
  } else {
    fecha = new Date(fechaData);
  }
  return fecha.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
  });
} catch (error) {
  return "No disponible";
}
};

// Función para formatear fecha de planes
const formatearFechaPlan = (date) => {
if (!date) return 'Sin fecha';
try {
  let dateObj;
  if (typeof date === 'number') {
    dateObj = new Date(date);
  } else if (date.toDate) {
    dateObj = date.toDate();
  } else if (date.seconds) {
    dateObj = new Date(date.seconds * 1000);
  } else {
    dateObj = new Date(date);
  }
  
  return dateObj.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
} catch (error) {
  console.error('Error formateando fecha:', error);
  return 'Fecha inválida';
}
};

if (!perfilData) {
return (
<div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-pink-900 flex items-center justify-center">
<div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 text-white text-center border border-white/20">
<div className="animate-spin w-16 h-16 border-4 border-white/30 border-t-white rounded-full mx-auto mb-6"></div>
<p className="text-xl font-medium">Cargando perfil...</p>
</div>
</div>
);
}

return (
<div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-pink-900 relative overflow-hidden">
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl"></div>
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
  </div>

  <div className="relative z-10 max-w-6xl mx-auto px-4 lg:px-6 py-6">

    <div className="mb-8">
      <button
        onClick={onBack}
        className="group bg-white/10 backdrop-blur-xl border border-white/20 text-white px-6 py-3 rounded-2xl shadow-xl hover:bg-white/20 transition-all duration-300 flex items-center gap-3 font-medium hover:scale-105"
      >
        <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver al inicio
      </button>
    </div>

    <div className="relative mb-8">
      <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-pink-600 rounded-t-[3rem] px-8 py-12 relative overflow-hidden">
        
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
        
        <button
          onClick={() => setIsEditing(true)}
          className="absolute top-6 right-6 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white p-3 rounded-2xl transition-all duration-300 hover:scale-110 border border-white/20"
        >
          <Edit className="w-5 h-5" />
        </button>

<div className="relative flex flex-col items-center justify-center text-white text-center">
  
  <div className="relative mb-6 flex justify-center">
    <div className="w-32 h-32 rounded-full border-4 border-white/30 shadow-2xl overflow-hidden bg-white/10 backdrop-blur-sm">
      {imageLoading ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="animate-pulse text-white/50 text-lg">...</div>
        </div>
      ) : imageUrl ? (
        <img 
          src={imageUrl} 
          alt="Foto perfil" 
          className="w-full h-full object-cover" 
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-3xl font-bold text-white">
          {mostrarInicial()}
        </div>
      )}
    </div>
    
    <div 
      className="absolute w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg"
      style={{
        bottom: '8px',
        right: '8px',
      }}
    >
      <div className="w-2 h-2 bg-white rounded-full"></div>
    </div>
  </div>

  <div className="flex flex-col items-center text-center">
    <h1 className="text-3xl font-bold mb-3 tracking-tight">
      {perfilData.nombre}
    </h1>
    
    <div className="flex items-center justify-center gap-2 text-white/90 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 mb-7">
      <Calendar className="w-4 h-4" />
      <span className="text-sm font-medium">
        Miembro desde {formatearFecha()}
      </span>
    </div>
  </div>
</div>

      <div className="bg-white/95 backdrop-blur-xl border-x border-white/20 px-8 py-4">
        <div className="flex justify-center gap-3 mb-4">
          <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl px-4 py-2 border border-red-100 flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            <span className="text-lg font-bold text-red-600">{getTotalLikes()}</span>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl px-4 py-2 border border-purple-100 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-500" />
            <span className="text-lg font-bold text-purple-600">{planes.length}</span>
          </div>

          <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl px-4 py-2 border border-pink-100 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-pink-500" />
            <span className="text-lg font-bold text-pink-600">{flashPlans.length}</span>
          </div>
        </div>

      <div className="flex justify-center px-2">
  <div className="flex flex-wrap justify-center bg-gray-100 rounded-2xl p-2 gap-2 w-full max-w-2xl">
            {[
              { key: "info", label: "Información", icon: User },
              { key: "planes", label: "Mis Planes", icon: Calendar },
              { key: "flashplans", label: "FlashPlans", icon: MapPin },
            ].map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === tab.key
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105"
                      : "text-gray-600 hover:bg-white hover:text-purple-600"
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white/95 backdrop-blur-xl rounded-b-[3rem] border-x border-b border-white/20 p-8">
        
       {activeTab === "info" && (
        <div className="space-y-8">
    
            <h2 className="text-3xl font-bold text-gray-800 text-center mb-10">
              Información Personal
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { 
                  icon: User, 
                  label: "Nombre", 
                  value: perfilData.nombre,
                  gradient: "from-blue-500 to-purple-600",
                  bgGradient: "from-blue-50 to-purple-50"
                },
                { 
                  icon: Phone, 
                  label: "Celular", 
                  value: perfilData.celular,
                  gradient: "from-green-500 to-emerald-600",
                  bgGradient: "from-green-50 to-emerald-50"
                },
                { 
                  icon: MapPin, 
                  label: "Ciudad", 
                  value: perfilData.ciudad,
                  gradient: "from-pink-500 to-rose-600",
                  bgGradient: "from-pink-50 to-rose-50"
                },
                { 
                  icon: Calendar, 
                  label: "Edad", 
                  value: `${perfilData.edad} años`,
                  gradient: "from-purple-500 to-indigo-600",
                  bgGradient: "from-purple-50 to-indigo-50"
                },
                { 
                  icon: Check, 
                  label: "Términos Aceptados", 
                  value: perfilData.terminosAceptados ? "Sí" : "No",
                  gradient: "from-emerald-500 to-green-600",
                  bgGradient: "from-emerald-50 to-green-50"
                },
                { 
                  icon: Mail, 
                  label: "Correo", 
                  value: perfilData.email || user?.email,
                  gradient: "from-orange-500 to-amber-600",
                  bgGradient: "from-orange-50 to-amber-50"
                },
              ].map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <div 
                    key={index} 
                    className={`bg-gradient-to-br ${item.bgGradient} rounded-2xl p-6 border border-white/60 hover:shadow-xl transition-all duration-300 hover:scale-105 group`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`bg-gradient-to-br ${item.gradient} p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-600 mb-1">{item.label}</p>
                        <p className="text-lg font-bold text-gray-800 break-all">{item.value || "No especificado"}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "planes" && (
          <div>
         <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-10">
              Mis Planes
               </h2>
            </div>

            {planes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {planes.map((plan) => {
                  const interactions = getPlanInteractions(plan.id);
                  
                  return (
                    <div
                      key={plan.id}
                      onClick={() => {
                        setSelectedPlan(plan);
                        setIsPlanModalOpen(true);
                      }}
                      className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-105 group cursor-pointer"
                    >
                      {plan.imageUrls && plan.imageUrls.length > 0 && (
                        <div className="relative w-full h-48 overflow-hidden">
                          <img
                            src={plan.imageUrls[0]}
                            alt={plan.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                        </div>
                      )}

                      <div className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt="Avatar"
                                className="w-10 h-10 rounded-full object-cover border-2 border-purple-200"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold border-2 border-purple-200">
                                {mostrarInicial()}
                              </div>
                            )}
                            <div>
                              <span className="font-bold text-gray-800 text-sm">
                                {perfilData?.nombre || "Usuario"}
                              </span>
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-xs text-green-600 font-medium">Mi Plan</span>
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                            {plan.createdAt 
                              ? new Date(plan.createdAt).toLocaleDateString("es-CO", {
                                  day: "2-digit",
                                  month: "2-digit",
                                })
                              : ""}
                          </span>
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-purple-600 transition-colors">
                          {plan.title || "Plan sin título"}
                        </h3>

                        <div className="flex items-center text-sm text-gray-600 gap-4 mb-3">
                          <span className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-lg">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            {formatearFechaPlan(plan.date)}
                          </span>
                          {plan.timeString && (
                            <span className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-lg">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3"/>
                              </svg>
                              {plan.timeString}
                            </span>
                          )}
                        </div>

                        {plan.location && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3 bg-purple-50 px-3 py-2 rounded-lg">
                            <MapPin className="w-4 h-4 text-purple-600" />
                            <span className="truncate font-medium">{plan.location}</span>
                          </div>
                        )}

                        <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                          {plan.description || "Sin descripción"}
                        </p>

                        {plan.enableWhatsapp && (
                          <div className="flex justify-end mb-3">
                            <div className="bg-green-500 p-2 rounded-full shadow-md hover:bg-green-600 transition-colors">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.087"/>
                              </svg>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 gap-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlanInteraction(plan.id, 'like');
                            }}
                            className="relative flex items-center hover:bg-gray-50 px-2 py-2 rounded-lg transition-colors group"
                          >
                            <div className="relative">
                              <Heart 
                                className={`w-6 h-6 ${interactions.isLiked ? 'fill-red-500 text-red-500' : 'text-gray-600'} transition-all`} 
                              />
                              {interactions.likes > 0 && (
                                <span className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold ${
                                  interactions.isLiked ? 'text-white' : 'text-gray-600'
                                }`}>
                                  {interactions.likes}
                                </span>
                              )}
                            </div>
                          </button>

                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJoinPlan(plan.id);
                            }}
                            className={`flex items-center gap-1 hover:bg-gray-50 px-2 py-2 rounded-lg transition-all ${
                              interactions.hasJoined ? 'bg-green-50' : ''
                            }`}
                          >
                            <Plus 
                              className={`w-4 h-4 transition-colors ${
                                interactions.hasJoined ? 'text-green-600' : 'text-gray-600'
                              }`} 
                            />
                            <span className={`text-xs font-medium hidden sm:inline ${
                              interactions.hasJoined ? 'text-green-600' : 'text-gray-600'
                            }`}>
                              {interactions.hasJoined ? 'Unido' : 'Unirse'}
                            </span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setModalComentarios({
                                isOpen: true,
                                planId: plan.id,
                                planTitle: plan.title
                              });
                              cargarTodosLosComentarios(plan.id);
                            }}
                            className="flex items-center gap-1 hover:bg-gray-50 px-2 py-2 rounded-lg transition-colors"
                          >
                            <MessageCircle className="w-4 h-4 text-gray-600" />
                            <span className="text-xs text-gray-600">
                              {plan.commentCount || 0}
                            </span>
                          </button>

                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSharePlan(plan);
                            }}
                            className="flex items-center gap-1 hover:bg-gray-50 px-2 py-2 rounded-lg transition-colors cursor-pointer"
                          >
                            <Share2 className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-full p-8 w-32 h-32 mx-auto mb-6 flex items-center justify-center">
                  <Calendar className="w-16 h-16 text-purple-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">
                  No tienes planes publicados
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Empieza a crear tus primeros planes increíbles y compártelos con la comunidad de SindesParches
                </p>
                <button
                  onClick={() => setModalCrearPlan(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  ✨ Crear mi primer plan
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "flashplans" && (
          <div>
           <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-800 text-center mb-10">
                Mis FlashPlans
              </h2>
            </div>

            {flashPlans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {flashPlans.map((flashPlan) => {
                  const createdTime = flashPlan.timestamp?.toDate?.()?.getTime() || flashPlan.timestamp?.seconds * 1000 || 0;
                  const expirationTime = createdTime + (24 * 60 * 60 * 1000);
                  const now = Date.now();
                  const hoursRemaining = Math.floor((expirationTime - now) / (1000 * 60 * 60));
                  
                  return (
                    <div 
                      key={flashPlan.id} 
                      onClick={() => setSelectedFlashPlan(flashPlan)}
                      className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-300 cursor-pointer group hover:scale-105"
                    >
                      <div className="relative w-full h-64 overflow-hidden">
                        {flashPlan.imageUrl ? (
                          <>
                            <img
                              src={flashPlan.imageUrl}
                              alt="FlashPlan"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                            
                            {flashPlan.content && (
                              <div className="absolute bottom-0 left-0 right-0 p-4">
                                <p className="text-white text-sm font-medium line-clamp-2">{flashPlan.content}</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center p-6">
                            <p className="text-white text-center font-medium text-lg">
                              {flashPlan.content || "FlashPlan sin contenido"}
                            </p>
                          </div>
                        )}

                        <div className="absolute top-3 right-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-xl ${
                            hoursRemaining > 12 
                              ? 'bg-green-500/90 text-white' 
                              : hoursRemaining > 6 
                              ? 'bg-yellow-500/90 text-white' 
                              : hoursRemaining > 0
                              ? 'bg-red-500/90 text-white'
                              : 'bg-gray-500/90 text-white'
                          }`}>
                            {hoursRemaining > 0 ? `${hoursRemaining}h` : 'Expirado'}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 bg-gradient-to-br from-gray-50 to-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span className="text-xs font-medium">
                              {flashPlan.timestamp?.toDate?.()?.toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'short'
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 bg-gradient-to-r from-purple-100 to-pink-100 px-3 py-1.5 rounded-full">
                            <Eye className="w-4 h-4 text-purple-600" />
                            <span className="text-sm font-bold text-purple-700">
                              {flashPlan.viewers?.length || 0}
                            </span>
                            <span className="text-xs text-purple-600">vistas</span>
                          </div>
                        </div>
                      </div>

                      <div className="px-4 pb-3">
                        <div className="text-center">
                          <span className="text-xs text-gray-400 font-medium">Click para ver completo</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="bg-gradient-to-br from-pink-100 to-orange-100 rounded-full p-8 w-32 h-32 mx-auto mb-6 flex items-center justify-center">
                  <MapPin className="w-16 h-16 text-pink-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">
                  No tienes FlashPlans aún
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Crea tu primer FlashPlan y comparte momentos épicos que durarán 24 horas
                </p>
                <button
                  onClick={() => setModalCrearFlashPlan(true)}
                  className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl inline-flex items-center gap-3"
                >
                  <Plus className="w-5 h-5" />
                  ✨ Crear mi primer FlashPlan
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  </div>

  <EditarPerfilModal
    isOpen={isEditing}
    userData={perfilData}
    onClose={() => setIsEditing(false)}
    onSave={async (newData) => {
      const perfilRef = doc(db, "perfil", user.uid);
      await updateDoc(perfilRef, newData);
      setPerfilData({ ...perfilData, ...newData });
    }}
  />

  <PlanModal
    isOpen={modalCrearPlan}
    onClose={() => setModalCrearPlan(false)}
    onPlanCreated={(nuevoPlan) => {
      setPlanes((prev) => [...prev, nuevoPlan]);
      setModalCrearPlan(false);
    }}
  />

  {selectedPlan && (
    <PlanDetailsModal
      isOpen={isPlanModalOpen}
      onClose={() => {
        setIsPlanModalOpen(false);
        setSelectedPlan(null);
      }}
      plan={selectedPlan}
      user={user}
    />
  )}

  {modalCrearFlashPlan && (
    <CreateFlashPlan
      onClose={() => setModalCrearFlashPlan(false)}
      onSuccess={() => {
        setModalCrearFlashPlan(false);
        if (user) {
          fetchFlashPlans(user);
        }
      }}
    />
  )}

  {selectedFlashPlan && (
    <ProfileFlashPlanViewer
      flashPlan={selectedFlashPlan}
      onClose={() => setSelectedFlashPlan(null)}
      userName={perfilData?.nombre || user?.displayName || 'Usuario'}
      userPhoto={imageUrl}
    />
  )}

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
          <button
            onClick={() => setModalComentarios({ isOpen: false, planId: null, planTitle: '' })}
            className="p-3 hover:bg-white/10 rounded-2xl transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
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

          <div className="border-t border-white/20 p-6 bg-white/5">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const texto = e.target.comentario.value.trim();
                if (!texto) return;

                const planActual = planes.find(p => p.id === modalComentarios.planId);
                if (planActual) {
                  await agregarComentario(modalComentarios.planId, texto);
                }
                e.target.reset();
              }}
              className="space-y-4"
            >
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold flex-shrink-0">
                  {mostrarInicial()}
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
      </div>
    </div>
  );
}

export default Perfil;