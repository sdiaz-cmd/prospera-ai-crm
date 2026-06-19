import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, ArrowRight, TrendingUp, Users, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface LoginForm {
  email: string;
  password: string;
}

const features = [
  {
    icon: TrendingUp,
    title: 'Pipeline visual',
    desc: 'Gestiona oportunidades de ventas en tiempo real',
  },
  {
    icon: Zap,
    title: 'IA integrada',
    desc: 'Responde leads y genera correos automáticamente',
  },
  {
    icon: Users,
    title: 'Equipo conectado',
    desc: 'Tus vendedores, clientes y datos en un solo lugar',
  },
];

export function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors }, setError } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const result = await authService.login(data.email, data.password);
      setAuth(result);
      navigate('/dashboard');
      toast.success(`¡Bienvenido, ${result.user.firstName}!`);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const msg = axiosError?.response?.data?.message || 'Credenciales incorrectas';
      setError('email', { message: ' ' });
      setError('password', { message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo — branding */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-gray-950">
        {/* Fondo con gradiente y patrón */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 via-blue-950/60 to-gray-950" />
        <div className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 20%, rgba(37,99,235,0.15) 0%, transparent 50%),
                              radial-gradient(circle at 80% 80%, rgba(14,165,233,0.1) 0%, transparent 50%)`,
          }}
        />

        {/* Grid decorativo */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              PROSPERA<span className="text-blue-400">.AI</span>
            </span>
          </div>

          {/* Hero copy */}
          <div className="max-w-sm">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1.5 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-blue-300 text-xs font-medium">CRM inteligente para LATAM</span>
            </div>

            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Cierra más ventas.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">
                Con menos esfuerzo.
              </span>
            </h1>

            <p className="text-gray-400 text-base leading-relaxed mb-10">
              Gestiona leads, automatiza seguimientos y toma decisiones con inteligencia artificial.
            </p>

            <div className="space-y-3">
              {features.map((f) => (
                <div key={f.title} className="flex items-center gap-4 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <f.icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{f.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-gray-600 text-xs">© 2025 PROSPERA.AI · Todos los derechos reservados</p>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-6 lg:p-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-lg font-bold text-gray-900">
              PROSPERA<span className="text-blue-500">.AI</span>
            </span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/80 border border-gray-100 p-8">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Iniciar sesión</h2>
              <p className="text-gray-500 text-sm">Accede a tu plataforma PROSPERA.AI</p>
            </div>

            {/* Google Login */}
            <button
              type="button"
              onClick={() => {
                const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/api$/, '');
                window.location.href = `${base}/api/auth/google`;
              }}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-5"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.826.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </button>

            <div className="relative flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">o con email</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <Input
                label="Correo electrónico"
                type="email"
                placeholder="tu@empresa.com"
                error={errors.email?.message}
                leftAddon={<Mail className="w-4 h-4" />}
                required
                {...register('email', {
                  required: 'El correo es requerido',
                  pattern: { value: /\S+@\S+\.\S+/, message: 'Correo inválido' },
                })}
              />

              <Input
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                placeholder="Tu contraseña"
                error={errors.password?.message}
                leftAddon={<Lock className="w-4 h-4" />}
                rightAddon={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="cursor-pointer">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
                {...register('password', { required: 'La contraseña es requerida' })}
              />

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer text-gray-600 select-none">
                  <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  Recordarme
                </label>
                <Link to="/forgot-password" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <Button type="submit" loading={loading} className="w-full" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Iniciar sesión
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center text-sm text-gray-500">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
                Regístrate gratis
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
