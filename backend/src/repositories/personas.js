/**
 * Acceso a datos de EYS.Personas (siempre con consultas parametrizadas).
 * Lo usan tanto la ruta pública como las rutas protegidas.
 */
import { getPool, sql } from '../db.js';

/** Convierte 'YYYY-MM-DD' a Date UTC para parámetros sql.Date. */
function aFecha(valor) {
  return valor ? new Date(`${valor}T00:00:00Z`) : null;
}

/** Convierte un Date de SQL a 'YYYY-MM-DD'. */
function aISO(fecha) {
  return fecha instanceof Date ? fecha.toISOString().slice(0, 10) : null;
}

export function mapearPersona(fila) {
  return {
    id: fila.Id,
    dni: fila.DNI,
    nombresApellidos: fila.NombresApellidos,
    fechaNacimiento: aISO(fila.FechaNacimiento),
    lugarNacimiento: fila.LugarNacimiento,
    telefono: fila.Telefono,
    direccion: fila.Direccion,
    bautizado: Boolean(fila.Bautizado),
    fechaBautismo: aISO(fila.FechaBautismo),
    origen: fila.Origen,
    creadoEn: fila.CreadoEn,
    actualizadoEn: fila.ActualizadoEn,
  };
}

function agregarParametros(request, d) {
  return request
    .input('dni', sql.Char(8), d.dni)
    .input('nombresApellidos', sql.NVarChar(200), d.nombresApellidos)
    .input('fechaNacimiento', sql.Date, aFecha(d.fechaNacimiento))
    .input('lugarNacimiento', sql.NVarChar(150), d.lugarNacimiento)
    .input('telefono', sql.NVarChar(20), d.telefono)
    .input('direccion', sql.NVarChar(250), d.direccion)
    .input('bautizado', sql.Bit, d.bautizado)
    .input('fechaBautismo', sql.Date, aFecha(d.fechaBautismo));
}

/** true si el error es de clave única (DNI duplicado). */
export function esDuplicado(err) {
  return err?.number === 2627 || err?.number === 2601;
}

export async function insertarPersona(datos, { origen, creadoPor = null }) {
  const pool = await getPool();
  const result = await agregarParametros(pool.request(), datos)
    .input('origen', sql.NVarChar(10), origen)
    .input('creadoPor', sql.Int, creadoPor)
    .query(`
      INSERT INTO EYS.Personas
        (DNI, NombresApellidos, FechaNacimiento, LugarNacimiento, Telefono, Direccion,
         Bautizado, FechaBautismo, Origen, CreadoPor)
      OUTPUT INSERTED.Id
      VALUES
        (@dni, @nombresApellidos, @fechaNacimiento, @lugarNacimiento, @telefono, @direccion,
         @bautizado, @fechaBautismo, @origen, @creadoPor)
    `);
  return result.recordset[0].Id;
}

/** Devuelve true si actualizó, false si no existe. */
export async function actualizarPersona(id, datos) {
  const pool = await getPool();
  const result = await agregarParametros(pool.request(), datos)
    .input('id', sql.Int, id)
    .query(`
      UPDATE EYS.Personas SET
        DNI = @dni,
        NombresApellidos = @nombresApellidos,
        FechaNacimiento = @fechaNacimiento,
        LugarNacimiento = @lugarNacimiento,
        Telefono = @telefono,
        Direccion = @direccion,
        Bautizado = @bautizado,
        FechaBautismo = @fechaBautismo,
        ActualizadoEn = SYSUTCDATETIME()
      WHERE Id = @id
    `);
  return result.rowsAffected[0] > 0;
}

export async function obtenerPersona(id) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', sql.Int, id)
    .query('SELECT * FROM EYS.Personas WHERE Id = @id');
  return result.recordset[0] ? mapearPersona(result.recordset[0]) : null;
}

/** Escapa los comodines de LIKE para buscar el texto literal. */
function escaparLike(texto) {
  return texto.replace(/[\[\]%_]/g, (c) => `[${c}]`);
}

export async function listarPersonas({ q, page, pageSize }) {
  const pool = await getPool();
  const filtro = q ? 'WHERE DNI LIKE @dniPrefijo OR NombresApellidos LIKE @nombre' : '';

  const conFiltro = (request) => {
    if (q) {
      const seguro = escaparLike(q);
      request
        .input('dniPrefijo', sql.VarChar(20), `${seguro.slice(0, 16)}%`)
        .input('nombre', sql.NVarChar(220), `%${seguro.slice(0, 200)}%`);
    }
    return request;
  };

  const [total, items] = await Promise.all([
    conFiltro(pool.request()).query(`SELECT COUNT(*) AS total FROM EYS.Personas ${filtro}`),
    conFiltro(pool.request())
      .input('offset', sql.Int, (page - 1) * pageSize)
      .input('pageSize', sql.Int, pageSize)
      .query(`
        SELECT * FROM EYS.Personas ${filtro}
        ORDER BY NombresApellidos, Id
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `),
  ]);

  return {
    items: items.recordset.map(mapearPersona),
    total: total.recordset[0].total,
    page,
    pageSize,
  };
}
