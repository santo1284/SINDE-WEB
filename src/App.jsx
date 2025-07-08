// En tu App.jsx
import LoginScreen from './login';

function App() {
  const handleNavigateToHome = () => {
    // Lógica para navegar a home
    console.log('Navegando a home');
  };

  const handleNavigateToProfile = () => {
    // Lógica para navegar a perfil
    console.log('Navegando a perfil');
  };

  const handleNavigateToRegister = () => {
    // Lógica para navegar a registro
    console.log('Navegando a registro');
  };

  const handleNavigateToSetPassword = (email) => {
    // Lógica para navegar a definir contraseña
    console.log('Navegando a definir contraseña para:', email);
  };

  return (
    <LoginScreen
      onNavigateToHome={handleNavigateToHome}
      onNavigateToProfile={handleNavigateToProfile}
      onNavigateToRegister={handleNavigateToRegister}
      onNavigateToSetPassword={handleNavigateToSetPassword}
    />
  );
}

export default App;