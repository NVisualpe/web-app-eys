import { createRouter, createWebHistory } from 'vue-router';
import { auth } from './store/auth.js';

const routes = [
  { path: '/', name: 'inicio', component: () => import('./views/publico/RegistroPublico.vue') },
  { path: '/registro', name: 'registro', component: () => import('./views/publico/RegistroPublico.vue') },
  {
    path: '/login',
    name: 'login',
    component: () => import('./views/LoginView.vue'),
    meta: { soloInvitados: true },
  },
  {
    path: '/personas',
    name: 'personas',
    component: () => import('./views/personas/PersonasLista.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/personas/nueva',
    name: 'persona-nueva',
    component: () => import('./views/personas/PersonaForm.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/personas/:id(\\d+)',
    name: 'persona-editar',
    component: () => import('./views/personas/PersonaForm.vue'),
    meta: { requiresAuth: true },
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach((to) => {
  const conSesion = auth.sesionVigente();
  if (to.meta.requiresAuth && !conSesion) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.meta.soloInvitados && conSesion) {
    return { name: 'personas' };
  }
});

export default router;
