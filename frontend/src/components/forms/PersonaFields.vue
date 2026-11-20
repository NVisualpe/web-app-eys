<script setup>
/**
 * Campos reutilizables de Persona.
 * Uso: <PersonaFields v-model="persona" :errores="errores" />
 */
import { hoyISO } from '../../utils/fechas.js';

const props = defineProps({
  modelValue: { type: Object, required: true },
  errores: { type: Object, default: () => ({}) },
  deshabilitado: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue']);

const hoy = hoyISO();
const uid = Math.random().toString(36).slice(2, 8);
const id = (campo) => `persona-${campo}-${uid}`;

function actualizar(campo, valor) {
  const nuevo = { ...props.modelValue, [campo]: valor };
  if (campo === 'bautizado' && valor !== true) nuevo.fechaBautismo = '';
  emit('update:modelValue', nuevo);
}

function soloDigitos(valor) {
  actualizar('dni', valor.replace(/\D/g, '').slice(0, 8));
}
</script>

<template>
  <div class="campos">
    <div class="campo" :class="{ 'con-error': errores.dni }">
      <label :for="id('dni')">DNI</label>
      <input
        :id="id('dni')"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        maxlength="8"
        placeholder="8 dígitos"
        :value="modelValue.dni"
        :disabled="deshabilitado"
        :aria-invalid="Boolean(errores.dni)"
        @input="soloDigitos($event.target.value)"
      />
      <p v-if="errores.dni" class="error-campo">{{ errores.dni }}</p>
    </div>

    <div class="campo campo--ancho" :class="{ 'con-error': errores.nombresApellidos }">
      <label :for="id('nombres')">Nombres y apellidos</label>
      <input
        :id="id('nombres')"
        type="text"
        autocomplete="name"
        maxlength="200"
        :value="modelValue.nombresApellidos"
        :disabled="deshabilitado"
        :aria-invalid="Boolean(errores.nombresApellidos)"
        @input="actualizar('nombresApellidos', $event.target.value)"
      />
      <p v-if="errores.nombresApellidos" class="error-campo">{{ errores.nombresApellidos }}</p>
    </div>

    <div class="campo" :class="{ 'con-error': errores.fechaNacimiento }">
      <label :for="id('fnac')">Fecha de nacimiento</label>
      <input
        :id="id('fnac')"
        type="date"
        :max="hoy"
        :value="modelValue.fechaNacimiento"
        :disabled="deshabilitado"
        :aria-invalid="Boolean(errores.fechaNacimiento)"
        @input="actualizar('fechaNacimiento', $event.target.value)"
      />
      <p v-if="errores.fechaNacimiento" class="error-campo">{{ errores.fechaNacimiento }}</p>
    </div>

    <div class="campo" :class="{ 'con-error': errores.lugarNacimiento }">
      <label :for="id('lugar')">Lugar de nacimiento</label>
      <input
        :id="id('lugar')"
        type="text"
        maxlength="150"
        placeholder="Ciudad / provincia"
        :value="modelValue.lugarNacimiento"
        :disabled="deshabilitado"
        :aria-invalid="Boolean(errores.lugarNacimiento)"
        @input="actualizar('lugarNacimiento', $event.target.value)"
      />
      <p v-if="errores.lugarNacimiento" class="error-campo">{{ errores.lugarNacimiento }}</p>
    </div>

    <div class="campo" :class="{ 'con-error': errores.telefono }">
      <label :for="id('tel')">Teléfono <span class="opcional">(opcional)</span></label>
      <input
        :id="id('tel')"
        type="tel"
        autocomplete="tel"
        maxlength="20"
        :value="modelValue.telefono"
        :disabled="deshabilitado"
        :aria-invalid="Boolean(errores.telefono)"
        @input="actualizar('telefono', $event.target.value)"
      />
      <p v-if="errores.telefono" class="error-campo">{{ errores.telefono }}</p>
    </div>

    <div class="campo" :class="{ 'con-error': errores.direccion }">
      <label :for="id('dir')">Dirección <span class="opcional">(opcional)</span></label>
      <input
        :id="id('dir')"
        type="text"
        autocomplete="street-address"
        maxlength="250"
        :value="modelValue.direccion"
        :disabled="deshabilitado"
        :aria-invalid="Boolean(errores.direccion)"
        @input="actualizar('direccion', $event.target.value)"
      />
      <p v-if="errores.direccion" class="error-campo">{{ errores.direccion }}</p>
    </div>

    <div class="campo" :class="{ 'con-error': errores.bautizado }">
      <fieldset>
        <legend>¿Está bautizado(a)?</legend>
        <div class="opciones">
          <label class="opcion">
            <input
              type="radio"
              :name="id('bautizado')"
              :checked="modelValue.bautizado === true"
              :disabled="deshabilitado"
              @change="actualizar('bautizado', true)"
            />
            Sí
          </label>
          <label class="opcion">
            <input
              type="radio"
              :name="id('bautizado')"
              :checked="modelValue.bautizado === false"
              :disabled="deshabilitado"
              @change="actualizar('bautizado', false)"
            />
            No
          </label>
        </div>
      </fieldset>
      <p v-if="errores.bautizado" class="error-campo">{{ errores.bautizado }}</p>
    </div>

    <div v-if="modelValue.bautizado === true" class="campo" :class="{ 'con-error': errores.fechaBautismo }">
      <label :for="id('fbau')">Fecha de bautismo</label>
      <input
        :id="id('fbau')"
        type="date"
        :min="modelValue.fechaNacimiento || undefined"
        :max="hoy"
        :value="modelValue.fechaBautismo"
        :disabled="deshabilitado"
        :aria-invalid="Boolean(errores.fechaBautismo)"
        @input="actualizar('fechaBautismo', $event.target.value)"
      />
      <p v-if="errores.fechaBautismo" class="error-campo">{{ errores.fechaBautismo }}</p>
    </div>
  </div>
</template>
