<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api.js';
import { auth } from '../store/auth.js';

const route = useRoute();
const router = useRouter();

const usuario = ref('');
const password = ref('');
const errores = ref({});
const mensajeError = ref('');
const enviando = ref(false);

async function ingresar() {
  mensajeError.value = '';
  errores.value = {};
  if (!usuario.value.trim()) errores.value.usuario = 'El usuario es obligatorio';
  if (!password.value) errores.value.password = 'La contraseña es obligatoria';
  if (Object.keys(errores.value).length) return;

  enviando.value = true;
  try {
    const { token, usuario: datos } = await api.post('/auth/login', {
      usuario: usuario.value.trim(),
      password: password.value,
    });
    auth.iniciarSesion(token, datos);
    const destino = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
      ? route.query.redirect
      : '/personas';
    router.replace(destino);
  } catch (err) {
    errores.value = err.campos || {};
    mensajeError.value = err.message;
    password.value = '';
  } finally {
    enviando.value = false;
  }
}
</script>

<template>
  <section class="login">
    <form class="tarjeta" novalidate @submit.prevent="ingresar">
      <h1>Ingresar</h1>
      <p class="subtitulo">Acceso para usuarios internos.</p>

      <div v-if="mensajeError" class="alerta alerta--error" role="alert">{{ mensajeError }}</div>

      <div class="campo" :class="{ 'con-error': errores.usuario }">
        <label for="login-usuario">Usuario</label>
        <input id="login-usuario" v-model="usuario" type="text" autocomplete="username" :disabled="enviando" />
        <p v-if="errores.usuario" class="error-campo">{{ errores.usuario }}</p>
      </div>

      <div class="campo" :class="{ 'con-error': errores.password }">
        <label for="login-password">Contraseña</label>
        <input
          id="login-password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          :disabled="enviando"
        />
        <p v-if="errores.password" class="error-campo">{{ errores.password }}</p>
      </div>

      <div class="acciones">
        <button type="submit" class="btn btn--bloque" :disabled="enviando">
          {{ enviando ? 'Ingresando…' : 'Ingresar' }}
        </button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.login {
  max-width: 400px;
  margin: 2rem auto 0;
}
.campo + .campo {
  margin-top: 1rem;
}
</style>
