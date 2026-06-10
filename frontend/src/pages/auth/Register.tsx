import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, User, Building2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyName: string;
}

export function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>();
  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      const result = await authService.register({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        companyName: data.companyName,
      });
      setAuth(result);
      navigate('/dashboard');
      toast.success('¡Cuenta creada! Bienvenido a PROSPERA.AI 🎉');
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      toast.error(axiosError?.response?.data?.message || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-primary-950 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <span className="text-2xl font-bold text-white">
            PROSPERA<span className="text-primary-400">.AI</span>
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Crear cuenta gratis</h2>
            <p className="text-gray-500 text-sm">14 días de prueba gratuita. Sin tarjeta de crédito.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nombre"
                placeholder="Juan"
                error={errors.firstName?.message}
                leftAddon={<User className="w-4 h-4" />}
                required
                {...register('firstName', { required: 'El nombre es requerido' })}
              />
              <Input
                label="Apellido"
                placeholder="Pérez"
                error={errors.lastName?.message}
                required
                {...register('lastName', { required: 'El apellido es requerido' })}
              />
            </div>

            <Input
              label="Empresa"
              placeholder="Mi Empresa SA de CV"
              error={errors.companyName?.message}
              leftAddon={<Building2 className="w-4 h-4" />}
              required
              {...register('companyName', { required: 'El nombre de la empresa es requerido' })}
            />

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

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 8 caracteres"
                error={errors.password?.message}
                leftAddon={<Lock className="w-4 h-4" />}
                rightAddon={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="cursor-pointer">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
                hint="Mayúscula, minúscula y número"
                {...register('password', {
                  required: 'La contraseña es requerida',
                  minLength: { value: 8, message: 'Mínimo 8 caracteres' },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                    message: 'Debe tener mayúscula, minúscula y número',
                  },
                })}
              />
              <Input
                label="Confirmar contraseña"
                type={showPassword ? 'text' : 'password'}
                placeholder="Repite tu contraseña"
                error={errors.confirmPassword?.message}
                required
                {...register('confirmPassword', {
                  required: 'Confirma tu contraseña',
                  validate: (v) => v === password || 'Las contraseñas no coinciden',
                })}
              />
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                required
                className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="terms" className="text-sm text-gray-600">
                Acepto los{' '}
                <a href="#" className="text-primary-600 hover:underline">Términos de Servicio</a>{' '}
                y la{' '}
                <a href="#" className="text-primary-600 hover:underline">Política de Privacidad</a>
              </label>
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Crear cuenta gratis
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
