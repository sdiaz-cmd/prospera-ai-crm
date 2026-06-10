import { Clock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

interface ComingSoonProps {
  title: string;
  description: string;
  phase: string;
}

export function ComingSoon({ title, description, phase }: ComingSoonProps) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
      <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mb-6">
        <Clock className="w-8 h-8 text-primary-600" />
      </div>
      <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-3 py-1 rounded-full mb-4">
        {phase}
      </span>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">{title}</h2>
      <p className="text-gray-500 max-w-md mb-8">{description}</p>
      <Button variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/dashboard')}>
        Volver al Dashboard
      </Button>
    </div>
  );
}
