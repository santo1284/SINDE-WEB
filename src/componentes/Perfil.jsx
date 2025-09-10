// src/componentes/Perfil.jsx
import React, { useState, useEffect } from "react";
import { db, storage } from "../firebase/firebase-config";
import { doc, getDoc } from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import { ArrowLeft } from "lucide-react";

const Perfil = ({ user, onBack }) => {
  const [perfilData, setPerfilData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchPerfilYImagen = async () => {
      if (!user) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        // 1) Leer documento de Firestore (datos básicos del perfil)
        const perfilRef = doc(db, "perfil", user.uid);
        const perfilSnap = await getDoc(perfilRef);

        if (perfilSnap.exists()) {
          const data = perfilSnap.data();
          if (mounted) setPerfilData(data);
        } else {
          if (mounted) setPerfilData(null);
        }

        // 2) Obtener foto desde Storage
        try {
          const storageRef = ref(storage, `profile_pictures/${user.uid}`);
          const url = await getDownloadURL(storageRef);
          if (mounted) setImageUrl(url);
        } catch (storageErr) {
          console.log(
            "⚠️ No hay imagen en Storage:",
            storageErr?.code || storageErr?.message || storageErr
          );
          if (mounted) setImageUrl(null);
        }
      } catch (err) {
        console.error("Error cargando perfil:", err);
        if (mounted) setPerfilData(null);
      } finally {
        if (mounted) {
          setLoading(false);
          setImageLoading(false);
        }
      }
    };

    fetchPerfilYImagen();

    return () => {
      mounted = false;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <p>Cargando perfil...</p>
      </div>
    );
  }

  if (!perfilData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-6">
        <button
          onClick={onBack}
          className="mb-6 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
        >
          <ArrowLeft className="inline w-5 h-5 mr-2" />
          Volver
        </button>
        <h2 className="text-2xl font-bold mb-4">Perfil no encontrado</h2>
        <p>Parece que aún no has creado tu perfil.</p>
      </div>
    );
  }

  const mostrarInicial = () =>
    (perfilData.nombre?.charAt(0) ||
      user?.displayName?.charAt(0) ||
      user?.email?.charAt(0) ||
      "U").toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={onBack}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h2 className="text-2xl font-bold">Mi Perfil</h2>
      </div>

      {/* Imagen de perfil */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100 flex items-center justify-center">
          {imageLoading ? (
            <div className="animate-pulse text-gray-300">...</div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt="Perfil"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white">
              {mostrarInicial()}
            </div>
          )}
        </div>
      </div>

      {/* Datos del usuario */}
      <div className="max-w-md mx-auto space-y-6 bg-white/10 p-6 rounded-2xl shadow-lg">
        <div>
          <p className="text-sm text-gray-300">Nombre</p>
          <p className="text-lg font-semibold">{perfilData.nombre || "-"}</p>
        </div>
        <div>
          <p className="text-sm text-gray-300">Ciudad</p>
          <p className="text-lg font-semibold">{perfilData.ciudad || "-"}</p>
        </div>
        <div>
          <p className="text-sm text-gray-300">Edad</p>
          <p className="text-lg font-semibold">{perfilData.edad ?? "-"}</p>
        </div>
        <div>
          <p className="text-sm text-gray-300">Correo</p>
          <p className="text-lg font-semibold">
            {perfilData.email || user?.email || "-"}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-300">Celular</p>
          <p className="text-lg font-semibold">{perfilData.celular || "-"}</p>
        </div>
      </div>
    </div>
  );
};

export default Perfil;
