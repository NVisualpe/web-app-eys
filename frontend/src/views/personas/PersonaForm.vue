<script setup>
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PersonaFields from '../../components/forms/PersonaFields.vue';
import { api } from '../../api.js';
import { personaVacia, validarPersona, aPayload } from '../../validators/persona.js';

const route = useRoute();
const router = useRouter();

const id = computed(() => route.params.id || null);
const esEdicion = computed(() => Boolean(id.value));

const persona = ref(personaVacia());
const errores = ref({});
const mensajeError = ref('');
const mensajeExito = ref('');
const cargando = ref(false);
const enviando = ref(false);
const noEncontrada = ref(false);

function desdeApi(p) {
  return {
    dni: p.dni,
    nombresApellidos: p.nombresApellidos,
    fechaNacimiento: p.fechaNacimiento || '',
    lugarNacimiento: p.lugarNacimiento,
    telefono: p.telefono || '',
    direccion: p.direccion || '',
    bautizado: p.bautizado,
    fechaBautismo: p.fechaBautismo || '',
  };
}

async function cargar() {
  errores.value = {};
  mensajeError.value = '';
  mensajeExito.value = '';
  noEncontrada.value = false;
  if (!esEdicion.value) {
    persona.value = personaVacia();
    return;
  }
  cargando.value = true;
  try {
    persona.value = desdeApi(await api.get(`/personas/${id.value}`));
  } catch (err) {
    if (err.status === 404) noEncontrada.value = true;
    else mensajeError.value = err.message;
  } finally {
    cargando.value = false;
  }
}
watch(id, cargar, { immediate: true });

async function guardar() {
  mensajeError.value = '';
  mensajeExito.value = '';
  errores.value = validarPersona(persona.value);
  if (Object.keys(errores.value).length) {
    mensajeError.value = 'Revisa los campos marcados.';
    return;
  }

  enviando.value = true;
  try {
    if (esEdicion.value) {
      persona.value = desdeApi(await api.put(`/personas/${id.value}`, aPayload(persona.value)));
      mensajeExito.value = 'Cambios guardados correctamente.';
    } else {
      await api.post('/personas', aPayload(persona.value));
      router.push({ name: 'personas' });
    }
  } catch (err) {
    errores.value = err.campos || {};
    mensajeError.value = err.message;
  } finally {
    enviando.value = false;
  }
}
</script>

<template>
  <section class="angosto">
    <p><RouterLink to="/personas">‹ Volver al listado</RouterLink></p>

    <div v-if="noEncontrada" class="tarjeta vacio">La persona solicitada no existe.</div>
    <div v-else-if="cargando" class="tarjeta cargando">Cargando…</div>

    <form v-else class="tarjeta" novalidate @submit.prevent="guardar">
      <h1>{{ esEdicion ? 'Editar persona' : 'Nueva persona' }}</h1>
      <p class="subtitulo">
        {{ esEdicion ? 'Modifica los datos y guarda los cambios.' : 'Registra una persona manualmente.' }}
      </p>

      <div v-if="mensajeError" class="alerta alerta--error" role="alert">{{ mensajeError }}</div>
      <div v-if="mensajeExito" class="alerta alerta--exito" role="status">{{ mensajeExito }}</div>

      <PersonaFields v-model="persona" :errores="errores" :deshabilitado="enviando" />

      <div class="acciones">
        <button type="submit" class="btn" :disabled="enviando">
          {{ enviando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Registrar persona' }}
        </button>
        <RouterLink to="/personas" class="btn btn--secundario">Cancelar</RouterLink>
      </div>
    </form>
  </section>
</template>
