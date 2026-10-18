import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { aplicar, uid } from './calc';
import { borrarDoc, contarPendientes, guardarConfig, guardarDoc, leerConfig, leerTodo } from './db';
import type { Articulo, Config, Linea, Movimiento, Proveedor, Viaje } from './types';

/*
 * Estado de la app en memoria, cargado desde SQLite al abrir.
 * Todo cambio se escribe primero en SQLite (funciona sin internet) y luego
 * se refleja en pantalla.
 */
interface Store {
  listo: boolean;
  arts: Articulo[];
  provs: Proveedor[];
  movs: Movimiento[];
  viajes: Viaje[];
  cfg: Config;
  pendientes: number;
  prov: (id?: string) => Proveedor | undefined;
  guardarArt: (a: Articulo) => Promise<void>;
  borrarArt: (id: string) => Promise<void>;
  guardarProv: (p: Proveedor) => Promise<void>;
  borrarProv: (id: string) => Promise<void>;
  guardarViaje: (v: Viaje) => Promise<void>;
  borrarViaje: (id: string) => Promise<void>;
  registrarMov: (a: Articulo, tipo: Movimiento['tipo'], lineas: Linea[], motivo: string) => Promise<Record<string, number>>;
  setCfg: (parcial: Partial<Config>) => Promise<void>;
  recargar: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [listo, setListo] = useState(false);
  const [arts, setArts] = useState<Articulo[]>([]);
  const [provs, setProvs] = useState<Proveedor[]>([]);
  const [movs, setMovs] = useState<Movimiento[]>([]);
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [cfg, setCfgState] = useState<Config>({});
  const [pendientes, setPendientes] = useState(0);

  const recargar = useCallback(async () => {
    const [a, p, m, v, c, n] = await Promise.all([
      leerTodo<Articulo>(db, 'articulos'),
      leerTodo<Proveedor>(db, 'proveedores'),
      leerTodo<Movimiento>(db, 'movimientos'),
      leerTodo<Viaje>(db, 'viajes'),
      leerConfig(db),
      contarPendientes(db),
    ]);
    setArts(a.map((x) => ({ ...x, colores: x.colores || [], tallas: x.tallas || [], fotos: x.fotos || [] })));
    setProvs(p.sort((x, y) => x.nombre.localeCompare(y.nombre)));
    setMovs(m.sort((x, y) => y.at - x.at));
    setViajes(v.sort((x, y) => (y.creado || 0) - (x.creado || 0)));
    setCfgState(c);
    setPendientes(n);
    setListo(true);
  }, [db]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const reemplazar = <T extends { id: string }>(lista: T[], doc: T) => {
    const i = lista.findIndex((x) => x.id === doc.id);
    if (i < 0) return [doc, ...lista];
    const c = lista.slice();
    c[i] = doc;
    return c;
  };

  const store = useMemo<Store>(() => {
    const sumarPend = () => setPendientes((n) => n + 1);
    return {
      listo,
      arts,
      provs,
      movs,
      viajes,
      cfg,
      pendientes,
      prov: (id) => provs.find((p) => p.id === id),
      guardarArt: async (a) => {
        await guardarDoc(db, 'articulos', a);
        setArts((l) => reemplazar(l, a));
        sumarPend();
      },
      borrarArt: async (id) => {
        await borrarDoc(db, 'articulos', id);
        setArts((l) => l.filter((x) => x.id !== id));
        sumarPend();
      },
      guardarProv: async (p) => {
        await guardarDoc(db, 'proveedores', p);
        setProvs((l) => reemplazar(l, p).sort((x, y) => x.nombre.localeCompare(y.nombre)));
        sumarPend();
      },
      borrarProv: async (id) => {
        await borrarDoc(db, 'proveedores', id);
        setProvs((l) => l.filter((x) => x.id !== id));
        sumarPend();
      },
      guardarViaje: async (v) => {
        await guardarDoc(db, 'viajes', v);
        setViajes((l) => reemplazar(l, v));
        sumarPend();
      },
      borrarViaje: async (id) => {
        await borrarDoc(db, 'viajes', id);
        setViajes((l) => l.filter((x) => x.id !== id));
        sumarPend();
      },
      registrarMov: async (a, tipo, lineas, motivo) => {
        const lin = lineas.filter((l) => l.cant);
        const stock = aplicar(a.stock, lin);
        if (!lin.length) return stock;
        const nuevo: Articulo = { ...a, stock };
        const mov: Movimiento = {
          id: uid(),
          artId: a.id,
          estilo: a.estilo,
          proveedorId: a.proveedorId,
          tipo,
          lineas: lin,
          total: lin.reduce((x, l) => x + l.cant, 0),
          motivo,
          factura: a.factura,
          at: Date.now(),
        };
        // Artículo y movimiento en una sola transacción: o se guardan los dos o ninguno.
        await db.withTransactionAsync(async () => {
          await guardarDoc(db, 'articulos', nuevo);
          await guardarDoc(db, 'movimientos', mov);
        });
        setArts((l) => reemplazar(l, nuevo));
        setMovs((l) => [mov, ...l]);
        setPendientes((n) => n + 2);
        return stock;
      },
      setCfg: async (parcial) => {
        await guardarConfig(db, parcial);
        setCfgState((c) => ({ ...c, ...parcial }));
      },
      recargar,
    };
  }, [listo, arts, provs, movs, viajes, cfg, pendientes, db, recargar]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore fuera de StoreProvider');
  return s;
}
