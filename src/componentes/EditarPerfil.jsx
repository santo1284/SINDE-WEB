import React, { useState, useRef, useEffect } from "react";
import { auth, storage } from "../firebase/firebase-config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { X, Plus, User, Phone, MapPin, Calendar } from "lucide-react";
const EditarPerfilModal = ({ isOpen, onClose, userData, onSave }) => {
const [nombre, setNombre] = useState(userData?.nombre || "");
const [celular, setCelular] = useState(userData?.celular || "");
const [edad, setEdad] = useState(userData?.edad || "");
const [ciudad, setCiudad] = useState(userData?.ciudad || "seleccionar ciudad");
const [foto, setFoto] = useState(null);
const [preview, setPreview] = useState(userData?.fotoURL || null);
const [loading, setLoading] = useState(false);
const [mensaje, setMensaje] = useState("");
// Lista de ciudades (igual que en CrearPerfil)
const ciudades = ["Garzon", "Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena"];
const fileInputRef = useRef();
// Actualizar estados cuando userData cambie
useEffect(() => {
if (userData) {
setNombre(userData.nombre || "");
setCelular(userData.celular || "");
setEdad(userData.edad || "");
setCiudad(userData.ciudad || "seleccionar ciudad");
setPreview(userData.fotoURL || null);
}
}, [userData]);
// Mostrar mensaje temporal
useEffect(() => {
if (mensaje) {
const timer = setTimeout(() => setMensaje(''), 5000);
return () => clearTimeout(timer);
}
}, [mensaje]);
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
const handleSave = async (e) => {
e.preventDefault();
// Validaciones (mismas que en CrearPerfil)
if (!nombre.trim()) {
  setMensaje("Por favor ingresa un nombre");
  return;
}

if (!celular.trim()) {
  setMensaje("Por favor ingresa un número de celular");
  return;
}

if (celular.length !== 10) {
  setMensaje("Por favor ingresa un número de celular válido");
  return;
}

if (!edad || edad < 15 || edad > 60) {
  setMensaje("Por favor selecciona una edad válida");
  return;
}

if (ciudad === "seleccionar ciudad") {
  setMensaje("Por favor selecciona una ciudad");
  return;
}

setLoading(true);
setMensaje("");

try {
  let fotoURL = userData?.fotoURL || "";

  // Subir nueva foto si se seleccionó una
  if (foto) {
    const user = auth.currentUser;
    const storageRef = ref(storage, `profile_pictures/${user.uid}`);
    await uploadBytes(storageRef, foto);
    fotoURL = await getDownloadURL(storageRef);
  }

  const newData = {
    nombre: nombre.trim(),
    celular: celular.trim(),
    edad: parseInt(edad),
    ciudad: ciudad,
    fotoURL,
    // Mantener campos existentes
    terminosAceptados: userData?.terminosAceptados || false,
    fechaAceptacionTerminos: userData?.fechaAceptacionTerminos || null,
    email: userData?.email || auth.currentUser?.email,
    fechaActualizacion: new Date().toISOString()
  };

  await onSave(newData);
  setMensaje("¡Perfil actualizado exitosamente!");
  
  // Cerrar modal después de un breve delay
  setTimeout(() => {
    onClose();
    setMensaje("");
  }, 1500);

} catch (error) {
  console.error("Error al guardar cambios:", error);
  setMensaje("Error al actualizar el perfil");
} finally {
  setLoading(false);
}
};
return (
<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
<div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
    {/* Botón cerrar */}
    <button
      onClick={onClose}
      className="absolute top-4 right-4 bg-gray-200 hover:bg-gray-300 p-2 rounded-full transition-all duration-300 z-10"
    >
      <X className="w-5 h-5 text-gray-600" />
    </button>

    {/* Título */}
    <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
      Editar Perfil
    </h2>

    <form onSubmit={handleSave}>
      {/* Foto de perfil */}
      <div className="mb-8 flex justify-center">
        <div
          className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center cursor-pointer relative overflow-hidden shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
          onClick={() => fileInputRef.current.click()}
        >
          {preview ? (
            <img
              src={preview}
              alt="Foto de perfil"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center">
              <Plus size={48} className="text-purple-500 mx-auto mb-2" />
              <p className="text-xs text-gray-600 font-medium">Añadir foto</p>
            </div>
          )}
          
          {/* Overlay de editar */}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
            <div className="text-center">
              <Plus size={24} className="text-white mx-auto mb-1" />
              <p className="text-xs text-white font-medium">Cambiar</p>
            </div>
          </div>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleFotoChange}
        />
      </div>

      {/* Nombre */}
      <div className="mb-6">
        <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
          <User className="w-4 h-4 mr-2 text-purple-600" />
          Nombre
        </label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Tu nombre completo"
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 mt-1 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300"
          required
        />
      </div>

      {/* Celular */}
      <div className="mb-6">
        <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
          <Phone className="w-4 h-4 mr-2 text-purple-600" />
          Celular
        </label>
        <input
          type="tel"
          value={celular}
          onChange={(e) => setCelular(e.target.value)}
          placeholder="Número de celular (10 dígitos)"
          maxLength={10}
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 mt-1 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300"
          required
        />
      </div>

      {/* Edad y Ciudad en una fila */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Edad */}
        <div>
          <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
            <Calendar className="w-4 h-4 mr-2 text-purple-600" />
            Edad
          </label>
          <select
            value={edad}
            onChange={(e) => setEdad(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300"
            required
          >
            <option value="">Edad</option>
            {Array.from({ length: 46 }, (_, i) => i + 15).map(age => (
              <option key={age} value={age}>{age}</option>
            ))}
          </select>
        </div>

        {/* Ciudad */}
        <div>
          <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
            <MapPin className="w-4 h-4 mr-2 text-purple-600" />
            Ciudad
          </label>
          <select
            value={ciudad}
            onChange={(e) => setCiudad(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300"
            required
          >
            <option value="seleccionar ciudad">Ciudad</option>
            {ciudades.map(ciudadOption => (
              <option key={ciudadOption} value={ciudadOption}>{ciudadOption}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mensaje */}
      {mensaje && (
        <div className={`mb-6 p-4 rounded-xl text-center text-sm font-medium transition-all duration-300 ${
          mensaje.includes('Error') || mensaje.includes('Debes') || mensaje.includes('Por favor')
            ? 'bg-red-100 text-red-700 border border-red-200'
            : 'bg-green-100 text-green-700 border border-green-200'
        }`}>
          {mensaje}
        </div>
      )}

      {/* Botones */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-gray-200 text-gray-700 font-bold py-4 rounded-xl hover:bg-gray-300 transition-all duration-300"
        >
          Cancelar
        </button>
        
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Guardando...
            </div>
          ) : (
            "Actualizar Perfil"
          )}
        </button>
      </div>
    </form>
  </div>
</div>
);
};
export default EditarPerfilModal;
