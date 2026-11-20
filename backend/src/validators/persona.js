/**
 * Validación de Persona (backend). Mismo criterio que frontend/src/validators/persona.js.
 * Devuelve { datos, campos }: si `campos` tiene claves, hay errores.
 */

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RE_DNI = /^\d{8}$/;
const RE_TELEFONO = /^[0-9+\-\s]{6,20}$/;

/** Fecha de hoy en formato YYYY-MM-DD (UTC; Perú está detrás de UTC, así que nunca rechaza "hoy"). */
function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

/** true si `valor` es una fecha real con formato YYYY-MM-DD. */
export function esFechaValida(valor) {
  if (typeof valor !== 'string' || !RE_FECHA.test(valor)) return false;
  const [a, m, d] = valor.split('-').map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d));
  return fecha.getUTCFullYear() === a && fecha.getUTCMonth() === m - 1 && fecha.getUTCDate() === d;
}

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function aBooleano(valor) {
  if (valor === true || valor === 1 || valor === 'true' || valor === '1') return true;
  if (valor === false || valor === 0 || valor === 'false' || valor === '0') return false;
  return null;
}

export function validarPersona(body = {}) {
  const campos = {};
  const hoy = hoyISO();

  const dni = texto(body.dni);
  if (!RE_DNI.test(dni)) campos.dni = 'El DNI debe tener exactamente 8 dígitos';

  const nombresApellidos = texto(body.nombresApellidos).replace(/\s+/g, ' ');
  if (!nombresApellidos) campos.nombresApellidos = 'Los nombres y apellidos son obligatorios';
  else if (nombresApellidos.length < 3 || nombresApellidos.length > 200)
    campos.nombresApellidos = 'Debe tener entre 3 y 200 caracteres';

  const fechaNacimiento = texto(body.fechaNacimiento);
  if (!fechaNacimiento) campos.fechaNacimiento = 'La fecha de nacimiento es obligatoria';
  else if (!esFechaValida(fechaNacimiento)) campos.fechaNacimiento = 'La fecha de nacimiento no es válida';
  else if (fechaNacimiento > hoy) campos.fechaNacimiento = 'La fecha de nacimiento no puede ser futura';

  const lugarNacimiento = texto(body.lugarNacimiento);
  if (!lugarNacimiento) campos.lugarNacimiento = 'El lugar de nacimiento es obligatorio';
  else if (lugarNacimiento.length > 150) campos.lugarNacimiento = 'Máximo 150 caracteres';

  const telefono = texto(body.telefono);
  if (telefono && !RE_TELEFONO.test(telefono))
    campos.telefono = 'El teléfono debe tener entre 6 y 20 caracteres (dígitos, +, espacios o guiones)';

  const direccion = texto(body.direccion);
  if (direccion.length > 250) campos.direccion = 'Máximo 250 caracteres';

  const bautizado = aBooleano(body.bautizado);
  if (bautizado === null) campos.bautizado = 'Indica si la persona está bautizada';

  let fechaBautismo = null;
  if (bautizado === true) {
    fechaBautismo = texto(body.fechaBautismo);
    if (!fechaBautismo) campos.fechaBautismo = 'La fecha de bautismo es obligatoria';
    else if (!esFechaValida(fechaBautismo)) campos.fechaBautismo = 'La fecha de bautismo no es válida';
    else if (fechaBautismo > hoy) campos.fechaBautismo = 'La fecha de bautismo no puede ser futura';
    else if (esFechaValida(fechaNacimiento) && fechaBautismo < fechaNacimiento)
      campos.fechaBautismo = 'La fecha de bautismo no puede ser anterior a la fecha de nacimiento';
  }

  return {
    campos,
    datos: {
      dni,
      nombresApellidos,
      fechaNacimiento,
      lugarNacimiento,
      telefono: telefono || null,
      direccion: direccion || null,
      bautizado: bautizado === true,
      fechaBautismo: bautizado === true ? fechaBautismo : null,
    },
  };
}

/** Responde 400 con el formato estándar si hay errores. Devuelve true si respondió. */
export function responderSiInvalido(res, campos) {
  if (Object.keys(campos).length === 0) return false;
  res.status(400).json({ error: 'Revisa los datos ingresados', campos });
  return true;
}
