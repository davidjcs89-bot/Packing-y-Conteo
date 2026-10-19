import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { ordTalla, tieneStock, uniq } from './calc';
import { fotoUri } from './fotos';
import type { Articulo, Proveedor } from './types';

/*
 * Catálogo PDF, mismo diseño que la app web: A4, 2 columnas, 4 u 6 productos por
 * página, foto principal + hasta 3 adicionales, estilo, precio, tipo y tallas.
 * Nunca muestra proveedor ni costo. Todo se genera en el teléfono, sin internet.
 */
export type TipoCat = 'mayoreo' | 'menudeo';

export interface OpcionesCat {
  tipo: TipoCat;
  titulo: string;
  subtitulo: string;
  contacto: string;
  porPag: 4 | 6;
  fotosExtra: boolean;
}

export function tallasPorColor(a: Articulo) {
  if (tieneStock(a)) {
    const m: Record<string, string[]> = {};
    for (const k of Object.keys(a.stock!)) {
      const [c, t] = k.split('|');
      (m[c] = m[c] || []).push(t);
    }
    const cs = Object.keys(m);
    if (cs.length)
      return cs
        .map((c) => {
          const ts = uniq(m[c]).sort((x, y) => ordTalla(x) - ordTalla(y)).filter((t) => t !== 'Única');
          return (c === 'Sin color' ? '' : c + ': ') + (ts.join(', ') || 'Única');
        })
        .join(' · ');
  }
  const ts = (a.tallas || []).join(', ');
  return (a.colores?.length ? a.colores.join(', ') + ': ' : '') + (ts || 'Consultar');
}

export function fechaCat(modo: string | undefined, texto?: string) {
  const m = modo || 'completa';
  if (m === 'ninguna') return '';
  if (m === 'texto') return String(texto || '').trim();
  if (m === 'mesanio') {
    const t = new Date().toLocaleDateString('es-EC', { month: 'long', year: 'numeric' }).replace(' de ', ' ');
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  return new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });
}

function iniciales(n?: string) {
  const pal = String(n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (!pal.length) return '';
  return pal.length === 1 ? pal[0].slice(0, 3).toUpperCase() : pal.map((p) => p[0]).join('').slice(0, 4).toUpperCase();
}

export function nombreArchivo(items: Articulo[], provs: Proveedor[], tipo: TipoCat) {
  const ini = uniq(items.map((a) => a.proveedorId).filter(Boolean) as string[])
    .map((id) => iniciales(provs.find((p) => p.id === id)?.nombre))
    .filter(Boolean);
  const suf = !ini.length ? '' : ini.length <= 3 ? '-' + ini.join('-') : '-VARIOS';
  return `Catalogo${suf}${tipo === 'menudeo' ? '-Menudeo' : ''}.pdf`;
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);
const money = (n: number | null) => (n == null ? 'Consultar' : '$' + n.toFixed(2));

/** Foto reducida a base64 para incrustarla en el PDF (el PDF queda liviano para WhatsApp). */
async function fotoB64(ref: string, lado: number) {
  try {
    const ctx = ImageManipulator.manipulate(fotoUri(ref));
    ctx.resize({ width: lado });
    const img = await ctx.renderAsync();
    const r = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.82, base64: true });
    return r.base64 ? `data:image/jpeg;base64,${r.base64}` : null;
  } catch {
    return null;
  }
}

