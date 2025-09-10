// src/componentes/CrearCuenta.jsx
import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { auth, db } from "../firebase/firebase-config.js";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";

function CrearCuenta({ onCrearCuentaSuccess, onShowLogin }) {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [terminos, setTerminos] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleCrearCuenta = async (e) => {
    e.preventDefault();
    setError(null);

    if (!terminos) {
      setError("Debes aceptar los términos y condiciones.");
      return;
    }

    setLoading(true);
    try {
      // 🔹 Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        correo,
        password
      );
      const user = userCredential.user;

      // 🔹 Guardar nombre en Firebase Auth (opcional)
      await updateProfile(user, { displayName: nombre });

      // 🔹 Guardar datos mínimos en Firestore
      await setDoc(doc(db, "perfil", user.uid), {
        uid: user.uid,
        correo,
        nombre: nombre || "",
        aceptoTerminos: true,
        fechaUnion: serverTimestamp(),
      });

      // 🔹 Enviar correo de verificación
      await sendEmailVerification(user);

      if (onCrearCuentaSuccess) onCrearCuentaSuccess();

    } catch (err) {
      console.error("Error creando cuenta:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("Este correo ya tiene una cuenta registrada.");
      } else {
        setError("Hubo un problema al crear la cuenta: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6">
      <form
        onSubmit={handleCrearCuenta}
        className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md"
      >
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Crear cuenta
        </h2>

        <input
          type="text"
          placeholder="Nombre completo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          className="w-full border rounded-lg px-3 py-2 mt-1"
        />
        <input
          type="email"
          placeholder="Correo electrónico"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          required
          className="w-full border rounded-lg px-3 py-2 mt-4"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border rounded-lg px-3 py-2 mt-4"
        />

        {/* ✅ Checkbox con link al modal */}
        <label className="flex items-center text-gray-700 text-sm space-x-2 mt-4">
          <input
            type="checkbox"
            checked={terminos}
            onChange={(e) => setTerminos(e.target.checked)}
            className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
          />
          <span>
            Acepto los{" "}
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="text-indigo-600 hover:underline"
            >
              términos y condiciones
            </button>
          </span>
        </label>

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition mt-6"
        >
          {loading ? "Creando..." : "Crear cuenta"}
        </button>

        <p className="mt-4 text-center text-sm text-gray-600">
          ¿Ya tienes cuenta?{" "}
          <button
            onClick={onShowLogin}
            className="text-indigo-600 hover:underline"
          >
            Inicia sesión
          </button>
        </p>
      </form>

      {/* ✅ Modal de términos */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-gray-600 hover:text-black"
            >
              ✖
            </button>

            <h2 className="text-xl font-bold mb-4 text-center text-gray-800">
              Términos y Condiciones
            </h2>

            <div className="text-gray-700 text-sm max-h-80 overflow-y-auto">
              <ul className="list-disc pl-5 space-y-2">
                <li>Sindesparches no se hace responsable de la veracidad o legitimidad de los planes publicados.</li>
                <li>Actúa como intermediario y no garantiza que los eventos se realicen según lo anunciado.</li>
                <li>Exime toda responsabilidad legal por consecuencias derivadas de actividades organizadas.</li>
                <li>Los usuarios asumen la responsabilidad al participar en los planes.</li>
                <li>La información se almacenará conforme a la política de privacidad.</li>
              </ul>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CrearCuenta;
