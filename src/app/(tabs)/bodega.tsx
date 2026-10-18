import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Buscador } from '@/components/buscador';
import { Cabecera, Chip, Chips, T, Tarjeta, Vacio } from '@/components/ui';
import { costoBase, ejes, money, ordenar, precio, sinAcento, skey, tieneStock, totalStock } from '@/lib/calc';
import { useStore } from '@/lib/store';
import { useColores } from '@/lib/theme';
import type { Articulo } from '@/lib/types';

const ORD_BOD: [string, string][] = [
  ['rec', 'Recientes'],
  ['pzs', 'Más piezas'],
  ['pzsasc', 'Menos piezas'],
  ['asc', 'Estilo ↑'],
];

export default function Bodega() {
  const c = useColores();
  const ins = useSafeAreaInsets();
  const { arts, movs, prov, cfg, viajes } = useStore();
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState('');
  const [detalle, setDetalle] = useState(false);
  const [orden, setOrden] = useState<string | null>(null);
  const modo = orden ?? cfg.ord_bod ?? 'rec';

  const reales = arts.filter((a) => !a.ejemplo);
  const conSt = reales.filter(tieneStock);
  const piezas = conSt.reduce((x, a) => x + totalStock(a), 0);
  const valCosto = conSt.reduce((x, a) => x + totalStock(a) * (costoBase(a, cfg, viajes, arts) || 0), 0);
  const valMay = conSt.reduce((x, a) => x + totalStock(a) * (precio(a, 'mayoreo', prov(a.proveedorId), cfg, costoBase(a, cfg, viajes, arts)) || 0), 0);

  const lista = useMemo(() => {
    const t = sinAcento(q.trim());
    const f = reales.filter(
      (a) =>
        (!t || sinAcento([a.estilo, a.nombre, a.factura, ...(a.colores || [])].join(' ')).includes(t)) &&
        (!filtro || (filtro === 'con' ? totalStock(a) > 0 : filtro === 'agot' ? tieneStock(a) && !totalStock(a) : !tieneStock(a)))
    );
    return ordenar(f, modo);
  }, [reales, q, filtro, modo]);

  const fila = ({ item: a }: { item: Articulo }) => {
    const tot = totalStock(a);
    const { cols, tals } = ejes(a);
    return (
      <Tarjeta onPress={() => router.push({ pathname: '/articulo/[id]', params: { id: a.id } })} style={{ marginBottom: 8, gap: 6, borderLeftWidth: tieneStock(a) && !tot ? 3 : undefined, borderLeftColor: c.danger }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <T tipo="mono">{a.estilo} <T tipo="muted">{a.nombre}</T></T>
            <T tipo="chico">{prov(a.proveedorId)?.nombre || ''}</T>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: tieneStock(a) && !tot ? c.danger : c.ink }}>{tieneStock(a) ? tot : '—'}</Text>
        </View>
        {detalle && tieneStock(a) ? (
          <View>
            {cols.map((col) => (
              <T key={col} tipo="chico">
                <Text style={{ color: c.ink, fontWeight: '600' }}>{col}: </Text>
                {tals.map((t) => `${t} ${a.stock?.[skey(col, t)] || 0}`).join(' · ')}
              </T>
            ))}
          </View>
        ) : null}
      </Tarjeta>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Cabecera titulo="Bodega" />
      <FlatList
        data={lista}
        keyExtractor={(a) => a.id}
        renderItem={fila}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: ins.bottom + 100 }}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 10 }}>
            <Tarjeta style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 }}>
              {[
                ['Piezas en bodega', String(piezas)],
                ['Artículos con existencia', String(conSt.filter((a) => totalStock(a) > 0).length)],
                ['Valor a costo', money(valCosto)],
                ['Valor a mayoreo', money(valMay)],
              ].map(([l, v]) => (
                <View key={l} style={{ width: '50%' }}>
                  <T tipo="chico">{l}</T>
                  <T style={{ fontSize: 20, fontWeight: '800', fontFamily: 'Menlo' }}>{v}</T>
                </View>
              ))}
            </Tarjeta>
            <Buscador valor={q} onCambio={setQ} />
            <Chips scroll>
              {[['', 'Todos'], ['con', 'Con existencia'], ['agot', 'Agotados'], ['sin', 'Sin registrar']].map(([k, l]) => (
                <Chip key={k} titulo={l} activo={filtro === k} onPress={() => setFiltro(k)} />
              ))}
            </Chips>
            <Chips scroll>
              <Chip titulo={detalle ? 'Ver resumen' : 'Ver color y talla'} activo={detalle} onPress={() => setDetalle((x) => !x)} />
              {ORD_BOD.map(([k, l]) => (
                <Chip key={k} titulo={l} activo={modo === k} onPress={() => setOrden(k)} />
              ))}
            </Chips>
          </View>
        }
        ListEmptyComponent={<Vacio texto="No hay artículos con estos filtros." />}
        ListFooterComponent={
          movs.length ? (
            <View style={{ marginTop: 16, gap: 6 }}>
              <T tipo="sub">Últimos movimientos</T>
              {movs.slice(0, 15).map((m) => (
                <Tarjeta key={m.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <T><T tipo="mono">{m.estilo}</T> {m.motivo}</T>
                    <T tipo="chico">{new Date(m.at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })} · {m.lineas.map((l) => `${l.color} ${l.talla} ${l.cant > 0 ? '+' : ''}${l.cant}`).join(', ')}</T>
                  </View>
                  <Text style={{ fontWeight: '800', color: m.total < 0 ? c.danger : c.accent }}>{m.total > 0 ? '+' : ''}{m.total}</Text>
                </Tarjeta>
              ))}
            </View>
          ) : undefined
        }
      />
    </View>
  );
}
