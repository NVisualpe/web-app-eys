import { Router } from 'express';
import { requiereLogin } from '../auth.js';
import { validarPersona, responderSiInvalido } from '../validators/persona.js';
import {
  listarPersonas,
  obtenerPersona,
  insertarPersona,
  actualizarPersona,
  esDuplicado,
} from '../repositories/personas.js';

const router = Router();
router.use(requiereLogin);

const DUPLICADO = {
  error: 'Este DNI ya está registrado',
  campos: { dni: 'Este DNI ya está registrado' },
};

function parsearId(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}

function enteroEnRango(valor, porDefecto, min, max) {
  const n = Number.parseInt(valor, 10);
  if (!Number.isFinite(n)) return porDefecto;
  return Math.min(Math.max(n, min), max);
}

// GET /api/personas?q=&page=&pageSize=
router.get('/', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const page = enteroEnRango(req.query.page, 1, 1, 100000);
    const pageSize = enteroEnRango(req.query.pageSize, 20, 1, 100);
    res.json(await listarPersonas({ q, page, pageSize }));
  } catch (err) {
    next(err);
  }
});

// GET /api/personas/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = parsearId(req.params.id);
    const persona = id && (await obtenerPersona(id));
    if (!persona) return res.status(404).json({ error: 'Persona no encontrada' });
    res.json(persona);
  } catch (err) {
    next(err);
  }
});

// POST /api/personas
router.post('/', async (req, res, next) => {
  try {
    const { datos, campos } = validarPersona(req.body);
    if (responderSiInvalido(res, campos)) return;

    const id = await insertarPersona(datos, { origen: 'interno', creadoPor: req.usuario.id });
    res.status(201).json(await obtenerPersona(id));
  } catch (err) {
    if (esDuplicado(err)) return res.status(409).json(DUPLICADO);
    next(err);
  }
});

// PUT /api/personas/:id
router.put('/:id', async (req, res, next) => {
  try {
    const id = parsearId(req.params.id);
    if (!id) return res.status(404).json({ error: 'Persona no encontrada' });

    const { datos, campos } = validarPersona(req.body);
    if (responderSiInvalido(res, campos)) return;

    const actualizado = await actualizarPersona(id, datos);
    if (!actualizado) return res.status(404).json({ error: 'Persona no encontrada' });
    res.json(await obtenerPersona(id));
  } catch (err) {
    if (esDuplicado(err)) return res.status(409).json(DUPLICADO);
    next(err);
  }
});

export default router;
