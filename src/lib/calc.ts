// Cálculos del negocio, iguales a la app web.
import type { Articulo, Config, Linea, Proveedor, Viaje } from './types';

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const r2 = (n: number) => Math.round(n * 100) / 100;
export const money = (n: number | null | undefined) =>
  n == null || isNaN(n) ? '—' : '$' + Number(n).toFixed(2);
export const fmtF = (n: number) => String(Math.round(n * 10) / 10);
export const num = (v: string | number | null | undefined): number | null => {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return isNaN(n) ? null : n;
};
export const sinAcento = (s: string) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const uniq = <T,>(a: T[]) => [...new Set(a)];

/** Yuanes a dólares: se divide para el tipo de cambio y se redondea hacia arriba al dólar entero. */
export const rmbAUsd = (v: number, tc: number) => Math.ceil(r2(v / tc));

export const TALLAS_BASE = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'S/M', 'L/XL', 'Única'];
export const COLORES_BASE = ['Negro', 'Blanco', 'Beige', 'Café', 'Gris', 'Azul', 'Rosa', 'Verde'];

export const MULTS_MAY = [3, 4, 4.5, 5, 6];
export const MULTS_MEN = [5, 6, 7, 8, 10];
export const multsDe = (cfg: Config, tipo: 'mayoreo' | 'menudeo') =>
  (tipo === 'menudeo' ? cfg.multMen : cfg.multMay) || (tipo === 'menudeo' ? MULTS_MEN : MULTS_MAY);

export const factorDe = (p: Proveedor | undefined, tipo: 'mayoreo' | 'menudeo', cfg: Config) =>
  (p && Number(tipo === 'mayoreo' ? p.fMay : p.fMen)) ||
  Number(tipo === 'mayoreo' ? cfg.defMay : cfg.defMen) ||
  null;

// ---------- existencias ----------
export const skey = (c: string, t: string) => `${c}|${t}`;
export const totalStock = (a: Articulo) =>
  Object.values(a.stock || {}).reduce((x, y) => x + (Number(y) || 0), 0);
export const tieneStock = (a: Articulo) => !!(a.stock && Object.keys(a.stock).length);

const ORD_TALLA = ['XXS', 'XS', 'S', 'S/M', 'M', 'L', 'L/XL', 'XL', 'XXL', 'XXXL', 'ÚNICA'];
export const ordTalla = (t: string) => {
  const i = ORD_TALLA.indexOf(String(t).toUpperCase());
  if (i >= 0) return i;
  const n = parseFloat(t);
  return isNaN(n) ? 100 : 50 + n / 100;
};

export function ejes(a: Articulo) {
  const st = a.stock || {};
  const conQ = Object.keys(st).filter((k) => st[k] > 0);
  let cols = uniq([...(a.colores || []), ...conQ.map((k) => k.split('|')[0])]);
  if (!cols.length) cols = ['Sin color'];
  let tals = uniq([...(a.tallas || []), ...conQ.map((k) => k.split('|')[1])]);
  if (!tals.length) tals = ['Única'];
  tals = tals.slice().sort((x, y) => ordTalla(x) - ordTalla(y) || x.localeCompare(y));
  return { cols, tals };
}

export function aplicar(stock: Record<string, number> | undefined, lineas: Linea[]) {
  const st: Record<string, number> = { ...(stock || {}) };
  for (const l of lineas) {
    if (!l.talla) continue;
    const k = skey(l.color, l.talla);
    st[k] = Math.max(0, (st[k] || 0) + l.cant);
  }
  const reales = Object.keys(st).filter((k) => !k.endsWith('|Única'));
  if (reales.length) for (const k of Object.keys(st)) if (k.endsWith('|Única') && !st[k]) delete st[k];
  return st;
}

// ---------- importación a Ecuador ----------
export const LB_KG = 0.45359237;
export const pesoKg = (a: Articulo) =>
  a.pesoLb != null ? Math.round(Number(a.pesoLb) * LB_KG * 1000) / 1000 : null;

export function tarifas(c: Config) {
  const n = (v: unknown, d: number) => (v == null || v === '' ? d : Number(v));
  return {
    flete: n(c.envioKg, 0),
    seg: n(c.segPct, 0),
    adv: n(c.advPct, 0),
    esp: n(c.espKg, 0),
    fod: n(c.fodPct, 0.5),
    iva: n(c.ivaPct, 15),
    ivaCosto: c.ivaCosto !== false,
    otros: n(c.otrosKg, 0),
  };
}

export interface ResumenViaje {
  gastos: number;
  valor: number;
  piezas: number;
  pct: number;
  porPieza: number;
}

export const CATS_GASTO: [string, string][] = [
  ['pasajes', 'Pasajes'],
  ['hospedaje', 'Hospedaje'],
  ['comida', 'Comida'],
  ['movilizacion', 'Movilización'],
  ['otros', 'Otros'],
];

