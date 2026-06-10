import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      toast.error('Error al enviar el correo. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-primary-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
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
          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Revisa tu correo</h2>
              <p className="text-gray-500 text-sm mb-6">
                Si <strong>{email}</strong> tiene una cuenta, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
              </p>
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center justify-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">¿Olvidaste tu contraseña?</h2>
                <p className="text-gray-500 text-sm">Ingresa tu correo y te enviaremos un enlace para restablecerla.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label="Correo electrónico"
                  type="email"
                  placeholder="tu@empresa.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  leftAddon={<Mail className="w-4 h-4" />}
                  required
                />
                <Button type="submit" loading={loading} className="w-full" size="lg">
                  Enviar enlace de recuperación
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-500">
                <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium flex items-center justify-center gap-1">
                  <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
