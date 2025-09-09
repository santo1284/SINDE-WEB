// 🔹 Importaciones de React y hooks
import { useState, useEffect } from 'react';

// 🔹 Importaciones de Firebase Auth
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  FacebookAuthProvider,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../firebase/firebase-config.js';

// 🔹 Importación de íconos
import {
  FaEnvelope,
  FaLock,
  FaFacebook,
  FaUser,
  FaEye,
  FaEyeSlash,
  FaGoogle,
} from 'react-icons/fa';

// 🔹 LoginScreen Component
const LoginScreen = ({ onLoginSuccess, onShowCrearCuenta }) => {

  // 🔹 Estados del login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 🔹 Estados para recuperación de contraseña
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // 🔹 Proveedores de login social
  const googleProvider = new GoogleAuthProvider();
  const facebookProvider = new FacebookAuthProvider();

  // 🔹 Manejo de redirect de login social
  useEffect(() => {
    handleRedirectResult();
  }, []);

  const handleRedirectResult = async () => {
    try {
      const result = await getRedirectResult(auth);
      if (result) {
        console.log('✅ Login exitoso con redirect:', result.user.email);
        onLoginSuccess(result.user);
      }
    } catch (error) {
      console.error('Error en redirect result:', error);
      alert('Error al iniciar sesión: ' + error.message);
    }
  };

  // 🔹 Login con email y contraseña
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      onLoginSuccess(cred.user);
    } catch (error) {
      console.error(error);
      alert('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔹 Login con Google
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onLoginSuccess(result.user);
    } catch (error) {
      console.error(error);
      alert('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔹 Login con Facebook
  const handleFacebookLogin = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, facebookProvider);
      onLoginSuccess(result.user);
    } catch (error) {
      if (
        error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/popup-blocked'
      ) {
        try {
          await signInWithRedirect(auth, facebookProvider);
        } catch (e) {
          alert('Error con redirect: ' + e.message);
        }
      } else {
        alert('Error: ' + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 🔹 Recuperación de contraseña
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      alert(`📧 Se envió un correo de recuperación a ${resetEmail}`);
      setIsResetOpen(false);
      setResetEmail('');
    } catch (error) {
      console.error(error);
      alert('Error al enviar correo: ' + error.message);
    }
  };

  return (
    <>
      {/* 🔹 Contenedor principal del login */}
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#ff0077cc] bg-purple-600 to-[#01887aa9] px-4">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-lg text-white space-y-6">

          {/* 🔹 Icono de usuario */}
          <div className="flex justify-center">
            <div className="bg-pink-400 p-4 rounded-full shadow-lg">
              <FaUser size={32} />
            </div>
          </div>

          {/* 🔹 Título y subtítulo */}
          <div className="text-center">
            <h2 className="text-3xl font-bold">Bienvenido</h2>
            <p className="text-sm text-white">Inicia sesión en tu cuenta</p>
          </div>

          {/* 🔹 Formulario de login */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div className="relative w-full">
              <FaEnvelope className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white" />
              <input
                type="email"
                placeholder="Email"
                className="w-full pl-12 pr-4 py-3 rounded-full bg-white/30 text-white placeholder:text-gray-300 focus:outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {/* Contraseña */}
            <div className="relative w-full">
              <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Contraseña"
                className="w-full pl-12 pr-12 py-3 rounded-full bg-white/30 text-white placeholder:text-gray-300 focus:outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            {/* Recuperar contraseña */}
            <div className="text-right text-sm">
              <button
                type="button"
                onClick={() => setIsResetOpen(true)}
                className="text-white hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Botón de iniciar sesión */}
            <button
              type="submit"
              className="w-full py-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition disabled:opacity-50 shadow-lg"
              disabled={isLoading}
            >
              {isLoading ? '⏳ Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          {/* 🔹 Separador */}
          <div className="flex items-center justify-center gap-2 text-sm text-white">
            <span className="border-t border-gray-300 w-1/5"></span>
            <span>o continúa con</span>
            <span className="border-t border-gray-300 w-1/5"></span>
          </div>

          {/* 🔹 Botones sociales */}
          <div className="flex gap-4">
            <button
              onClick={handleGoogleLogin}
              className="w-1/2 flex items-center justify-center gap-2 bg-white/30 hover:bg-white/40 py-2 rounded-xl transition disabled:opacity-50"
              disabled={isLoading}
            >
              <FaGoogle /> Google
            </button>
            <button
              onClick={handleFacebookLogin}
              className="w-1/2 flex items-center justify-center gap-2 bg-white/30 hover:bg-white/40 py-2 rounded-xl transition disabled:opacity-50"
              disabled={isLoading}
            >
              <FaFacebook /> Facebook
            </button>
          </div>

          {/* 🔹 Crear cuenta */}
          <p className="text-center text-sm text-white">
            ¿No tienes cuenta?{' '}
            <button
              onClick={onShowCrearCuenta}
              className="text-blue-300 hover:underline"
              disabled={isLoading}
            >
              Crear cuenta
            </button>
          </p>
        </div>
      </div>

      {/* 🔹 Modal de recuperación de contraseña */}
      {isResetOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
          <div className="bg-white text-gray-900 p-6 rounded-2xl shadow-lg w-full max-w-sm space-y-4">
            <h2 className="text-xl font-bold">Recuperar contraseña</h2>
            <p className="text-sm text-gray-600">
              Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
            </p>
            <form onSubmit={handlePasswordReset} className="space-y-3">
              <input
                type="email"
                placeholder="Correo electrónico"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsResetOpen(false)}
                  className="px-4 py-2 bg-gray-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg"
                >
                  Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default LoginScreen;
