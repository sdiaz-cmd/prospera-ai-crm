import { createContext, useContext, useState, ReactNode } from 'react';

export type Lang = 'es' | 'en';

const translations = {
  es: {
    nav: {
      dashboard: 'Dashboard',
      leads: 'Leads',
      contacts: 'Contactos',
      accounts: 'Empresas',
      opportunities: 'Oportunidades',
      activities: 'Actividades',
      tasks: 'Tareas',
      quotes: 'Cotizaciones',
      products: 'Productos',
      suppliers: 'Proveedores',
      invoices: 'Facturas',
      inventory: 'Inventario',
      dashboardOps: 'Dashboard Ops',
      projects: 'Proyectos',
      calendar: 'Calendario',
      teams: 'Cuadrillas',
      campaigns: 'Campañas',
      landingPages: 'Landing Pages',
      whatsapp: 'WhatsApp Agent',
      ai: 'IA & Automatización',
      reports: 'Reportes',
      support: 'Soporte',
      commissions: 'Comisiones',
      costCenters: 'Centro de Costos',
      users: 'Usuarios',
      settings: 'Configuración',
      crm: 'CRM',
      financeErp: 'Finanzas & ERP',
      operations: 'Operaciones',
      marketing: 'Marketing',
      tools: 'Herramientas',
    },
    header: {
      search: 'Buscar leads, contactos, oportunidades...',
      profile: 'Mi Perfil',
      settings: 'Configuración',
      logout: 'Cerrar Sesión',
      darkMode: 'Modo oscuro',
      lightMode: 'Modo claro',
    },
    common: {
      create: 'Crear',
      edit: 'Editar',
      delete: 'Eliminar',
      cancel: 'Cancelar',
      save: 'Guardar',
      search: 'Buscar',
      loading: 'Cargando...',
      noData: 'Sin datos',
      actions: 'Acciones',
      confirm: 'Confirmar',
    },
  },
  en: {
    nav: {
      dashboard: 'Dashboard',
      leads: 'Leads',
      contacts: 'Contacts',
      accounts: 'Companies',
      opportunities: 'Opportunities',
      activities: 'Activities',
      tasks: 'Tasks',
      quotes: 'Quotes',
      products: 'Products',
      suppliers: 'Suppliers',
      invoices: 'Invoices',
      inventory: 'Inventory',
      dashboardOps: 'Ops Dashboard',
      projects: 'Projects',
      calendar: 'Calendar',
      teams: 'Teams',
      campaigns: 'Campaigns',
      landingPages: 'Landing Pages',
      whatsapp: 'WhatsApp Agent',
      ai: 'AI & Automation',
      reports: 'Reports',
      support: 'Support',
      commissions: 'Commissions',
      costCenters: 'Cost Centers',
      users: 'Users',
      settings: 'Settings',
      crm: 'CRM',
      financeErp: 'Finance & ERP',
      operations: 'Operations',
      marketing: 'Marketing',
      tools: 'Tools',
    },
    header: {
      search: 'Search leads, contacts, opportunities...',
      profile: 'My Profile',
      settings: 'Settings',
      logout: 'Log Out',
      darkMode: 'Dark mode',
      lightMode: 'Light mode',
    },
    common: {
      create: 'Create',
      edit: 'Edit',
      delete: 'Delete',
      cancel: 'Cancel',
      save: 'Save',
      search: 'Search',
      loading: 'Loading...',
      noData: 'No data',
      actions: 'Actions',
      confirm: 'Confirm',
    },
  },
} as const;

type DeepValue<T> = T extends string
  ? string
  : T extends Record<string, unknown>
  ? { [K in keyof T]: DeepValue<T[K]> }
  : never;

type Translations = DeepValue<typeof translations.es>;

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const parts = path.split('.');
  let val: unknown = obj;
  for (const p of parts) {
    if (val && typeof val === 'object') val = (val as Record<string, unknown>)[p];
    else return path;
  }
  return typeof val === 'string' ? val : path;
}

interface LangCtx {
  lang: Lang;
  toggleLang: () => void;
  t: (key: string) => string;
  translations: Translations;
}

const LanguageContext = createContext<LangCtx>({
  lang: 'es',
  toggleLang: () => {},
  t: (k) => k,
  translations: translations.es as unknown as Translations,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem('prospera-lang') as Lang) || 'es';
  });

  const toggleLang = () => {
    const next: Lang = lang === 'es' ? 'en' : 'es';
    setLang(next);
    localStorage.setItem('prospera-lang', next);
  };

  const t = (key: string): string =>
    getNestedValue(translations[lang] as unknown as Record<string, unknown>, key);

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t, translations: translations[lang] as unknown as Translations }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
