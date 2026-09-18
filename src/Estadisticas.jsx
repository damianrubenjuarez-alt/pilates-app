// src/Estadisticas.jsx
import { useState, useEffect } from 'react';
import { useEstudio } from './EstudioContext';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from './firebase/config';
import { 
  BarChart3, Users, Calendar, TrendingUp, Award, Clock 
} from 'lucide-react';

// ============================================================
// HELPERS DE FECHA
// ============================================================
function formatoISO(fecha) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function sumarDias(fecha, dias) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
}

const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// ============================================================
// PÁGINA: ESTADÍSTICAS
// ============================================================
export function Estadisticas() {
  const { estudio, esAdmin } = useEstudio();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [rango, setRango] = useState(30); // días
  const [stats, setStats] = useState(null);

  // ============================================================
  // Cargar datos de Firestore
  // ============================================================
  useEffect(() => {
    if (!estudio) return;

    async function cargarEstadisticas() {
      setCargando(true);
      setError('');
      try {
        const hoy = new Date();
        const desde = formatoISO(sumarDias(hoy, -rango));
        const hasta = formatoISO(hoy);

        // 1. Cargar todos los slots del rango
        const slotsRef = collection(db, 'estudios', estudio.id, 'slots');
        const q = query(
          slotsRef,
          where('fecha', '>=', desde),
          where('fecha', '<=', hasta),
          orderBy('fecha')
        );
        const slotsSnap = await getDocs(q);
        const slots = slotsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // 2. Cargar todos los miembros
        const miembrosRef = collection(db, 'estudios', estudio.id, 'miembros');
        const miembrosSnap = await getDocs(miembrosRef);
        const miembros = miembrosSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // 3. Calcular estadísticas
        const totalSlots = slots.length;
        let totalCamas = 0;
        let camasOcupadas = 0;
        
        const reservasPorTipo = {};      // { Reformer: 5, Mat: 3 }
        const reservasPorDia = {};        // { 1: 10, 2: 8, ... } (1=lunes, 7=domingo)
        const reservasPorHora = {};       // { "10:00": 5, "18:00": 8 }
        const reservasPorAlumno = {};     // { uid: 5, uid2: 3 }

        slots.forEach(slot => {
          totalCamas += slot.camas.length;
          
          // Día de la semana (1=lunes, 7=domingo)
          const fechaSlot = new Date(slot.fecha + 'T00:00:00');
          const diaSemana = fechaSlot.getDay() === 0 ? 7 : fechaSlot.getDay();
          
          // Hora
          const hora = slot.hora;
          
          // Tipo
          const tipo = slot.tipo || 'Otro';
          
          slot.camas.forEach(cama => {
            if (cama.estado === 'ocupada' && cama.uid) {
              camasOcupadas++;
              
              // Contar por tipo
              reservasPorTipo[tipo] = (reservasPorTipo[tipo] || 0) + 1;
              
              // Contar por día
              reservasPorDia[diaSemana] = (reservasPorDia[diaSemana] || 0) + 1;
              
              // Contar por hora
              reservasPorHora[hora] = (reservasPorHora[hora] || 0) + 1;
              
              // Contar por alumno
              reservasPorAlumno[cama.uid] = (reservasPorAlumno[cama.uid] || 0) + 1;
            }
          });
        });

        // Ordenar rankings
        const tiposOrdenados = Object.entries(reservasPorTipo)
          .sort((a, b) => b[1] - a[1]);
        
        const diasOrdenados = Object.entries(reservasPorDia)
          .sort((a, b) => a[0] - b[0]);
        
        const horasOrdenadas = Object.entries(reservasPorHora)
          .sort((a, b) => b[1] - a[1]);
        
        const alumnosOrdenados = Object.entries(reservasPorAlumno)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([uid, count]) => {
            const m = miembros.find(x => x.uid === uid);
            return { uid, count, nombre: m?.nombre || 'Desconocido', email: m?.email };
          });

        // Ocupación promedio
        const ocupacionPromedio = totalCamas > 0 
          ? Math.round((camasOcupadas / totalCamas) * 100) 
          : 0;

        // Contar alumnos activos (con al menos 1 reserva)
        const alumnosActivos = Object.keys(reservasPorAlumno).length;

        setStats({
          totalSlots,
          totalCamas,
          camasOcupadas,
          ocupacionPromedio,
          alumnosActivos,
          totalMiembros: miembros.filter(m => m.rol === 'alumno').length,
          tiposOrdenados,
          diasOrdenados,
          horasOrdenadas,
          alumnosOrdenados,
        });

      } catch (e) {
        console.error('Error cargando estadísticas:', e);
        setError('Error al cargar las estadísticas: ' + e.message);
      } finally {
        setCargando(false);
      }
    }

    cargarEstadisticas();
  }, [estudio?.id, rango]);

  // ============================================================
  // Control de acceso
  // ============================================================
  if (!estudio) return <div className="p-8">Cargando estudio...</div>;

  if (!esAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-lg font-bold mb-2">Acceso denegado</h2>
          <p className="text-sm text-gray-600">
            Solo los administradores pueden ver las estadísticas.
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-purple-600" />
          Estadísticas
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {estudio.nombre} · Últimos {rango} días
        </p>
      </div>

      {/* Selector de rango */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {[7, 30, 90].map(dias => (
          <button
            key={dias}
            onClick={() => setRango(dias)}
            className={`text-sm px-4 py-2 rounded border transition ${
              rango === dias
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {dias} días
          </button>
        ))}
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="mb-6 text-sm bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Cargando */}
      {cargando ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-600 border-t-transparent"></div>
        </div>
      ) : stats && (
        <>
          {/* ============================================================ */}
          {/* TARJETAS DE RESUMEN                                            */}
          {/* ============================================================ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            
            <TarjetaResumen
              icono={<Calendar className="w-5 h-5" />}
              titulo="Clases creadas"
              valor={stats.totalSlots}
              color="blue"
            />
            
            <TarjetaResumen
              icono={<TrendingUp className="w-5 h-5" />}
              titulo="Reservas totales"
              valor={stats.camasOcupadas}
              color="green"
            />
            
            <TarjetaResumen
              icono={<BarChart3 className="w-5 h-5" />}
              titulo="Ocupación"
              valor={`${stats.ocupacionPromedio}%`}
              color="purple"
            />
            
            <TarjetaResumen
              icono={<Users className="w-5 h-5" />}
              titulo="Alumnos activos"
              valor={`${stats.alumnosActivos}/${stats.totalMiembros}`}
              color="orange"
            />
          </div>

          {/* ============================================================ */}
          {/* RANKINGS                                                       */}
          {/* ============================================================ */}
          <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-6">
            
            {/* Clases más populares */}
            <div className="bg-white border rounded-lg p-5">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                Clases más populares
              </h2>
              {stats.tiposOrdenados.length === 0 ? (
                <p className="text-sm text-gray-500">Sin datos todavía</p>
              ) : (
                <div className="space-y-3">
                  {stats.tiposOrdenados.map(([tipo, count], i) => {
                    const max = stats.tiposOrdenados[0][1];
                    const porcentaje = (count / max) * 100;
                    return (
                      <div key={tipo}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{i + 1}. {tipo}</span>
                          <span className="text-gray-600">{count} reservas</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full transition-all"
                            style={{ width: `${porcentaje}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Alumnos más activos */}
            <div className="bg-white border rounded-lg p-5">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Alumnos más activos
              </h2>
              {stats.alumnosOrdenados.length === 0 ? (
                <p className="text-sm text-gray-500">Sin datos todavía</p>
              ) : (
                <div className="space-y-2">
                  {stats.alumnosOrdenados.slice(0, 5).map((a, i) => (
                    <div key={a.uid} className="flex justify-between items-center text-sm py-1 border-b border-gray-100 last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {i + 1}. {a.nombre}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{a.email}</p>
                      </div>
                      <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded ml-2 whitespace-nowrap">
                        {a.count} reservas
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* OCUPACIÓN POR DÍA Y HORA                                       */}
          {/* ============================================================ */}
          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            
            {/* Ocupación por día */}
            <div className="bg-white border rounded-lg p-5">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Días más ocupados
              </h2>
              {stats.diasOrdenados.length === 0 ? (
                <p className="text-sm text-gray-500">Sin datos todavía</p>
              ) : (
                <div className="space-y-2">
                  {stats.diasOrdenados.map(([dia, count]) => {
                    const max = Math.max(...stats.diasOrdenados.map(d => d[1]));
                    const porcentaje = (count / max) * 100;
                    const nombreDia = DIAS_LARGOS[Number(dia) % 7];
                    return (
                      <div key={dia}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{nombreDia}</span>
                          <span className="text-gray-600">{count}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${porcentaje}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ocupación por hora */}
            <div className="bg-white border rounded-lg p-5">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" />
                Horarios más pedidos
              </h2>
              {stats.horasOrdenadas.length === 0 ? (
                <p className="text-sm text-gray-500">Sin datos todavía</p>
              ) : (
                <div className="space-y-2">
                  {stats.horasOrdenadas.slice(0, 8).map(([hora, count]) => {
                    const max = stats.horasOrdenadas[0][1];
                    const porcentaje = (count / max) * 100;
                    return (
                      <div key={hora}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{hora}</span>
                          <span className="text-gray-600">{count}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${porcentaje}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Nota al pie */}
          <p className="text-xs text-gray-400 mt-6 text-center">
            Los datos se calculan en base a los slots de los últimos {rango} días.
          </p>
        </>
      )}
    </div>
  );
}

// ============================================================
// COMPONENTE: Tarjeta de resumen
// ============================================================
function TarjetaResumen({ icono, titulo, valor, color }) {
  const colores = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colores[color]}`}>
        {icono}
      </div>
      <p className="text-xs text-gray-500 mb-1">{titulo}</p>
      <p className="text-2xl font-bold">{valor}</p>
    </div>
  );
}