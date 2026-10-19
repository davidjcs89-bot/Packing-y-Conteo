import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { Boton, Campo, Chip, Chips, Fila, Pantalla, Segmento, T, Tarjeta } from '@/components/ui';
import { CATS_GASTO, gastoUsd, money, num, resumenViaje, uid, uniq } from '@/lib/calc';
import { useStore } from '@/lib/store';
import { useColores } from '@/lib/theme';
import type { Articulo, Gasto, Viaje } from '@/lib/types';

export default function EditorViaje() {
  const c = useColores();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { viajes, arts, provs, cfg, guardarViaje, borrarViaje, guardarArts } = useStore();
  const existente = viajes.find((v) => v.id === id);
  const [v, setV] = useState<Viaje>(() =>
    existente ? JSON.parse(JSON.stringify(existente)) : { id: uid(), nombre: '', desde: '', hasta: '', tc: cfg.tcDef ?? null, gastos: [], reparto: 'valor', creado: Date.now() }
  );
  // Asignación de artículos al viaje: se guarda junto con el viaje.
  const [asig, setAsig] = useState<Record<string, string | null>>({});
  const [tcTxt, setTcTxt] = useState(v.tc != null ? String(v.tc) : '');

  const set = (p: Partial<Viaje>) => setV((x) => ({ ...x, ...p }));
  const setG = (i: number, p: Partial<Gasto>) => set({ gastos: v.gastos.map((g, j) => (j === i ? { ...g, ...p } : g)) });

  const reales = arts.filter((a) => !a.ejemplo);
  const viajeDe = (a: Articulo) => (a.id in asig ? asig[a.id] : a.viajeId ?? null);
  const artsSim = reales.map((a) => ({ ...a, viajeId: viajeDe(a) }));
  const r = resumenViaje(v, artsSim, cfg.tcDef ?? null);
  const porCat = CATS_GASTO.map(([k, n]) => [n, v.gastos.filter((g) => (g.cat || 'otros') === k).reduce((x, g) => x + gastoUsd(g, v, cfg.tcDef ?? null), 0)] as const).filter(([, m]) => m);
  const provsV = uniq(reales.map((a) => a.proveedorId).filter(Boolean) as string[])
    .map((pid) => provs.find((p) => p.id === pid))
    .filter(Boolean);

  const togProv = (pid: string) => {
    const todos = reales.filter((a) => a.proveedorId === pid);
    const incluidos = todos.every((a) => viajeDe(a) === v.id);
    setAsig((x) => ({ ...x, ...Object.fromEntries(todos.map((a) => [a.id, incluidos ? null : v.id])) }));
  };

  const guardar = async () => {
    const datos: Viaje = {
      ...v,
      nombre: v.nombre.trim() || 'Viaje ' + new Date().toLocaleDateString('es-EC', { month: 'short', year: 'numeric' }),
      gastos: v.gastos.filter((g) => Number(g.monto)),
    };
    await guardarViaje(datos);
    const cambios = reales.filter((a) => a.id in asig && (a.viajeId ?? null) !== asig[a.id]).map((a) => ({ ...a, viajeId: asig[a.id] }));
    await guardarArts(cambios);
    router.back();
  };

  const eliminar = () =>
    Alert.alert('Eliminar viaje', '¿Eliminar este viaje? Sus artículos quedan sin viaje.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await guardarArts(reales.filter((a) => a.viajeId === v.id).map((a) => ({ ...a, viajeId: null })));
          await borrarViaje(v.id);
          router.back();
        },
      },
    ]);

  return (
    <>
      <Stack.Screen
        options={{
          title: existente ? v.nombre || 'Viaje' : 'Nuevo viaje',
          headerRight: () => (
            <Pressable onPress={guardar} hitSlop={10}>
              <Text style={{ color: c.accent, fontWeight: '800', fontSize: 17 }}>Guardar</Text>
            </Pressable>
          ),
        }}
      />
      <Pantalla>
        <Campo etiqueta="Nombre del viaje" value={v.nombre} onChangeText={(x) => set({ nombre: x })} placeholder="Guangzhou octubre 2026" />
        <Fila>
          <Campo etiqueta="Desde" value={v.desde || ''} onChangeText={(x) => set({ desde: x })} placeholder="2026-10-01" keyboardType="numbers-and-punctuation" />
          <Campo etiqueta="Hasta" value={v.hasta || ''} onChangeText={(x) => set({ hasta: x })} placeholder="2026-10-15" keyboardType="numbers-and-punctuation" />
          <Campo etiqueta="Cambio ¥/USD" value={tcTxt} onChangeText={(x) => { setTcTxt(x); set({ tc: num(x) }); }} placeholder="6.70" keyboardType="decimal-pad" />
        </Fila>

        <Tarjeta style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 }}>
          {[
            ['Gastos del viaje', money(r.gastos)],
            ['Comprado (costo)', money(r.valor)],
            ['Piezas', String(r.piezas)],
            ['Recargo', v.reparto === 'pieza' ? money(r.porPieza) + '/pza' : r.pct.toFixed(1) + '%'],
          ].map(([l, x]) => (
            <View key={l} style={{ width: '50%' }}>
              <T tipo="chico">{l}</T>
              <T style={{ fontSize: 19, fontWeight: '800', fontFamily: 'Menlo' }}>{x}</T>
            </View>
          ))}
        </Tarjeta>

        <T tipo="label">Gastos</T>
        {v.gastos.map((g, i) => (
          <Tarjeta key={g.id} style={{ gap: 8 }}>
            <Chips scroll>
              {CATS_GASTO.map(([k, n]) => (
                <Chip key={k} titulo={n} activo={(g.cat || 'otros') === k} onPress={() => setG(i, { cat: k })} />
              ))}
            </Chips>
            <Campo value={g.desc || ''} onChangeText={(x) => setG(i, { desc: x })} placeholder="Detalle (opcional)" />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                value={g.monto != null ? String(g.monto) : ''}
                onChangeText={(x) => setG(i, { monto: num(x) })}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={c.muted}
                style={{ flex: 1, backgroundColor: c.bg, borderColor: c.line, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: c.ink, fontFamily: 'Menlo' }}
              />
              <Chip titulo="USD" activo={g.moneda !== 'RMB'} onPress={() => setG(i, { moneda: 'USD' })} />
              <Chip titulo="RMB" activo={g.moneda === 'RMB'} onPress={() => setG(i, { moneda: 'RMB' })} />
              <Pressable hitSlop={8} onPress={() => set({ gastos: v.gastos.filter((_, j) => j !== i) })}>
                <Text style={{ color: c.muted, fontSize: 22 }}>×</Text>
              </Pressable>
            </View>
            {g.moneda === 'RMB' && Number(g.monto) ? <T tipo="chico">≈ {money(gastoUsd(g, v, cfg.tcDef ?? null))}</T> : null}
          </Tarjeta>
        ))}
        <Chips>
          {CATS_GASTO.map(([k, n]) => (
            <Chip key={k} titulo={'+ ' + n} onPress={() => set({ gastos: [...v.gastos, { id: uid(), cat: k, desc: '', monto: null, moneda: 'USD' }] })} />
          ))}
        </Chips>
        <T tipo="chico">{porCat.map(([n, m]) => `${n} ${money(m)}`).join(' · ') || 'Sin gastos todavía.'}</T>

        <T tipo="label">Cómo repartir</T>
        <Segmento opciones={[['valor', 'Por valor (% del costo)'], ['pieza', 'Igual por pieza']]} valor={v.reparto === 'pieza' ? 'pieza' : 'valor'} onCambio={(k) => set({ reparto: k })} />
        <T tipo="chico">{v.reparto === 'pieza' ? 'Cada pieza carga lo mismo.' : 'Cada prenda carga según su costo: una de $20 absorbe más que una de $5.'}</T>

        <T tipo="label">Compras de este viaje</T>
        <T tipo="chico">Toca un proveedor para incluir o quitar todos sus artículos. También puedes elegir el viaje dentro de cada artículo.</T>
        {provsV.map((p) => {
          const todos = reales.filter((a) => a.proveedorId === p!.id);
          const en = todos.filter((a) => viajeDe(a) === v.id).length;
          const otro = todos.filter((a) => viajeDe(a) && viajeDe(a) !== v.id).length;
          return (
            <Tarjeta key={p!.id} onPress={() => togProv(p!.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderColor: en ? c.accent : c.line }}>
              <View style={{ flex: 1 }}>
                <T style={{ fontWeight: '700' }}>{p!.nombre}</T>
                <T tipo="chico">
                  {en}/{todos.length} art. en este viaje{otro ? ` · ${otro} en otro viaje` : ''}
                </T>
              </View>
              <Chip titulo={en === todos.length && en ? 'Incluido' : en ? 'Parcial' : 'Incluir'} activo={en === todos.length && en > 0} onPress={() => togProv(p!.id)} />
            </Tarjeta>
          );
        })}

        <Boton tipo="primario" titulo="Guardar" onPress={guardar} />
        {existente ? <Boton tipo="peligro" titulo="Eliminar viaje" onPress={eliminar} /> : null}
      </Pantalla>
    </>
  );
}
