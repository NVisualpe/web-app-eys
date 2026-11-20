import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { getPool } from './db.js';
import authRoutes from './routes/auth.routes.js';
import publicoRoutes from './routes/publico.routes.js';
import personasRoutes from './routes/personas.routes.js';

if (!process.env.JWT_SECRET) {
  console.error('[config] Falta la variable de entorno JWT_SECRET. La API no puede iniciar.');
  process.exit(1);
}

const app = express();

// Detrás del proxy de Passenger / Apache: necesario para obtener la IP real (rate limit).
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet());

const origenesPermitidos = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Peticiones sin Origin (curl, health checks) o de un origen permitido.
      if (!origin || origenesPermitidos.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
  })
);

app.use(express.json({ limit: '100kb' }));

// ---------- Rutas ----------
app.get('/api/health', async (req, res, next) => {
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1 AS ok');
    res.json({ ok: true });
  } catch (err) {
    console.error('[health] Sin conexión a la BD:', err.message);
    res.status(503).json({ ok: false, error: 'Sin conexión a la base de datos' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/publico', publicoRoutes);
app.use('/api/personas', personasRoutes);

// 404 para rutas de la API no definidas
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Recurso no encontrado' });
});

// ---------- Manejo central de errores ----------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'La petición es demasiado grande' });
  }
  console.error('[error]', req.method, req.originalUrl, err);
  res.status(500).json({ error: 'Ocurrió un error inesperado. Inténtalo nuevamente.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API EYS escuchando en el puerto ${PORT}`);
});

export default app;
