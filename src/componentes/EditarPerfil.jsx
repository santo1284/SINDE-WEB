// EditarPerfilModal.jsx
import React, { useState } from "react";
import { auth, storage } from "../firebase/firebase-config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { X, Plus } from "lucide-react";

const EditarPerfilModal = ({ isOpen, onClose, userData, onSave }) => {
  const [nombre, setNombre] = useState(userData?.nombre || "");
  const [celular, setCelular] = useState(userData?.celular || "");
  const [edad, setEdad] = useState(userData?.edad || "");
  const [ciudad, setCiudad] = useState(userData?.ciudad || "");
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(userData?.fotoURL || null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Manejar cambio de foto
  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  // Guardar cambios
  const handleSave = async () => {
    try {
      setLoading(true);
      let fotoURL = userData?.fotoURL || "";

      if (foto) {
        const user = auth.currentUser;
        const storageRef = ref(storage, `profile_pictures/${user.uid}`);
        await uploadBytes(storageRef, foto);
        fotoURL = await getDownloadURL(storageRef);
      }

      const newData = {
        nombre,
        celular,
        edad,
        ciudad,
        fotoURL,
      };

      await onSave(newData); // se guarda en Firestore desde Perfil.jsx
      setLoading(false);
      onClose();
    } catch (error) {
      console.error("Error al guardar cambios:", error);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-96 relative shadow-lg">
        {/* Cerrar */}
        <button
          className="absolute top-3 right-3 bg-gray-200 p-2 rounded-full hover:bg-gray-300"
          onClick={onClose}
        >
          <X size={18} />
        </button>

        <h2 className="text-center text-xl font-bold mb-4">Editar Perfil</h2>

        {/* Foto */}
        <div className="flex flex-col items-center mb-4">
          <div className="relative">
            <img
              src={preview || "https://via.placeholder.com/100"}
              alt="foto perfil"
              className="w-24 h-24 rounded-full border-2 border-indigo-500 object-cover"
            />
            <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full cursor-pointer">
              <Plus size={14} />
              <input
                type="file"
                className="hidden"
                onChange={handleFotoChange}
              />
            </label>
          </div>
          <p className="text-sm text-gray-500 mt-1">Cambiar foto</p>
        </div>

        {/* Inputs */}
        <input
          type="text"
          placeholder="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-3"
        />
        <input
          type="text"
          placeholder="Celular"
          value={celular}
          onChange={(e) => setCelular(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-3"
        />
        <input
          type="number"
          placeholder="Edad"
          value={edad}
          onChange={(e) => setEdad(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-3"
        />
        <input
          type="text"
          placeholder="Ciudad"
          value={ciudad}
          onChange={(e) => setCiudad(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-3"
        />

        {/* Botón guardar */}
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded-lg mt-4 hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Guardar Cambios"}
        </button>
      </div>
    </div>
  );
};

export default EditarPerfilModal;
