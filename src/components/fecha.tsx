import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { Boton, T } from '@/components/ui';
import { useColores } from '@/lib/theme';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const leer = (s?: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
export const fechaCorta = (s?: string) => {
  const d = leer(s);
  return d ? d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
};

/** Campo de fecha con calendario (guarda "AAAA-MM-DD", igual que la web). */
export function SelectorFecha({ etiqueta, valor, onCambio }: { etiqueta: string; valor?: string; onCambio: (v: string) => void }) {
  const c = useColores();
  const [abierto, setAbierto] = useState(false);
  const sel = leer(valor);
  const [mes, setMes] = useState(() => {
    const d = sel || new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const inicio = (mes.getDay() + 6) % 7; // lunes primero
  const diasMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const celdas = [...Array(inicio).fill(null), ...Array.from({ length: diasMes }, (_, i) => i + 1)];
  const hoy = iso(new Date());
  const elegir = (d: Date) => {
    onCambio(iso(d));
    setAbierto(false);
  };
  return (
    <View style={{ flex: 1, gap: 5 }}>
      <T tipo="chico" style={{ fontWeight: '600' }}>{etiqueta}</T>
      <Pressable onPress={() => setAbierto(true)} style={{ backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 }}>
        <Text style={{ fontSize: 15, color: valor ? c.ink : c.muted }} numberOfLines={1}>{fechaCorta(valor) || 'Elegir'}</Text>
      </Pressable>
      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <Pressable onPress={() => setAbierto(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'center', padding: 20 }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: c.surface, borderRadius: 16, padding: 16, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Pressable hitSlop={12} onPress={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}>
                <Text style={{ fontSize: 24, color: c.accent }}>‹</Text>
              </Pressable>
              <T tipo="sub">{MESES[mes.getMonth()]} {mes.getFullYear()}</T>
              <Pressable hitSlop={12} onPress={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}>
                <Text style={{ fontSize: 24, color: c.accent }}>›</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {DIAS.map((d, i) => (
                <Text key={i} style={{ width: '14.28%', textAlign: 'center', color: c.muted, fontWeight: '700', fontSize: 12, paddingVertical: 4 }}>{d}</Text>
              ))}
              {celdas.map((n, i) => {
                if (!n) return <View key={i} style={{ width: '14.28%', height: 40 }} />;
                const k = iso(new Date(mes.getFullYear(), mes.getMonth(), n));
                const activo = k === valor;
                return (
                  <Pressable key={i} onPress={() => elegir(new Date(mes.getFullYear(), mes.getMonth(), n))} style={{ width: '14.28%', height: 40, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: activo ? c.accent : 'transparent', borderWidth: k === hoy && !activo ? 1 : 0, borderColor: c.accent }}>
                      <Text style={{ color: activo ? c.accentInk : c.ink, fontWeight: activo ? '800' : '500' }}>{n}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Boton titulo="Hoy" onPress={() => elegir(new Date())} style={{ flex: 1 }} />
              <Boton titulo="Borrar" onPress={() => { onCambio(''); setAbierto(false); }} style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
