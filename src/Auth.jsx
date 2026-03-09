import { useState } from 'react';
import './Auth.css';

function Auth({ onLogin }) {
  const [userCode, setUserCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!userCode.trim()) {
      setError('Por favor ingresa un código');
      return;
    }

    // Validar formato: solo letras, números, guiones
    if (!/^[a-zA-Z0-9-_]+$/.test(userCode)) {
      setError('Solo letras, números, guiones y guión bajo');
      return;
    }

    if (userCode.length < 4) {
      setError('El código debe tener al menos 4 caracteres');
      return;
    }

    // Guardar en localStorage y notificar al parent
    localStorage.setItem('cobramatic_user_code', userCode.toUpperCase());
    onLogin(userCode.toUpperCase());
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">💰</div>
        <h1>CobraMatic</h1>
        <p className="auth-subtitle">Sistema de Recordatorios de Cobro</p>

        {!isCreating ? (
          <>
            <h2>Ingresa tu código de acceso</h2>
            <form onSubmit={handleSubmit} className="auth-form">
              <input
                type="text"
                placeholder="Ej: JUAN2024"
                value={userCode}
                onChange={(e) => {
                  setUserCode(e.target.value);
                  setError('');
                }}
                className="auth-input"
                autoFocus
              />
              {error && <p className="auth-error">{error}</p>}
              
              <button type="submit" className="auth-button">
                Entrar
              </button>
            </form>

            <div className="auth-divider">o</div>

            <button 
              onClick={() => setIsCreating(true)}
              className="auth-button-secondary"
            >
              Crear nuevo código
            </button>
          </>
        ) : (
          <>
            <h2>Crea tu código de acceso</h2>
            <p className="auth-info">
              📌 Usa algo fácil de recordar (ej: JUAN2024, NEGOCIO123)
            </p>
            <p className="auth-warning">
              ⚠️ <strong>Guarda este código.</strong> Lo necesitarás para acceder siempre.
            </p>
            
            <form onSubmit={handleSubmit} className="auth-form">
              <input
                type="text"
                placeholder="Tu código de acceso"
                value={userCode}
                onChange={(e) => {
                  setUserCode(e.target.value);
                  setError('');
                }}
                className="auth-input"
                autoFocus
              />
              {error && <p className="auth-error">{error}</p>}
              
              <button type="submit" className="auth-button">
                Crear y Entrar
              </button>
            </form>

            <button 
              onClick={() => {
                setIsCreating(false);
                setUserCode('');
                setError('');
              }}
              className="auth-link"
            >
              ← Volver a login
            </button>
          </>
        )}

        <div className="auth-footer">
          <p>🔒 Tus datos están protegidos</p>
          <p className="auth-note">Solo tú puedes ver tu información con tu código</p>
        </div>
      </div>
    </div>
  );
}

export default Auth;