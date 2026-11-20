/** 'YYYY-MM-DD' → 'dd/mm/aaaa' (sin pasar por Date para evitar desfases de zona horaria). */
export function formatearFecha(iso) {
  if (!iso || typeof iso !== 'string') return '';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return a && m && d ? `${d}/${m}/${a}` : '';
}

/** Fecha de hoy en hora local como 'YYYY-MM-DD'. */
export function hoyISO() {
  const h = new Date();
  const mm = String(h.getMonth() + 1).padStart(2, '0');
  const dd = String(h.getDate()).padStart(2, '0');
  return `${h.getFullYear()}-${mm}-${dd}`;
}
