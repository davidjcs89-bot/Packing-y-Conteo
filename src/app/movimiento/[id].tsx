import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { TablaStock } from '@/components/tabla-stock';
import { Boton, Campo, Chip, Chips, Pantalla, Segmento, T, Tarjeta } from '@/components/ui';
import { ejes, skey, totalStock } from '@/lib/calc';
import { useStore } from '@/lib/store';
import { useColores } from '@/lib/theme';
import type { Linea, Movimiento } from '@/lib/types';

type Tipo = Movimiento['tipo'];
const MOTIVOS: Record<Tipo, string[]> = {
  venta: ['Venta', 'Venta mayoreo', 'Cambio', 'Muestra'],
  entrada: ['Compra', 'Devolución', 'Llegó del proveedor'],
  ajuste: ['Conteo físico', 'Daño', 'Pérdida'],
};

/** Registrar una venta, entrada o conteo de un artículo, por color y talla. */
export default function RegistrarMovimiento() {
  const c = useColores();
  const { id, tipo: tipoParam } = useLocalSearchParams<{ id: string; tipo?: Tipo }>();
  const { arts, registrarMov } = useStore();
  const a = arts.find((x) => x.id === id);
  const [tipo, setTipo] = useState<Tipo>(tipoParam === 'entrada' || tipoParam === 'ajuste' ? tipoParam : 'venta');
  const [cant, setCant] = useState<Record<string, number>>({});
  const [motivo, setMotivo] = useState(MOTIVOS[tipo][0]);
  const [guardando, setGuardando] = useState(false);

  const { cols, tals } = useMemo(() => (a ? ejes(a) : { cols: [], tals: [] }), [a]);
  if (!a) return <Pantalla><T>No se encontró el artículo.</T></Pantalla>;
  const st = a.stock || {};
  const claves = cols.flatMap((col) => tals.map((t) => skey(col, t)));
  // En "Conteo" se escribe lo que hay; en venta/entrada, cuánto sale o entra.
  const valores = Object.fromEntries(claves.map((k) => [k, cant[k] ?? (tipo === 'ajuste' ? st[k] || 0 : 0)]));
  const lineas: Linea[] = claves
    .map((k) => {
      const v = valores[k] || 0;
      const d = tipo === 'venta' ? -v : tipo === 'entrada' ? v : v - (st[k] || 0);
      return { color: k.split('|')[0], talla: k.split('|')[1], cant: d };
    })
    .filter((l) => l.cant);
  const total = lineas.reduce((x, l) => x + l.cant, 0);
  const pasa = tipo === 'venta' && claves.some((k) => (valores[k] || 0) > (st[k] || 0));
  const despues = totalStock(a) + total;

  const cambiarTipo = (t: Tipo) => {
    setTipo(t);
    setCant({});
    setMotivo(MOTIVOS[t][0]);
  };

  const guardar = async () => {
    if (!lineas.length) return Alert.alert('Sin cambios', tipo === 'ajuste' ? 'Las cantidades son iguales a las de bodega.' : 'Escribe cuántas piezas.');
    if (pasa) return Alert.alert('No alcanza', 'Estás vendiendo más piezas de las que hay en alguna talla (marcadas en rojo).');
    setGuardando(true);
    try {
      await registrarMov(a, tipo, lineas, motivo.trim() || MOTIVOS[tipo][0]);
      router.back();
    } catch (e) {
      Alert.alert('No se pudo guardar', String(e));
      setGuardando(false);
    }
  };

  const titulo = tipo === 'venta' ? 'Venta' : tipo === 'entrada' ? 'Entrada' : 'Conteo';
  return (
    <>
      <Stack.Screen
        options={{
          title: `${titulo} · ${a.estilo}`,
          headerRight: () => (
            <Pressable onPress={guardar} hitSlop={10} disabled={guardando}>
              <Text style={{ color: c.accent, fontWeight: '800', fontSize: 17 }}>Guardar</Text>
            </Pressable>
          ),
        }}
      />
      <Pantalla>
        <View>
          <T tipo="mono">{a.estilo} <T tipo="muted">{a.nombre}</T></T>
          <T tipo="chico">En bodega: {totalStock(a)} piezas</T>
        </View>
        <Segmento opciones={[['venta', '− Venta'], ['entrada', '+ Entrada'], ['ajuste', 'Conteo']]} valor={tipo} onCambio={cambiarTipo} />
        <T tipo="chico">
          {tipo === 'venta' ? 'Escribe cuántas piezas salen de cada color y talla.' : tipo === 'entrada' ? 'Escribe cuántas piezas entran de cada color y talla.' : 'Escribe lo que contaste en bodega; se guarda la diferencia como ajuste.'}
        </T>
        <Tarjeta>
          <TablaStock
            cols={cols}
            tals={tals}
            valores={valores}
            onCambio={(k, v) => setCant({ ...valores, [k]: v })}
            onLlenar={(n) => setCant(Object.fromEntries(claves.map((k) => [k, n])))}
            disp={tipo === 'venta' ? st : undefined}
            atajos={tipo === 'ajuste' ? [0] : [1, 2, 4, 0]}
          />
        </Tarjeta>
        <T tipo="label">Motivo</T>
        <Chips>
          {MOTIVOS[tipo].map((m) => (
            <Chip key={m} titulo={m} activo={motivo === m} onPress={() => setMotivo(m)} />
          ))}
        </Chips>
        <Campo value={motivo} onChangeText={setMotivo} placeholder="Motivo o nota (cliente, factura…)" />
        <Tarjeta style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T>{total > 0 ? `+${total}` : total} piezas</T>
          <T style={{ fontWeight: '800' }}>Quedan {despues}</T>
        </Tarjeta>
        <Boton tipo="primario" titulo={guardando ? 'Guardando…' : `Guardar ${titulo.toLowerCase()}`} onPress={guardar} disabled={guardando || pasa} />
      </Pantalla>
    </>
  );
}
