// src/componentes/CrearPerfil.jsx
import React, { useState, useRef } from "react";
import { db, storage } from "../firebase/firebase-config";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Plus } from "lucide-react"; // icono +

const CrearPerfil = ({ user, onPerfilCreado }) => {
  const [nombre, setNombre] = useState(user?.displayName || "");
  const [celular, setCelular] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [edad, setEdad] = useState("");
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔹 Estados para términos y condiciones
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fileInputRef = useRef();

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleGuardarPerfil = async (e) => {
    e.preventDefault();
    if (!user) return;

    if (!aceptaTerminos) {
      alert("Debes aceptar los Términos y Condiciones antes de continuar.");
      return;
    }

    setLoading(true);
    try {
      let fotoURL = "";

      if (foto) {
        const storageRef = ref(storage, `profile_pictures/${user.uid}`);
        await uploadBytes(storageRef, foto);
        fotoURL = await getDownloadURL(storageRef);
      }

      await setDoc(doc(db, "perfil", user.uid), {
        nombre,
        celular,
        ciudad,
        edad: Number(edad),
        email: user.email,
        fotoURL,
        aceptaTerminos: true,
        timestamp: serverTimestamp(),
      });

      onPerfilCreado();
    } catch (error) {
      console.error("Error guardando perfil:", error);
      alert("Hubo un error al guardar el perfil");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6">
      <form
        onSubmit={handleGuardarPerfil}
        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative"
      >
  
        {/* Título */}
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Crear Perfil
        </h2>

        {/* Foto de perfil */}
        <div className="mb-6 flex justify-center">
          <div
            className="w-28 h-28 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer relative overflow-hidden shadow-md hover:shadow-lg hover:bg-gray-200 transition"
            onClick={() => fileInputRef.current.click()}
          >
            {preview ? (
              <img
                src={preview}
                alt="Foto de perfil"
                className="w-full h-full object-cover"
              />
            ) : (
              <Plus size={36} className="text-gray-500" />
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
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700">
            Nombre
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full border border-gray-800 rounded-lg px-4 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
            required
          />
        </div>

        {/* Celular */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700">
            Celular
          </label>
          <input
            type="text"
            value={celular}
            onChange={(e) => setCelular(e.target.value)}
            maxLength={10}
            className="w-full border border-gray-900 rounded-lg px-4 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
            required
          />
        </div>

        {/* Ciudad */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700">
            Ciudad
          </label>
          <input
            type="text"
            value={ciudad}
            onChange={(e) => setCiudad(e.target.value)}
            className="w-full border border-gray-900 rounded-lg px-4 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
            required
          />
        </div>

        {/* Edad */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700">
            Edad
          </label>
          <input
            type="number"
            value={edad}
            onChange={(e) => setEdad(e.target.value)}
            min={15}
            max={99}
            className="w-full border border-gray-900 rounded-lg px-4 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
            required
          />
        </div>

        {/* Checkbox Términos */}
        <div className="mb-4 flex items-center text-sm">
          <input
            type="checkbox"
            checked={aceptaTerminos}
            onChange={(e) => setAceptaTerminos(e.target.checked)}
            className="mr-2 rounded text-purple-600 focus:ring-purple-500"
            required
          />
          <span className="text-gray-700">
            Acepto los{" "}
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="text-purple-600 font-semibold hover:underline"
            >
              Términos y Condiciones
            </button>
          </span>
        </div>

        {/* Botón principal */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-2 rounded-lg shadow-md hover:opacity-90 transition"
        >
          {loading ? "Guardando..." : "Guardar Perfil"}
        </button>
      </form>

      {/* Modal de Términos */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 px-4">
          <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-6 relative">
            {/* Botón cerrar */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-gray-600 hover:text-black text-lg"
            >
              ✖
            </button>

            <h3 className="text-lg font-bold mb-4 text-purple-600">
              Términos y Condiciones
            </h3>
            <ul className="text-gray-700 text-sm list-disc pl-5 space-y-2">
              <li>
                Sindesparches no se hace responsable de la veracidad de los
                planes publicados.
              </li>
              <li>
                Actuamos solo como intermediarios, no garantizamos la ejecución
                de los eventos.
              </li>
              <li>
                Eximidos de responsabilidad legal por consecuencias derivadas de
                la participación.
              </li>
              <li>
                Los usuarios asumen toda la responsabilidad en los planes.
              </li>
              <li>
                La información será almacenada conforme a la política de
                privacidad.
              </li>
            </ul>

            <button
              onClick={() => setShowModal(false)}
              className="mt-6 w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrearPerfil;