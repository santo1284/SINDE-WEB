import React, { useState, useEffect } from 'react';
import { X, MapPin, Camera, Clock, Calendar } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { v4 as uuidv4 } from "uuid"; // npm i uuid
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "250px",
  borderRadius: "12px",
};

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

  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [errores, setErrores] = useState({});
  const [creandoPlan, setCreandoPlan] = useState(false);
  const [coords, setCoords] = useState(null);

  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();

  // Google Maps Loader
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyCxjuEfWAO73CCvvkWyNA3dXGHc_EXOBMo", // ⚠️ pon aquí tu API Key real
  });

  // Geocodificar dirección escrita en el input
  useEffect(() => {
    if (nuevoPlan.location && isLoaded && window.google) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: nuevoPlan.location }, (results, status) => {
        if (status === "OK" && results[0]) {
          const { lat, lng } = results[0].geometry.location;
          setCoords({ lat: lat(), lng: lng() });
          setNuevoPlan(prev => ({
            ...prev,
            latitude: lat(),
            longitude: lng(),
            locationAddress: results[0].formatted_address
          }));
        }
      });
    }
  }, [nuevoPlan.location, isLoaded]);

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

  // --- SUBIR imágenes a Firebase ---
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

  // --- Manejar imágenes ---
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

  const eliminarImagen = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
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
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        setNuevoPlan(prev => ({
          ...prev,
          latitude,
          longitude,
          location: `${latitude}, ${longitude}`
        }));
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

  // --- Crear Plan ---
  const crearPlan = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;
    setCreandoPlan(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Usuario no autenticado");
      const planId = uuidv4();
      const imageUrls = await uploadImagesToFirebase(imageFiles, user.uid, planId);
      const dateMs = new Date(`${nuevoPlan.date}T${nuevoPlan.timeString}`).getTime();
      const planData = {
        id: planId,
        userId: user.uid,
        createdAt: Date.now(),
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
      await setDoc(doc(db, 'planes', planId), planData);
      if (onPlanCreated) onPlanCreated({ id: planId, ...planData });
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
        <div className="flex items-center p-6 border-b bg-gradient-to-r from-pink-500 to-purple-600">
          <div className="flex-1 flex justify-center">
            <h2 className="text-xl font-bold text-white text-center">¡Crear Plan Increíble!</h2><span className="text-2xl">✨</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors ml-auto"
          >
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
              <div className="grid grid-cols-2 gap-6">
              {/* Hora */}
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-500" />
                  Hora 
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={nuevoPlan.timeString}
                    onChange={(e) => setNuevoPlan({ ...nuevoPlan, timeString: e.target.value })}
                    className={`w-full p-3 pl-10 border rounded-xl shadow-sm transition-all
                      focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400
                      ${errores.time ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                    `}
                    required
                  />
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-500 w-5 h-5" />
                </div>
                {errores.time && <p className="text-red-500 text-xs mt-2">{errores.time}</p>}
              </div>

              {/* Fecha */}
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-pink-500" />
                 Fecha 
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={nuevoPlan.date}
                    onChange={(e) => setNuevoPlan({ ...nuevoPlan, date: e.target.value })}
                    className={`w-full p-3 pl-10 border rounded-xl shadow-sm transition-all
                      focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400
                      ${errores.date ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                    `}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-pink-500 w-5 h-5" />
                </div>
                {errores.date && <p className="text-red-500 text-xs mt-2">{errores.date}</p>}
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
                    placeholder="Escribe la dirección o lugar"
                    value={nuevoPlan.location}
                    onChange={(e) =>
                      setNuevoPlan({ ...nuevoPlan, location: e.target.value })
                    }
                    className={`flex-1 p-3 border rounded-lg transition-colors ${
                      errores.location
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300 focus:border-purple-500"
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={obtenerUbicacionActual}
                    className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Mi ubicación
                  </button>
                </div>
                {errores.location && (
                  <p className="text-red-500 text-sm mt-1">{errores.location}</p>
                )}
              </div>
              
              {/* Mapa */}
                {isLoaded && coords && (
                  <div className="mt-3">
                    <GoogleMap
                      mapContainerStyle={containerStyle}
                      center={coords}
                      zoom={15}
                    >
                      <Marker position={coords} />
                    </GoogleMap>
                  </div>
                )}
              
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
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              disabled={creandoPlan}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creandoPlan}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creandoPlan ? 'Creando...' : 'Crear Plan 🎉'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlanModal;