// ─── Translation dictionary ───────────────────────────────────────────────────
// Add new keys as needed. Use the 'es' key in Spanish source code
// and call t('key') to get the current language value.

export type LangKey = keyof typeof translations.es;

const translations = {
  es: {
    // Sidebar navigation
    'nav.dashboard':      'Dashboard',
    'nav.crm':            'CRM',
    'nav.leads':          'Leads',
    'nav.contacts':       'Contactos',
    'nav.accounts':       'Cuentas',
    'nav.opportunities':  'Oportunidades',
    'nav.activities':     'Actividades',
    'nav.tasks':          'Tareas',
    'nav.quotes':         'Cotizaciones',
    'nav.finance':        'Finanzas',
    'nav.invoices':       'Facturas',
    'nav.products':       'Productos',
    'nav.inventory':      'Inventario',
    'nav.suppliers':      'Proveedores',
    'nav.marketing':      'Marketing',
    'nav.campaigns':      'Campañas',
    'nav.landing':        'Landing Pages',
    'nav.tools':          'Herramientas',
    'nav.reports':        'Reportes',
    'nav.ai':             'Asistente IA',
    'nav.whatsapp':       'WhatsApp',
    'nav.users':          'Usuarios',
    'nav.settings':       'Configuración',

    // Settings
    'settings.title':         'Configuración',
    'settings.subtitle':      'Gestiona la configuración de tu empresa',
    'settings.tab.empresa':   'Empresa',
    'settings.tab.plan':      'Plan y facturación',
    'settings.tab.security':  'Seguridad',
    'settings.tab.notifs':    'Notificaciones',
    'settings.tab.integrations': 'Integraciones',
    'settings.tab.appearance': 'Apariencia',

    // Appearance
    'appearance.title':       'Apariencia e Idioma',
    'appearance.theme':       'Tema',
    'appearance.theme.desc':  'Elige entre modo claro y oscuro',
    'appearance.light':       'Claro',
    'appearance.dark':        'Oscuro',
    'appearance.language':    'Idioma',
    'appearance.language.desc': 'Cambia el idioma de la interfaz',
    'appearance.es':          'Español',
    'appearance.en':          'English',

    // Common
    'common.save':    'Guardar cambios',
    'common.cancel':  'Cancelar',
    'common.delete':  'Eliminar',
    'common.edit':    'Editar',
    'common.create':  'Crear',
    'common.search':  'Buscar leads, contactos, oportunidades...',
    'common.loading': 'Cargando...',
    'common.profile': 'Mi Perfil',
    'common.logout':  'Cerrar Sesión',
  },
  en: {
    // Sidebar navigation
    'nav.dashboard':      'Dashboard',
    'nav.crm':            'CRM',
    'nav.leads':          'Leads',
    'nav.contacts':       'Contacts',
    'nav.accounts':       'Accounts',
    'nav.opportunities':  'Opportunities',
    'nav.activities':     'Activities',
    'nav.tasks':          'Tasks',
    'nav.quotes':         'Quotes',
    'nav.finance':        'Finance',
    'nav.invoices':       'Invoices',
    'nav.products':       'Products',
    'nav.inventory':      'Inventory',
    'nav.suppliers':      'Suppliers',
    'nav.marketing':      'Marketing',
    'nav.campaigns':      'Campaigns',
    'nav.landing':        'Landing Pages',
    'nav.tools':          'Tools',
    'nav.reports':        'Reports',
    'nav.ai':             'AI Assistant',
    'nav.whatsapp':       'WhatsApp',
    'nav.users':          'Users',
    'nav.settings':       'Settings',

    // Settings
    'settings.title':         'Settings',
    'settings.subtitle':      'Manage your company settings',
    'settings.tab.empresa':   'Company',
    'settings.tab.plan':      'Plan & billing',
    'settings.tab.security':  'Security',
    'settings.tab.notifs':    'Notifications',
    'settings.tab.integrations': 'Integrations',
    'settings.tab.appearance': 'Appearance',

    // Appearance
    'appearance.title':       'Appearance & Language',
    'appearance.theme':       'Theme',
    'appearance.theme.desc':  'Choose between light and dark mode',
    'appearance.light':       'Light',
    'appearance.dark':        'Dark',
    'appearance.language':    'Language',
    'appearance.language.desc': 'Change the interface language',
    'appearance.es':          'Español',
    'appearance.en':          'English',

    // Common
    'common.save':    'Save changes',
    'common.cancel':  'Cancel',
    'common.delete':  'Delete',
    'common.edit':    'Edit',
    'common.create':  'Create',
    'common.search':  'Search leads, contacts, opportunities...',
    'common.loading': 'Loading...',
    'common.profile': 'My Profile',
    'common.logout':  'Sign Out',
  },
} as const;

export type TranslationDict = typeof translations.es;

export function getTranslations(lang: 'es' | 'en'): TranslationDict {
  return translations[lang];
}
