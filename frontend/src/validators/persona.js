/**
 * Validación de Persona en el frontend (solo UX).
 * Mismo criterio que backend/src/validators/persona.js — la API siempre valida de nuevo.
 */
import { hoyISO } from '../utils/fechas.js';

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RE_DNI = /^\d{8}$/;
const RE_TELEFONO = /^[0-9+\-\s]{6,20}$/;

function esFechaValida(valor) {
  if (typeof valor !== 'string' || !RE_FECHA.test(valor)) return false;
  const [a, m, d] = valor.split('-').map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d));
  return fecha.getUTCFullYear() === a && fecha.getUTCMonth() === m - 1 && fecha.getUTCDate() === d;
}

const t = (v) => (typeof v === 'string' ? v.trim() : '');

export function personaVacia() {
  return {
    dni: '',
    nombresApellidos: '',
    fechaNacimiento: '',
    lugarNacimiento: '',
    telefono: '',
    direccion: '',
    bautizado: null,
    fechaBautismo: '',
  };
}

/** Devuelve un objeto { campo: mensaje } (vacío si todo está bien). */
export function validarPersona(p) {
  const e = {};
  const hoy = hoyISO();

  if (!RE_DNI.test(t(p.dni))) e.dni = 'El DNI debe tener exactamente 8 dígitos';

  const nombre = t(p.nombresApellidos);
  if (!nombre) e.nombresApellidos = 'Los nombres y apellidos son obligatorios';
  else if (nombre.length < 3 || nombre.length > 200) e.nombresApellidos = 'Debe tener entre 3 y 200 caracteres';

  const fn = t(p.fechaNacimiento);
  if (!fn) e.fechaNacimiento = 'La fecha de nacimiento es obligatoria';
  else if (!esFechaValida(fn)) e.fechaNacimiento = 'La fecha de nacimiento no es válida';
  else if (fn > hoy) e.fechaNacimiento = 'La fecha de nacimiento no puede ser futura';

  const lugar = t(p.lugarNacimiento);
  if (!lugar) e.lugarNacimiento = 'El lugar de nacimiento es obligatorio';
  else if (lugar.length > 150) e.lugarNacimiento = 'Máximo 150 caracteres';

  const tel = t(p.telefono);
  if (tel && !RE_TELEFONO.test(tel))
    e.telefono = 'El teléfono debe tener entre 6 y 20 caracteres (dígitos, +, espacios o guiones)';

  if (t(p.direccion).length > 250) e.direccion = 'Máximo 250 caracteres';

  if (p.bautizado !== true && p.bautizado !== false) e.bautizado = 'Indica si la persona está bautizada';

  if (p.bautizado === true) {
    const fb = t(p.fechaBautismo);
    if (!fb) e.fechaBautismo = 'La fecha de bautismo es obligatoria';
    else if (!esFechaValida(fb)) e.fechaBautismo = 'La fecha de bautismo no es válida';
    else if (fb > hoy) e.fechaBautismo = 'La fecha de bautismo no puede ser futura';
    else if (esFechaValida(fn) && fb < fn)
      e.fechaBautismo = 'La fecha de bautismo no puede ser anterior a la fecha de nacimiento';
  }

  return e;
}

/** Arma el cuerpo que se envía a la API. */
export function aPayload(p) {
  return {
    dni: t(p.dni),
    nombresApellidos: t(p.nombresApellidos).replace(/\s+/g, ' '),
    fechaNacimiento: p.fechaNacimiento,
    lugarNacimiento: t(p.lugarNacimiento),
    telefono: t(p.telefono) || null,
    direccion: t(p.direccion) || null,
    bautizado: p.bautizado === true,
    fechaBautismo: p.bautizado === true ? p.fechaBautismo : null,
  };
}
