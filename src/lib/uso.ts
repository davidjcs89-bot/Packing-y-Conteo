import type { SQLiteDatabase } from 'expo-sqlite';
import { Directory, File, Paths } from 'expo-file-system';

import { carpetaFotos } from './fotos';
import { DB_NAME } from './db';

/*
 * Uso y costos.
 * Hoy todo vive en el teléfono (gratis). Cuando conectemos la nube (Fase 4) la
 * sincronización llamará a usoNube() con lo que leyó, escribió y transfirió, y
 * aquí se acumula por día y por mes. Se guarda en la base local: no cuesta nada.
 */
export interface Contadores { l: number; e: number; tb: number; ts: number }
export interface Uso { d: string; m: string; desde: string; hoy: Contadores; mes: Contadores }

const CERO = (): Contadores => ({ l: 0, e: 0, tb: 0, ts: 0 });

export async function leerUso(db: SQLiteDatabase): Promise<Uso> {
  const hoy = new Date().toISOString().slice(0, 10);
  const mes = hoy.slice(0, 7);
  const r = await db.getFirstAsync<{ value: string }>("SELECT value FROM config WHERE key = 'uso_nube'");
  let u: Uso = { d: hoy, m: mes, desde: hoy, hoy: CERO(), mes: CERO() };
  try {
    if (r) u = JSON.parse(r.value);
  } catch {
    /* dañado: se reinicia */
  }
  if (u.d !== hoy) Object.assign(u, { d: hoy, hoy: CERO() });
  if (u.m !== mes) Object.assign(u, { m: mes, mes: CERO(), desde: hoy });
  return u;
}

/** Suma lo que hizo una sincronización con la nube. */
export async function usoNube(db: SQLiteDatabase, delta: Partial<Contadores>) {
  const u = await leerUso(db);
  for (const k of ['l', 'e', 'tb', 'ts'] as const) {
    u.hoy[k] += delta[k] || 0;
    u.mes[k] += delta[k] || 0;
  }
  await db.runAsync("INSERT INTO config (key, value) VALUES ('uso_nube', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", JSON.stringify(u));
}

/** Espacio que ocupa la app en el teléfono. */
export function espacioLocal() {
  let datos = 0;
  for (const nombre of [DB_NAME, DB_NAME + '-wal']) {
    try {
      const f = new File(new Directory(Paths.document, 'SQLite'), nombre);
      if (f.exists) datos += f.size || 0;
    } catch {
      /* sin archivo */
    }
  }
  let fotos = 0;
  let nFotos = 0;
  for (const it of carpetaFotos().list()) {
    if (it instanceof File) {
      fotos += it.size || 0;
      nFotos++;
    }
  }
  return { datos, fotos, nFotos, libre: Paths.availableDiskSpace, total: Paths.totalDiskSpace };
}

export const peso = (b?: number | null) =>
  b == null ? '—' : b >= 1073741824 ? (b / 1073741824).toFixed(1) + ' GB' : b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(b ? 1 : 0, Math.round(b / 1024)) + ' KB';
