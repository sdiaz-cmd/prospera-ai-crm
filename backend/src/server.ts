import 'dotenv/config';
import app from './app';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log('\n');
  console.log('  ██████╗ ██████╗  ██████╗ ███████╗██████╗ ███████╗██████╗  █████╗     █████╗ ██╗');
  console.log('  ██╔══██╗██╔══██╗██╔═══██╗██╔════╝██╔══██╗██╔════╝██╔══██╗██╔══██╗   ██╔══██╗██║');
  console.log('  ██████╔╝██████╔╝██║   ██║███████╗██████╔╝█████╗  ██████╔╝███████║   ███████║██║');
  console.log('  ██╔═══╝ ██╔══██╗██║   ██║╚════██║██╔═══╝ ██╔══╝  ██╔══██╗██╔══██║   ██╔══██║██║');
  console.log('  ██║     ██║  ██║╚██████╔╝███████║██║     ███████╗██║  ██║██║  ██║   ██║  ██║██║');
  console.log('  ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝  ╚═╝╚═╝');
  console.log('\n');
  console.log(`  🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`  📋 Health Check: http://localhost:${PORT}/health`);
  console.log(`  🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log('\n');
});
