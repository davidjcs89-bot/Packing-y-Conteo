import type { SQLiteDatabase } from 'expo-sqlite';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { strFromU8, unzipSync } from 'fflate';

import { COLECCIONES } from './db';
import { escribirFoto, limpiarFotos } from './fotos';
import type { Articulo, Coleccion, Config } from './types';

/*
 * Importa el respaldo .zip que exporta la app web.
 * Todo ocurre en el teléfono: no hay lecturas ni escrituras en la nube.
 *  - "reemplazar": deja exactamente lo del respaldo.
 *  - "combinar": agrega lo nuevo y, si un registro existe en los dos lados,
 *    se queda con el modificado más recientemente.
 */
export type ModoImportar = 'reemplazar' | 'combinar';

interface Respaldo {
  app: string;
  version: number;
  creado: string;
  articulos: Articulo[];
  proveedores: { id: string }[];
  movimientos: { id: string }[];
  viajes: { id: string }[];
  config: Config;
  fotos: Record<string, string>;
}

export interface Resumen {
  articulos: number;
  proveedores: number;
  movimientos: number;
  viajes: number;
  fotos: number;
  conservados: number;
  creado: string;
}

/** Preferencias que son de este teléfono y no se sobrescriben con las de la web. */
const CONFIG_LOCAL = ['tema', 'ord_arts', 'ord_bod', 'busquedas'];

export async function elegirRespaldo() {
  const r = await DocumentPicker.getDocumentAsync({ type: ['application/zip', 'application/x-zip-compressed', 'public.zip-archive'], copyToCacheDirectory: true, multiple: false });
  if (r.canceled || !r.assets?.length) return null;
  return r.assets[0];
}

const pausa = () => new Promise((ok) => setTimeout(ok, 0));
const marcaDe = (d: Record<string, unknown>) => Number(d.upd ?? d.creado ?? d.at ?? 0) || 0;

export async function importarRespaldo(db: SQLiteDatabase, uri: string, modo: ModoImportar, progreso: (txt: string) => void): Promise<Resumen> {
  progreso('Abriendo el archivo…');
  await pausa();
  const archivo = new File(uri);
  const zip = unzipSync(await archivo.bytes());
  const json = zip['respaldo.json'];
  if (!json) throw new Error('El archivo no es un respaldo de Packing-y-Conteo.');
  const r = JSON.parse(strFromU8(json)) as Respaldo;
  if (r.app !== 'packing-y-conteo') throw new Error('El archivo no es un respaldo de Packing-y-Conteo.');

  // 1. Fotos: se escriben primero; si algo falla después, solo quedan archivos sueltos que la limpieza borra.
  const mapa: Record<string, string> = {};
  const refs = Object.entries(r.fotos || {});
  let i = 0;
  for (const [ref, ruta] of refs) {
    const bytes = zip[ruta];
    if (bytes) mapa[ref] = escribirFoto('imp_' + ruta.replace(/^fotos\//, ''), bytes);
    if (++i % 10 === 0) {
      progreso(`Guardando fotos ${i} de ${refs.length}…`);
      await pausa();
    }
  }
  const arts = (r.articulos || []).map((a) => ({ ...a, fotos: (a.fotos || []).map((f) => mapa[f]).filter(Boolean) }));

  // 2. Datos: una sola transacción, o se guarda todo o nada.
  progreso('Guardando datos…');
  await pausa();
  const docs: Record<Coleccion, { id: string }[]> = { articulos: arts, proveedores: r.proveedores || [], movimientos: r.movimientos || [], viajes: r.viajes || [] };
  const res: Resumen = { articulos: 0, proveedores: 0, movimientos: 0, viajes: 0, fotos: Object.keys(mapa).length, conservados: 0, creado: r.creado };
  await db.withTransactionAsync(async () => {
    for (const col of COLECCIONES) {
      if (modo === 'reemplazar') await db.runAsync(`DELETE FROM ${col}`);
      const locales = new Map<string, number>();
      if (modo === 'combinar') {
        for (const row of await db.getAllAsync<{ id: string; updated_at: number }>(`SELECT id, updated_at FROM ${col}`)) locales.set(row.id, row.updated_at);
      }
      const st = await db.prepareAsync(
        `INSERT INTO ${col} (id, data, updated_at, deleted, dirty) VALUES ($id, $data, $upd, 0, 1)
         ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, deleted = 0, dirty = 1`
      );
      try {
        for (const d of docs[col]) {
          if (!d?.id) continue;
          const { id, ...rest } = d as { id: string } & Record<string, unknown>;
          const marca = marcaDe(rest) || Date.now();
          const local = locales.get(id);
          if (local != null && local >= marca) {
            res.conservados++;
            continue;
          }
          await st.executeAsync({ $id: id, $data: JSON.stringify(rest), $upd: marca });
          res[col]++;
        }
      } finally {
        await st.finalizeAsync();
      }
    }
    const cfg = Object.entries(r.config || {}).filter(([k]) => !CONFIG_LOCAL.includes(k));
    if (modo === 'reemplazar') await db.runAsync(`DELETE FROM config WHERE key NOT IN (${CONFIG_LOCAL.map(() => '?').join(',')})`, ...CONFIG_LOCAL);
    for (const [k, v] of cfg) {
      await db.runAsync('INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', k, JSON.stringify(v ?? null));
    }
  });

  // 3. Limpieza: borra fotos que ya ningún artículo usa y el archivo temporal.
  progreso('Ordenando fotos…');
  await pausa();
  const enUso = new Set<string>();
  for (const row of await db.getAllAsync<{ data: string }>('SELECT data FROM articulos WHERE deleted = 0')) {
    try {
      for (const f of (JSON.parse(row.data).fotos || []) as string[]) enUso.add(f);
    } catch {
      /* fila dañada */
    }
  }
  limpiarFotos(enUso);
  try {
    archivo.delete();
  } catch {
    /* es una copia en caché; iOS la borra solo */
  }
  return res;
}
