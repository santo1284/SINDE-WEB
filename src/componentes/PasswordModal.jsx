// componentes/PasswordModal.jsx
import React, { useState, useEffect } from 'react';
import { linkWithCredential, EmailAuthProvider } from 'firebase/auth';
import { FaLock, FaEye, FaEyeSlash, FaUserShield } from 'react-icons/fa';

const PasswordModal = ({ user, isOpen, onClose, onPasswordSet, onError }) => {
  console.log('🔧 PasswordModal renderizado con:', { 
    user: user?.email, 
    isOpen, 
    hasOnClose: !!onClose, 
    hasOnPasswordSet: !!onPasswordSet 
  });
  
  console.log('🔍 Props detalladas:', {
    userExists: !!user,
    userEmail: user?.email,
    userUID: user?.uid,
    isOpenValue: isOpen,
    shouldRender: isOpen && !!user
  });
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Limpiar estados cuando se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isOpen]);

  // No renderizar si no está abierto
  if (!isOpen || !user) {
    console.log('❌ PasswordModal NO renderiza porque:', { isOpen, hasUser: !!user });
    return null;
  }

  console.log('✅ PasswordModal SÍ renderiza para:', user.email);

  const handleSetPassword = async (e) => {
    e.preventDefault();
    
    // Validaciones
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('🔄 Vinculando contraseña para:', user.email);
      
      // Crear credencial de email/password para Sin Desparches
      const credential = EmailAuthProvider.credential(user.email, newPassword);
      
      // Vincular con la cuenta existente
      const result = await linkWithCredential(user, credential);
      
      console.log('✅ Contraseña vinculada exitosamente para Sin Desparches');
      
      // Limpiar estados del modal
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      
      // Notificar éxito y continuar al home
      onPasswordSet && onPasswordSet();
      
    } catch (error) {
      console.error('❌ Error al vincular contraseña:', error);
      
      let errorMessage = 'Error al actualizar la contraseña. Intenta de nuevo.';
      
      // Manejar errores específicos
      switch (error.code) {
        case 'auth/provider-already-linked':
          errorMessage = 'Ya tienes una contraseña establecida para Sin Desparches';
          break;
        case 'auth/credential-already-in-use':
          errorMessage = 'Este email ya está vinculado a otra cuenta';
          break;
        case 'auth/weak-password':
          errorMessage = 'La contraseña es muy débil';
          break;
        case 'auth/requires-recent-login':
          errorMessage = 'Por seguridad, necesitas volver a iniciar sesión';
          break;
        default:
          errorMessage = error.message || 'Error desconocido';
      }
      
      setError(errorMessage);
      onError && onError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-lg text-white relative">
        
        {/* Título actualizado */}
        <div className="text-center mb-6">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <FaUserShield size={24} />
          </div>
          <h2 className="text-2xl font-bold mb-2">
            🔐 Actualizar Contraseña
          </h2>
          <p className="text-gray-200 text-sm mb-2">
            <strong>Para acceder a Sin Desparches</strong>
          </p>
          <p className="text-emerald-300 text-xs mt-1 font-medium bg-emerald-500/20 px-3 py-1 rounded-full inline-block">
            {user?.email}
          </p>
          <p className="text-yellow-300 text-xs mt-3 bg-yellow-600/20 p-2 rounded-lg">
            ⚠️ Necesitas una contraseña específica para Sin Desparches
          </p>
        </div>
        
        <form onSubmit={handleSetPassword} className="space-y-4">
          
          {/* Nueva Contraseña para Sin Desparches */}
          <div className="relative w-full">
            <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-300" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Nueva contraseña para Sin Desparches (mín. 6 caracteres)"
              className="w-full pl-12 pr-12 py-3 rounded-full bg-white/20 text-white placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength="6"
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-white"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          
          {/* Confirmar Contraseña */}
          <div className="relative w-full">
            <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-300" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirmar contraseña"
              className="w-full pl-12 pr-12 py-3 rounded-full bg-white/20 text-white placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength="6"
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-white"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isLoading}
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          
          {/* Error */}
          {error && (
            <div className="bg-red-500/20 border border-red-400 text-red-200 px-4 py-3 rounded-xl text-sm">
              ⚠️ {error}
            </div>
          )}
          
          {/* Indicador de fortaleza */}
          {newPassword && (
            <div className="text-xs text-gray-300 bg-gray-700/30 p-2 rounded-lg">
              <span className="font-medium">Fortaleza de contraseña: </span>
              {newPassword.length >= 8 ? (
                <span className="text-green-400">🟢 Fuerte</span>
              ) : newPassword.length >= 6 ? (
                <span className="text-yellow-400">🟡 Media</span>
              ) : (
                <span className="text-red-400">🔴 Débil</span>
              )}
            </div>
          )}
          
          {/* Información adicional */}
          <div className="bg-blue-600/20 border border-blue-400 text-blue-200 px-4 py-3 rounded-xl text-sm">
            <div className="flex items-center mb-1">
              <FaUserShield className="mr-2" size={14} />
              <strong>¿Por qué necesitas esto?</strong>
            </div>
            <p className="text-xs">
              Esta contraseña te permitirá acceder directamente a Sin Desparches sin usar Google/Facebook en futuras ocasiones.
            </p>
          </div>
          
          {/* Botón para actualizar contraseña */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-full transition font-semibold disabled:opacity-50 flex items-center justify-center"
              disabled={isLoading || !newPassword || !confirmPassword}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"></div>
                  Actualizando...
                </>
              ) : (
                <>
                  <FaUserShield className="mr-2" size={16} />
                  Actualizar Contraseña de Sin Desparches
                </>
              )}
            </button>
          </div>
        </form>

        {/* Mensaje de obligatoriedad actualizado */}
        <div className="mt-4 text-center">
          <p className="text-xs text-amber-300 bg-amber-600/20 p-2 rounded-lg">
            🚨 Necesario para continuar a Sin Desparches
          </p>
        </div>
      </div>
    </div>
  );
};

export default PasswordModal;