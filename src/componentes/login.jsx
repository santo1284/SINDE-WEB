import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  FacebookAuthProvider,
} from 'firebase/auth';
import { auth } from '../firebase/firebase-config.js'; // ajusta si está en otra carpeta
import {
  FaEnvelope,
  FaLock,
  FaFacebook,
  FaUser,
  FaEye,
  FaEyeSlash,
  FaGoogle,
} from 'react-icons/fa';
import PasswordModal from "./PasswordModal.jsx";

const LoginScreen = ({ onLoginSuccess, onShowCrearCuenta }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [socialUser, setSocialUser] = useState(null);

  const googleProvider = new GoogleAuthProvider();
  const facebookProvider = new FacebookAuthProvider();

  useEffect(() => {
    handleRedirectResult();
  }, []);

  // cuando socialUser cambie
  useEffect(() => {
    if (socialUser) {
      console.log('🎯 socialUser actualizado, abriendo modal...');
      setShowPasswordModal(true);
    }
  }, [socialUser]);

  const handleRedirectResult = async () => {
    try {
      const result = await getRedirectResult(auth);
      if (result) {
        console.log('✅ Login exitoso con redirect:', result.user.email);
        handleSocialLoginSuccess(result.user);
      }
    } catch (error) {
      console.error('Error en redirect result:', error);
      alert('Error al iniciar sesión: ' + error.message);
    }
  };

  const handleSocialLoginSuccess = (user) => {
    const providers = user.providerData.map(p => p.providerId);
    const hasOnlySocial = providers.length > 0 &&
      !providers.includes('password') &&
      (providers.includes('google.com') || providers.includes('facebook.com'));
    if (hasOnlySocial) {
      console.log('🔐 Modal obligatorio para contraseña');
      setSocialUser(user);
    } else {
      console.log('✅ Ya tiene contraseña, mandando al Home');
      onLoginSuccess(user);
    }
  };

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

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      handleSocialLoginSuccess(result.user);
    } catch (error) {
      console.error(error);
      alert('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, facebookProvider);
      handleSocialLoginSuccess(result.user);
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

  const handlePasswordSet = () => {
    console.log('🎉 Contraseña establecida');
    setShowPasswordModal(false);
    onLoginSuccess(socialUser);
    setSocialUser(null);
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#7F00FF] to-[#E100FF] px-4">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-lg text-white space-y-6">
          <div className="flex justify-center">
            <div className="bg-purple-600 p-4 rounded-full shadow-lg">
              <FaUser size={32} />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-bold">Bienvenido</h2>
            <p className="text-sm text-gray-200">Inicia sesión en tu cuenta</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative w-full">
              <FaEnvelope className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-300" />
              <input
                type="email"
                placeholder="Email"
                className="w-full pl-12 pr-4 py-3 rounded-full bg-white/20 text-white placeholder:text-gray-300 focus:outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="relative w-full">
              <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-300" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Contraseña"
                className="w-full pl-12 pr-12 py-3 rounded-full bg-white/20 text-white placeholder:text-gray-300 focus:outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-300"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <div className="text-right text-sm">
              <a href="#" className="text-gray-300 hover:underline">
                ¿Olvidaste tu contraseña?
              </a>
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-full bg-morado hover:bg-[#7F00FF] font-semibold transition disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? '⏳ Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-300">
            <span className="border-t border-gray-300 w-1/5"></span>
            <span>o continúa con</span>
            <span className="border-t border-gray-300 w-1/5"></span>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleGoogleLogin}
              className="w-1/2 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 py-2 rounded-xl transition disabled:opacity-50"
              disabled={isLoading}
            >
              <FaGoogle /> Google
            </button>
            <button
              onClick={handleFacebookLogin}
              className="w-1/2 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 py-2 rounded-xl transition disabled:opacity-50"
              disabled={isLoading}
            >
              <FaFacebook /> Facebook
            </button>
          </div>
          <p className="text-center text-sm text-gray-300">
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

      <PasswordModal
        user={socialUser}
        isOpen={showPasswordModal}
        onClose={() => {}}
        onPasswordSet={handlePasswordSet}
      />
    </>
  );
};

export default LoginScreen;