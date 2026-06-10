# 🚀 Guía de Deploy — PROSPERA.AI

## Tiempo estimado: 1-2 horas

---

## Prerequisitos
- Cuenta en [GitHub](https://github.com) (gratis)
- Cuenta en [Railway](https://railway.app) (gratis para empezar)
- Cuenta en [Vercel](https://vercel.com) (gratis)
- Cuenta en [Resend](https://resend.com) (gratis hasta 3,000 emails/mes)
- Dominio propio (opcional, ~$12/año en Namecheap)

---

## Paso 1 — Subir el código a GitHub

1. Ve a [github.com](https://github.com) → **New repository**
2. Nombre: `prospera-ai-crm` → **Create repository**
3. En tu Terminal (dentro de la carpeta CRM):

```bash
cd ~/Desktop/PROSPERA.AI/CRM
git init
git add .
git commit -m "PROSPERA.AI v1.0 — Lanzamiento inicial"
git remote add origin https://github.com/TU_USUARIO/prospera-ai-crm.git
git push -u origin main
```

---

## Paso 2 — Deploy del Backend en Railway

1. Ve a [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Selecciona `prospera-ai-crm`
3. Railway detecta el `railway.toml` automáticamente

### Variables de entorno en Railway:
Ve a tu servicio → **Variables** → agrega estas:

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `JWT_SECRET` | *(genera con el comando de abajo)* |
| `JWT_REFRESH_SECRET` | *(genera otro)* |
| `JWT_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `CORS_ORIGIN` | `https://app.tudominio.com` |
| `APP_URL` | `https://app.tudominio.com` |
| `RESEND_API_KEY` | *(de resend.com)* |
| `RESEND_FROM` | `PROSPERA.AI <noreply@tudominio.com>` |

**Generar secretos JWT:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Ejecuta ese comando dos veces para tener dos secretos diferentes.

### Volumen persistente (base de datos):
En Railway → tu servicio → **Volumes** → **Add Volume**
- Mount Path: `/data`

4. Click **Deploy** → espera que termine (2-3 min)
5. En **Settings** → copia la URL pública del backend (ej: `prospera-ai.up.railway.app`)

---

## Paso 3 — Deploy del Frontend en Vercel

1. Ve a [vercel.com](https://vercel.com) → **New Project** → importa `prospera-ai-crm`
2. **Root Directory**: `frontend`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`

### Variables de entorno en Vercel:
| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://prospera-ai.up.railway.app/api` |

5. Click **Deploy** → Vercel te dará una URL como `prospera-ai.vercel.app`

---

## Paso 4 — Conectar dominio propio (opcional pero recomendado)

### En Vercel:
- Settings → Domains → agrega `app.tudominio.com`
- Vercel te da los DNS records a configurar

### En Namecheap/GoDaddy:
- Agrega los CNAME records que Vercel indica
- SSL se activa automáticamente en ~5 minutos

### Actualiza Railway:
- Vuelve a Railway → Variables → cambia `CORS_ORIGIN` y `APP_URL` a tu dominio real

---

## Paso 5 — Configurar Resend (emails)

1. Ve a [resend.com](https://resend.com) → Sign Up
2. **API Keys** → **Create API Key** → copia la key
3. **Domains** → agrega tu dominio → sigue las instrucciones DNS
4. Agrega la API Key en Railway como `RESEND_API_KEY`

> Sin Resend configurado, los links de recuperación de contraseña aparecen en los logs del backend (funciona en dev, no en producción).

---

## Paso 6 — Primera prueba en producción

1. Abre `https://app.tudominio.com/register`
2. Crea una empresa de prueba
3. Verifica que puedas iniciar sesión y ver el dashboard
4. Prueba recuperar contraseña

---

## Costos mensuales estimados

| Servicio | Plan | Costo |
|---|---|---|
| Railway | Hobby | $5/mes |
| Vercel | Free | $0 |
| Resend | Free (3k emails) | $0 |
| Dominio .com | Anual | ~$1/mes |
| **Total** | | **~$6/mes** |

---

## Comandos útiles post-deploy

```bash
# Ver logs del backend en Railway
railway logs

# Redeploy manual
railway up

# Variables de entorno
railway variables
```

---

## ¿Algo falla?

Los errores más comunes:
- **CORS error**: El `CORS_ORIGIN` en Railway no coincide con la URL de Vercel
- **DB not found**: El volumen `/data` no está montado en Railway
- **Build fails**: Verifica que el `Root Directory` en Vercel sea `frontend`
