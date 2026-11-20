import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validarPersona, responderSiInvalido } from '../validators/persona.js';
import { insertarPersona, esDuplicado } from '../repositories/personas.js';

const router = Router();

const limitePublico = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Se alcanzó el límite de registros desde esta conexión. Inténtalo más tarde.' },
});

// POST /api/publico/personas
router.post('/personas', limitePublico, async (req, res, next) => {
  try {
    const { datos, campos } = validarPersona(req.body);
    if (responderSiInvalido(res, campos)) return;

    await insertarPersona(datos, { origen: 'publico' });
    res.status(201).json({ ok: true });
  } catch (err) {
    if (esDuplicado(err)) {
      return res.status(409).json({
        error: 'Este DNI ya está registrado',
        campos: { dni: 'Este DNI ya está registrado' },
      });
    }
    next(err);
  }
});

export default router;
