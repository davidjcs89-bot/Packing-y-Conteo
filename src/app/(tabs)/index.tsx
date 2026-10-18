import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Buscador } from '@/components/buscador';
import { Cabecera, Chip, Chips, T, Tarjeta, Vacio } from '@/components/ui';
import { costoBase, money, ORDENES, ordenar, precio, sinAcento, tieneStock, totalStock } from '@/lib/calc';
import { useStore } from '@/lib/store';
import { useColores } from '@/lib/theme';
import type { Articulo } from '@/lib/types';

export default function Articulos() {
  const c = useColores();
  const ins = useSafeAreaInsets();
  const { arts, provs, prov, cfg, viajes, listo } = useStore();
  const [q, setQ] = useState('');
  const [fProv, setFProv] = useState('');
  const [orden, setOrden] = useState<string | null>(null);
  const modo = orden ?? cfg.ord_arts ?? 'rec';

  const lista = useMemo(() => {
    const t = sinAcento(q.trim());
    const f = arts.filter(
      (a) =>
        (!fProv || a.proveedorId === fProv) &&
        (!t || sinAcento([a.estilo, a.nombre, a.categoria, a.factura, ...(a.colores || [])].join(' ')).includes(t))
    );
    return ordenar(f, modo);
  }, [arts, q, fProv, modo]);

  const renderItem = ({ item: a }: { item: Articulo }) => {
    const p = prov(a.proveedorId);
    const base = costoBase(a, cfg, viajes, arts);
    const pm = precio(a, 'mayoreo', p, cfg, base);
    return (
      <Tarjeta onPress={() => router.push({ pathname: '/articulo/[id]', params: { id: a.id } })} style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
        {a.fotos[0] ? (
          <Image source={{ uri: a.fotos[0] }} style={{ width: 72, height: 92, borderRadius: 8, backgroundColor: c.bg }} contentFit="cover" cachePolicy="disk" transition={120} />
        ) : (
          <View style={{ width: 72, height: 92, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
            <T tipo="chico">Sin foto</T>
          </View>
        )}
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <T tipo="mono">{a.estilo || '—'}</T>
            <Text style={{ color: tieneStock(a) && !totalStock(a) ? c.danger : c.accent, fontWeight: '800', fontSize: 17 }}>{tieneStock(a) ? totalStock(a) : '—'}</Text>
          </View>
          <T numberOfLines={1} style={{ fontWeight: '600' }}>
            {a.nombre || 'Sin tipo'} <T tipo="muted">· {p?.nombre || 'Sin proveedor'}</T>
          </T>
          <T tipo="chico" numberOfLines={1}>
            {(a.colores || []).join(', ') || 'Sin colores'} · {(a.tallas || []).join(', ')}
          </T>
          <View style={{ alignSelf: 'flex-start', backgroundColor: pm == null ? c.dangerSoft : c.goldSoft, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginTop: 2 }}>
            <Text style={{ color: pm == null ? c.danger : c.gold, fontWeight: '700', fontFamily: 'Menlo', fontSize: 13 }}>{pm == null ? 'Sin precio' : `May ${money(pm)}`}</Text>
          </View>
        </View>
      </Tarjeta>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Cabecera titulo="Artículos" derecha={<T tipo="chico">{lista.length} de {arts.length}</T>} />
      <FlatList
        data={lista}
        keyExtractor={(a) => a.id}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: ins.bottom + 140 }}
        initialNumToRender={12}
        windowSize={7}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 10 }}>
            <Buscador valor={q} onCambio={setQ} />
            <Chips scroll>
              <Chip titulo={`Todos · ${arts.length}`} activo={!fProv} onPress={() => setFProv('')} />
              {provs.map((p) => {
                const n = arts.filter((a) => a.proveedorId === p.id).length;
                return n ? <Chip key={p.id} titulo={`${p.nombre} · ${n}`} activo={fProv === p.id} onPress={() => setFProv(p.id)} /> : null;
              })}
            </Chips>
            <Chips scroll>
              {ORDENES.map(([k, l]) => (
                <Chip key={k} titulo={l} activo={modo === k} onPress={() => setOrden(k)} />
              ))}
            </Chips>
          </View>
        }
        ListEmptyComponent={listo ? <Vacio texto={arts.length ? 'Sin resultados con ese filtro.' : 'Todavía no hay artículos. Crea uno con el botón “+ Artículo” o importa tu respaldo desde Ajustes.'} /> : undefined}
      />
      <Pressable
        onPress={() => router.push({ pathname: '/articulo/[id]', params: { id: 'nuevo', prov: fProv } })}
        style={({ pressed }) => ({ position: 'absolute', right: 16, bottom: ins.bottom + 70, backgroundColor: c.accent, borderRadius: 28, paddingHorizontal: 20, paddingVertical: 14, opacity: pressed ? 0.8 : 1, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } })}>
        <Text style={{ color: c.accentInk, fontWeight: '800', fontSize: 16 }}>＋ Artículo</Text>
      </Pressable>
    </View>
  );
}
