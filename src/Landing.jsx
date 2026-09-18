// src/Landing.jsx
import { Link } from 'react-router-dom';
import {
  Calendar, Users, Mail, CreditCard, BarChart3, Building2,
  Check, ArrowRight, Sparkles, Shield, Zap, Clock
} from 'lucide-react';

export function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* ============================================================ */}
      {/* HEADER FIJO */}
      {/* ============================================================ */}
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🧘</span>
            <span className="text-xl font-bold">Pilates App</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              to="/login-admin"
              className="text-sm px-4 py-2 rounded-lg border bg-white hover:bg-gray-50 transition"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/registro-admin"
              className="text-sm px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition font-medium"
            >
              Crear cuenta
            </Link>
          </nav>
        </div>
      </header>

      {/* ============================================================ */}
      {/* HERO */}
      {/* ============================================================ */}
      <section className="bg-gradient-to-b from-purple-50 to-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Nuevo · 14 días gratis sin tarjeta
          </div>

          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            Gestioná tu estudio de pilates
            <span className="block text-purple-600">sin Excel ni cuadernos</span>
          </h1>

          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Sistema completo de reservas, agenda, alumnos y notificaciones
            automáticas. Todo en un solo lugar, desde cualquier dispositivo.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              to="/registro-admin"
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-8 py-4 rounded-xl hover:bg-purple-700 transition font-medium text-lg shadow-lg shadow-purple-200"
            >
              Crear cuenta gratis
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 bg-white border px-8 py-4 rounded-xl hover:bg-gray-50 transition font-medium text-lg"
            >
              Ver funciones
            </a>
          </div>

          <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-green-600" />
              14 días gratis
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-green-600" />
              Sin tarjeta de crédito
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-green-600" />
              Cancelás cuando quieras
            </span>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FUNCIONES */}
      {/* ============================================================ */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Todo lo que tu estudio necesita
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Funciones pensadas para hacerte la vida más fácil y que tus
              alumnos reserven solos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Calendar}
              titulo="Calendario semanal"
              texto="Tus alumnos ven la disponibilidad en tiempo real y reservan su cama en un clic."
            />
            <FeatureCard
              icon={Users}
              titulo="Alumnos ilimitados"
              texto="Invitá a todos los alumnos que quieras. Cada uno con sus clases y su historial."
            />
            <FeatureCard
              icon={Mail}
              titulo="Invitaciones automáticas"
              texto="Mandás la invitación y el alumno crea su cuenta solo. Sin carga manual."
            />
            <FeatureCard
              icon={CreditCard}
              titulo="Pagos online"
              texto="Cobrá con MercadoPago o Stripe. Los packs se acreditan automáticamente."
            />
            <FeatureCard
              icon={BarChart3}
              titulo="Reportes y métricas"
              texto="Sabé qué clases se llenan, quién viene más, cuánto facturás por mes."
            />
            <FeatureCard
              icon={Building2}
              titulo="Varias sedes"
              texto="Gestioná hasta 3 estudios con sus propios calendarios e instructores."
            />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* PLANES */}
      {/* ============================================================ */}
      <section id="precios" className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Planes simples y honestos
            </h2>
            <p className="text-gray-600 text-lg">
              Empezá gratis. Cambiá cuando tu estudio crezca.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            {/* TRIAL */}
            <PlanCard
              nombre="Trial"
              precio="Gratis"
              periodo="14 días"
              descripcion="Probá todas las funciones sin pagar."
              features={[
                '1 sede',
                'Alumnos ilimitados',
                'Admins ilimitados',
                'Todas las funciones',
                'Soporte email 24h + WhatsApp'
              ]}
              cta="Empezar gratis"
              href="/registro-admin"
            />

            {/* BÁSICO */}
            <PlanCard
              nombre="Básico"
              precio="USD 25"
              periodo="/mes"
              subtitulo="o USD 250/año"
              descripcion="Ideal para el estudio chico donde vos manejás todo."
              features={[
                '1 sede',
                'Alumnos ilimitados',
                '1 solo administrador',
                '3 instructores',
                'Recordatorios por email',
                'Soporte email 24h + WhatsApp'
              ]}
              cta="Empezar"
              href="/registro-admin"
              popular
            />

            {/* PRO */}
            <PlanCard
              nombre="Pro"
              precio="USD 45"
              periodo="/mes"
              subtitulo="o USD 450/año"
              descripcion="Para el estudio que creció y quiere automatizar todo."
              features={[
                'Hasta 3 sedes',
                'Alumnos ilimitados',
                'Hasta 3 administradores',
                'Instructores ilimitados',
                'Marca blanca (logo + colores)',
                'Subdominio propio',
                'Pagos online',
                'Lista de espera',
                'Reportes avanzados',
                'Soporte email 24h + WhatsApp'
              ]}
              cta="Empezar"
              href="/registro-admin"
              destacado
            />
          </div>

          <p className="text-center text-gray-500 text-sm mt-8">
            ¿Necesitás más de 3 sedes?{' '}
            <a href="#" className="text-purple-600 hover:underline">
              Contactanos
            </a>
          </p>
        </div>
      </section>

      {/* ============================================================ */}
      {/* CTA FINAL */}
      {/* ============================================================ */}
      <section className="py-20 px-6 bg-purple-600">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-4xl font-bold mb-4">
            ¿Listo para digitalizar tu estudio?
          </h2>
          <p className="text-lg text-purple-100 mb-8">
            Sumate a los estudios que ya no usan papel.
            Empezá gratis en menos de 2 minutos.
          </p>
          <Link
            to="/registro-admin"
            className="inline-flex items-center gap-2 bg-white text-purple-700 px-8 py-4 rounded-xl hover:bg-gray-100 transition font-medium text-lg shadow-lg"
          >
            Crear mi cuenta gratis
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FOOTER */}
      {/* ============================================================ */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🧘</span>
              <span className="font-bold text-white">Pilates App</span>
            </div>
            <div className="flex gap-6 text-sm">
              <a href="#" className="hover:text-white transition">Términos</a>
              <a href="#" className="hover:text-white transition">Privacidad</a>
              <a href="#" className="hover:text-white transition">Contacto</a>
            </div>
          </div>
          <p className="text-center text-xs mt-8 text-gray-500">
            © 2026 Pilates App. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ============================================================
// COMPONENTE: Feature Card
// ============================================================
function FeatureCard({ icon: Icon, titulo, texto }) {
  return (
    <div className="p-6 rounded-2xl border bg-white hover:shadow-lg hover:border-purple-200 transition">
      <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-bold text-lg mb-2">{titulo}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{texto}</p>
    </div>
  );
}

// ============================================================
// COMPONENTE: Plan Card
// ============================================================
function PlanCard({
  nombre, precio, periodo, subtitulo, descripcion,
  features, cta, href, popular, destacado
}) {
  const borde = popular
    ? 'border-purple-600 border-2 shadow-lg'
    : destacado
    ? 'border-purple-300 border-2'
    : 'border-gray-200';

  return (
    <div className={`relative rounded-2xl bg-white p-8 ${borde}`}>
      {/* Badge */}
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-4 py-1 rounded-full">
          ⭐ MÁS POPULAR
        </div>
      )}
      {destacado && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-4 py-1 rounded-full">
          🚀 RECOMENDADO
        </div>
      )}

      <h3 className="font-bold text-xl mb-1">{nombre}</h3>
      <p className="text-sm text-gray-500 mb-6">{descripcion}</p>

      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold">{precio}</span>
          <span className="text-gray-500 text-sm">{periodo}</span>
        </div>
        {subtitulo && (
          <p className="text-xs text-gray-400 mt-1">{subtitulo}</p>
        )}
      </div>

      <Link
        to={href}
        className={`block text-center w-full py-3 rounded-lg font-medium transition mb-6 ${
          popular || destacado
            ? 'bg-purple-600 text-white hover:bg-purple-700'
            : 'bg-gray-900 text-white hover:bg-gray-800'
        }`}
      >
        {cta}
      </Link>

      <ul className="space-y-3">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <span className="text-gray-700">{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}