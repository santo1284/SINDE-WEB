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
} from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import EditarPerfilModal from "./EditarPerfil";
import PlanModal from "./PlanModal";
import PlanDetailsModal from "./PlanDetailsModal";
import { onAuthStateChanged } from "firebase/auth";
import { User, Phone, MapPin, Calendar, Mail, Check, Edit } from "lucide-react";
function Perfil({ onBack }) {
const [perfilData, setPerfilData] = useState(null);
const [planes, setPlanes] = useState([]);
const [flashPlans, setFlashPlans] = useState([]);
const [isEditing, setIsEditing] = useState(false);
const [activeTab, setActiveTab] = useState("info");
const [imageUrl, setImageUrl] = useState(null);
const [imageLoading, setImageLoading] = useState(true);
const [modalCrearPlan, setModalCrearPlan] = useState(false);
const [user, setUser] = useState(null);
const [selectedPlan, setSelectedPlan] = useState(null);
const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
// Función para cargar perfil
const fetchPerfil = async (currentUser) => {
try {
const perfilRef = doc(db, "perfil", currentUser.uid);
const perfilSnap = await getDoc(perfilRef);
if (perfilSnap.exists()) {
setPerfilData(perfilSnap.data());
}
  // Imagen de perfil
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
// Si no hay perfil cargado todavía
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
// JSX del perfil con diseño mejorado y animaciones de fondo
return (
<div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-pink-900 relative overflow-hidden">
  {/* Animaciones de fondo dinámicas */}
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Círculos flotantes grandes */}
    <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
    
    {/* Orbes flotantes medianos */}
    <div className="absolute top-20 left-20 w-32 h-32 bg-cyan-400/30 rounded-full blur-2xl animate-bounce" style={{animationDuration: '6s', animationDelay: '0.5s'}}></div>
    <div className="absolute top-1/3 right-32 w-24 h-24 bg-yellow-400/25 rounded-full blur-xl animate-bounce" style={{animationDuration: '8s', animationDelay: '1.5s'}}></div>
    <div className="absolute bottom-32 left-1/3 w-20 h-20 bg-green-400/30 rounded-full blur-xl animate-bounce" style={{animationDuration: '7s', animationDelay: '3s'}}></div>
    <div className="absolute top-1/4 left-1/2 w-16 h-16 bg-pink-400/40 rounded-full blur-lg animate-bounce" style={{animationDuration: '9s', animationDelay: '2.5s'}}></div>
    
    {/* Partículas pequeñas flotantes */}
    <div className="absolute top-1/6 right-1/4 w-3 h-3 bg-white/60 rounded-full animate-ping" style={{animationDuration: '4s'}}></div>
    <div className="absolute top-2/3 left-1/6 w-2 h-2 bg-purple-300/70 rounded-full animate-ping" style={{animationDuration: '5s', animationDelay: '1s'}}></div>
    <div className="absolute bottom-1/4 right-1/3 w-4 h-4 bg-pink-300/50 rounded-full animate-ping" style={{animationDuration: '6s', animationDelay: '2s'}}></div>
    <div className="absolute top-1/2 right-1/6 w-2 h-2 bg-cyan-300/80 rounded-full animate-ping" style={{animationDuration: '3s', animationDelay: '0.5s'}}></div>
    <div className="absolute bottom-1/3 left-1/2 w-3 h-3 bg-yellow-300/60 rounded-full animate-ping" style={{animationDuration: '7s', animationDelay: '3.5s'}}></div>
    
    {/* Estrellas titilantes */}
    <div className="absolute top-1/5 left-1/4 w-1 h-1 bg-white rounded-full animate-pulse opacity-70"></div>
    <div className="absolute top-1/3 right-1/5 w-1 h-1 bg-white rounded-full animate-pulse opacity-50" style={{animationDelay: '1s'}}></div>
    <div className="absolute bottom-1/5 left-2/3 w-1 h-1 bg-white rounded-full animate-pulse opacity-80" style={{animationDelay: '2s'}}></div>
    <div className="absolute top-2/3 left-1/5 w-1 h-1 bg-white rounded-full animate-pulse opacity-60" style={{animationDelay: '0.5s'}}></div>
    <div className="absolute bottom-1/2 right-1/4 w-1 h-1 bg-white rounded-full animate-pulse opacity-90" style={{animationDelay: '1.5s'}}></div>
    <div className="absolute top-1/4 left-3/4 w-1 h-1 bg-white rounded-full animate-pulse opacity-40" style={{animationDelay: '3s'}}></div>
    
    {/* Ondas concéntricas */}
    <div className="absolute top-1/4 right-1/3 w-40 h-40 border border-white/10 rounded-full animate-ping" style={{animationDuration: '8s'}}></div>
    <div className="absolute bottom-1/3 left-1/4 w-32 h-32 border border-purple-300/20 rounded-full animate-ping" style={{animationDuration: '10s', animationDelay: '2s'}}></div>
    
    {/* Figuras geométricas flotantes */}
    <div className="absolute top-1/6 left-1/3 w-6 h-6 bg-gradient-to-br from-purple-400/30 to-pink-400/30 transform rotate-45 animate-spin" style={{animationDuration: '20s'}}></div>
    <div className="absolute bottom-1/4 right-1/6 w-4 h-4 bg-gradient-to-br from-cyan-400/40 to-blue-400/40 transform rotate-12 animate-spin" style={{animationDuration: '15s', animationDelay: '5s'}}></div>
    <div className="absolute top-2/3 left-2/3 w-5 h-5 bg-gradient-to-br from-yellow-400/35 to-orange-400/35 transform -rotate-12 animate-spin" style={{animationDuration: '25s', animationDelay: '3s'}}></div>
    
    {/* Líneas de conexión animadas */}
    <div className="absolute top-1/3 left-1/2 w-px h-20 bg-gradient-to-b from-transparent via-white/20 to-transparent animate-pulse" style={{animationDelay: '1s'}}></div>
    <div className="absolute top-1/2 left-1/3 w-16 h-px bg-gradient-to-r from-transparent via-purple-300/30 to-transparent animate-pulse" style={{animationDelay: '2.5s'}}></div>
    
    {/* Efecto de partículas deslizantes */}
    <div className="absolute inset-0">
      <div className="absolute top-1/4 -left-2 w-1 h-1 bg-white/70 rounded-full animate-pulse"></div>
      <div className="absolute top-1/3 -left-2 w-0.5 h-0.5 bg-purple-300/60 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
      <div className="absolute top-1/2 -left-2 w-1 h-1 bg-pink-300/50 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
      <div className="absolute top-2/3 -left-2 w-0.5 h-0.5 bg-cyan-300/70 rounded-full animate-pulse" style={{animationDelay: '3s'}}></div>
    </div>
  </div>

  {/* Efecto de lluvia de estrellas sutil */}
  <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
    {[...Array(12)].map((_, i) => (
      <div
        key={i}
        className="absolute w-0.5 h-0.5 bg-white rounded-full animate-bounce"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDuration: `${3 + Math.random() * 4}s`,
          animationDelay: `${Math.random() * 3}s`
        }}
      ></div>
    ))}
  </div>

  <div className="relative z-10 max-w-6xl mx-auto px-4 lg:px-6 py-6">

    {/* Botón volver mejorado */}
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

    {/* Header principal con diseño curvo */}
    <div className="relative mb-8">
      <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-pink-600 rounded-t-[3rem] px-8 py-12 relative overflow-hidden">
        
        {/* Patrón decorativo */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
        
        {/* Botón editar flotante */}
        <button
          onClick={() => setIsEditing(true)}
          className="absolute top-6 right-6 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white p-3 rounded-2xl transition-all duration-300 hover:scale-110 border border-white/20"
        >
          <Edit className="w-5 h-5" />
        </button>

        {/* Contenido del header */}
        <div className="relative flex flex-col items-center text-white text-center">
          
          {/* Foto de perfil mejorada */}
          <div className="relative mb-6">
            <div className="w-32 h-32 rounded-full border-4 border-white/30 shadow-2xl overflow-hidden bg-white/10 backdrop-blur-sm">
              {imageLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-pulse text-white/50 text-lg">...</div>
                </div>
              ) : imageUrl ? (
                <img src={imageUrl} alt="Foto perfil" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-3xl font-bold text-white">
                  {mostrarInicial()}
                </div>
              )}
            </div>
            
            {/* Badge online */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-4 border-white/30 flex items-center justify-center">
              <div className="w-3 h-3 bg-green-300 rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* Información del usuario */}
          <h1 className="text-3xl font-bold mb-2 tracking-tight">
            {perfilData.nombre}
          </h1>
          
          <div className="flex items-center gap-2 text-white/90 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">
              Miembro desde {formatearFecha()}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs mejorados */}
      <div className="bg-white/95 backdrop-blur-xl border-x border-white/20 px-8 py-6">
        <div className="flex justify-center">
          <div className="flex bg-gray-100 rounded-2xl p-2 gap-2">
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
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contenido con fondo blanco y bordes redondeados */}
      <div className="bg-white/95 backdrop-blur-xl rounded-b-[3rem] border-x border-b border-white/20 p-8">
        
        {/* TAB INFORMACIÓN */}
        {activeTab === "info" && (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">
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
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-600 mb-1">{item.label}</p>
                        <p className="text-lg font-bold text-gray-800">{item.value || "No especificado"}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB PLANES */}
        {activeTab === "planes" && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-800">
                Mis Planes
              </h2>
              <span className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 px-4 py-2 rounded-full text-sm font-bold border border-purple-200">
                {planes.length} planes creados
              </span>
            </div>

            {/* Si tiene planes */}
            {planes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {planes.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => {
                      setSelectedPlan(plan);
                      setIsPlanModalOpen(true);
                    }}
                    className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-105 group"
                  >
                    {/* Imagen principal del plan */}
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

                    {/* Contenido */}
                    <div className="p-5">
                      {/* Header con avatar y nombre */}
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

                      {/* Título */}
                      <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-purple-600 transition-colors">
                        {plan.title || "Plan sin título"}
                      </h3>

                      {/* Fecha y hora del plan */}
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

                      {/* Ubicación */}
                      {plan.location && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3 bg-purple-50 px-3 py-2 rounded-lg">
                          <MapPin className="w-4 h-4 text-purple-600" />
                          <span className="truncate font-medium">{plan.location}</span>
                        </div>
                      )}

                      {/* Descripción */}
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                        {plan.description || "Sin descripción"}
                      </p>

                      {/* Estadísticas de interacción */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-1 text-red-500 font-medium">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            {plan.likes?.length || 0} likes
                          </span>
                          <span className="flex items-center gap-1 text-blue-500 font-medium">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            {plan.participants?.length || 0} participantes
                          </span>
                          <span className="flex items-center gap-1 text-green-500 font-medium">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            {plan.participants?.length || 0} participantes
                          </span>
                          <span className="flex items-center gap-1 text-green-500 font-medium">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            {plan.commentCount || 0} comentarios
                          </span>
                        </div>
                        {plan.enableWhatsapp && (
                          <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                            <Phone className="w-3 h-3" />
                            <span className="text-xs font-bold">WhatsApp</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Si no tiene planes */
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

        {/* TAB FLASHPLANS */}
        {activeTab === "flashplans" && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-800">Mis FlashPlans</h2>
              <span className="bg-gradient-to-r from-pink-100 to-orange-100 text-pink-700 px-4 py-2 rounded-full text-sm font-bold border border-pink-200">
                {flashPlans.length} flashplans
              </span>
            </div>
            {flashPlans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {flashPlans.map((flashPlan) => (
                  <div key={flashPlan.id} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
                    <p className="text-gray-600">FlashPlan: {flashPlan.id}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="bg-gradient-to-br from-pink-100 to-orange-100 rounded-full p-8 w-32 h-32 mx-auto mb-6 flex items-center justify-center">
                  <MapPin className="w-16 h-16 text-pink-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">
                  No tienes FlashPlans aún
                </h3>
                <p className="text-gray-600">Próximamente podrás crear FlashPlans</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  </div>

  {/* Modales */}
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
</div>
);
}

export default Perfil;
