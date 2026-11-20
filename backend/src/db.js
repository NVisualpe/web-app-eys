import sql from 'mssql';

// La configuración se arma al conectar (no al importar) para que las variables
// de entorno ya estén cargadas.
function crearConfig() {
  return {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT) || 1433,
    options: {
      encrypt: true,
      trustServerCertificate: false,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    connectionTimeout: 60000,
    requestTimeout: 15000,
  };
}

let poolPromise = null;

/**
 * Devuelve el pool de conexión (singleton).
 * Si la conexión falla, se descarta la promesa para reintentar en la siguiente llamada.
 */
export function getPool() {
  if (!poolPromise) {
    const pool = new sql.ConnectionPool(crearConfig());
    pool.on('error', (err) => {
      console.error('[db] Error en el pool:', err.message);
    });
    poolPromise = pool.connect().catch((err) => {
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

export async function cerrarPool() {
  if (poolPromise) {
    const pool = await poolPromise.catch(() => null);
    poolPromise = null;
    if (pool) await pool.close();
  }
}

export { sql };
