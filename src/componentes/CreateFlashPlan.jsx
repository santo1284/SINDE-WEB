import React, { useState } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/firebase-config'; // Agregar storage aquí
import { useAuth } from '../context/AuthContext';

const CreateFlashPlan = ({ onClose, onSuccess }) => {
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !image) {
      alert('Debes agregar texto o una imagen');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = null;

      // Subir imagen si existe
      if (image) {
        const imageRef = ref(storage, `flashPlans/${currentUser.uid}/${Date.now()}_${image.name}`);
        const snapshot = await uploadBytes(imageRef, image);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      // Crear el Flash Plan usando la estructura de tu app móvil
      const flashPlanData = {
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email || '',
        userPhoto: currentUser.photoURL || '',
        content: content.trim(),
        imageUrl: imageUrl, // Usar imageUrl en lugar de image
        timestamp: Timestamp.now(), // Usar timestamp en lugar de createdAt
        viewers: []
      };

      await addDoc(collection(db, 'flashPlans'), flashPlanData);
      
      onSuccess();
    } catch (error) {
      console.error('Error creating flash plan:', error);
      alert('Error al crear el Flash Plan. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Crear Flash Plan</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-2xl"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4">
          {/* Preview de imagen */}
          {imagePreview && (
            <div className="mb-4 relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-48 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => {
                  setImage(null);
                  setImagePreview(null);
                }}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
              >
                ×
              </button>
            </div>
          )}

          {/* Textarea para contenido */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="¿Qué plan tienes para hoy? Comparte tu aventura flash..."
            className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={loading}
          />

          {/* Botones de acción */}
          <div className="flex items-center gap-3 mt-4">
            <label className="flex items-center gap-2 cursor-pointer text-purple-600 hover:text-purple-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Imagen
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                disabled={loading}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || (!content.trim() && !image)}
            className="w-full mt-6 bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Publicando...' : 'Publicar Flash Plan'}
          </button>
        </form>

        <div className="px-4 pb-4">
          <p className="text-xs text-gray-500 text-center">
            Tu Flash Plan estará disponible por 24 horas
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreateFlashPlan;