import React, { useState, useRef } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Plus } from 'lucide-react';
import fondo from '../assets/fondo.png';
import { auth, db, storage } from "../firebase/firebase-config.js"; // ✅ Ruta correcta

const CrearCuenta = ({ onCrearCuentaSuccess, onShowLogin }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    celular: '',
    edad: '',
    ciudad: '',
    password: '',
    acceptTerms: false
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const emailRef = useRef();
  const celularRef = useRef();
  const edadRef = useRef();
  const ciudadRef = useRef();
  const passwordRef = useRef();

  const handleKeyDown = (e, nextRef) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef?.current) nextRef.current.focus();
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tamaño del archivo (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, image: 'La imagen debe ser menor a 5MB' }));
        return;
      }
      
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, image: 'Solo se permiten archivos de imagen' }));
        return;
      }
      
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setErrors(prev => ({ ...prev, image: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.nombre.trim()) newErrors.nombre = 'Nombre requerido';
    if (!formData.email.trim()) newErrors.email = 'Correo requerido';
    if (!/^\d{10}$/.test(formData.celular)) newErrors.celular = 'Debe tener 10 dígitos';
    if (!formData.edad || !/^\d{2}$/.test(formData.edad)) newErrors.edad = 'Edad inválida';
    if (!formData.ciudad) newErrors.ciudad = 'Ciudad requerida';
    if (!formData.password || formData.password.length < 6) newErrors.password = 'Mínimo 6 caracteres';
    if (!formData.acceptTerms) newErrors.acceptTerms = 'Debes aceptar los términos';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

const uploadImage = async (user) => {
  if (!imageFile) return null;

  try {
    console.log('Iniciando subida de imagen...');
    setUploadProgress(25);
    
    // Verificar que el usuario esté autenticado
    if (!user || !user.uid) {
      throw new Error('Usuario no autenticado');
    }
    
    const imageRef = ref(storage, `profile_pictures/${user.uid}`);
    console.log('Referencia creada:', imageRef);
    
    setUploadProgress(50);
    const uploadResult = await uploadBytes(imageRef, imageFile);
    console.log('Imagen subida exitosamente:', uploadResult);
    
    setUploadProgress(75);
    const downloadURL = await getDownloadURL(imageRef);
    console.log('URL de descarga obtenida:', downloadURL);
    
    setUploadProgress(100);
    return downloadURL;
  } catch (error) {
    console.error('Error al subir imagen:', error);
    console.error('Código de error:', error.code);
    console.error('Mensaje de error:', error.message);
    throw new Error(`Error al subir imagen: ${error.message}`);
  }
};

const handleSubmit = async (e) => {
  e.preventDefault();
  if (!validateForm()) return;
  
  setIsLoading(true);
  setUploadProgress(0);
  setErrors({});

  try {
    console.log('Iniciando creación de cuenta...');
    
    // Crear usuario
    const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
    const user = userCredential.user;
    console.log('Usuario creado:', user.uid);

    // Actualizar perfil
    await updateProfile(user, { displayName: formData.nombre });
    console.log('Perfil actualizado');

    // IMPORTANTE: Esperar a que el token de autenticación se propague
    await user.getIdToken(true); // Forzar refresh del token
    console.log('Token de autenticación obtenido');

    // Subir imagen DESPUÉS de confirmar la autenticación
    let imageUrl = null;
    if (imageFile) {
      console.log('Subiendo imagen...');
      // Pequeña pausa para asegurar que la autenticación se haya propagado
      await new Promise(resolve => setTimeout(resolve, 1000));
      imageUrl = await uploadImage(user);
      console.log('Imagen subida con URL:', imageUrl);
    }

    // Guardar en Firestore
    console.log('Guardando datos en Firestore...');
    await setDoc(doc(db, 'perfil', user.uid), {
      uid: user.uid,
      nombre: formData.nombre,
      email: formData.email,
      celular: formData.celular,
      edad: parseInt(formData.edad),
      ciudad: formData.ciudad,
      profileImage: imageUrl,
      createdAt: serverTimestamp()
    });

    console.log('Cuenta creada exitosamente');
    onCrearCuentaSuccess(user);
    
  } catch (error) {
    console.error('Error completo:', error);
    let errorMessage = 'Error al crear la cuenta';
    
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'Este correo ya está registrado';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'La contraseña es muy débil';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Correo electrónico inválido';
    } else if (error.code === 'storage/unauthorized') {
      errorMessage = 'Error de permisos al subir imagen. Usuario no autenticado.';
    } else if (error.code === 'storage/quota-exceeded') {
      errorMessage = 'Límite de almacenamiento excedido';
    } else if (error.message.includes('imagen')) {
      errorMessage = error.message;
    } else if (error.message.includes('CORS') || error.message.includes('ERR_FAILED')) {
      errorMessage = 'Error de conexión. Intenta de nuevo en unos segundos.';
    }
    
    setErrors({ submit: errorMessage });
  } finally {
    setIsLoading(false);
    setUploadProgress(0);
  }
};

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-6 text-white"
      style={{ backgroundImage: `url(${fondo})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="backdrop-blur-md bg-black/50 border border-white/20 rounded-3xl w-full max-w-md p-4 sm:p-6 relative shadow-xl">
        <div className="absolute -top-0 left-0 w-full">
          <div className="bg-white text-black font-bold text-xl text-center py-2 rounded-t-2xl shadow-md w-full">
            ¡Crea tu cuenta!
          </div>
        </div>

        <div className="flex justify-center mt-8 mb-4 relative">
          <label htmlFor="imagenPerfil" className="cursor-pointer relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-white flex items-center justify-center shadow-lg">
              {imagePreview ? (
                <img src={imagePreview} alt="perfil" className="w-full h-full object-cover" />
              ) : (
                <Plus className="text-pink-500 w-10 h-10" />
              )}
            </div>
            <input
              id="imagenPerfil"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </label>
        </div>
        
        {errors.image && <p className="text-red-400 text-xs text-center mb-2">{errors.image}</p>}
        
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="mb-4">
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-pink-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-center mt-1">Subiendo imagen... {uploadProgress}%</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <input name="nombre" type="text" value={formData.nombre} onChange={handleInputChange}
            onKeyDown={(e) => handleKeyDown(e, emailRef)} placeholder="Nombre"
            className="w-full p-2 rounded bg-transparent border-b border-white focus:outline-none" />
          {errors.nombre && <p className="text-red-400 text-xs">{errors.nombre}</p>}

          <input ref={emailRef} name="email" type="email" value={formData.email}
            onChange={handleInputChange} onKeyDown={(e) => handleKeyDown(e, celularRef)}
            placeholder="Correo" className="w-full p-2 rounded bg-transparent border-b border-white focus:outline-none" />
          {errors.email && <p className="text-red-400 text-xs">{errors.email}</p>}

          <input ref={celularRef} name="celular" type="tel" maxLength="10" value={formData.celular}
            onChange={handleInputChange} onKeyDown={(e) => handleKeyDown(e, edadRef)}
            placeholder="Celular" className="w-full p-2 rounded bg-transparent border-b border-white focus:outline-none" />
          {errors.celular && <p className="text-red-400 text-xs">{errors.celular}</p>}

          <input ref={edadRef} name="edad" type="number" max="99" value={formData.edad}
            onChange={handleInputChange} onKeyDown={(e) => handleKeyDown(e, ciudadRef)}
            placeholder="Edad" className="w-full p-2 rounded bg-transparent border-b border-white focus:outline-none" />
          {errors.edad && <p className="text-red-400 text-xs">{errors.edad}</p>}

          <select ref={ciudadRef} name="ciudad" value={formData.ciudad}
            onChange={handleInputChange} onKeyDown={(e) => handleKeyDown(e, passwordRef)}
            className="w-full p-2 rounded bg-black border-b border-white text-white focus:outline-none"
            style={{ colorScheme: 'dark', backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <option value="">Selecciona una ciudad</option>
            <option value="Bogotá">Bogotá</option>
            <option value="Medellín">Medellín</option>
            <option value="Cali">Cali</option>
            <option value="Barranquilla">Barranquilla</option>
            <option value="Cartagena">Cartagena</option>
            <option value="Bucaramanga">Bucaramanga</option>
            <option value="Pereira">Pereira</option>
            <option value="Santa Marta">Santa Marta</option>
            <option value="Cúcuta">Cúcuta</option>
            <option value="Manizales">Manizales</option>
          </select>
          {errors.ciudad && <p className="text-red-400 text-xs">{errors.ciudad}</p>}

          <input ref={passwordRef} name="password" type="password" value={formData.password}
            onChange={handleInputChange} placeholder="Contraseña"
            className="w-full p-2 rounded bg-transparent border-b border-white focus:outline-none" />
          {errors.password && <p className="text-red-400 text-xs">{errors.password}</p>}

          <div className="flex items-center mt-2">
            <input type="checkbox" name="acceptTerms" checked={formData.acceptTerms}
              onChange={handleInputChange} className="mr-2" />
            <span className="text-sm">
              Acepto los{' '}
              <button type="button" onClick={() => setShowTermsModal(true)}
                className="text-pink-400 underline">términos y condiciones</button>
            </span>
          </div>
          {errors.acceptTerms && <p className="text-red-400 text-xs">{errors.acceptTerms}</p>}
          {errors.submit && <p className="text-red-400 text-xs">{errors.submit}</p>}

          <button type="submit" disabled={isLoading}
            className="w-full mt-2 bg-pink-600 hover:bg-pink-500 text-white py-2 rounded-full font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            {isLoading ? 'Creando cuenta...' : '😎 ¡PÁRCHATE!'}
          </button>

          <div className="text-center mt-2 text-sm">
            ¿Ya tienes cuenta?{' '}
            <button type="button" onClick={onShowLogin} className="text-pink-400 underline">
              Inicia sesión
            </button>
          </div>
        </form>

        {showTermsModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white text-black rounded-xl max-w-md w-full p-6 shadow-2xl relative">
              <h2 className="text-xl font-bold mb-4">Términos y Condiciones</h2>
              <ul className="text-sm space-y-2 list-disc pl-5">
                <li>Sindesparches no se hace responsable de la veracidad de los planes.</li>
                <li>Actúa como intermediario y no garantiza los eventos.</li>
                <li>No tiene responsabilidad legal por consecuencias derivadas.</li>
                <li>Los usuarios asumen su responsabilidad.</li>
                <li>La información será almacenada según la política de privacidad.</li>
              </ul>
              <button onClick={() => setShowTermsModal(false)}
                className="mt-6 bg-pink-600 text-white px-4 py-2 rounded-full">Cerrar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CrearCuenta;