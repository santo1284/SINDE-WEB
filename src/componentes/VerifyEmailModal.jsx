import { useEffect, useState } from "react";
import { onAuthStateChanged, sendEmailVerification, signOut, updateEmail } from "firebase/auth";
import { auth } from "../firebase/firebase-config";

const VerifyEmailModal = ({ email, onClose, onVerifyCheck }) => {
  const [message, setMessage] = useState("Revisa tu correo y verifica tu cuenta.");
  const [countdown, setCountdown] = useState(60);
  const [resendAttempts, setResendAttempts] = useState(0);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  // Contador regresivo
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Verificar si el usuario ya validó correo
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          onVerifyCheck();
        }
      }
    });

    return () => unsubscribe();
  }, [onVerifyCheck]);

  // Reenviar correo
  const handleResend = async () => {
    if (resendAttempts < 3 && auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
        setResendAttempts(prev => prev + 1);
        setCountdown(60);
        setMessage(`Correo reenviado (${resendAttempts + 1}/3). Revisa tu bandeja de entrada y spam.`);
      } catch (error) {
        console.error('Error reenviando correo:', error);
        setMessage('Error al reenviar. Intenta de nuevo.');
      }
    }
  };

  // Cambiar email
  const handleChangeEmail = async (e) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes('@')) {
      alert('Por favor ingresa un email válido');
      return;
    }

    setIsChangingEmail(true);
    try {
      await updateEmail(auth.currentUser, newEmail.trim());
      await sendEmailVerification(auth.currentUser);
      setMessage(`Email actualizado a ${newEmail}. Se ha enviado un nuevo correo de verificación.`);
      setShowChangeEmail(false);
      setNewEmail("");
      setCountdown(60);
      setResendAttempts(0);
    } catch (error) {
      console.error('Error cambiando email:', error);
      let errorMessage = 'Error al cambiar el email.';
      
      if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Necesitas iniciar sesión nuevamente para cambiar el email.';
        await signOut(auth);
        onClose();
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email ya está en uso por otra cuenta.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'El formato del email no es válido.';
      }
      
      alert(errorMessage);
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onClose();
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white shadow-2xl rounded-2xl p-6 text-center max-w-md w-full">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Verificación de Correo
        </h2>
        <p className="text-gray-600 mb-2">{message}</p>
        <p className="text-sm text-blue-600 mb-4">📧 {email}</p>
        <p className="text-gray-800 font-bold mb-6">
          ⏳ Tiempo restante: {countdown}s
        </p>

        {/* Formulario para cambiar email */}
        {showChangeEmail ? (
          <form onSubmit={handleChangeEmail} className="mb-4">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Nuevo correo electrónico"
              className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isChangingEmail}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isChangingEmail}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition font-medium disabled:opacity-50"
              >
                {isChangingEmail ? 'Cambiando...' : 'Confirmar'}
              </button>
              <button
                type="button"
                onClick={() => setShowChangeEmail(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition font-medium"
                disabled={isChangingEmail}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          countdown === 0 && (
            <div className="space-y-3">
              {resendAttempts < 3 && (
                <button
                  onClick={handleResend}
                  className="w-full bg-pink-600 hover:bg-pink-700 text-white px-4 py-3 rounded-lg transition font-medium"
                >
                  Reenviar correo ({resendAttempts}/3)
                </button>
              )}
              
              <button
                onClick={() => setShowChangeEmail(true)}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg transition font-medium"
              >
                Cambiar correo electrónico
              </button>
              
              <button
                onClick={handleLogout}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg transition font-medium"
              >
                Volver al Login
              </button>
            </div>
          )
        )}

        <div className="mt-4 text-xs text-gray-500">
          💡 Revisa tu carpeta de spam o promociones
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailModal;