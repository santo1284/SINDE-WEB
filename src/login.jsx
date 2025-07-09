import React, { useState, useEffect } from 'react';
import { User, Lock, Mail, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  FacebookAuthProvider,
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from './firebase-config'; // Importar desde el archivo de configuración

// Componente Login
const LoginScreen = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Verificar autenticación al cargar
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Usuario ya autenticado, redirigir a Home
        onLoginSuccess(user);
      }
    });
    return () => unsubscribe();
  }, [onLoginSuccess]);

  // Limpiar mensaje de error después de 5 segundos
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor, completa todos los campos');
      return;
    }

    if (!isValidEmail(email)) {
      setErrorMessage('Por favor, ingresa un email válido');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Autenticación exitosa con Firebase');
      
      setShowSuccess(true);
      
      // Redirigir después de mostrar éxito
      setTimeout(() => {
        onLoginSuccess(userCredential.user);
      }, 2000);
      
    } catch (error) {
      console.error('Error de autenticación:', error);
      
      switch (error.code) {
        case 'auth/user-not-found':
          setErrorMessage('No existe una cuenta con este email');
          break;
        case 'auth/wrong-password':
          setErrorMessage('Contraseña incorrecta');
          break;
        case 'auth/invalid-email':
          setErrorMessage('Email inválido');
          break;
        case 'auth/too-many-requests':
          setErrorMessage('Demasiados intentos fallidos. Intenta más tarde');
          break;
        case 'auth/network-request-failed':
          setErrorMessage('Error de conexión. Verifica tu internet');
          break;
        default:
          setErrorMessage('Error al iniciar sesión. Intenta de nuevo');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (providerType) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      let provider;
      if (providerType === 'google') {
        provider = new GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
      } else if (providerType === 'facebook') {
        provider = new FacebookAuthProvider();
        provider.addScope('email');
      }
      
      const result = await signInWithPopup(auth, provider);
      console.log(`Autenticación exitosa con ${providerType}`);
      
      setShowSuccess(true);
      
      setTimeout(() => {
        onLoginSuccess(result.user);
      }, 2000);
      
    } catch (error) {
      console.error(`Error en login con ${providerType}:`, error);
      
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          setErrorMessage('Ventana de autenticación cerrada');
          break;
        case 'auth/popup-blocked':
          setErrorMessage('Ventana emergente bloqueada por el navegador');
          break;
        case 'auth/network-request-failed':
          setErrorMessage('Error de conexión. Verifica tu internet');
          break;
        case 'auth/account-exists-with-different-credential':
          setErrorMessage('Ya existe una cuenta con este email usando otro método');
          break;
        default:
          setErrorMessage(`Error al iniciar sesión con ${providerType}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      setErrorMessage('Ingresa un email válido');
      return;
    }

    if (!isValidEmail(resetEmail)) {
      setErrorMessage('Por favor, ingresa un email válido');
      return;
    }

    setIsLoading(true);
    
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setErrorMessage('Se ha enviado un correo para restablecer tu contraseña');
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error) {
      console.error('Error al enviar correo de restablecimiento:', error);
      
      switch (error.code) {
        case 'auth/user-not-found':
          setErrorMessage('No existe una cuenta con este email');
          break;
        case 'auth/invalid-email':
          setErrorMessage('Email inválido');
          break;
        case 'auth/network-request-failed':
          setErrorMessage('Error de conexión. Verifica tu internet');
          break;
        default:
          setErrorMessage('Error al enviar el correo de restablecimiento');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      {/* Mensaje de éxito */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 text-center animate-pulse">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">¡Éxito!</h2>
            <p className="text-gray-600">Iniciando sesión...</p>
          </div>
        </div>
      )}

      {/* Diálogo de restablecer contraseña */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Restablecer Contraseña</h2>
            <p className="text-gray-600 mb-6">Te enviaremos un enlace para restablecer tu contraseña</p>
            
            <div className="relative mb-6">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Ingresa tu email"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowForgotPassword(false)}
                className="flex-1 py-3 px-4 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleForgotPassword}
                disabled={isLoading}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 transition-all"
              >
                {isLoading ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="max-w-md w-full">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <User className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Bienvenido</h1>
            <p className="text-white/70">Inicia sesión en tu cuenta</p>
          </div>

          {/* Formulario */}
          <div className="space-y-6">
            {/* Campo Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/70" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full pl-10 pr-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:2 focus:ring-indigo-400 focus:border-transparent backdrop-blur-sm"
              />
            </div>

            {/* Campo Contraseña */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/70" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="w-full pl-10 pr-12 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent backdrop-blur-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Enlace olvidé contraseña */}
            <div className="text-right">
              <button
                onClick={() => setShowForgotPassword(true)}
                className="text-white/70 hover:text-white text-sm transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Botón de login */}
            <button
              onClick={handleEmailLogin}
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none shadow-lg"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Iniciando sesión...
                </div>
              ) : (
                'Iniciar Sesión'
              )}
            </button>

            {/* Mensaje de error */}
            {errorMessage && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-center">
                <p className="text-red-200 text-sm">{errorMessage}</p>
              </div>
            )}

            {/* Separador */}
            <div className="flex items-center">
              <div className="flex-1 h-px bg-white/20"></div>
              <span className="px-4 text-white/70 text-sm">o continúa con</span>
              <div className="flex-1 h-px bg-white/20"></div>
            </div>

            {/* Botones sociales */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleSocialLogin('google')}
                disabled={isLoading}
                className="flex items-center justify-center py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all duration-200 disabled:opacity-50 backdrop-blur-sm"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>
              
              <button
                onClick={() => handleSocialLogin('facebook')}
                disabled={isLoading}
                className="flex items-center justify-center py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all duration-200 disabled:opacity-50 backdrop-blur-sm"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </button>
            </div>

            {/* Enlace crear cuenta */}
            <div className="text-center pt-4">
              <p className="text-white/70">
                ¿No tienes cuenta?{' '}
                <button className="text-indigo-300 hover:text-indigo-200 font-semibold transition-colors">
                  Crear cuenta
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;