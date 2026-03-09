import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import Landing from './Landing'
import './App.css'

// Plantillas de mensajes predefinidas
const plantillas = {
  cortés: `Hola {nombre}! 👋

Espero que estés muy bien. Te escribo para recordarte que tenemos pendiente el pago de {monto} por {concepto}.

La fecha acordada es {fecha}. ¿Podrías confirmarme cuándo podrías realizar el pago?

¡Gracias! 😊`,
  
  recordatorio: `Hola {nombre}! 🙂

Te recuerdo amablemente que el pago de {monto} por {concepto} vence el {fecha}.

¿Necesitas alguna información adicional para procesar el pago?

Quedo atento. ¡Saludos!`,
  
  urgente: `Hola {nombre},

Noto que el pago de {monto} por {concepto} venció el {fecha} y aún no lo he recibido.

¿Hay algún inconveniente? Me gustaría resolverlo lo antes posible.

Quedo pendiente de tu respuesta. Gracias.`
};

function App() {
  // Estado de autenticación
  const [userCode, setUserCode] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Estado para mostrar/ocultar landing
  const [mostrarApp, setMostrarApp] = useState(false);
  
  // Estados del formulario
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState('cortés');
  const [telefono, setTelefono] = useState('');
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState('');
  const [concepto, setConcepto] = useState('');
  const [mensaje, setMensaje] = useState(plantillas.cortés);
  
  // Estado de clientes
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  // Estados para historial expandido
  const [historialExpandido, setHistorialExpandido] = useState({});

  // Verificar si ya hay un código guardado
  useEffect(() => {
    const savedCode = localStorage.getItem('cobramatic_user_code');
    if (savedCode) {
      setUserCode(savedCode);
      setIsAuthenticated(true);
      setMostrarApp(true); // Si ya está autenticado, mostrar app directamente
    } else {
      setCargando(false); // Si no hay código, dejar de cargar
    }
  }, []);

  // Cargar clientes solo si está autenticado
  useEffect(() => {
    if (isAuthenticated && userCode) {
      cargarClientes();
    }
  }, [isAuthenticated, userCode]);

  // Función para cargar clientes desde Supabase
  const cargarClientes = async () => {
    try {
      setCargando(true);
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('user_code', userCode) // Filtrar por código de usuario
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setClientes(data || []);
    } catch (error) {
      console.error('Error cargando clientes:', error);
      alert('Error al cargar los clientes. Verifica la conexión a Supabase.');
    } finally {
      setCargando(false);
    }
  };

  // Actualizar mensaje cuando cambia la plantilla
  const handlePlantillaChange = (nuevaPlantilla) => {
    setPlantillaSeleccionada(nuevaPlantilla);
    setMensaje(plantillas[nuevaPlantilla]);
  };

  // Generar preview del mensaje
  const generarPreview = () => {
    return mensaje
      .replace(/{nombre}/g, nombre || '{nombre}')
      .replace(/{monto}/g, monto || '{monto}')
      .replace(/{fecha}/g, fecha || '{fecha}')
      .replace(/{concepto}/g, concepto || '{concepto}');
  };

  // Agregar nuevo cliente
  const agregarCliente = async (e) => {
    e.preventDefault();
    
    if (!telefono || !nombre || !monto) {
      alert('Por favor completa al menos teléfono, nombre y monto');
      return;
    }
    
    const nuevoCliente = {
      user_code: userCode, // Asociar con el código del usuario
      telefono,
      nombre,
      monto,
      fecha,
      concepto,
      mensaje,
      enviados: 0,
      historial: [],
      pagado: false
    };
    
    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert([nuevoCliente])
        .select();
      
      if (error) throw error;
      
      // Actualizar lista local
      setClientes([data[0], ...clientes]);
      
      // Limpiar formulario
      setTelefono('');
      setNombre('');
      setMonto('');
      setFecha('');
      setConcepto('');
      setMensaje(plantillas[plantillaSeleccionada]);
    } catch (error) {
      console.error('Error agregando cliente:', error);
      alert('Error al agregar el cliente. Intenta de nuevo.');
    }
  };

  // Enviar mensaje por WhatsApp
  const enviarWhatsApp = async (id) => {
    const cliente = clientes.find(c => c.id === id);
    if (!cliente) return;
    
    const mensajePersonalizado = cliente.mensaje
      .replace(/{nombre}/g, cliente.nombre)
      .replace(/{monto}/g, cliente.monto)
      .replace(/{fecha}/g, cliente.fecha)
      .replace(/{concepto}/g, cliente.concepto);
    
    const mensajeCodificado = encodeURIComponent(mensajePersonalizado);
    const url = `https://wa.me/${cliente.telefono}?text=${mensajeCodificado}`;
    
    // Registrar el envío
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString('es-ES');
    const hora = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    const nuevoHistorial = [
      { fecha, hora, timestamp: ahora.getTime() },
      ...(cliente.historial || [])
    ];
    
    try {
      const { error } = await supabase
        .from('clientes')
        .update({
          enviados: cliente.enviados + 1,
          historial: nuevoHistorial
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // Actualizar estado local
      setClientes(clientes.map(c => {
        if (c.id === id) {
          return {
            ...c,
            enviados: c.enviados + 1,
            historial: nuevoHistorial
          };
        }
        return c;
      }));
      
      // Abrir WhatsApp
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error registrando envío:', error);
      // Abrir WhatsApp aunque falle el registro
      window.open(url, '_blank');
    }
  };

  // Eliminar cliente
  const eliminarCliente = async (id) => {
    if (!confirm('¿Seguro que quieres eliminar este cliente?')) return;
    
    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setClientes(clientes.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error eliminando cliente:', error);
      alert('Error al eliminar el cliente. Intenta de nuevo.');
    }
  };

  // Marcar como pagado
  const marcarPagado = async (id) => {
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ pagado: true })
        .eq('id', id);
      
      if (error) throw error;
      
      setClientes(clientes.map(c => 
        c.id === id ? { ...c, pagado: true } : c
      ));
    } catch (error) {
      console.error('Error marcando como pagado:', error);
      alert('Error al actualizar. Intenta de nuevo.');
    }
  };

  // Desmarcar pagado
  const desmarcarPagado = async (id) => {
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ pagado: false })
        .eq('id', id);
      
      if (error) throw error;
      
      setClientes(clientes.map(c => 
        c.id === id ? { ...c, pagado: false } : c
      ));
    } catch (error) {
      console.error('Error desmarcando pagado:', error);
      alert('Error al actualizar. Intenta de nuevo.');
    }
  };

  // Toggle historial
  const toggleHistorial = (id) => {
    setHistorialExpandido(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Cerrar sesión
  const handleLogout = () => {
    if (confirm('¿Seguro que quieres cerrar sesión?')) {
      localStorage.removeItem('cobramatic_user_code');
      setUserCode(null);
      setIsAuthenticated(false);
      setMostrarApp(false);
      setClientes([]);
    }
  };

  // Manejar login
  const handleLogin = (code) => {
    setUserCode(code);
    setIsAuthenticated(true);
    setMostrarApp(true);
  };

  // Mostrar pantalla de login si no está autenticado
  if (!isAuthenticated) {
    return <Auth onLogin={handleLogin} />;
  }

  if (cargando) {
    return (
      <div className="container">
        <h1>💰 CobraMatic</h1>
        <p className="subtitle">Cargando datos...</p>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '3em' }}>⏳</div>
        </div>
      </div>
    );
  }

  // Mostrar Landing Page primero
  if (!mostrarApp) {
    return <Landing onIniciar={() => setMostrarApp(true)} />;
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1>💰 CobraMatic</h1>
          <p className="subtitle">Gestiona tus recordatorios de cobro por WhatsApp</p>
        </div>
        <button 
          onClick={handleLogout}
          style={{
            padding: '10px 20px',
            background: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9em',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.target.style.background = '#e8e8e8'}
          onMouseOut={(e) => e.target.style.background = '#f5f5f5'}
        >
          🚪 Cerrar sesión
        </button>
      </div>
      
      {/* Dashboard de Métricas */}
      {clientes.filter(c => !c.pagado).length > 0 && (
        <div className="dashboard">
          <div className="metrica-card">
            <div className="metrica-icon">👥</div>
            <div className="metrica-info">
              <div className="metrica-numero">{clientes.filter(c => !c.pagado).length}</div>
              <div className="metrica-label">Clientes Pendientes</div>
            </div>
          </div>
          
          <div className="metrica-card">
            <div className="metrica-icon">💵</div>
            <div className="metrica-info">
              <div className="metrica-numero">
                ${clientes
                  .filter(c => !c.pagado)
                  .reduce((total, c) => {
                    const monto = c.monto.replace(/[^0-9]/g, '');
                    return total + (parseInt(monto) || 0);
                  }, 0)
                  .toLocaleString('es-CO')}
              </div>
              <div className="metrica-label">Total Sin Cobrar</div>
            </div>
          </div>
          
          <div className="metrica-card">
            <div className="metrica-icon">⚠️</div>
            <div className="metrica-info">
              <div className="metrica-numero">
                {clientes.filter(c => {
                  if (c.pagado || !c.fecha) return false;
                  const fechaVencimiento = new Date(c.fecha);
                  const hoy = new Date();
                  return fechaVencimiento < hoy;
                }).length}
              </div>
              <div className="metrica-label">Cobros Vencidos</div>
            </div>
          </div>
        </div>
      )}
      
      <div className="alerta">
        ℹ️ Tip: Usa las variables {'{nombre}'}, {'{monto}'}, {'{fecha}'}, {'{concepto}'} en tu mensaje y se reemplazarán automáticamente
      </div>

      <form onSubmit={agregarCliente}>
        <div className="form-group">
          <label htmlFor="telefono">📱 Teléfono (con código de país, ej: 573001234567)</label>
          <input 
            type="tel" 
            id="telefono" 
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="573001234567" 
          />
        </div>

        <div className="form-group">
          <label htmlFor="nombre">👤 Nombre del Cliente</label>
          <input 
            type="text" 
            id="nombre" 
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Juan Pérez" 
          />
        </div>

        <div className="form-group">
          <label htmlFor="monto">💵 Monto a Cobrar</label>
          <input 
            type="text" 
            id="monto" 
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="$500,000 COP" 
          />
        </div>

        <div className="form-group">
          <label htmlFor="fecha">📅 Fecha de Vencimiento</label>
          <input 
            type="date" 
            id="fecha" 
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="concepto">📝 Concepto del Cobro</label>
          <input 
            type="text" 
            id="concepto" 
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Servicio de consultoría" 
          />
        </div>

        <div className="form-group">
          <label htmlFor="plantilla">📝 Plantilla de Mensaje</label>
          <select 
            id="plantilla" 
            value={plantillaSeleccionada}
            onChange={(e) => handlePlantillaChange(e.target.value)}
          >
            <option value="cortés">Cortés y Amable</option>
            <option value="recordatorio">Recordatorio Estándar</option>
            <option value="urgente">Urgente (Vencido)</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="mensaje">✉️ Mensaje Personalizado</label>
          <textarea 
            id="mensaje" 
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
          />
          <div className="variables">
            💡 Variables disponibles: {'{nombre}'}, {'{monto}'}, {'{fecha}'}, {'{concepto}'}
          </div>
        </div>

        <div className="mensaje-preview">
          <h4>👁️ Vista Previa del Mensaje:</h4>
          <pre>{generarPreview()}</pre>
        </div>

        <button type="submit" className="btn">
          ➕ Agregar Cliente
        </button>
      </form>

      <div className="clientes-list">
        <h2 style={{ marginTop: '40px', color: '#333', marginBottom: '20px' }}>
          📋 Clientes Pendientes
        </h2>
        
        {clientes.length === 0 ? (
          <p style={{ color: '#999', marginTop: '10px' }}>
            No hay clientes agregados aún
          </p>
        ) : (
          clientes.map(cliente => (
            <div 
              key={cliente.id} 
              className={`cliente-card ${cliente.pagado ? 'estado-pagado' : ''}`}
            >
              <h3>
                {cliente.nombre}
                {cliente.pagado && (
                  <span className="tag-pagado">✅ PAGADO</span>
                )}
                {cliente.enviados > 0 && (
                  <span className="badge-enviados">
                    📤 {cliente.enviados} recordatorio{cliente.enviados > 1 ? 's' : ''} enviado{cliente.enviados > 1 ? 's' : ''}
                  </span>
                )}
              </h3>
              <p><strong>📱 Teléfono:</strong> +{cliente.telefono}</p>
              <p><strong>💵 Monto:</strong> {cliente.monto}</p>
              <p><strong>📅 Vencimiento:</strong> {cliente.fecha}</p>
              <p><strong>📝 Concepto:</strong> {cliente.concepto}</p>
              
              <div style={{ marginTop: '10px' }}>
                {!cliente.pagado && (
                  <button 
                    className="btn-enviar" 
                    onClick={() => enviarWhatsApp(cliente.id)}
                  >
                    📲 Enviar Recordatorio
                  </button>
                )}
                
                <button 
                  className="btn-marcar-pagado" 
                  onClick={() => cliente.pagado ? desmarcarPagado(cliente.id) : marcarPagado(cliente.id)}
                >
                  {cliente.pagado ? '↩️ Desmarcar Pagado' : '✅ Marcar como Pagado'}
                </button>
                
                <button 
                  className="btn-eliminar" 
                  onClick={() => eliminarCliente(cliente.id)}
                >
                  🗑️ Eliminar
                </button>
                
                {cliente.historial && cliente.historial.length > 0 && (
                  <>
                    <button 
                      className="toggle-historial" 
                      onClick={() => toggleHistorial(cliente.id)}
                    >
                      👁️ {historialExpandido[cliente.id] ? 'Ocultar' : 'Ver'} Historial
                    </button>
                    
                    {historialExpandido[cliente.id] && (
                      <div className="historial">
                        <strong>📋 Historial de Envíos:</strong>
                        {cliente.historial.map((h, idx) => (
                          <div key={idx} className="historial-item">
                            🕐 {h.fecha} - {h.hora}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;