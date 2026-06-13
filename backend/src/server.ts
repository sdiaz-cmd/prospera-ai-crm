import 'dotenv/config';
import app from './app';
import { run } from './database/db';

const PORT = process.env.PORT || 4000;

// ─── Limpieza periódica de tokens expirados ──────────────────────────────────
// Corre cada 6 horas para mantener la DB limpia y prevenir acumulación
function scheduleTokenCleanup() {
  const cleanup = () => {
    try {
      const now = new Date().toISOString();
      run('DELETE FROM refresh_tokens WHERE expires_at < ? OR is_revoked = 1', [now]);
      run('DELETE FROM password_reset_tokens WHERE expires_at < ? OR used = 1', [now]);
    } catch (e) {
      console.warn('[Cleanup] Error limpiando tokens expirados:', (e as Error).message);
    }
  };

  // Primera limpieza al arrancar (30 segundos después para no bloquear el inicio)
  setTimeout(cleanup, 30_000);
  // Luego cada 6 horas
  setInterval(cleanup, 6 * 60 * 60 * 1000);
}

app.listen(PORT, () => {
  console.log('\n');
  console.log('  ██████╗ ██████╗  ██████╗ ███████╗██████╗ ███████╗██████╗  █████╗     █████╗ ██╗');
  console.log('  ██╔══██╗██╔══██╗██╔═══██╗██╔════╝██╔══██╗██╔════╝██╔══██╗██╔══██╗   ██╔══██╗██║');
  console.log('  ██████╔╝██████╔╝██║   ██║███████╗██████╔╝█████╗  ██████╔╝███████║   ███████║██║');
  console.log('  ██╔═══╝ ██╔══██╗██║   ██║╚════██║██╔═══╝ ██╔══╝  ██╔══██╗██╔══██║   ██╔══██║██║');
  console.log('  ██║     ██║  ██║╚██████╔╝███████║██║     ███████╗██║  ██║██║  ██║   ██║  ██║██║');
  console.log('  ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝  ╚═╝╚═╝');
  console.log('\n');
  console.log(`  Servidor corriendo en http://localhost:${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/health`);
  console.log(`  Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log('\n');

  scheduleTokenCleanup();
});
