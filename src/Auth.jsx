import { useState } from 'react';
import { supabase } from './supabaseClient';
import './Auth.css';

function Auth({ onLogin }) {
  const [userCode, setUserCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [codigoGenerado, setCodigoGenerado] = useState('');
  const [mostrarCodigo, setMostrarCodigo] = useState(false);

  // Generar código único
  const generarCodigoUnico = async () => {
    // Generar código aleatorio
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const codigo = `${timestamp}${random}`;
    
    // Verificar que no existe (aunque es casi imposible)
    const { data } = await supabase
      .from('clientes')
      .select('user_code')
      .eq('user_code', codigo)
      .limit(1);
    
    // Si por alguna razón existe, generar otro
    if (data && data.length > 0) {
      return generarCodigoUnico(); // Recursivo hasta encontrar uno único
    }
    
    return codigo;
  };

  // Crear nueva cuenta con código auto-generado
  const handleCrearCuenta = async () => {
    try {
      setError('');
      const codigo = await generarCodigoUnico();
      setCodigoGenerado(codigo);
      setMostrarCodigo(true);
    } catch (err) {
      setError('Error al generar código. Intenta de nuevo.');
      console.error(err);
    }
  };

  // Confirmar y usar el código generado
  const handleConfirmarCodigo = () => {
    localStorage.setItem('cobramatic_user_code', codigoGenerado);
    onLogin(codigoGenerado);
  };

  // Login con código existente
  const handleLogin = (e) => {
    e.preventDefault();
    
    if (!userCode.trim()) {
      setError('Por favor ingresa tu código de acceso');
      return;
    }

    // Guardar y notificar al parent
    localStorage.setItem('cobramatic_user_code', userCode.toUpperCase());
    onLogin(userCode.toUpperCase());
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">💰</div>
        <h1>CobraMatic</h1>
        <p className="auth-subtitle">Sistema de Recordatorios de Cobro</p>

        {/* Mostrar código generado */}
        {mostrarCodigo ? (
          <>
            <h2>✅ Tu código de acceso</h2>
            <div className="codigo-generado">
              <div className="codigo-box">
                {codigoGenerado}
              </div>
            </div>
            
            <div className="auth-warning">
              ⚠️ <strong>¡IMPORTANTE!</strong><br/>
              Guarda este código en un lugar seguro.<br/>
              Lo necesitarás para acceder siempre.
            </div>

            <div className="auth-info">
              📝 <strong>Recomendación:</strong><br/>
              • Toma una captura de pantalla<br/>
              • Guárdalo en tus notas<br/>
              • Envíatelo por email
            </div>

            <button 
              onClick={handleConfirmarCodigo}
              className="auth-button"
            >
              Continuar con este código
            </button>

            <button 
              onClick={() => {
                setMostrarCodigo(false);
                setCodigoGenerado('');
              }}
              className="auth-link"
            >
              ← Generar otro código
            </button>
          </>
        ) : !isCreating ? (
          <>
            <h2>Ingresa tu código de acceso</h2>
            <form onSubmit={handleLogin} className="auth-form">
              <input
                type="text"
                placeholder="Ej: ABC123XYZ"
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
              Crear nueva cuenta
            </button>
          </>
        ) : (
          <>
            <h2>Crear nueva cuenta</h2>
            <p className="auth-info">
              🔒 Te generaremos un <strong>código único y seguro</strong> para acceder a tu cuenta.
            </p>
            <p className="auth-info">
              💡 No necesitas recordar contraseñas complicadas, solo guarda tu código en un lugar seguro.
            </p>
            
            <button 
              onClick={handleCrearCuenta}
              className="auth-button"
            >
              🎲 Generar mi código de acceso
            </button>

            <button 
              onClick={() => {
                setIsCreating(false);
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