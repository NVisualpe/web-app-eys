/**
 * Prueba la conexión a Azure SQL.
 * Uso: npm run probar-bd
 */
import 'dotenv/config';
import { getPool, cerrarPool } from '../src/db.js';

const faltantes = ['DB_SERVER', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'].filter((v) => !process.env[v]);
if (faltantes.length) {
  console.error(`✖ Faltan variables de entorno: ${faltantes.join(', ')}`);
  console.error('  Revisa el archivo .env (local) o las "Environment variables" de la app en cPanel.');
  process.exit(1);
}

console.log(`Conectando a ${process.env.DB_SERVER}:${process.env.DB_PORT || 1433} / ${process.env.DB_NAME} ...`);

try {
  const pool = await getPool();
  const r = await pool.request().query('SELECT 1 AS ok, DB_NAME() AS bd, SYSUTCDATETIME() AS hora');
  const fila = r.recordset[0];
  console.log(`✔ Conexión correcta. Base de datos: ${fila.bd}. Hora del servidor (UTC): ${fila.hora.toISOString()}`);

  const tablas = await pool
    .request()
    .query(
      "SELECT name FROM sys.tables WHERE schema_id = SCHEMA_ID('EYS') AND name IN ('Usuarios', 'Personas') ORDER BY name"
    );
  const nombres = tablas.recordset.map((t) => t.name);
  if (nombres.length === 2) console.log('✔ Tablas EYS.Usuarios y EYS.Personas encontradas.');
  else console.warn('⚠ Faltan tablas en el esquema EYS. Ejecuta database/schema.sql en la base de datos.');
  process.exitCode = 0;
} catch (err) {
  const codigo = err.code || err.originalError?.code || '';
  const mensaje = `${err.message} ${err.originalError?.message || ''}`;

  console.error('✖ No se pudo conectar a la base de datos.');
  if (/ETIMEOUT|ECONNREFUSED|ESOCKET|EHOSTUNREACH|ENOTFOUND/i.test(codigo + mensaje)) {
    if (/ENOTFOUND/i.test(mensaje)) {
      console.error('  → El nombre del servidor (DB_SERVER) no existe. Revisa que sea xxxx.database.windows.net');
    } else {
      console.error('  → No hay comunicación con el servidor (timeout / conexión rechazada). Posibles causas:');
      console.error('    1. La IP de este equipo/hosting NO está en las reglas de firewall de Azure SQL (Redes).');
      console.error('    2. El hosting bloquea las conexiones salientes al puerto 1433 (consulta con soporte).');
    }
  } else if (/ELOGIN|Login failed/i.test(codigo + mensaje)) {
    console.error('  → Error de inicio de sesión: usuario (DB_USER) o contraseña (DB_PASSWORD) incorrectos.');
    if (/Client with IP address/i.test(mensaje)) {
      console.error('    (Azure indica que la IP no está autorizada: agrégala en el firewall del servidor SQL.)');
    }
  } else if (/Cannot open database/i.test(mensaje)) {
    console.error('  → La base de datos (DB_NAME) no existe o el usuario no tiene acceso a ella.');
  }
  console.error(`  Detalle técnico: [${codigo}] ${err.message}`);
  process.exitCode = 1;
} finally {
  await cerrarPool();
}
