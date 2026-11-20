import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { getPool, sql } from '../db.js';
import { firmarToken, requiereLogin } from '../auth.js';

const router = Router();

const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión. Espera 15 minutos e inténtalo de nuevo.' },
});

// Hash de relleno para que el tiempo de respuesta sea similar exista o no el usuario.
const HASH_FALSO = bcrypt.hashSync('contraseña-inexistente', 10);

// POST /api/auth/login
router.post('/login', limiteLogin, async (req, res, next) => {
  try {
    const usuario = typeof req.body?.usuario === 'string' ? req.body.usuario.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!usuario || !password) {
      return res.status(400).json({
        error: 'Ingresa usuario y contraseña',
        campos: {
          ...(usuario ? {} : { usuario: 'El usuario es obligatorio' }),
          ...(password ? {} : { password: 'La contraseña es obligatoria' }),
        },
      });
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input('usuario', sql.NVarChar(50), usuario.slice(0, 50))
      .query(
        'SELECT Id, Usuario, PasswordHash, Nombre FROM EYS.Usuarios WHERE Usuario = @usuario AND Activo = 1'
      );

    const fila = result.recordset[0];
    const valido = await bcrypt.compare(password, fila ? fila.PasswordHash : HASH_FALSO);

    if (!fila || !valido) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const datos = { id: fila.Id, usuario: fila.Usuario, nombre: fila.Nombre };
    res.json({ token: firmarToken(datos), usuario: datos });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', requiereLogin, async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, req.usuario.id)
      .query('SELECT Id, Usuario, Nombre FROM EYS.Usuarios WHERE Id = @id AND Activo = 1');

    const fila = result.recordset[0];
    if (!fila) return res.status(401).json({ error: 'El usuario ya no está activo' });

    res.json({ id: fila.Id, usuario: fila.Usuario, nombre: fila.Nombre });
  } catch (err) {
    next(err);
  }
});

export default router;
