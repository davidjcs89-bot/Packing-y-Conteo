import type { SQLiteDatabase } from 'expo-sqlite';

import type { Coleccion, Config } from './types';

/*
 * Base local en el iPhone (SQLite).
 * Cada colección es una tabla de documentos JSON. Las columnas updated_at,
 * deleted y dirty quedan listas para la sincronización con la nube (Fase 4):
 *  - updated_at: última modificación (ms)
 *  - deleted: 1 = borrado lógico (para que otros dispositivos se enteren)
 *  - dirty: 1 = cambio local pendiente de subir
 */
export const DB_NAME = 'packing-y-conteo.db';
const DB_VERSION = 1;
export const COLECCIONES: Coleccion[] = ['articulos', 'proveedores', 'movimientos', 'viajes'];

export async function migrar(db: SQLiteDatabase) {
  const r = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let v = r?.user_version ?? 0;
  if (v >= DB_VERSION) return;
  if (v === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';
      ${COLECCIONES.map(
        (c) => `CREATE TABLE IF NOT EXISTS ${c} (
          id TEXT PRIMARY KEY NOT NULL,
          data TEXT NOT NULL,
          updated_at INTEGER NOT NULL,
          deleted INTEGER NOT NULL DEFAULT 0,
          dirty INTEGER NOT NULL DEFAULT 1
        );`
      ).join('\n')}
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
    v = 1;
  }
  await db.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
}

export async function leerTodo<T>(db: SQLiteDatabase, col: Coleccion): Promise<T[]> {
  const rows = await db.getAllAsync<{ id: string; data: string }>(
    `SELECT id, data FROM ${col} WHERE deleted = 0`
  );
  return rows.map((r) => ({ ...JSON.parse(r.data), id: r.id }) as T);
}

export async function guardarDoc(db: SQLiteDatabase, col: Coleccion, doc: { id: string }) {
  const { id, ...rest } = doc as { id: string } & Record<string, unknown>;
  await db.runAsync(
    `INSERT INTO ${col} (id, data, updated_at, deleted, dirty) VALUES (?, ?, ?, 0, 1)
     ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, deleted = 0, dirty = 1`,
    id,
    JSON.stringify(rest),
    Date.now()
  );
}

export async function borrarDoc(db: SQLiteDatabase, col: Coleccion, id: string) {
  await db.runAsync(
    `UPDATE ${col} SET deleted = 1, dirty = 1, updated_at = ? WHERE id = ?`,
    Date.now(),
    id
  );
}

export async function leerConfig(db: SQLiteDatabase): Promise<Config> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM config');
  const c: Config = {};
  for (const r of rows) {
    try {
      c[r.key] = JSON.parse(r.value);
    } catch {
      /* valor dañado: se ignora */
    }
  }
  return c;
}

export async function guardarConfig(db: SQLiteDatabase, parcial: Partial<Config>) {
  await db.withTransactionAsync(async () => {
    for (const [k, v] of Object.entries(parcial)) {
      await db.runAsync(
        'INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        k,
        JSON.stringify(v ?? null)
      );
    }
  });
}

export async function contarPendientes(db: SQLiteDatabase): Promise<number> {
  let n = 0;
  for (const c of COLECCIONES) {
    const r = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${c} WHERE dirty = 1`);
    n += r?.n ?? 0;
  }
  return n;
}
