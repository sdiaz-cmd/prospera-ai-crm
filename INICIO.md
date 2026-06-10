# 🚀 PROSPERA.AI — Guía de Inicio

## Stack Tecnológico
| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Base de datos | SQLite (dev) → PostgreSQL (producción) |
| Auth | JWT + Refresh Tokens + bcrypt |
| Estado | Zustand + React Query |

---

## Inicio Rápido

### 1. Configurar el Backend

```bash
cd backend

# Copiar variables de entorno (ya configurado para desarrollo)
cp .env.example .env

# Instalar dependencias (ya instaladas)
npm install

# Crear base de datos y datos de prueba
npm run db:setup

# Iniciar servidor (puerto 4000)
npm run dev
```

### 2. Configurar el Frontend

```bash
cd frontend

# Instalar dependencias (ya instaladas)
npm install

# Iniciar aplicación (puerto 5173)
npm run dev
```

### 3. Abrir en el navegador

```
http://localhost:5173
```

---

## Credenciales de Acceso

| Rol | Email | Contraseña |
|---|---|---|
| **Administrador** | admin@prospera.ai | Admin123! |
| **Gerente** | gerente@prospera.ai | Gerente123! |
| **Ejecutivo de Ventas** | ventas@prospera.ai | Ventas123! |

---

## Estructura del Proyecto

```
PROSPERA.AI/CRM/
├── backend/                    # API REST (Express + TypeScript)
│   ├── src/
│   │   ├── database/           # DB: schema, setup, helpers
│   │   ├── middleware/         # Auth, errores
│   │   ├── modules/
│   │   │   ├── auth/           # Login, registro, refresh, me
│   │   │   ├── users/          # CRUD usuarios de empresa
│   │   │   ├── roles/          # RBAC: roles y permisos
│   │   │   ├── companies/      # Configuración de empresa
│   │   │   └── dashboard/      # KPIs y métricas
│   │   ├── utils/              # JWT, respuestas HTTP
│   │   └── types/              # Tipos TypeScript
│   ├── .env                    # Variables de entorno
│   └── dev.db                  # Base de datos SQLite (se crea al ejecutar db:setup)
│
└── frontend/                   # SPA React + TypeScript
    ├── src/
    │   ├── components/
    │   │   ├── ui/             # Button, Input, Card, Modal, Badge, Avatar
    │   │   ├── layout/         # Sidebar, Header, Layout
    │   │   └── common/         # ProtectedRoute, LoadingSpinner
    │   ├── pages/
    │   │   ├── auth/           # Login, Registro
    │   │   ├── dashboard/      # Dashboard con KPIs y gráficas
    │   │   ├── users/          # Gestión de usuarios
    │   │   └── settings/       # Configuración de empresa
    │   ├── services/           # Capa de API (axios)
    │   ├── store/              # Estado global (Zustand)
    │   ├── types/              # Tipos TypeScript
    │   └── utils/              # Helpers, formatos, constantes
    └── ...config files
```

---

## API Endpoints (Backend)

### Autenticación
| Método | Ruta | Descripción |
|---|---|---|
| POST | /api/auth/register | Crear cuenta + empresa |
| POST | /api/auth/login | Iniciar sesión |
| POST | /api/auth/refresh | Renovar access token |
| POST | /api/auth/logout | Cerrar sesión |
| GET  | /api/auth/me | Datos del usuario activo |

### Usuarios
| Método | Ruta | Descripción |
|---|---|---|
| GET | /api/users | Listar usuarios de la empresa |
| POST | /api/users | Crear nuevo usuario |
| PUT | /api/users/:id | Actualizar usuario |
| DELETE | /api/users/:id | Eliminar usuario de empresa |

### Roles y Permisos
| Método | Ruta | Descripción |
|---|---|---|
| GET | /api/roles | Listar roles |
| POST | /api/roles | Crear rol |
| PUT | /api/roles/:id | Actualizar rol |
| DELETE | /api/roles/:id | Eliminar rol |
| GET | /api/roles/permissions | Todos los permisos del sistema |

### Empresa y Dashboard
| Método | Ruta | Descripción |
|---|---|---|
| GET | /api/company/settings | Configuración de la empresa |
| PUT | /api/company/settings | Actualizar configuración |
| GET | /api/dashboard/overview | KPIs, métricas y gráficas |

