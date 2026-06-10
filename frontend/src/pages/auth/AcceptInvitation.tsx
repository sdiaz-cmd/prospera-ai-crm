import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock } from 'lucide-react';
import api from '../../services/api';

export function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [info, setInfo] = useState<{ email: string; companyName: string; roleName: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', password: '', confirm: '' });

  useEffect(() => {
    api.get(`/invitations/${token}`)
      .then(r => setInfo(r.data))
      .catch(e => setError(e.response?.data?.error || 'Invitación no válida o expirada'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden'); return; }
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/invitations/${token}/accept`, {
        firstName: form.firstName,
        lastName: form.lastName,
        password: form.password,
      });
      navigate('/login?invited=1');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error || 'Error al activar la cuenta');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <span className="text-xl font-bold text-gray-900">
            PROSPERA<span className="text-blue-500">.AI</span>
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/80 border border-gray-100 p-8">
          {error && !info ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-red-500 text-xl">✕</span>
              </div>
              <p className="text-gray-900 font-semibold mb-1">Invitación no válida</p>
              <p className="text-red-500 text-sm mb-5">{error}</p>
              <Link to="/login" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Ir al inicio de sesión →
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Activa tu cuenta</h2>
                <p className="text-gray-500 text-sm">
                  Fuiste invitado a <strong className="text-gray-900">{info?.companyName}</strong> como <strong className="text-gray-900">{info?.roleName}</strong>
                </p>
                <p className="text-blue-600 text-sm mt-1">{info?.email}</p>
              </div>

              {error && (
                <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-50 border border-red-100">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre <span className="text-red-500">*</span></label>
                    <input
                      type="text" required
                      value={form.firstName}
                      onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                      placeholder="Juan"
                      className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Apellido <span className="text-red-500">*</span></label>
                    <input
                      type="text" required
                      value={form.lastName}
                      onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                      placeholder="Pérez"
                      className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'} required minLength={8}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full border border-gray-300 rounded-lg pl-10 pr-10 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar contraseña <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'} required
                      value={form.confirm}
                      onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                      placeholder="Repite tu contraseña"
                      className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                  </div>
                </div>

                <button
                  type="submit" disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors shadow-sm shadow-blue-500/20 mt-2"
                >
                  {submitting ? 'Activando cuenta...' : 'Activar cuenta'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
