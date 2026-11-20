import { reactive, computed } from 'vue';

const CLAVE = 'eys_sesion';

function leerSesion() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    if (guardado?.token && !tokenExpirado(guardado.token)) return guardado;
  } catch {
    /* sesión corrupta: se ignora */
  }
  localStorage.removeItem(CLAVE);
  return { token: null, usuario: null };
}

/** Revisa el campo "exp" del JWT (sin verificar la firma; eso lo hace la API). */
function tokenExpirado(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

const state = reactive(leerSesion());

export const auth = {
  state,
  estaAutenticado: computed(() => Boolean(state.token)),

  /** Comprueba de nuevo la expiración (la usa el guard del router). */
  sesionVigente() {
    if (state.token && tokenExpirado(state.token)) this.cerrarSesion();
    return Boolean(state.token);
  },

  iniciarSesion(token, usuario) {
    state.token = token;
    state.usuario = usuario;
    localStorage.setItem(CLAVE, JSON.stringify({ token, usuario }));
  },

  cerrarSesion() {
    state.token = null;
    state.usuario = null;
    localStorage.removeItem(CLAVE);
  },
};
