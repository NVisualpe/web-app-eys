/**
 * Crea un usuario interno.
 * Uso: npm run crear-usuario -- <usuario> <password> "<Nombre completo>"
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { getPool, cerrarPool, sql } from '../src/db.js';

const [usuario, password, nombre] = process.argv.slice(2);

if (!usuario || !password || !nombre) {
  console.error('Uso: npm run crear-usuario -- <usuario> <password> "<Nombre completo>"');
  process.exit(1);
}
if (usuario.length > 50) {
  console.error('El usuario no puede tener más de 50 caracteres.');
  process.exit(1);
}
if (password.length < 8) {
  console.error('La contraseña debe tener al menos 8 caracteres.');
  process.exit(1);
}

try {
  const hash = await bcrypt.hash(password, 10);
  const pool = await getPool();
  await pool
    .request()
    .input('usuario', sql.NVarChar(50), usuario.trim())
    .input('hash', sql.NVarChar(200), hash)
    .input('nombre', sql.NVarChar(150), nombre.trim())
    .query('INSERT INTO EYS.Usuarios (Usuario, PasswordHash, Nombre) VALUES (@usuario, @hash, @nombre)');

  console.log(`✔ Usuario "${usuario}" creado correctamente.`);
  process.exitCode = 0;
} catch (err) {
  if (err.number === 2627 || err.number === 2601) {
    console.error(`✖ El usuario "${usuario}" ya existe.`);
  } else {
    console.error('✖ No se pudo crear el usuario:', err.message);
  }
  process.exitCode = 1;
} finally {
  await cerrarPool();
}
