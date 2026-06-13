import { useAppStore } from '@/store/appStore';
import { getTranslations } from './translations';

export function useTranslation() {
  const language = useAppStore(s => s.language);
  const dict = getTranslations(language);

  const t = (key: string): string => dict[key] ?? key;

  return { t, language };
}
