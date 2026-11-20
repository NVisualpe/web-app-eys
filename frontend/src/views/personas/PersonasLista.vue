<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../../api.js';
import { formatearFecha } from '../../utils/fechas.js';

const PAGE_SIZE = 20;

const route = useRoute();
const router = useRouter();

// La búsqueda y la página viven en la URL (se pueden compartir y sobreviven al "Atrás").
const busqueda = ref(typeof route.query.q === 'string' ? route.query.q : '');
const datos = ref({ items: [], total: 0, page: 1, pageSize: PAGE_SIZE });
const cargando = ref(false);
const mensajeError = ref('');

const pagina = computed(() => Math.max(1, Number.parseInt(route.query.page, 10) || 1));
const totalPaginas = computed(() => Math.max(1, Math.ceil(datos.value.total / datos.value.pageSize)));

let ultimaPeticion = 0;
async function cargar() {
  const n = ++ultimaPeticion;
  cargando.value = true;
  mensajeError.value = '';
  try {
    const params = new URLSearchParams({ page: pagina.value, pageSize: PAGE_SIZE });
    const q = (route.query.q || '').toString().trim();
    if (q) params.set('q', q);
    const respuesta = await api.get(`/personas?${params}`);
    if (n === ultimaPeticion) datos.value = respuesta;
  } catch (err) {
    if (n === ultimaPeticion) mensajeError.value = err.message;
  } finally {
    if (n === ultimaPeticion) cargando.value = false;
  }
}

watch(() => [route.query.q, route.query.page], cargar, { immediate: true });

let temporizador;
watch(busqueda, (valor) => {
  clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    const q = valor.trim();
    router.replace({ query: { ...(q ? { q } : {}) } });
  }, 350);
});
onBeforeUnmount(() => clearTimeout(temporizador));

function irAPagina(p) {
  router.push({ query: { ...route.query, page: p > 1 ? p : undefined } });
}
</script>

<template>
  <section>
    <div class="encabezado">
      <div>
        <h1>Personas</h1>
        <p class="subtitulo" style="margin: 0">{{ datos.total }} registradas</p>
      </div>
      <RouterLink to="/personas/nueva" class="btn">+ Nueva persona</RouterLink>
    </div>

    <div class="buscador">
      <label for="buscar" class="sr-only">Buscar</label>
      <input id="buscar" v-model="busqueda" type="search" placeholder="Buscar por DNI o nombre…" autocomplete="off" />
    </div>

    <div v-if="mensajeError" class="alerta alerta--error" role="alert">
      {{ mensajeError }}
      <button type="button" class="btn btn--secundario btn--chico" @click="cargar">Reintentar</button>
    </div>

    <p v-if="cargando && !datos.items.length" class="cargando">Cargando…</p>
    <p v-else-if="!cargando && !datos.items.length && !mensajeError" class="vacio">
      {{ route.query.q ? 'No se encontraron personas con esa búsqueda.' : 'Aún no hay personas registradas.' }}
    </p>

    <table v-if="datos.items.length" class="tabla" :class="{ 'tabla--cargando': cargando }">
      <thead>
        <tr>
          <th>DNI</th>
          <th>Nombres y apellidos</th>
          <th>F. nacimiento</th>
          <th>Teléfono</th>
          <th>Bautizado</th>
          <th>Origen</th>
          <th><span class="sr-only">Acciones</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in datos.items" :key="p.id">
          <td data-label="DNI">{{ p.dni }}</td>
          <td data-label="Nombre"><strong>{{ p.nombresApellidos }}</strong></td>
          <td data-label="F. nacimiento">{{ formatearFecha(p.fechaNacimiento) }}</td>
          <td data-label="Teléfono">{{ p.telefono || '—' }}</td>
          <td data-label="Bautizado">
            <span class="insignia" :class="{ 'insignia--si': p.bautizado }">
              {{ p.bautizado ? `Sí · ${formatearFecha(p.fechaBautismo)}` : 'No' }}
            </span>
          </td>
          <td data-label="Origen">{{ p.origen === 'publico' ? 'Página pública' : 'Interno' }}</td>
          <td class="celda-acciones">
            <RouterLink :to="`/personas/${p.id}`" class="btn btn--secundario btn--chico">Editar</RouterLink>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="datos.total > datos.pageSize" class="paginacion">
      <span>Página {{ pagina }} de {{ totalPaginas }}</span>
      <div class="paginacion__botones">
        <button type="button" class="btn btn--secundario btn--chico" :disabled="pagina <= 1 || cargando" @click="irAPagina(pagina - 1)">
          ‹ Anterior
        </button>
        <button
          type="button"
          class="btn btn--secundario btn--chico"
          :disabled="pagina >= totalPaginas || cargando"
          @click="irAPagina(pagina + 1)"
        >
          Siguiente ›
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.buscador {
  margin-bottom: 1rem;
}
.tabla--cargando {
  opacity: 0.6;
}
.alerta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
