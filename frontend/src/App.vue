<script setup>
import { useRouter } from 'vue-router';
import { auth } from './store/auth.js';

const router = useRouter();

function salir() {
  auth.cerrarSesion();
  router.push({ name: 'login' });
}
</script>

<template>
  <header class="barra">
    <div class="barra__contenido">
      <RouterLink :to="auth.estaAutenticado.value ? '/personas' : '/'" class="marca">EYS</RouterLink>

      <nav v-if="auth.estaAutenticado.value" class="menu">
        <RouterLink to="/personas">Personas</RouterLink>
        <!-- Nuevos formularios: agregar aquí su enlace -->
        <span class="menu__usuario">{{ auth.state.usuario?.nombre }}</span>
        <button type="button" class="btn btn--claro btn--chico" @click="salir">Salir</button>
      </nav>
      <nav v-else class="menu">
        <RouterLink to="/login">Ingresar</RouterLink>
      </nav>
    </div>
  </header>

  <main class="contenido">
    <RouterView />
  </main>
</template>