export async function generarCatalogo(
  items: Articulo[],
  precioDe: (a: Articulo) => number | null,
  op: OpcionesCat,
  nombre: string,
  progreso: (txt: string) => void
) {
  const acc = op.tipo === 'mayoreo' ? '#9A6512' : '#0E7C66';
  const per = op.porPag === 6 ? 6 : 4;
  const pages = Math.max(1, Math.ceil(items.length / per));
  const fotos = new Map<string, string | null>();
  let n = 0;
  for (const a of items) {
    progreso(`Preparando fotos ${++n} de ${items.length}…`);
    const lista = (a.fotos || []).slice(0, op.fotosExtra ? 4 : 1);
    for (let i = 0; i < lista.length; i++) if (!fotos.has(lista[i])) fotos.set(lista[i], await fotoB64(lista[i], i === 0 ? 1000 : 450));
  }
  progreso('Armando el PDF…');
  const celda = (a: Articulo) => {
    const main = a.fotos?.[0] ? fotos.get(a.fotos[0]) : null;
    const ex = op.fotosExtra ? (a.fotos || []).slice(1, 4).map((f) => fotos.get(f)).filter(Boolean) : [];
    return `<div class="pc">
      <div class="im ${ex.length ? 'multi' : ''}">
        <div class="m">${main ? `<img src="${main}">` : '<span class="sf">Sin foto</span>'}</div>
        ${ex.length ? `<div class="ts">${ex.map((d) => `<div><img src="${d}"></div>`).join('')}</div>` : ''}
      </div>
      <div class="t1"><b class="es">${esc(a.estilo)}</b><span class="pr">${money(precioDe(a))}</span></div>
      <div class="t2">${esc(a.nombre)}</div>
      <div class="t3"><b>Tallas:</b> ${esc(tallasPorColor(a))}</div>
    </div>`;
  };
  const paginas = Array.from({ length: pages }, (_, pg) => `
    <section class="pg">
      <header><h1>${esc(op.titulo || 'Catálogo')}</h1><p>${esc(op.subtitulo) || '&nbsp;'}</p></header>
      <div class="grid r${per / 2}">${items.slice(pg * per, pg * per + per).map(celda).join('')}</div>
      <footer><span>${op.contacto ? 'Pedidos por WhatsApp: ' + esc(op.contacto) : ''}</span><span>Página ${pg + 1} de ${pages}</span></footer>
    </section>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1b1b1b; }
    .pg { width: 210mm; height: 297mm; padding: 10mm 12mm 0; position: relative; page-break-after: always; overflow: hidden; }
    .pg:last-child { page-break-after: auto; }
    header { border-bottom: 0.5mm solid ${acc}; padding-bottom: 2.5mm; margin-bottom: 5mm; }
    h1 { font-size: 19pt; font-weight: 800; }
    header p { font-size: 9pt; color: #6b6b6b; margin-top: 1mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 6mm; row-gap: 6mm; height: 247mm; }
    .grid.r2 { grid-template-rows: 1fr 1fr; } .grid.r3 { grid-template-rows: 1fr 1fr 1fr; }
    .pc { display: flex; flex-direction: column; min-height: 0; }
    .im { flex: 1; min-height: 0; display: flex; gap: 1.5mm; }
    .im .m { flex: 1; background: #f2f2f2; display: flex; align-items: center; justify-content: center; min-height: 0; }
    .im.multi .m { flex: 0 0 72%; }
    .im img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
    .ts { flex: 1; display: flex; flex-direction: column; gap: 1.5mm; }
    .ts div { flex: 0 0 calc((100% - 3mm) / 3); background: #f2f2f2; display: flex; align-items: center; justify-content: center; min-height: 0; overflow: hidden; }
    .sf { color: #999; font-size: 8pt; }
    .t1 { display: flex; justify-content: space-between; align-items: baseline; margin-top: 2mm; }
    .es { font-family: Menlo, Courier, monospace; font-size: 10pt; }
    .pr { font-size: 13pt; font-weight: 800; color: ${acc}; }
    .t2 { font-size: 9pt; color: #282828; margin-top: 0.8mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .t3 { font-size: 8.5pt; margin-top: 0.8mm; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    footer { position: absolute; left: 12mm; right: 12mm; bottom: 6mm; display: flex; justify-content: space-between; font-size: 8pt; color: #6b6b6b; }
  </style></head><body>${paginas}</body></html>`;
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
  // Renombrar con un nombre claro para quien lo recibe.
  const destino = new File(Paths.cache, nombre);
  if (destino.exists) destino.delete();
  new File(uri).move(destino);
  return destino.uri;
}

export async function compartirPdf(uri: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Compartir no está disponible en este dispositivo.');
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Compartir catálogo' });
}
