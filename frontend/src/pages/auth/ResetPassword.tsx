import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error('La contraseña debe tener al menos 8 caracteres'); return; }
    if (password !== confirm) { toast.error('Las contraseñas no coinciden'); return; }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Enlace inválido o expirado');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-primary-950 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <p className="text-gray-600 mb-4">Enlace inválido.</p>
          <Link to="/forgot-password" className="text-primary-600 hover:underline font-medium">Solicitar nuevo enlace</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-primary-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <span className="text-2xl font-bold text-white">
            PROSPERA<span className="text-primary-400">.AI</span>
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {done ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">¡Contraseña actualizada!</h2>
              <p className="text-gray-500 text-sm">Redirigiendo al inicio de sesión...</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Nueva contraseña</h2>
                <p className="text-gray-500 text-sm">Elige una contraseña segura para tu cuenta.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label="Nueva contraseña"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  leftAddon={<Lock className="w-4 h-4" />}
                  rightAddon={
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="cursor-pointer">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  hint="Mínimo 8 caracteres"
                  required
                />
                <Input
                  label="Confirmar contraseña"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repite tu contraseña"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                />
                <Button type="submit" loading={loading} className="w-full" size="lg">
                  Cambiar contraseña
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
