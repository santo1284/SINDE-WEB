import { useEffect, useState } from "react";
import { onAuthStateChanged, sendEmailVerification, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebase-config";
import { setDoc, doc, getDoc } from "firebase/firestore";

const VerifyEmail = () => {
  const [message, setMessage] = useState("Revisa tu correo y verifica tu cuenta.");
  const [countdown, setCountdown] = useState(60);
  const [resendAttempts, setResendAttempts] = useState(0);
  const navigate = useNavigate();

  // ⏳ Contador regresivo
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 👀 Verificar si el usuario ya validó correo
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          // ✅ Solo aquí crear perfil si no existe
          const ref = doc(db, "perfil", user.uid);
          const snap = await getDoc(ref);

          if (!snap.exists()) {
            await setDoc(ref, {
              uid: user.uid,
              email: user.email,
              creadoEn: new Date(),
            });
          }

          navigate("/editar-perfil");
        }
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // 📩 Reenviar correo (máximo 1 reenvío)
  const handleResend = async () => {
    if (resendAttempts < 1 && auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
      setResendAttempts(1);
      setCountdown(60);
      setMessage("Se ha reenviado el correo de verificación.");
    } else {
      await signOut(auth);
      navigate("/"); // vuelve al login
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg rounded-2xl p-6 text-center max-w-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Verificación de Correo</h2>
        <p className="text-gray-600 mb-2">{message}</p>
        <p className="text-gray-800 font-bold mb-4">
          ⏳ Tiempo restante: {countdown}s
        </p>

        {countdown === 0 && (
          <div>
            {resendAttempts < 1 ? (
              <button
                onClick={handleResend}
                className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg transition"
              >
                Reenviar correo (último intento)
              </button>
            ) : (
              <button
                onClick={async () => {
                  await signOut(auth);
                  navigate("/");
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition"
              >
                Volver al Login
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