export const piezasArt = (a: Articulo) => Number(a.cantidad) || totalStock(a) || 1;

export function gastoUsd(g: { monto: number | null; moneda: string; tc?: number | null }, v: Viaje, tcDef: number | null) {
  const m = Number(g.monto) || 0;
  if (g.moneda === 'RMB') {
    const tc = Number(g.tc) || Number(v.tc) || tcDef || 0;
    return tc ? m / tc : 0;
  }
  return m;
}

export function resumenViaje(v: Viaje, arts: Articulo[], tcDef: number | null): ResumenViaje {
  const delViaje = arts.filter((a) => a.viajeId === v.id && !a.ejemplo);
  const gastos = (v.gastos || []).reduce((x, g) => x + gastoUsd(g, v, tcDef), 0);
  const valor = delViaje.reduce((x, a) => x + (Number(a.costo) || 0) * piezasArt(a), 0);
  const piezas = delViaje.reduce((x, a) => x + piezasArt(a), 0);
  return {
    gastos: r2(gastos),
    valor: r2(valor),
    piezas,
    pct: valor ? (gastos / valor) * 100 : 0,
    porPieza: piezas ? gastos / piezas : 0,
  };
}

export interface Desglose {
  kg: number | null;
  fob: number | null;
  flete: number;
  seguro: number;
  cif: number | null;
  adv: number;
  esp: number;
  fod: number;
  iva: number;
  otros: number;
  imp: number;
  viaje: number;
  total: number | null;
}

/** Ecuador: CIF = FOB + flete + seguro; ad valorem y FODINFA sobre CIF; específico por kg; IVA sobre CIF + aranceles + FODINFA. */
export function desglose(a: Articulo, cfg: Config, viajes: Viaje[], arts: Articulo[]): Desglose {
  const kg = pesoKg(a);
  const t = tarifas(cfg);
  const fob = a.costo == null ? null : Number(a.costo);
  let viaje = 0;
  const v = a.viajeId ? viajes.find((x) => x.id === a.viajeId) : undefined;
  if (v && fob != null) {
    const r = resumenViaje(v, arts, cfg.tcDef ?? null);
    if (r.gastos) viaje = r2(v.reparto === 'pieza' ? r.porPieza : (fob * r.pct) / 100);
  }
  const base: Desglose = { kg, fob, flete: 0, seguro: 0, cif: fob, adv: 0, esp: 0, fod: 0, iva: 0, otros: 0, imp: 0, viaje, total: fob == null ? null : r2(fob + viaje) };
  if (fob == null || kg == null) return base;
  const flete = r2(kg * t.flete);
  const seguro = r2((fob * t.seg) / 100);
  const cif = r2(fob + flete + seguro);
  const adv = r2((cif * t.adv) / 100);
  const esp = r2(kg * t.esp);
  const fod = r2((cif * t.fod) / 100);
  const iva = r2(((cif + adv + esp + fod) * t.iva) / 100);
  const otros = r2(kg * t.otros);
  const imp = r2(adv + esp + fod + (t.ivaCosto ? iva : 0));
  return { kg, fob, flete, seguro, cif, adv, esp, fod, iva, otros, imp, viaje, total: r2(cif + imp + otros + viaje) };
}

/** Costo base para precios: costo USD + importación + gastos de viaje. */
export const costoBase = (a: Articulo, cfg: Config, viajes: Viaje[], arts: Articulo[]) =>
  desglose(a, cfg, viajes, arts).total;

export function precio(
  a: Articulo,
  tipo: 'mayoreo' | 'menudeo',
  p: Proveedor | undefined,
  cfg: Config,
  base: number | null
) {
  const man = tipo === 'mayoreo' ? a.pMay : a.pMen;
  if (man != null) return Number(man);
  const f = factorDe(p, tipo, cfg);
  if (!f || base == null) return null;
  return Math.ceil(r2(base * f));
}

// ---------- orden ----------
export const ORDENES: [string, string][] = [
  ['rec', 'Recientes'],
  ['ant', 'Antiguos'],
  ['asc', 'Estilo ↑'],
  ['desc', 'Estilo ↓'],
];
export function ordenar(lista: Articulo[], modo: string) {
  const cr = (a: Articulo) => a.creado || 0;
  const es = (a: Articulo) => String(a.estilo || '');
  const f: Record<string, (x: Articulo, y: Articulo) => number> = {
    ant: (x, y) => cr(x) - cr(y),
    asc: (x, y) => es(x).localeCompare(es(y), undefined, { numeric: true }),
    desc: (x, y) => es(y).localeCompare(es(x), undefined, { numeric: true }),
    pzs: (x, y) => totalStock(y) - totalStock(x) || cr(y) - cr(x),
    pzsasc: (x, y) => totalStock(x) - totalStock(y) || cr(y) - cr(x),
    rec: (x, y) => cr(y) - cr(x),
  };
  return lista.slice().sort(f[modo] || f.rec);
}
