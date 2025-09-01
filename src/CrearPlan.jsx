// src/CrearPlan.jsx
import React, { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "./firebase-config";

export default function CrearPlan({ onClose }) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState("");
  const [imagen, setImagen] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCrearPlan = async (e) => {
    e.preventDefault();
    if (!titulo.trim() || !descripcion.trim()) {
      alert("Por favor llena título y descripción");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "planes"), {
        titulo,
        descripcion,
        fecha,        // string YYYY-MM-DD
        imagen,       // URL opcional
        creadoPor: auth.currentUser ? auth.currentUser.uid : null,
        creadorNombre: auth.currentUser?.displayName || "Anónimo",
        creadoEn: serverTimestamp(),
        likes: [],
        participantes: [],
      });
      alert("✅ Plan creado con éxito");
      if (onClose) onClose();
    } catch (err) {
      console.error(err);
      alert("❌ No se pudo crear el plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg">
        <h2 className="text-xl font-bold mb-4">Crear Nuevo Plan</h2>
        <form onSubmit={handleCrearPlan} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Título"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="border p-2 rounded"
          />
          <textarea
            placeholder="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="border p-2 rounded"
          />
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="border p-2 rounded"
          />
          <input
            type="text"
            placeholder="URL de imagen (opcional)"
            value={imagen}
            onChange={(e) => setImagen(e.target.value)}
            className="border p-2 rounded"
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700"
            >
              {loading ? "Creando..." : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
