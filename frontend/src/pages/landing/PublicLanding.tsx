import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle, AlertCircle } from 'lucide-react';
import api from '@/services/api';

interface LandingPage {
  name: string; slug: string;
  headline: string; subheadline: string; description: string;
  ctaText: string; primaryColor: string; bgColor: string; logoText: string;
  showPhone: boolean; showCompany: boolean; showMessage: boolean;
}

export function PublicLanding() {
  const { slug } = useParams<{ slug: string }>();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', message: '' });

  const { data: page, isLoading, isError } = useQuery({
    queryKey: ['public-lp', slug],
    queryFn: () => api.get<LandingPage>(`/landing-pages/public/${slug}`).then(r => r.data),
    retry: false,
  });

  const submitMut = useMutation({
    mutationFn: () => api.post(`/landing-pages/public/${slug}/submit`, form).then(r => r.data),
    onSuccess: () => setSubmitted(true),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-700">Página no encontrada</h1>
          <p className="text-gray-400 mt-1 text-sm">Esta página no existe o ya no está disponible.</p>
        </div>
      </div>
    );
  }

  const color = page.primaryColor || '#6366f1';

  const inputCls = 'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 bg-white';

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: page.bgColor || '#f9fafb' }}>
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        {/* Logo */}
        {page.logoText && (
          <div className="mb-8 text-center">
            <span className="text-2xl font-bold" style={{ color }}>{page.logoText}</span>
          </div>
        )}

        <div className="w-full max-w-md">
          {/* Headline */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
              {page.headline}
            </h1>
            {page.subheadline && (
              <p className="text-lg text-gray-600">{page.subheadline}</p>
            )}
            {page.description && (
              <p className="text-sm text-gray-500 mt-3 leading-relaxed">{page.description}</p>
            )}
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
            {submitted ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${color}20` }}>
                  <CheckCircle className="w-8 h-8" style={{ color }} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">¡Recibido!</h2>
                <p className="text-gray-500 text-sm">Gracias por tu interés. Nos pondremos en contacto contigo muy pronto.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Nombre completo *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Tu nombre"
                    className={inputCls}
                    style={{ '--tw-ring-color': color } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Correo electrónico</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="tu@correo.com"
                    className={inputCls}
                  />
                </div>
                {page.showPhone && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Teléfono</label>
                    <input
                      value={form.phone}
                      onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="+52 55 1234 5678"
                      className={inputCls}
                    />
                  </div>
                )}
                {page.showCompany && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Empresa</label>
                    <input
                      value={form.company}
                      onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                      placeholder="Nombre de tu empresa"
                      className={inputCls}
                    />
                  </div>
                )}
                {page.showMessage && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Mensaje</label>
                    <textarea
                      value={form.message}
                      onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                      rows={3}
                      placeholder="¿En qué podemos ayudarte?"
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                )}

                {submitMut.isError && (
                  <p className="text-sm text-red-600 text-center">Ocurrió un error. Intenta de nuevo.</p>
                )}

                <button
                  onClick={() => submitMut.mutate()}
                  disabled={!form.name || submitMut.isPending}
                  className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-opacity disabled:opacity-50 hover:opacity-90"
                  style={{ backgroundColor: color }}
                >
                  {submitMut.isPending ? 'Enviando...' : page.ctaText}
                </button>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-5">
            Powered by <span className="font-semibold">PROSPERA.AI</span>
          </p>
        </div>
      </div>
    </div>
  );
}
