import { Text, View } from 'react-native';

import { T, Tarjeta } from '@/components/ui';
import { useStore } from '@/lib/store';
import { useColores } from '@/lib/theme';
import type { Movimiento } from '@/lib/types';

const NOMBRE: Record<Movimiento['tipo'], string> = { venta: 'Venta', entrada: 'Entrada', ajuste: 'Ajuste' };

export function FilaMovimiento({ m, conEstilo }: { m: Movimiento; conEstilo?: boolean }) {
  const c = useColores();
  return (
    <Tarjeta style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
      <View style={{ flex: 1 }}>
        <T>
          {conEstilo ? <T tipo="mono">{m.estilo} </T> : null}
          {m.motivo || NOMBRE[m.tipo]}
        </T>
        <T tipo="chico">
          {new Date(m.at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })} · {NOMBRE[m.tipo]} · {m.lineas.map((l) => `${l.color} ${l.talla} ${l.cant > 0 ? '+' : ''}${l.cant}`).join(', ')}
        </T>
      </View>
      <Text style={{ fontWeight: '800', color: m.total < 0 ? c.danger : c.accent }}>{m.total > 0 ? '+' : ''}{m.total}</Text>
    </Tarjeta>
  );
}

/** Últimos movimientos de un artículo. */
export function HistorialArticulo({ artId }: { artId: string }) {
  const { movs } = useStore();
  const lista = movs.filter((m) => m.artId === artId).slice(0, 20);
  if (!lista.length) return null;
  return (
    <View style={{ gap: 6 }}>
      <T tipo="label">Movimientos</T>
      {lista.map((m) => (
        <FilaMovimiento key={m.id} m={m} />
      ))}
    </View>
  );
}
