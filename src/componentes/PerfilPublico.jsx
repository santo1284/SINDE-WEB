// PerfilPublico.jsx - Versión híbrida con diseño moderno de v6 y funcionalidad completa de v1
import React, { useEffect, useState, useRef } from "react";
import { db, storage } from "../firebase/firebase-config";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
  addDoc,
  orderBy,
} from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import PlanDetailsModal from "./PlanDetailsModal";
import {
  User,
  MapPin,
  Calendar,
  Heart,
  X,
  MessageCircle,
  Send,
  Clock,
  Share2,
  Phone,
  Plus,
  Mail,
  Sparkles,
  Zap,
} from "lucide-react";

function PerfilPublico({ userId, onClose, currentUser }) {
  const [perfilData, setPerfilData] = useState(null);
  const [perfilPublicoConfig, setPerfilPublicoConfig] = useState(null);
  const [planes, setPlanes] = useState([]);
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [activeTab, setActiveTab] = useState("eventos");

  // Estados para modal de comentarios
  const [modalComentarios, setModalComentarios] = useState({
    isOpen: false,
    planId: null,
    planTitle: "",
  });
  const [comentarios, setComentarios] = useState({});
  const [cargandoComentarios, setCargandoComentarios] = useState({});

  // Control del header con scroll (robusto)
  const scrollContainerRef = useRef(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);
  const commentUnsubsRef = useRef({});

  useEffect(() => {
    const handleRaf = () => {
      tickingRef.current = false;
      const el = scrollContainerRef.current;
      const currentScrollY = el
        ? el.scrollTop
        : window.pageYOffset || document.documentElement.scrollTop || 0;

      const last = lastScrollYRef.current;
      const delta = currentScrollY - last;
      const MIN_DELTA = 6;
      const HIDE_AFTER = 100;

      if (currentScrollY < 10) {
        setIsHeaderVisible(true);
      } else if (delta > MIN_DELTA && currentScrollY > HIDE_AFTER) {
        setIsHeaderVisible(false);
      } else if (delta < -MIN_DELTA) {
        setIsHeaderVisible(true);
      }
      lastScrollYRef.current = currentScrollY;
    };

    const onScrollHandler = () => {
      if (!tickingRef.current) {
        tickingRef.current = true;
        window.requestAnimationFrame(handleRaf);
      }
    };

    const el = scrollContainerRef.current;
    if (el) {
      lastScrollYRef.current = el.scrollTop || 0;
      el.addEventListener("scroll", onScrollHandler, { passive: true });
    } else {
      lastScrollYRef.current =
        window.pageYOffset || document.documentElement.scrollTop || 0;
      window.addEventListener("scroll", onScrollHandler, { passive: true });
    }

    return () => {
      if (el) {
        el.removeEventListener("scroll", onScrollHandler);
      } else {
        window.removeEventListener("scroll", onScrollHandler);
      }
    };
  }, []);

  // Cargar perfil
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const perfilRef = doc(db, "perfil", userId);
        const perfilSnap = await getDoc(perfilRef);

        if (perfilSnap.exists()) {
          setPerfilData(perfilSnap.data());
        }

        try {
          const configRef = doc(db, "perfilPublico", userId);
          const configSnap = await getDoc(configRef);

          if (configSnap.exists()) {
            setPerfilPublicoConfig(configSnap.data());
          } else {
            setPerfilPublicoConfig({
              showEmail: true,
              showAge: true,
              showPhone: false,
              bio: "",
            });
          }
        } catch (e) {
          setPerfilPublicoConfig({
            showEmail: true,
            showAge: true,
            showPhone: false,
            bio: "",
          });
        }

        try {
          const storageRef = ref(storage, `profile_pictures/${userId}`);
          const url = await getDownloadURL(storageRef);
          setImageUrl(url);
        } catch (e) {
          setImageUrl(null);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error:", error);
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  // Cargar planes
  useEffect(() => {
    const q = query(collection(db, "planes"), where("userId", "==", userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const planesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPlanes(planesData);
    });

    return () => unsubscribe();
  }, [userId]);

  const cargarTodosLosComentarios = async (planId) => {
    if (cargandoComentarios[planId]) return;

    setCargandoComentarios((prev) => ({ ...prev, [planId]: true }));

    try {
      const commentsRef = collection(db, "planes", planId, "comments");
      const q = query(commentsRef, orderBy("timestamp", "desc"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const comentariosData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setComentarios((prev) => ({
          ...prev,
          [planId]: comentariosData,
        }));

        setCargandoComentarios((prev) => ({ ...prev, [planId]: false }));
      });

      commentUnsubsRef.current[planId] = unsubscribe;
    } catch (error) {
      console.error("Error al cargar comentarios:", error);
      setCargandoComentarios((prev) => ({ ...prev, [planId]: false }));
    }
  };

  useEffect(() => {
    return () => {
      const keys = Object.keys(commentUnsubsRef.current);
      keys.forEach((k) => {
        try {
          const fn = commentUnsubsRef.current[k];
          if (typeof fn === "function") fn();
        } catch (e) {}
      });
    };
  }, []);

  const agregarComentario = async (planId, texto) => {
    if (!texto.trim()) return;

    try {
      const commentsRef = collection(db, "planes", planId, "comments");

      await addDoc(commentsRef, {
        planId: planId,
        userId: currentUser.uid,
        userName:
          currentUser.displayName ||
          currentUser.email?.split("@")[0] ||
          "Usuario Anónimo",
        text: texto.trim(),
        timestamp: new Date(),
      });

      const planRef = doc(db, "planes", planId);
      const planActual = planes.find((p) => p.id === planId);
      const nuevoConteo = (planActual?.commentCount || 0) + 1;

      await updateDoc(planRef, {
        commentCount: nuevoConteo,
        lastCommentAt: new Date(),
      });
    } catch (error) {
      console.error("Error al agregar comentario:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const formatearFechaPlan = (date) => {
    if (!date) return "Sin fecha";
    try {
      let dateObj;
      if (typeof date === "number") {
        dateObj = new Date(date);
      } else if (date.toDate) {
        dateObj = date.toDate();
      } else if (date.seconds) {
        dateObj = new Date(date.seconds * 1000);
      } else {
        dateObj = new Date(date);
      }

      return dateObj.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (error) {
      return "Fecha inválida";
    }
  };

  const calcularTiempoPublicacion = (createdAt) => {
    if (!createdAt) return "Hace un momento";
    
    try {
      let fecha;
      if (typeof createdAt === 'number') {
        fecha = new Date(createdAt);
      } else if (createdAt.seconds) {
        fecha = new Date(createdAt.seconds * 1000);
      } else {
        fecha = new Date(createdAt);
      }
      
      const ahora = new Date();
      const diferenciaHoras = Math.floor((ahora - fecha) / (1000 * 60 * 60));
      
      if (diferenciaHoras < 1) return "Hace un momento";
      if (diferenciaHoras < 24) return `Hace ${diferenciaHoras}h`;
      
      const diferenciaDias = Math.floor(diferenciaHoras / 24);
      if (diferenciaDias < 7) return `Hace ${diferenciaDias}d`;
      
      return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    } catch (error) {
      return "Hace un momento";
    }
  };

  const formatearFechaMiembro = () => {
    const fechaData = perfilData?.fechaAceptacionTerminos;
    
    if (!fechaData) return "Fecha no disponible";
    
    try {
      let fecha;
      if (typeof fechaData === "string") {
        fecha = new Date(fechaData);
      } else if (fechaData.seconds) {
        fecha = new Date(fechaData.seconds * 1000);
      } else {
        fecha = new Date(fechaData);
      }
      
      return fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return "Fecha no disponible";
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-pink-900 z-50 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!perfilData) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-pink-900 z-50 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 text-center border border-white/20">
          <h3 className="text-white text-2xl font-bold mb-4">Perfil no encontrado</h3>
          <button
            onClick={onClose}
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-xl font-bold"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const inicial = (perfilData?.nombre?.charAt(0) || "U").toUpperCase();

  return (
    <>
      <div
        ref={scrollContainerRef}
        className="fixed inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-pink-900 overflow-y-auto"
        style={{ zIndex: 50 }}
      >
        {/* Header con animación */}
        <div
          className={`sticky top-0 bg-white/10 backdrop-blur-xl border-b border-white/20 z-10 transition-transform duration-300 ${
            isHeaderVisible ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-white hover:bg-white/10 px-3 py-2 rounded-xl transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span className="font-bold">Volver</span>
            </button>
            <h1 className="text-white text-xl font-bold">Perfil de Usuario</h1>
            <div className="w-24"></div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto pb-8">
          {/* Card de perfil mejorado */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl mx-4 mt-6 p-6 border border-white/20">
            {/* Foto */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-full animate-pulse opacity-75 blur-lg"></div>
                <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Perfil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center text-white text-4xl font-bold">
                      {inicial}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Nombre */}
            <h2 className="text-white text-3xl font-black text-center mb-2">
              {perfilData.nombre}
            </h2>

            {/* Badges modernos y compactos */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
              <div className="flex items-center gap-2 bg-pink-500/20 border border-pink-500/50 text-pink-300 px-3 py-1 rounded-full">
                <MapPin className="w-3 h-3" />
                <span className="text-xs font-bold">{perfilData.ciudad}</span>
              </div>
              <div className="flex items-center gap-2 bg-purple-500/20 border border-purple-500/50 text-purple-300 px-3 py-1 rounded-full">
                <Clock className="w-3 h-3" />
                <span className="text-xs font-bold">Miembro</span>
              </div>
            </div>

            {/* Email */}
            {perfilPublicoConfig?.showEmail && perfilData.email && (
              <p className="text-white/70 text-center text-sm mb-4">
                {perfilData.email}
              </p>
            )}

            {/* Bio */}
            {perfilPublicoConfig?.bio && (
              <div className="bg-white/10 rounded-xl p-3 mb-4 border border-white/20">
                <p className="text-white/90 text-sm text-center leading-relaxed">
                  {perfilPublicoConfig.bio}
                </p>
              </div>
            )}

            {/* Tabs estadísticas - Compactos */}
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setActiveTab("eventos")}
                className={`rounded-xl p-3 w-24 transition-all ${
                  activeTab === "eventos"
                    ? "bg-gradient-to-br from-purple-600/50 to-pink-600/50 scale-105 border-2 border-white/30"
                    : "bg-white/10 hover:bg-white/20 border border-white/20"
                }`}
              >
                <Calendar className="w-5 h-5 mb-1 mx-auto text-white" />
                <div className="text-2xl font-black text-white">{planes.length}</div>
                <div className="text-xs text-white/70">Eventos</div>
              </button>

              <button
                onClick={() => setActiveTab("info")}
                className={`rounded-xl p-3 w-24 transition-all ${
                  activeTab === "info"
                    ? "bg-gradient-to-br from-indigo-600/50 to-purple-600/50 scale-105 border-2 border-white/30"
                    : "bg-white/10 hover:bg-white/20 border border-white/20"
                }`}
              >
                <User className="w-5 h-5 mb-1 mx-auto text-white" />
                <div className="text-2xl font-black text-white">
                  {perfilPublicoConfig?.showAge && perfilData.edad ? perfilData.edad : "??"}
                </div>
                <div className="text-xs text-white/70">Años</div>
              </button>
            </div>
          </div>

          {/* Contenido de tabs */}
          <div className="px-4 mt-6">
            {activeTab === "eventos" && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-5 h-5 text-pink-400" />
                  <h3 className="text-white text-xl font-black">Publicaciones</h3>
                  <div className="bg-pink-500/20 text-pink-300 px-2 py-1 rounded-full text-xs font-bold border border-pink-500/50">
                    {planes.length}
                  </div>
                </div>

                {planes.length > 0 ? (
                  <div className="space-y-3">
                    {planes.map((plan) => (
                      <div
                        key={plan.id}
                         onClick={() => {
                        setSelectedPlan(plan);
                        setShowPlanModal(true);
                         }}
                        className="bg-white/10 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/20 hover:border-pink-500/50 transition-all"
                      >
                        {/* Header del plan con avatar y tiempo */}
                        <div className="flex items-center justify-between p-3 bg-white/5">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-pink-500 to-purple-500">
                              {imageUrl ? (
                                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                                  {inicial}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-white text-sm font-bold">{perfilData.nombre}</p>
                              <p className="text-white/60 text-xs">{calcularTiempoPublicacion(plan.createdAt)}</p>
                            </div>
                          </div>
                          <Zap className="w-4 h-4 text-yellow-400" />
                        </div>

                        {/* Imagen */}
                        {plan.imageUrls && plan.imageUrls.length > 0 && (
                          <div className="relative h-48">
                            <img
                              src={plan.imageUrls[0]}
                              alt={plan.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                          </div>
                        )}

                        {/* Contenido */}
                        <div className="p-4">
                          <h4 className="text-white text-lg font-bold mb-2">{plan.title}</h4>
                          <p className="text-white/70 text-sm mb-3 line-clamp-2">
                            {plan.description}
                          </p>

                          {/* Fecha y ubicación compactas */}
                          <div className="space-y-1 mb-3">
                            <div className="flex items-center gap-2 text-white/70 text-xs">
                              <Calendar className="w-3 h-3" />
                              <span>{formatearFechaPlan(plan.date)}</span>
                              {plan.timeString && (
                                <>
                                  <Clock className="w-3 h-3 ml-2" />
                                  <span>{plan.timeString}</span>
                                </>
                              )}
                            </div>
                            {plan.location && (
                              <div className="flex items-center gap-2 text-white/70 text-xs">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">{plan.location}</span>
                              </div>
                            )}
                          </div>

                          {/* Interacciones completas */}
                       <div className="flex items-center justify-between pt-3 border-t border-white/20">
                            <div className="flex items-center gap-2 flex-1">
                              <button
                             onClick={async (e) => {  // ✅ Agregar (e) aquí
                             e.stopPropagation();
                                  if (!currentUser) return;
                                  const planRef = doc(db, "planes", plan.id);
                                  const hasLiked = plan.likes?.includes(currentUser.uid);
                                  await updateDoc(planRef, {
                                    likes: hasLiked
                                      ? arrayRemove(currentUser.uid)
                                      : arrayUnion(currentUser.uid),
                                  });
                                }}
                                className="flex items-center gap-1 hover:bg-white/10 px-2 py-1 rounded-lg transition-colors"
                              >
                                <Heart
                                  className={`w-5 h-5 ${
                                    plan.likes?.includes(currentUser?.uid)
                                      ? "fill-red-500 text-red-500"
                                      : "text-white/70"
                                  }`}
                                />
                                <span className="text-white text-xs font-bold">
                                  {plan.likes?.length || 0}
                                </span>
                              </button>

                              <button
                                onClick={async (e) => {  // ✅ Agregar (e) aquí
                                  e.stopPropagation();
                                  if (!currentUser) return;
                                  const planRef = doc(db, "planes", plan.id);
                                  const hasJoined = plan.participants?.includes(currentUser.uid);
                                  await updateDoc(planRef, {
                                    participants: hasJoined
                                      ? arrayRemove(currentUser.uid)
                                      : arrayUnion(currentUser.uid),
                                  });
                                }}
                                className="flex items-center gap-1 hover:bg-white/10 px-2 py-1 rounded-lg transition-colors"
                              >
                                <Plus
                                  className={`w-5 h-5 ${
                                    plan.participants?.includes(currentUser?.uid)
                                      ? "text-green-400"
                                      : "text-white/70"
                                  }`}
                                />
                                <span className="text-white text-xs font-bold">
                                  {plan.participants?.length || 0}
                                </span>
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setModalComentarios({
                                    isOpen: true,
                                    planId: plan.id,
                                    planTitle: plan.title,
                                  });
                                  cargarTodosLosComentarios(plan.id);
                                }}
                                className="flex items-center gap-1 hover:bg-white/10 px-2 py-1 rounded-lg transition-colors"
                              >
                                <MessageCircle className="w-5 h-5 text-white/70" />
                                <span className="text-white text-xs font-bold">
                                  {plan.commentCount || 0}
                                </span>
                              </button>

                             <button
                              onClick={async (e) => {
                                e.stopPropagation();  // 👈 AGREGAR ESTO
                                try {
                                  if (navigator.share) {
                                      await navigator.share({
                                        title: plan.title,
                                        text: plan.description,
                                        url: window.location.href,
                                      });
                                    } else {
                                      await navigator.clipboard.writeText(window.location.href);
                                      alert("Enlace copiado");
                                    }
                                  } catch (e) {
                                    console.log("Error al compartir");
                                  }
                                }}
                                className="flex items-center hover:bg-white/10 p-2 rounded-lg transition-colors"
                              >
                                <Share2 className="w-5 h-5 text-white/70" />
                              </button>

                              {plan.enableWhatsapp && plan.phoneNumber && (
                                <a
                                  href={`https://wa.me/${plan.phoneNumber.replace(/\D/g, "")}?text=Hola! Vi tu plan "${plan.title}"`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-8 h-8 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-all ml-1"
                                >
                                  <Phone className="w-4 h-4 text-white" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20">
                    <Calendar className="w-12 h-12 text-white/50 mx-auto mb-3" />
                    <p className="text-white/70">No hay planes publicados</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "info" && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <User className="w-5 h-5 text-purple-400" />
                  <h3 className="text-white text-xl font-black">Información</h3>
                </div>

                <div className="space-y-2">
                  <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white/70 text-xs">Ciudad</p>
                        <p className="text-white font-bold">{perfilData.ciudad || "No especificado"}</p>
                      </div>
                    </div>
                  </div>

                  {perfilPublicoConfig?.showAge && perfilData.edad && (
                    <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white/70 text-xs">Edad</p>
                          <p className="text-white font-bold">{perfilData.edad} años</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {perfilPublicoConfig?.showEmail && perfilData.email && (
                    <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-lg flex items-center justify-center">
                          <Mail className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white/70 text-xs">Email</p>
                          <p className="text-white font-bold text-sm truncate">{perfilData.email}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {perfilPublicoConfig?.showPhone && perfilData.celular && (
                    <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                          <Phone className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white/70 text-xs">Teléfono</p>
                          <p className="text-white font-bold">{perfilData.celular}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white/70 text-xs">Miembro desde</p>
                        <p className="text-white font-bold text-sm">{formatearFechaMiembro()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

     {showPlanModal && selectedPlan && (
  <PlanDetailsModal
    isOpen={showPlanModal}
    onClose={() => {
      setShowPlanModal(false);
      setSelectedPlan(null);
    }}
    plan={selectedPlan}
    user={currentUser}
    onOpenPerfilPublico={(userId) => {
      // Esto permite que desde el modal se abra otro perfil público
      setShowPlanModal(false);
      setSelectedPlan(null);
      // Aquí necesitarías una prop de tu componente padre si quieres 
      // navegar a otro perfil desde el modal
    }}
  />
)}
      {/* Modal de comentarios compacto */}
      {modalComentarios.isOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
         style={{ zIndex: 70 }}
        >
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-white/20">
            <div className="flex items-center justify-between p-5 border-b border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Comentarios</h3>
                  <p className="text-white/60 text-sm truncate">{modalComentarios.planTitle}</p>
                </div>
              </div>
              <button
                onClick={() =>
                  setModalComentarios({ isOpen: false, planId: null, planTitle: "" })
                }
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {cargandoComentarios[modalComentarios.planId] ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-10 h-10 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin"></div>
                  <span className="ml-3 text-white">Cargando comentarios...</span>
                </div>
              ) : comentarios[modalComentarios.planId]?.length > 0 ? (
                <div className="space-y-3">
                  {comentarios[modalComentarios.planId].map((comentario) => (
                    <div
                      key={comentario.id}
                      className="bg-white/10 rounded-xl p-3 border border-white/20"
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-9 h-9 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-sm font-bold">
                          {(comentario.userName?.charAt(0) || "A").toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-white text-sm">
                              {comentario.userName || "Usuario Anónimo"}
                            </span>
                            <div className="flex items-center text-white/60 text-xs gap-1">
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

                                return fecha.toLocaleString("es-ES", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                });
                              })()}
                            </div>
                          </div>
                          <p className="text-white text-sm">{comentario.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
                    <h4 className="text-xl font-bold text-white mb-2">No hay comentarios aún</h4>
                    <p className="text-white/70 text-sm">Sé el primero en comentar sobre este plan</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/20 p-4 bg-white/5">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const texto = e.target.comentario.value.trim();
                  if (!texto) return;
                  await agregarComentario(modalComentarios.planId, texto);
                  e.target.reset();
                }}
              >
                <div className="flex gap-3 mb-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold">
                    {inicial}
                  </div>

                  <textarea
                    name="comentario"
                    placeholder="Escribe tu comentario..."
                    className="flex-1 p-3 bg-white/10 border border-white/30 rounded-xl focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-500/20 resize-none text-white placeholder:text-white/50 text-sm"
                    rows="2"
                    maxLength={500}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-white/60 text-xs">
                    {comentarios[modalComentarios.planId]?.length || 0} comentarios
                  </span>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl transition-all flex items-center gap-2 font-bold text-sm"
                  >
                    <Send className="w-4 h-4" />
                    Comentar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PerfilPublico;