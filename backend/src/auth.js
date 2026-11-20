import jwt from 'jsonwebtoken';

function secreto() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET no está configurado');
  return s;
}

/** Firma un token para el usuario { id, usuario, nombre }. */
export function firmarToken(usuario) {
  return jwt.sign(
    { sub: usuario.id, usuario: usuario.usuario, nombre: usuario.nombre },
    secreto(),
    { expiresIn: process.env.JWT_EXPIRES || '8h' }
  );
}

/** Middleware: exige un header "Authorization: Bearer <token>" válido. */
export function requiereLogin(req, res, next) {
  const header = req.get('authorization') || '';
  const [tipo, token] = header.split(' ');
  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Debes iniciar sesión' });
  }
  try {
    const payload = jwt.verify(token, secreto());
    req.usuario = { id: Number(payload.sub), usuario: payload.usuario, nombre: payload.nombre };
    next();
  } catch {
    return res.status(401).json({ error: 'La sesión expiró o no es válida. Inicia sesión nuevamente.' });
  }
}
