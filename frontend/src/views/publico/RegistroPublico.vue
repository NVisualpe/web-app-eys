<script setup>
import { ref } from 'vue';
import PersonaFields from '../../components/forms/PersonaFields.vue';
import { api } from '../../api.js';
import { personaVacia, validarPersona, aPayload } from '../../validators/persona.js';

const persona = ref(personaVacia());
const errores = ref({});
const mensajeError = ref('');
const enviando = ref(false);
const registrado = ref(false);

async function enviar() {
  mensajeError.value = '';
  errores.value = validarPersona(persona.value);
  if (Object.keys(errores.value).length) {
    mensajeError.value = 'Revisa los campos marcados.';
    return;
  }

  enviando.value = true;
  try {
    await api.post('/publico/personas', aPayload(persona.value));
    registrado.value = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    errores.value = err.campos || {};
    mensajeError.value = err.message;
  } finally {
    enviando.value = false;
  }
}

function registrarOtra() {
  persona.value = personaVacia();
  errores.value = {};
  mensajeError.value = '';
  registrado.value = false;
}
</script>

<template>
  <section class="angosto">
    <div v-if="registrado" class="tarjeta gracias">
      <div class="gracias__icono" aria-hidden="true">✓</div>
      <h1>¡Gracias por registrarte!</h1>
      <p class="subtitulo">Tus datos se guardaron correctamente.</p>
      <button type="button" class="btn" @click="registrarOtra">Registrar otra persona</button>
    </div>

    <form v-else class="tarjeta" novalidate @submit.prevent="enviar">
      <h1>Registro de datos</h1>
      <p class="subtitulo">Completa el formulario. Los campos sin la marca “opcional” son obligatorios.</p>

      <div v-if="mensajeError" class="alerta alerta--error" role="alert">{{ mensajeError }}</div>

      <PersonaFields v-model="persona" :errores="errores" :deshabilitado="enviando" />

      <div class="acciones">
        <button type="submit" class="btn btn--bloque" :disabled="enviando">
          {{ enviando ? 'Enviando…' : 'Registrarme' }}
        </button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.gracias {
  text-align: center;
  padding: 2.5rem 1.5rem;
}
.gracias__icono {
  width: 64px;
  height: 64px;
  margin: 0 auto 1rem;
  border-radius: 50%;
  background: var(--exito-fondo);
  color: var(--exito);
  font-size: 2rem;
  line-height: 64px;
  font-weight: 700;
}
</style>
