// ─── Translation dictionary ───────────────────────────────────────────────────

export type Language = 'es' | 'en';

const es: Record<string, string> = {
  // Sidebar
  'nav.dashboard':     'Dashboard',
  'nav.crm':           'CRM',
  'nav.leads':         'Leads',
  'nav.contacts':      'Contactos',
  'nav.accounts':      'Cuentas',
  'nav.opportunities': 'Oportunidades',
  'nav.activities':    'Actividades',
  'nav.tasks':         'Tareas',
  'nav.quotes':        'Cotizaciones',
  'nav.finance':       'Finanzas',
  'nav.invoices':      'Facturas',
  'nav.products':      'Productos',
  'nav.inventory':     'Inventario',
  'nav.suppliers':     'Proveedores',
  'nav.marketing':     'Marketing',
  'nav.campaigns':     'Campañas',
  'nav.landing':       'Landing Pages',
  'nav.tools':         'Herramientas',
  'nav.reports':       'Reportes',
  'nav.ai':            'Asistente IA',
  'nav.whatsapp':      'WhatsApp',
  'nav.users':         'Usuarios',
  'nav.settings':      'Configuración',
  // Settings
  'settings.title':            'Configuración',
  'settings.subtitle':         'Gestiona la configuración de tu empresa',
  'settings.tab.empresa':      'Empresa',
  'settings.tab.plan':         'Plan y facturación',
  'settings.tab.security':     'Seguridad',
  'settings.tab.notifs':       'Notificaciones',
  'settings.tab.integrations': 'Integraciones',
  'settings.tab.appearance':   'Apariencia',
  // Appearance
  'appearance.theme':      'Tema',
  'appearance.theme.desc': 'Elige entre modo claro y oscuro',
  'appearance.light':      'Claro',
  'appearance.dark':       'Oscuro',
  'appearance.language':      'Idioma',
  'appearance.language.desc': 'Cambia el idioma de la interfaz',
  'appearance.es': 'Español',
  'appearance.en': 'English',
  // Common
  'common.search':  'Buscar leads, contactos, oportunidades...',
  'common.profile': 'Mi Perfil',
  'common.logout':  'Cerrar Sesión',
};

const en: Record<string, string> = {
  // Sidebar
  'nav.dashboard':     'Dashboard',
  'nav.crm':           'CRM',
  'nav.leads':         'Leads',
  'nav.contacts':      'Contacts',
  'nav.accounts':      'Accounts',
  'nav.opportunities': 'Opportunities',
  'nav.activities':    'Activities',
  'nav.tasks':         'Tasks',
  'nav.quotes':        'Quotes',
  'nav.finance':       'Finance',
  'nav.invoices':      'Invoices',
  'nav.products':      'Products',
  'nav.inventory':     'Inventory',
  'nav.suppliers':     'Suppliers',
  'nav.marketing':     'Marketing',
  'nav.campaigns':     'Campaigns',
  'nav.landing':       'Landing Pages',
  'nav.tools':         'Tools',
  'nav.reports':       'Reports',
  'nav.ai':            'AI Assistant',
  'nav.whatsapp':      'WhatsApp',
  'nav.users':         'Users',
  'nav.settings':      'Settings',
  // Settings
  'settings.title':            'Settings',
  'settings.subtitle':         'Manage your company settings',
  'settings.tab.empresa':      'Company',
  'settings.tab.plan':         'Plan & billing',
  'settings.tab.security':     'Security',
  'settings.tab.notifs':       'Notifications',
  'settings.tab.integrations': 'Integrations',
  'settings.tab.appearance':   'Appearance',
  // Appearance
  'appearance.theme':      'Theme',
  'appearance.theme.desc': 'Choose between light and dark mode',
  'appearance.light':      'Light',
  'appearance.dark':       'Dark',
  'appearance.language':      'Language',
  'appearance.language.desc': 'Change the interface language',
  'appearance.es': 'Español',
  'appearance.en': 'English',
  // Common
  'common.search':  'Search leads, contacts, opportunities...',
  'common.profile': 'My Profile',
  'common.logout':  'Sign Out',
};

const dicts: Record<Language, Record<string, string>> = { es, en };

export function getTranslations(lang: Language): Record<string, string> {
  return dicts[lang];
}
