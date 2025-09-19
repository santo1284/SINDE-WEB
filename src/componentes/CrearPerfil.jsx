// src/componentes/CrearPerfil.jsx
import React, { useState, useRef } from "react";
import { db, storage } from "../firebase/firebase-config";
import { doc, setDoc } from "firebase/firestore"; // Removido serverTimestamp
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Plus, User, Phone, MapPin, Calendar } from "lucide-react";

const CrearPerfil = ({ user, onPerfilCreado }) => {
  const [nombre, setNombre] = useState(user?.displayName || "");
  const [celular, setCelular] = useState("");
  const [ciudad, setCiudad] = useState("seleccionar ciudad"); // Valor por defecto igual que móvil
  const [edad, setEdad] = useState("");
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  // Estados para términos y condiciones (igual que móvil)
  const [terminosAceptados, setTerminosAceptados] = useState(false);
  const [mostrarTerminos, setMostrarTerminos] = useState(false);

  // Lista de ciudades (igual que en móvil)
  const ciudades = ["Garzon", "Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena"];

  const fileInputRef = useRef();

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  // Mostrar mensaje temporal
  React.useEffect(() => {
    if (mensaje) {
      const timer = setTimeout(() => setMensaje(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [mensaje]);

  const handleGuardarPerfil = async (e) => {
    e.preventDefault();
    if (!user) return;

    // Validaciones exactas como en móvil
    if (!terminosAceptados) {
      setMensaje("Debes aceptar los términos y condiciones");
      return;
    }

    if (!foto) {
      setMensaje("Por favor selecciona una imagen");
      return;
    }

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
      // Subir foto a Firebase Storage
      const storageRef = ref(storage, `profile_pictures/${user.uid}`);
      await uploadBytes(storageRef, foto);

      // Estructura de datos EXACTAMENTE como en móvil
      const perfilData = {
        nombre: nombre.trim(),
        celular: celular.trim(),
        edad: parseInt(edad),
        ciudad: ciudad,
        terminosAceptados: terminosAceptados,
        fechaAceptacionTerminos: new Date().toISOString(), // Equivalente a FieldValue.serverTimestamp()
        email: user.email // Campo adicional para consistencia
      };

      // Guardar en Firestore
      await setDoc(doc(db, "perfil", user.uid), perfilData);

      setMensaje("¡Perfil guardado exitosamente!");
      
      // Llamar callback después de un breve delay para mostrar el mensaje
      setTimeout(() => {
        if (onPerfilCreado) onPerfilCreado();
      }, 1500);

    } catch (error) {
      console.error("Error guardando perfil:", error);
      setMensaje("Error al guardar el perfil");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-pink-900 p-6">
      <form
        onSubmit={handleGuardarPerfil}
        className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full max-w-lg relative"
      >
        {/* Título */}
        <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Crear Perfil
        </h2>

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
              {ciudades.map(ciudad => (
                <option key={ciudad} value={ciudad}>{ciudad}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Términos y condiciones */}
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="terminos"
              checked={terminosAceptados}
              onChange={(e) => setTerminosAceptados(e.target.checked)}
              className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              required
            />
            <div className="flex-1">
              <label htmlFor="terminos" className="text-sm text-gray-700 font-medium">
                Acepto los términos y condiciones
              </label>
              <button
                type="button"
                onClick={() => setMostrarTerminos(true)}
                className="block text-xs text-purple-600 font-semibold hover:underline mt-1"
              >
                Leer términos completos
              </button>
            </div>
          </div>
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div className={`mb-6 p-4 rounded-xl text-center text-sm font-medium ${
            mensaje.includes('Error') || mensaje.includes('Debes') || mensaje.includes('Por favor')
              ? 'bg-red-100 text-red-700 border border-red-200'
              : 'bg-green-100 text-green-700 border border-green-200'
          }`}>
            {mensaje}
          </div>
        )}

        {/* Botón principal */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Guardando...
            </div>
          ) : (
            "¡COMENZAR AVENTURA!"
          )}
        </button>
      </form>

      {/* Modal de Términos */}
      {mostrarTerminos && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Términos y Condiciones</h3>
                <button
                  onClick={() => setMostrarTerminos(false)}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Contenido del modal */}
            <div className="p-6 overflow-y-auto max-h-96">
              <div className="prose prose-sm text-gray-700">
                <p className="mb-4 font-semibold">
                  Al utilizar la aplicación Sindesparches, usted acepta que:
                </p>
                
                <ol className="list-decimal list-inside space-y-3">
                  <li>
                    <strong>Sindesparches no se hace responsable</strong> de la veracidad, exactitud o legitimidad de los planes publicados en la plataforma.
                  </li>
                  <li>
                    <strong>Sindesparches actúa únicamente como intermediario</strong> entre usuarios y no garantiza que los eventos o planes se lleven a cabo según lo anunciado.
                  </li>
                  <li>
                    <strong>Sindesparches queda eximido de toda responsabilidad legal</strong> por cualquier consecuencia derivada de la participación en actividades organizadas a través de la plataforma.
                  </li>
                  <li>
                    <strong>Los usuarios asumen toda la responsabilidad</strong> al participar en los planes publicados.
                  </li>
                  <li>
                    <strong>La información proporcionada será almacenada</strong> en nuestra base de datos conforme a nuestra política de privacidad.
                  </li>
                </ol>
              </div>
            </div>

            {/* Footer del modal */}
            <div className="p-6 bg-gray-50 border-t">
              <button
                onClick={() => setMostrarTerminos(false)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-all duration-300"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrearPerfil;