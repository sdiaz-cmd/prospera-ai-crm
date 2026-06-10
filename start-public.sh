#!/bin/bash
# ─────────────────────────────────────────────────────────────
# PROSPERA.AI — Modo Público
# Compila el frontend, inicia el backend y abre un túnel público
# para que cualquiera (Mac o Windows) pueda acceder al CRM.
#
# Uso:
#   chmod +x start-public.sh   (solo la primera vez)
#   ./start-public.sh
#
# Requisito: tener cloudflared instalado
#   brew install cloudflared
# ─────────────────────────────────────────────────────────────

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
FRONTEND="$ROOT/frontend"
BACKEND="$ROOT/backend"

echo ""
echo "🚀 PROSPERA.AI — Iniciando modo público..."
echo ""

# 1. Compilar el frontend
echo "📦 Compilando el frontend..."
cd "$FRONTEND"
npm run build
echo "✅ Frontend compilado en frontend/dist/"
echo ""

# 2. Iniciar el backend en segundo plano
echo "⚙️  Iniciando el backend (puerto 4000)..."
cd "$BACKEND"
npm run dev &
BACKEND_PID=$!
echo "✅ Backend iniciado (PID: $BACKEND_PID)"
echo ""

# Esperar a que el backend arranque
sleep 3

# 3. Abrir túnel público con Cloudflare
echo "🌐 Abriendo túnel público con Cloudflare..."
echo "   (La URL pública aparecerá abajo en unos segundos)"
echo "   Comparte esa URL con quien necesite acceder al CRM."
echo ""
echo "   Para cerrar todo: presiona Ctrl+C"
echo ""

# Trap para cerrar el backend al salir
trap "echo ''; echo '🛑 Cerrando...'; kill $BACKEND_PID 2>/dev/null; exit 0" INT TERM

cloudflared tunnel --url http://localhost:4000
