import type { Articulo, ParteComposicion } from './types';

// Mismas listas que la app web.
export const FIBRAS = ['Algodón', 'Poliéster', 'Elastano', 'Viscosa', 'Poliamida', 'Lino', 'Lana', 'Seda', 'Acrílico', 'Rayón', 'Modal', 'Lyocell', 'Acetato', 'Cachemira', 'Cuero', 'Poliuretano'];
export const PARTES = ['Principal', 'Forro', 'Relleno', 'Exterior', 'Interior', 'Puños y cuello'];
export const PAISES = ['China', 'Ecuador', 'Colombia', 'Perú', 'Turquía', 'India', 'Bangladesh', 'Vietnam'];

export const sumaParte = (pt: ParteComposicion) => (pt.fibras || []).reduce((x, f) => x + (Number(f.p) || 0), 0);

const clave = (pt: ParteComposicion) =>
  pt.fibras
    .filter((f) => f.f && Number(f.p))
    .slice()
    .sort((x, y) => Number(y.p) - Number(x.p))
    .map((f) => `${Number(f.p)}% ${f.f}`)
    .join(', ');

/** Texto como va en la etiqueta: "95% Algodón, 5% Elastano · Forro: 100% Poliéster". */
export function compTexto(a: Pick<Articulo, 'composicion'>) {
  const cs = (a.composicion || []).filter((pt) => (pt.fibras || []).some((f) => f.f && Number(f.p)));
  return cs.map((pt) => (cs.length > 1 || (pt.parte && pt.parte !== 'Principal') ? `${pt.parte}: ${clave(pt)}` : clave(pt))).join(' · ');
}

/** Composiciones completas (100%) usadas en artículos recientes, para elegirlas con un toque. */
export function compRecientes(arts: Articulo[]) {
  const m = new Map<string, { f: string; p: number }[]>();
  for (const a of arts.slice().sort((x, y) => (y.creado || 0) - (x.creado || 0)))
    for (const pt of a.composicion || []) {
      if (sumaParte(pt) !== 100) continue;
      const k = clave(pt);
      if (k && !m.has(k)) m.set(k, pt.fibras.filter((f) => f.f && Number(f.p)).map((f) => ({ f: f.f, p: Number(f.p) })));
    }
  return [...m.entries()].slice(0, 6);
}
