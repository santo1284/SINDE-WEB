// src/componentes/Perfil.jsx
import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase/firebase-config.js"; // ✅ ruta corregida
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const Perfil = ({ onBack }) => {
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "perfil", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUsuario({ id: user.uid, ...docSnap.data() });
          }
        } catch (error) {
          console.error("Error al obtener perfil:", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  if (!usuario) {
    return (
      <div className="flex justify-center items-center min-h-screen text-white">
        Cargando perfil...
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center p-6 bg-gray-900 min-h-screen text-white">

      {/* Foto de perfil */}
      <div className="relative mt-12">
        <img
          src={usuario.fotoURL || "https://via.placeholder.com/150"}
          alt="Foto de perfil"
          className="w-32 h-32 rounded-full object-cover border-4 border-pink-500"
        />
        <button className="absolute bottom-0 right-0 bg-pink-500 p-2 rounded-full shadow-lg hover:bg-pink-600">
          ✏️
        </button>
      </div>

      {/* Info de usuario */}
      <div className="mt-4 text-center">
        <h2 className="text-2xl font-bold">{usuario.nombre || "Sin nombre"}</h2>
        <p>📱 {usuario.celular || "Sin celular"}</p>
        <p>🎂 {usuario.edad || "Edad no registrada"}</p>
        <p>🏙️ {usuario.ciudad || "Ciudad no registrada"}</p>
      <p className="mt-2 text-gray-400 text-sm">
        Miembro desde:{" "}
        {usuario.fechaUnion
          ? new Date(usuario.fechaUnion.seconds * 1000).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "Fecha no disponible"}
      </p>
      </div>

      {/* Secciones futuras */}
      <div className="grid grid-cols-3 gap-4 mt-6 w-full max-w-md">
        <div className="bg-gray-800 p-4 rounded-xl text-center">
          <h3 className="font-semibold">Me gusta</h3>
          <p className="text-gray-400 text-sm">Próximamente</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl text-center">
          <h3 className="font-semibold">Eventos</h3>
          <p className="text-gray-400 text-sm">Próximamente</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl text-center">
          <h3 className="font-semibold">FlashPlans</h3>
          <p className="text-gray-400 text-sm">Próximamente</p>
        </div>
      </div>
    </div>
  );
};

export default Perfil;
