import { useAppStore } from '@/store/appStore';
import { getTranslations, LangKey } from './translations';

export function useTranslation() {
  const language = useAppStore(s => s.language);
  const dict = getTranslations(language);

  const t = (key: LangKey): string => dict[key] ?? key;

  return { t, language };
}
