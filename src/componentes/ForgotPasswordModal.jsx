// ForgotPasswordModal.jsx
import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase-config"; // tu configuración de Firebase

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleResetPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("📧 Se ha enviado un enlace de restablecimiento a tu correo.");
    } catch (error) {
      setMessage("❌ Error: " + error.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-96">
        <h2 className="text-xl font-bold mb-4 text-center">Restablecer contraseña</h2>
        
        <input
          type="email"
          placeholder="Ingresa tu correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-2 rounded mb-3"
        />
        
        <button
          onClick={handleResetPassword}
          className="w-full bg-pink-500 text-white p-2 rounded hover:bg-pink-600"
        >
          Enviar enlace
        </button>

        {message && <p className="text-sm text-gray-700 mt-3">{message}</p>}

        <button
          onClick={onClose}
          className="mt-4 w-full border p-2 rounded hover:bg-gray-100"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default ForgotPasswordModal; 