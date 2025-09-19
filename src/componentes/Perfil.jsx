import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase/firebase-config";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import EditarPerfilModal from "./EditarPerfil";
import { useNavigate } from "react-router-dom";

function Perfil({ onBack }) {
  const [perfilData, setPerfilData] = useState(null);
  const [planes, setPlanes] = useState([]);
  const [flashPlans, setFlashPlans] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  const user = auth.currentUser;

  useEffect(() => {
    const fetchPerfil = async () => {
      if (user) {
        const perfilRef = doc(db, "perfil", user.uid);
        const perfilSnap = await getDoc(perfilRef);
        if (perfilSnap.exists()) {
          setPerfilData(perfilSnap.data());
        }

        const planesRef = collection(db, "planes", user.uid, "misPlanes");
        const planesSnap = await getDocs(planesRef);
        setPlanes(planesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

        const flashRef = collection(db, "flashPlans", user.uid, "misFlash");
        const flashSnap = await getDocs(flashRef);
        setFlashPlans(
          flashSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
      }
    };
    fetchPerfil();
  }, [user]);

  if (!perfilData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-700 to-pink-700 flex items-center justify-center">
        <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-8 text-white text-center">
          <div className="animate-spin w-12 h-12 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4"></div>
          <p className="text-lg">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-700 to-pink-700 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Botón volver */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-xl shadow-lg hover:bg-white/30 transition-all duration-300 flex items-center gap-2 font-medium"
          >
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Volver
          </button>
        </div>

        {/* Tarjeta principal del perfil */}
        <div className="bg-white/90 backdrop-blur-lg shadow-2xl rounded-3xl overflow-hidden">
          {/* Header del perfil */}
          <div className="relative">
            <div className="h-48 bg-gradient-to-r from-pink-600 via-indigo-600 to-purple-600 relative overflow-hidden">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative h-full flex flex-col items-center justify-center text-white px-8">
                {/* Foto */}
                <div className="relative mb-4">
                  <img
                    src={perfilData.fotoURL || "https://via.placeholder.com/150"}
                    alt="Foto perfil"
                    className="w-24 h-24 rounded-2xl border-4 border-white shadow-xl object-cover"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-green-500 w-6 h-6 rounded-full border-3 border-white flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
                {/* Nombre y fecha */}
                <h1 className="text-2xl font-bold mb-1">{perfilData.nombre}</h1>
                <p className="text-white/90 flex items-center gap-2 text-sm">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Miembro desde{" "}
                  {perfilData.fechaRegistro ||
                  perfilData.createdAt ||
                  perfilData.fechaTerminos
                    ? new Date(
                        (perfilData.fechaRegistro ||
                          perfilData.createdAt ||
                          perfilData.fechaTerminos).seconds * 1000
                      ).toLocaleDateString("es-CO", {
                        year: "numeric",
                        month: "long",
                      })
                    : "No disponible"}
                </p>
              </div>
            </div>

            {/* Stats (se mantienen igual, no los toqué) */}
            <div className="relative px-8 py-6 bg-white">
              <div className="flex justify-center">
                <div className="flex gap-6">
                  <div className="text-center bg-purple-200 rounded-xl p-4 min-w-[100px]">
                    <div className="text-2xl font-bold text-purple-600">
                      {planes.length}
                    </div>
                    <div className="text-sm text-gray-600">Planes</div>
                  </div>
                  <div className="text-center bg-pink-200 rounded-xl p-4 min-w-[100px] flex flex-col items-center">
                    <div className="relative">
                      <svg
                        className="w-12 h-12 text-red-500"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 
                           2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 
                           4.5 2.09C13.09 3.81 14.76 3 16.5 3 
                           19.58 3 22 5.42 22 8.5c0 3.78-3.4 
                           6.86-8.55 11.54L12 21.35z" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-white font-bold">
                        {flashPlans.reduce(
                          (total, fp) => total + (fp.likes || 0),
                          0
                        )}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">Me Gusta</div>
                  </div>
                  <div className="text-center bg-indigo-200 rounded-xl p-4 min-w-[100px]">
                    <div className="text-2xl font-bold text-indigo-600">
                      {flashPlans.length}
                    </div>
                    <div className="text-sm text-gray-600">FlashPlans</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ---------------------------
              AQUÍ: quité los "botones morados" con íconos pero 
              dejé el contenedor y el botón editar tal como estaba,
              para no romper posicionamiento ni diseño.
             --------------------------- */}
          <div className="px-8 border-b border-gray-200 bg-white relative">
            <div className="flex gap-1">
              {/* botones morados (con iconos) removidos a pedido */}
            </div>

            {/* Editar perfil (se mantiene) */}
            <div className="absolute top-4 right-8">
              <button
                onClick={() => setIsEditing(true)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg transition-all duration-300"
              >
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Barra de pestañas nueva (centrada) - se mantiene */}
          <div className="flex justify-center space-x-4 mb-8">
            {[
              { key: "info", label: "Información" },
              { key: "planes", label: "Mis Planes" },
              { key: "flashplans", label: "FlashPlans" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                  activeTab === tab.key
                    ? "bg-gradient-to-r from-yellow-400 to-pink-500 text-white shadow-lg"
                    : "bg-white text-gray-700 border border-gray-300 hover:from-yellow-400 hover:to-pink-500 hover:bg-gradient-to-r hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Contenido de pestañas */}
          <div className="p-5">
            {activeTab === "info" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                  Información Personal
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    {
                      icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
                      label: "Nombre",
                      value: perfilData.nombre,
                    },
                    {
                      icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
                      label: "Celular",
                      value: perfilData.celular,
                    },
                    {
                      icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z",
                      label: "Ciudad",
                      value: perfilData.ciudad,
                    },
                    {
                      icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
                      label: "Edad",
                      value: `${perfilData.edad} años`,
                    },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-b from-pink-600 to-blue-600 p-3 rounded-lg">
                          <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d={item.icon}
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 font-medium">
                            {item.label}
                          </p>
                          <p className="text-lg text-gray-800 font-semibold">
                            {item.value || "No especificado"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "planes" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                  Mis Planes
                </h2>

                <div className="flex justify-end mb-6">
                  <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-sm font-medium">
                    {planes.length} planes
                  </span>
                </div>

                {planes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {planes.map((plan) => (
                      <div
                        key={plan.id}
                        className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300"
                      >
                        <div className="flex items-start gap-3">
                          <div className="bg-purple-100 p-2 rounded-lg">
                            <svg
                              className="w-5 h-5 text-pink-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                              />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 mb-1">
                              {plan.titulo || "Plan sin título"}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {plan.descripcion
                                ? plan.descripcion.substring(0, 60) + "..."
                                : "Sin descripción"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                      <svg
                        className="w-12 h-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      No tienes planes publicados
                    </h3>
                    <p className="text-black">
                      ¡Empieza a crear tus primeros planes y compártelos con la
                      comunidad!
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "flashplans" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                  Mis FlashPlans
                </h2>

                <div className="flex justify-end mb-6">
                  <span className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-medium">
                    {flashPlans.length} flashplans
                  </span>
                </div>

                {flashPlans.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {flashPlans.map((fp) => (
                      <div
                        key={fp.id}
                        className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300"
                      >
                        <div className="flex items-start gap-3">
                          <div className="bg-pink-100 p-2 rounded-lg">
                            <svg
                              className="w-5 h-5 text-pink-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                              />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-black mb-1">
                              {fp.titulo || "FlashPlan sin título"}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {fp.descripcion
                                ? fp.descripcion.substring(0, 60) + "..."
                                : "Sin descripción"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                      <svg
                        className="w-12 h-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      No tienes flashplans publicados
                    </h3>
                    <p className="text-gray-600">
                      ¡Crea tus primeros flashplans para planes rápidos e
                      inmediatos!
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal edición */}
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
      </div>
    </div>
  );
}

export default Perfil;
