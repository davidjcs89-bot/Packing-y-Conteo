import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Buscador } from '@/components/buscador';
import { FilaMovimiento } from '@/components/historial';
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

  const hoy0 = new Date().setHours(0, 0, 0, 0);
  const movHoy = movs.filter((m) => m.at >= hoy0);
  const vendHoy = -movHoy.filter((m) => m.tipo === 'venta').reduce((x, m) => x + m.total, 0);
  const entHoy = movHoy.filter((m) => m.tipo === 'entrada').reduce((x, m) => x + m.total, 0);

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
        {tieneStock(a) ? (
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
            {([['venta', '− Venta'], ['entrada', '+ Entrada'], ['ajuste', 'Conteo']] as const).map(([t, l]) => (
              <Pressable
                key={t}
                onPress={() => router.push({ pathname: '/movimiento/[id]', params: { id: a.id, tipo: t } })}
                style={({ pressed }) => ({ flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: c.line, backgroundColor: c.bg, opacity: pressed ? 0.6 : 1 })}>
                <Text style={{ fontWeight: '700', fontSize: 13, color: t === 'venta' ? c.danger : t === 'entrada' ? c.accent : c.ink }}>{l}</Text>
              </Pressable>
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
              <View style={{ width: '100%', borderTopWidth: 1, borderTopColor: c.line, paddingTop: 8 }}>
                <T tipo="chico">
                  Hoy: <Text style={{ color: c.danger, fontWeight: '800' }}>{vendHoy}</Text> vendidas · <Text style={{ color: c.accent, fontWeight: '800' }}>{entHoy}</Text> entradas
                </T>
              </View>
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
                <FilaMovimiento key={m.id} m={m} conEstilo />
              ))}
            </View>
          ) : undefined
        }
      />
    </View>
  );
}
