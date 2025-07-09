import React from 'react';
import { User, LogOut, Mail, Calendar, Shield } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from './firebase-config'; // Importar desde el archivo de configuración

const Home = ({ user, onLogout }) => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('Sesión cerrada exitosamente');
      onLogout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No disponible';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mr-3">
                <User className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-gray-600 text-sm">
                Hola, {user.displayName || 'Usuario'}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tarjeta de bienvenida */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8 border border-white/20">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Avatar" 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-white" />
              )}
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-2">
            ¡Bienvenido de vuelta!
          </h2>
          
          <p className="text-gray-600 text-center mb-8">
            Has iniciado sesión exitosamente en tu cuenta
          </p>

          {/* Información del usuario */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-r from-emerald-100 to-teal-100 rounded-2xl p-6">
              <div className="flex items-center mb-4">
                <Mail className="w-6 h-6 text-emerald-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-800">Información de Cuenta</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">Email:</span>
                  <p className="font-medium text-gray-800">{user.email}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Nombre:</span>
                  <p className="font-medium text-gray-800">{user.displayName || 'No especificado'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">ID de Usuario:</span>
                  <p className="font-medium text-gray-800 text-xs break-all">{user.uid}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl p-6">
              <div className="flex items-center mb-4">
                <Shield className="w-6 h-6 text-blue-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-800">Detalles de Sesión</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">Verificado:</span>
                  <p className="font-medium text-gray-800">
                    {user.emailVerified ? '✅ Sí' : '❌ No'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Último acceso:</span>
                  <p className="font-medium text-gray-800">
                    {formatDate(user.metadata?.lastSignInTime)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Cuenta creada:</span>
                  <p className="font-medium text-gray-800">
                    {formatDate(user.metadata?.creationTime)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tarjetas de acciones rápidas */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4">
              <User className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Perfil</h3>
            <p className="text-gray-600 text-sm mb-4">Gestiona tu información personal</p>
            <button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium py-2 px-4 rounded-lg transition-all">
              Ver Perfil
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Actividad</h3>
            <p className="text-gray-600 text-sm mb-4">Revisa tu actividad reciente</p>
            <button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium py-2 px-4 rounded-lg transition-all">
              Ver Actividad
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Seguridad</h3>
            <p className="text-gray-600 text-sm mb-4">Configuración de seguridad</p>
            <button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium py-2 px-4 rounded-lg transition-all">
              Configurar
            </button>
          </div>
        </div>

        {/* Mensaje de estado */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl p-6 text-center">
          <h3 className="text-xl font-bold text-white mb-2">
            ¡Todo listo!
          </h3>
          <p className="text-indigo-100">
            Ya puedes comenzar a usar todas las funcionalidades de la aplicación
          </p>
        </div>
      </main>
    </div>
  );
};

export default Home;