### Leads (CRM)
| Método | Ruta | Descripción |
|---|---|---|
| GET | /api/leads | Listar leads (search, status, source, page) |
| GET | /api/leads/stats | Conteos por status |
| GET | /api/leads/:id | Lead + actividades + tareas |
| POST | /api/leads | Crear lead |
| PUT | /api/leads/:id | Actualizar lead |
| PATCH | /api/leads/:id/convert | Convertir a cliente |
| DELETE | /api/leads/:id | Eliminar |

### Contactos, Cuentas, Oportunidades, Actividades, Tareas
| Prefijo | GET / | GET /:id | POST / | PUT /:id | DELETE /:id |
|---|---|---|---|---|---|
| /api/contacts | ✅ | ✅ | ✅ | ✅ | ✅ |
| /api/accounts | ✅ | ✅ | ✅ | ✅ | ✅ |
| /api/opportunities | ✅ + /kanban + /stats | ✅ | ✅ | ✅ + PATCH /:id/stage | ✅ |
| /api/activities | ✅ | ✅ | ✅ | ✅ | ✅ |
| /api/tasks | ✅ | ✅ | ✅ | ✅ | ✅ |

---

### ⚠️ Al actualizar a Fase 2: re-ejecuta el setup
El schema de la base de datos cambió (columnas nuevas). En la carpeta `backend/`:
```bash
rm dev.db
npm run db:setup
```

---

## Módulos Implementados

### ✅ Completados
- **Autenticación**: Login, Registro de empresa, JWT + Refresh tokens
- **Multiempresa**: Cada empresa es un tenant independiente
- **Roles y Permisos**: RBAC completo (42 permisos por 7 módulos)
- **Usuarios**: Invitar, gestionar, desactivar
- **Dashboard**: KPIs en tiempo real, pipeline, actividades, gráficas
- **Configuración**: Datos de empresa, plan, seguridad, notificaciones
- **Leads**: CRUD completo, vista tabla + kanban, filtros, score, conversión
- **Contactos**: CRUD, vinculación a cuentas, asignación
- **Cuentas**: CRUD, empresa con contactos y oportunidades vinculadas
- **Oportunidades**: Pipeline Kanban visual, estadísticas de pipeline, mover etapas
- **Actividades**: Timeline de llamadas, emails, reuniones, notas, demos
- **Tareas**: Lista con prioridades, estados, fechas límite, toggle completar

### 🔜 Próximas Fases
- **Fase 2 restante**: Cotizaciones (Quotes)
- **Fase 3**: ERP (Productos, Inventario, Proveedores, Facturación)
- **Fase 4**: Marketing (Campañas, Segmentación, Email Templates)
- **Fase 5**: IA (Agente de leads, Generador de correos, Clasificación automática)
- **Fase 6**: Landing Pages con captura de leads
- **Fase 7**: Reportes y Forecast
- **Fase 8**: Integraciones (Gmail, WhatsApp, Apollo, LinkedIn, n8n)

---

## Para Producción

### PostgreSQL
En `.env`, cambiar:
```env
DATABASE_URL=postgresql://user:password@host:5432/prospera_ai
```

Y actualizar `src/database/db.ts` para usar el driver de PostgreSQL.

### Servicios recomendados
| Servicio | Uso | Gratis |
|---|---|---|
| [Railway](https://railway.app) | Backend + PostgreSQL | ✅ |
| [Vercel](https://vercel.com) | Frontend | ✅ |
| [Neon](https://neon.tech) | PostgreSQL serverless | ✅ |
| [Supabase](https://supabase.com) | PostgreSQL + Auth | ✅ |

---

## Notas de Seguridad

- Cambia `JWT_SECRET` y `JWT_REFRESH_SECRET` en producción (mínimo 64 caracteres)
- Habilita HTTPS en producción
- Configura CORS correctamente para tu dominio
- Las contraseñas se hashean con bcrypt (12 rounds)
- Rate limiting activo en todos los endpoints

---

*PROSPERA.AI © 2024 — Plataforma SaaS de CRM, ERP y Automatización con IA*
