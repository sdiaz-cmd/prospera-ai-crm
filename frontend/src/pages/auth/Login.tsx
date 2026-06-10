import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface LoginForm {
  email: string;
  password: string;
}

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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-primary-950 flex">
      {/* Panel izquierdo */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600/20 to-purple-600/20" />
        <div className="relative z-10 text-white max-w-md">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="text-2xl font-bold">
              PROSPERA<span className="text-primary-400">.AI</span>
            </span>
          </div>

          <h1 className="text-4xl font-bold mb-6 leading-tight">
            Tu CRM inteligente para cerrar más ventas
          </h1>
          <p className="text-gray-400 text-lg mb-10">
            Gestiona leads, automatiza seguimientos y acelera tu ciclo de ventas con inteligencia artificial.
          </p>

          <div className="space-y-4">
            {[
              { icon: '🎯', title: 'Pipeline visual', desc: 'Gestiona oportunidades de ventas en tiempo real' },
              { icon: '🤖', title: 'IA integrada', desc: 'Responde leads y genera correos automáticamente' },
              { icon: '📊', title: 'Reportes en tiempo real', desc: 'Toma decisiones basadas en datos precisos' },
            ].map((feature) => (
              <div key={feature.title} className="flex items-start gap-4 p-4 bg-white/5 rounded-xl backdrop-blur-sm">
                <span className="text-2xl">{feature.icon}</span>
                <div>
                  <p className="font-semibold text-white">{feature.title}</p>
                  <p className="text-sm text-gray-400">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho - Formulario */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">P</span>
            </div>
            <span className="text-xl font-bold text-white">
              PROSPERA<span className="text-primary-400">.AI</span>
            </span>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Iniciar sesión</h2>
              <p className="text-gray-500 text-sm">Accede a tu plataforma PROSPERA.AI</p>
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
                <label className="flex items-center gap-2 cursor-pointer text-gray-600">
                  <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  Recordarme
                </label>
                <Link to="/forgot-password" className="text-primary-600 hover:text-primary-700 font-medium">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <Button type="submit" loading={loading} className="w-full" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Iniciar sesión
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                Regístrate gratis
              </Link>
            </div>

            {/* Demo credentials */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs font-medium text-gray-600 mb-2">💡 Credenciales de demo:</p>
              <p className="text-xs text-gray-500">admin@prospera.ai / Admin123!</p>
              <p className="text-xs text-gray-500">gerente@prospera.ai / Gerente123!</p>
              <p className="text-xs text-gray-500">ventas@prospera.ai / Ventas123!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
