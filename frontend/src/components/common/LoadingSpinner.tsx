import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] gap-3">
      <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center">
          <span className="text-white font-bold text-xl">P</span>
        </div>
        <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
        <p className="text-sm text-gray-400">Cargando PROSPERA.AI...</p>
      </div>
    </div>
  );
}
