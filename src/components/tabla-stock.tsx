import { ScrollView, Text, TextInput, View } from 'react-native';

import { Chip, Chips, T } from '@/components/ui';
import { skey } from '@/lib/calc';
import { useColores } from '@/lib/theme';

/** Tabla de cantidades por color × talla, con atajos para llenar todas. */
export function TablaStock({ cols, tals, valores, onCambio, onLlenar, disp, atajos = [1, 2, 4, 0] }: {
  cols: string[];
  tals: string[];
  valores: Record<string, number>;
  onCambio: (k: string, v: number) => void;
  onLlenar: (n: number) => void;
  /** Piezas disponibles por celda: se muestran debajo y la celda se pone roja si se pasa. */
  disp?: Record<string, number>;
  atajos?: number[];
}) {
  const c = useColores();
  const total = Object.values(valores).reduce((x, y) => x + (Number(y) || 0), 0);
  const celda = 56;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <T tipo="chico">Poner en todas:</T>
        <Chips>
          {atajos.map((n) => (
            <Chip key={n} titulo={String(n)} onPress={() => onLlenar(n)} style={{ minWidth: 40, alignItems: 'center' }} />
          ))}
        </Chips>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 92 }} />
        {tals.map((t) => (
          <Text key={t} style={{ width: celda, textAlign: 'center', color: c.muted, fontWeight: '700', fontSize: 13 }}>{t}</Text>
        ))}
        <Text style={{ width: 44, textAlign: 'center', color: c.muted, fontWeight: '700', fontSize: 13 }}>Tot</Text>
      </View>
      {cols.map((col) => {
        const rt = tals.reduce((x, t) => x + (Number(valores[skey(col, t)]) || 0), 0);
        return (
          <View key={col} style={{ flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: c.line, paddingVertical: 5 }}>
            <Text style={{ width: 92, color: c.ink, fontWeight: '600' }} numberOfLines={1}>{col}</Text>
            {tals.map((t) => {
              const k = skey(col, t);
              const pasa = disp != null && (Number(valores[k]) || 0) > (disp[k] || 0);
              return (
                <View key={t} style={{ width: celda, alignItems: 'center' }}>
                  <TextInput
                    value={String(valores[k] ?? 0)}
                    onChangeText={(v) => onCambio(k, parseInt(v.replace(/\D/g, ''), 10) || 0)}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    style={{ width: celda - 6, textAlign: 'center', fontSize: 16, fontWeight: '700', color: pasa ? c.danger : c.ink, backgroundColor: pasa ? c.dangerSoft : c.card, borderWidth: 1, borderColor: pasa ? c.danger : c.line, borderRadius: 8, paddingVertical: 8, fontFamily: 'Menlo' }}
                  />
                  {disp ? <Text style={{ fontSize: 10, color: pasa ? c.danger : c.muted, marginTop: 2 }}>de {disp[k] || 0}</Text> : null}
                </View>
              );
            })}
            <Text style={{ width: 44, textAlign: 'center', color: c.ink, fontWeight: '800' }}>{rt}</Text>
          </View>
        );
      })}
      </View>
      </ScrollView>
      <T tipo="chico">Total: <Text style={{ fontWeight: '800', color: c.ink }}>{total}</Text> piezas</T>
    </View>
  );
}
