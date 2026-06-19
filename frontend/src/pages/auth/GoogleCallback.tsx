import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

/**
 * Página de callback OAuth de Google.
 * El backend redirige aquí con todos los datos de sesión como query params.
 * Esta página los extrae, los almacena en el authStore y redirige al dashboard.
 */
export function GoogleCallback() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');

    if (error) {
      const messages: Record<string, string> = {
        google_denied:         'Inicio de sesión con Google cancelado.',
        google_not_configured: 'Google OAuth no está configurado. Contacta al administrador.',
        google_token_failed:   'Error al obtener token de Google.',
        google_no_email:       'Tu cuenta de Google no tiene email.',
        google_error:          'Error al iniciar sesión con Google.',
        account_inactive:      'Tu cuenta está desactivada.',
      };
      toast.error(messages[error] || 'Error desconocido con Google.');
      navigate('/login');
      return;
    }

    const accessToken  = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const userId       = params.get('userId');
    const firstName    = params.get('firstName') || '';
    const lastName     = params.get('lastName')  || '';
    const email        = params.get('email')     || '';
    const companyId    = params.get('companyId') || '';
    const companyName  = params.get('companyName') || '';
    const companySlug  = params.get('companySlug') || '';
    const companyPlan  = params.get('companyPlan') || 'trial';
    const roleName     = params.get('roleName')  || '';
    const isOwner      = params.get('isOwner') === '1';

    if (!accessToken || !userId) {
      toast.error('Respuesta de Google incompleta.');
      navigate('/login');
      return;
    }

    setAuth({
      user: { id: userId, email, firstName, lastName },
      company: { id: companyId, name: companyName, slug: companySlug, plan: companyPlan },
      role: { id: '', name: roleName },
      permissions: [],
      accessToken,
      refreshToken: refreshToken || '',
      isOwner,
    });

    toast.success(`¡Bienvenido, ${firstName}!`);
    navigate('/dashboard', { replace: true });
  }, [navigate, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 text-sm">Iniciando sesión con Google...</p>
      </div>
    </div>
  );
}
