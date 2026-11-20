import { auth } from './store/auth.js';
import router from './router.js';

const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(mensaje, status, campos = {}) {
    super(mensaje);
    this.status = status;
    this.campos = campos;
  }
}

async function solicitud(metodo, ruta, cuerpo) {
  const headers = { Accept: 'application/json' };
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
  if (auth.state.token) headers.Authorization = `Bearer ${auth.state.token}`;

  let respuesta;
  try {
    respuesta = await fetch(`${BASE_URL}${ruta}`, {
      method: metodo,
      headers,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexión a internet.', 0);
  }

  const datos = await respuesta.json().catch(() => null);

  if (respuesta.status === 401 && auth.state.token) {
    auth.cerrarSesion();
    const actual = router.currentRoute.value;
    router.push({ name: 'login', query: actual.meta.requiresAuth ? { redirect: actual.fullPath } : {} });
  }

  if (!respuesta.ok) {
    throw new ApiError(
      datos?.error || 'Ocurrió un error inesperado. Inténtalo nuevamente.',
      respuesta.status,
      datos?.campos || {}
    );
  }

  return datos;
}

export const api = {
  get: (ruta) => solicitud('GET', ruta),
  post: (ruta, cuerpo) => solicitud('POST', ruta, cuerpo),
  put: (ruta, cuerpo) => solicitud('PUT', ruta, cuerpo),
};
