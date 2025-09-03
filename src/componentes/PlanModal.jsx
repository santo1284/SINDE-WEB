import React, { useState } from 'react';
import { X, MapPin, Camera, Clock, Calendar, MessageCircle } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { v4 as uuidv4 } from "uuid"; // npm i uuid
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const PlanModal = ({ isOpen, onClose, onPlanCreated }) => {
  const [nuevoPlan, setNuevoPlan] = useState({
    title: '',
    description: '',
    date: '',
    timeString: '',
    location: '',
    latitude: null,
    longitude: null,
    locationAddress: '',
    city: '',
    state: '',
    enableWhatsapp: false,
    phoneNumber: ''
  });

  // Archivos e imágenes para preview (local, no subidas aún)
  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  const [errores, setErrores] = useState({});
  const [creandoPlan, setCreandoPlan] = useState(false);

  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();

  // --- Compresión de imagen (Canvas) ---
  const compressImage = (file, maxWidth = 800, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  // --- SUBIR imágenes al mismo path que la app móvil ---
  const uploadImagesToFirebase = async (files, userId, planId) => {
    if (!files || files.length === 0) return [];
    const urls = [];
    for (let i = 0; i < Math.min(files.length, 5); i++) {
      const file = files[i];
      const compressedBlob = await compressImage(file);
      const imageName = `${uuidv4()}.jpg`;
      const storageRef = ref(storage, `planes/${userId}/${planId}/${imageName}`);
      const snapshot = await uploadBytes(storageRef, compressedBlob);
      const url = await getDownloadURL(snapshot.ref);
      urls.push(url);
    }
    return urls;
  };

  // --- Manejar selección de imágenes (solo guarda archivos y previews) ---
  const manejarImagenes = (filesList) => {
    if (!filesList || filesList.length === 0) return;

    const files = Array.from(filesList);
    const espacioRestante = 5 - imageFiles.length;
    if (espacioRestante <= 0) {
      setErrores(prev => ({ ...prev, imagenes: 'Máximo 5 imágenes permitidas' }));
      return;
    }

    const toAdd = files.slice(0, espacioRestante);
    const newPreviews = toAdd.map(f => URL.createObjectURL(f));

    setImageFiles(prev => [...prev, ...toAdd]);
    setPreviewUrls(prev => [...prev, ...newPreviews]);
    setErrores(prev => ({ ...prev, imagenes: undefined }));
  };

  // --- Eliminar imagen seleccionada (archivo + preview) ---
  const eliminarImagen = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      // Liberar URL para evitar memory leaks
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // --- Obtener ubicación actual ---
  const obtenerUbicacionActual = () => {
    if (!navigator.geolocation) {
      alert('La geolocalización no está soportada en este navegador');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await fetch(
            `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=YOUR_API_KEY`
          );
          const data = await response.json();

          if (data.results && data.results.length > 0) {
            const result = data.results[0];
            setNuevoPlan(prev => ({
              ...prev,
              latitude,
              longitude,
              location: result.formatted || `${latitude}, ${longitude}`,
              locationAddress: result.formatted,
              city: result.components.city || result.components.town || '',
              state: result.components.state || ''
            }));
          }
        } catch (error) {
          console.error('Error obteniendo dirección:', error);
          setNuevoPlan(prev => ({
            ...prev,
            latitude,
            longitude,
            location: `${latitude}, ${longitude}`
          }));
        }
      },
      (error) => {
        console.error('Error obteniendo ubicación:', error);
        alert('Error al obtener la ubicación');
      }
    );
  };

  // --- Validación ---
  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!nuevoPlan.title.trim()) nuevosErrores.title = 'El título es obligatorio';
    if (!nuevoPlan.description.trim()) nuevosErrores.description = 'La descripción es obligatoria';

    if (!nuevoPlan.date) {
      nuevosErrores.date = 'La fecha es obligatoria';
    } else {
      const fechaSeleccionada = new Date(nuevoPlan.date);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      if (fechaSeleccionada < hoy) {
        nuevosErrores.date = 'La fecha no puede ser anterior a hoy';
      }
    }

    if (!nuevoPlan.timeString) nuevosErrores.time = 'La hora es obligatoria';
    if (!nuevoPlan.location.trim()) nuevosErrores.location = 'La ubicación es obligatoria';

    if (nuevoPlan.enableWhatsapp && !nuevoPlan.phoneNumber.trim()) {
      nuevosErrores.phoneNumber = 'El número de WhatsApp es obligatorio';
    }

    if (imageFiles.length === 0) {
      nuevosErrores.imagenes = 'Debes seleccionar al menos una imagen';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  // --- CREAR PLAN (mismo flujo que móvil) ---
  const crearPlan = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;
    setCreandoPlan(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Usuario no autenticado");

      // 1) Generar ID igual que en móvil
      const planId = uuidv4();

      // 2) Subir imágenes primero
      const imageUrls = await uploadImagesToFirebase(imageFiles, user.uid, planId);

      // 3) Construir objeto plan (milisegundos como en Kotlin)
      const dateMs = new Date(`${nuevoPlan.date}T${nuevoPlan.timeString}`).getTime();
      const planData = {
        id: planId,               // igual que en Kotlin
        userId: user.uid,
        createdAt: Date.now(),    // System.currentTimeMillis()
        title: nuevoPlan.title.trim(),
        description: nuevoPlan.description.trim(),
        date: dateMs || 0,
        timeString: nuevoPlan.timeString,
        location: nuevoPlan.location.trim(),
        latitude: nuevoPlan.latitude,
        longitude: nuevoPlan.longitude,
        locationAddress: nuevoPlan.locationAddress || null,
        city: nuevoPlan.city || null,
        state: nuevoPlan.state || null,
        imageUrls,
        enableWhatsapp: !!nuevoPlan.enableWhatsapp,
        phoneNumber: nuevoPlan.enableWhatsapp ? (nuevoPlan.phoneNumber || '').trim() : '',
        likes: [],
        participants: [],
        commentCount: 0,
        shares: 0
      };

      // 4) Guardar con MISMO ID que móvil
      await setDoc(doc(db, 'planes', planId), planData);

      // 5) Notificar y limpiar
      if (onPlanCreated) onPlanCreated({ id: planId, ...planData });
      // Revocar previews
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      setImageFiles([]);
      setNuevoPlan({
        title: '',
        description: '',
        date: '',
        timeString: '',
        location: '',
        latitude: null,
        longitude: null,
        locationAddress: '',
        city: '',
        state: '',
        enableWhatsapp: false,
        phoneNumber: ''
      });
      setErrores({});
      onClose();

    } catch (error) {
      console.error("❌ Error al crear plan:", error);
      setErrores({ general: "Error al crear el plan: " + (error?.message || 'desconocido') });
    } finally {
      setCreandoPlan(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-y-auto max-h-[90vh]">

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-pink-500 to-purple-600">
          <h2 className="text-xl font-bold text-white">Crear Plan Increíble</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={crearPlan} className="p-6 space-y-4">

          {errores.general && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg">
              {errores.general}
            </div>
          )}

          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título del plan *</label>
            <input
              type="text"
              placeholder="¿Qué plan tienes en mente?"
              value={nuevoPlan.title}
              onChange={(e) => setNuevoPlan({ ...nuevoPlan, title: e.target.value })}
              className={`w-full p-3 border rounded-lg transition-colors ${errores.title ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-purple-500'}`}
              maxLength={100}
              required
            />
            {errores.title && <p className="text-red-500 text-sm mt-1">{errores.title}</p>}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
            <textarea
              placeholder="Cuéntanos más detalles sobre tu plan..."
              value={nuevoPlan.description}
              onChange={(e) => setNuevoPlan({ ...nuevoPlan, description: e.target.value })}
              className={`w-full p-3 border rounded-lg transition-colors ${errores.description ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-purple-500'}`}
              rows="4"
              maxLength={500}
              required
            />
            <div className="text-xs text-gray-500 mt-1">{(nuevoPlan.description || '').length}/500 caracteres</div>
            {errores.description && <p className="text-red-500 text-sm mt-1">{errores.description}</p>}
          </div>

          {/* Fecha y Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline w-4 h-4 mr-1" />
                Fecha *
              </label>
              <input
                type="date"
                value={nuevoPlan.date}
                onChange={(e) => setNuevoPlan({ ...nuevoPlan, date: e.target.value })}
                className={`w-full p-3 border rounded-lg transition-colors ${errores.date ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-purple-500'}`}
                min={new Date().toISOString().split('T')[0]}
                required
              />
              {errores.date && <p className="text-red-500 text-sm mt-1">{errores.date}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="inline w-4 h-4 mr-1" />
                Hora *
              </label>
              <input
                type="time"
                value={nuevoPlan.timeString}
                onChange={(e) => setNuevoPlan({ ...nuevoPlan, timeString: e.target.value })}
                className={`w-full p-3 border rounded-lg transition-colors ${errores.time ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-purple-500'}`}
                required
              />
              {errores.time && <p className="text-red-500 text-sm mt-1">{errores.time}</p>}
            </div>
          </div>

          {/* Ubicación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MapPin className="inline w-4 h-4 mr-1" />
              Ubicación *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="¿Dónde será el plan?"
                value={nuevoPlan.location}
                onChange={(e) => setNuevoPlan({ ...nuevoPlan, location: e.target.value })}
                className={`flex-1 p-3 border rounded-lg transition-colors ${errores.location ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-purple-500'}`}
                required
              />
              <button
                type="button"
                onClick={obtenerUbicacionActual}
                className="px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center"
                title="Obtener ubicación actual"
              >
                <MapPin className="w-4 h-4" />
              </button>
            </div>
            {errores.location && <p className="text-red-500 text-sm mt-1">{errores.location}</p>}

            {(nuevoPlan.city || nuevoPlan.state) && (
              <div className="mt-2 p-2 bg-blue-50 rounded-lg text-sm text-blue-700">
                <MapPin className="inline w-4 h-4 mr-1" />
                {nuevoPlan.city && `Ciudad: ${nuevoPlan.city}`}
                {nuevoPlan.city && nuevoPlan.state && ' | '}
                {nuevoPlan.state && `Departamento: ${nuevoPlan.state}`}
              </div>
            )}
          </div>

          {/* WhatsApp */}
          <div className="space-y-2 bg-green-50 p-4 rounded-lg border border-green-200">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={nuevoPlan.enableWhatsapp}
                onChange={(e) => setNuevoPlan({ ...nuevoPlan, enableWhatsapp: e.target.checked })}
                className="w-4 h-4 text-green-600"
              />
              <MessageCircle className="w-5 h-5 text-green-600" />
              <span className="text-gray-700 font-medium">Habilitar contacto por WhatsApp</span>
            </label>

            {nuevoPlan.enableWhatsapp && (
              <div>
                <input
                  type="tel"
                  placeholder="Número de WhatsApp (ej: +57 300 123 4567)"
                  value={nuevoPlan.phoneNumber}
                  onChange={(e) => setNuevoPlan({ ...nuevoPlan, phoneNumber: e.target.value })}
                  className={`w-full p-3 border rounded-lg transition-colors ${errores.phoneNumber ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-green-500'}`}
                />
                {errores.phoneNumber && <p className="text-red-500 text-sm mt-1">{errores.phoneNumber}</p>}
              </div>
            )}
          </div>

          {/* Imágenes */}
          <div>
            <label className="block mb-2 text-gray-700 font-medium">
              <Camera className="inline w-5 h-5 mr-1" />
              Imágenes del plan (máximo 5)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => manejarImagenes(e.target.files)}
                className="w-full"
                disabled={imageFiles.length >= 5}
              />
              <p className="text-sm text-gray-500 mt-2">
                Formatos: JPG, PNG. Las imágenes se optimizarán automáticamente.
              </p>
            </div>

            {errores.imagenes && <p className="text-red-500 text-sm mt-1">{errores.imagenes}</p>}

            {previewUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {previewUrls.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt={`Preview ${i + 1}`} className="w-20 h-20 object-cover rounded-lg shadow-md" />
                    <button
                      type="button"
                      onClick={() => eliminarImagen(i)}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botón enviar */}
          <button
            type="submit"
            disabled={creandoPlan}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-bold hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {creandoPlan ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Creando plan...
              </>
            ) : (
              "Crear Plan"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PlanModal;
