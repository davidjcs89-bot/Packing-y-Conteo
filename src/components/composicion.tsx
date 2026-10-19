import { Pressable, Text, TextInput, View } from 'react-native';

import { Boton, Campo, Chip, Chips, T, Tarjeta } from '@/components/ui';
import { uniq } from '@/lib/calc';
import { compRecientes, compTexto, FIBRAS, PAISES, PARTES, sumaParte } from '@/lib/composicion';
import { useStore } from '@/lib/store';
import { useColores } from '@/lib/theme';
import type { Articulo, ParteComposicion } from '@/lib/types';

/** Pestaña Composición y origen del artículo (igual que en la web). */
export function EditorComposicion({ a, set }: { a: Articulo; set: (p: Partial<Articulo>) => void }) {
  const c = useColores();
  const { arts } = useStore();
  const comp: ParteComposicion[] = a.composicion?.length ? a.composicion : [{ parte: 'Principal', fibras: [] }];
  const setComp = (cs: ParteComposicion[]) => set({ composicion: cs });
  const setParte = (pi: number, pt: ParteComposicion) => setComp(comp.map((x, i) => (i === pi ? pt : x)));
  const rec = compRecientes(arts.filter((x) => x.id !== a.id));
  const prev = compTexto({ composicion: comp });

  return (
    <View style={{ gap: 12 }}>
      <T tipo="chico">Porcentaje de cada fibra por peso, de mayor a menor; debe sumar 100%. Si tiene forro o relleno, agrégalo como otra parte.</T>
      {rec.length ? (
        <View style={{ gap: 6 }}>
          <T tipo="chico" style={{ fontWeight: '600' }}>Usadas antes</T>
          <Chips scroll>
            {rec.map(([k, fibras]) => (
              <Chip key={k} titulo={k} onPress={() => setParte(0, { ...comp[0], fibras: fibras.map((f) => ({ ...f })) })} />
            ))}
          </Chips>
        </View>
      ) : null}

      {comp.map((pt, pi) => {
        const sum = sumaParte(pt);
        const falta = 100 - sum;
        return (
          <Tarjeta key={pi} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <T tipo="label">{comp.length > 1 || pt.parte !== 'Principal' ? pt.parte : 'Tela principal'}</T>
              {comp.length > 1 ? <Boton tipo="link" titulo="Quitar parte" onPress={() => setComp(comp.filter((_, i) => i !== pi))} /> : null}
            </View>
            {comp.length > 1 ? (
              <Chips scroll>
                {uniq([...PARTES, pt.parte]).map((x) => (
                  <Chip key={x} titulo={x} activo={pt.parte === x} onPress={() => setParte(pi, { ...pt, parte: x })} />
                ))}
              </Chips>
            ) : null}
            {pt.fibras.map((f, fi) => (
              <View key={fi} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  value={f.f}
                  onChangeText={(v) => setParte(pi, { ...pt, fibras: pt.fibras.map((x, j) => (j === fi ? { ...x, f: v } : x)) })}
                  placeholder="Fibra"
                  placeholderTextColor={c.muted}
                  autoCapitalize="words"
                  style={{ flex: 1, backgroundColor: c.bg, borderColor: c.line, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: c.ink }}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <TextInput
                    value={f.p != null ? String(f.p) : ''}
                    onChangeText={(v) => setParte(pi, { ...pt, fibras: pt.fibras.map((x, j) => (j === fi ? { ...x, p: v === '' ? null : Math.min(100, parseInt(v, 10) || 0) } : x)) })}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={c.muted}
                    style={{ width: 62, textAlign: 'right', backgroundColor: c.bg, borderColor: c.line, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, fontSize: 16, color: c.ink, fontFamily: 'Menlo' }}
                  />
                  <Text style={{ color: c.muted, fontWeight: '700' }}>%</Text>
                </View>
                <Pressable hitSlop={8} onPress={() => setParte(pi, { ...pt, fibras: pt.fibras.filter((_, j) => j !== fi) })}>
                  <Text style={{ color: c.muted, fontSize: 20 }}>×</Text>
                </Pressable>
              </View>
            ))}
            <Chips>
              {FIBRAS.filter((x) => !pt.fibras.some((f) => f.f === x))
                .slice(0, sum === 100 ? 4 : 9)
                .map((x) => (
                  <Chip key={x} titulo={'+ ' + x} onPress={() => setParte(pi, { ...pt, fibras: [...pt.fibras, { f: x, p: falta > 0 ? falta : null }] })} />
                ))}
            </Chips>
            <Text style={{ fontSize: 13, fontWeight: '600', color: sum === 100 ? c.accent : sum ? c.danger : c.muted }}>
              {!pt.fibras.length ? 'Toca una fibra para agregarla.' : sum === 100 ? 'Total 100% ✓' : falta > 0 ? `Total ${sum}% · faltan ${falta}%` : `Total ${sum}% · sobran ${-falta}%`}
            </Text>
          </Tarjeta>
        );
      })}
      <Boton
        titulo="+ Agregar parte (forro, relleno…)"
        onPress={() => {
          const usadas = comp.map((x) => x.parte);
          setComp([...comp, { parte: PARTES.find((x) => !usadas.includes(x)) || 'Otra', fibras: [] }]);
        }}
      />

      <T tipo="label">Origen</T>
      <Chips>
        {uniq([...(a.origen ? [a.origen] : []), ...PAISES]).map((x) => (
          <Chip key={x} titulo={x} activo={a.origen === x} onPress={() => set({ origen: a.origen === x ? '' : x })} />
        ))}
      </Chips>
      <Campo value={PAISES.includes(a.origen || '') ? '' : a.origen || ''} onChangeText={(v) => set({ origen: v })} placeholder="Otro país" autoCapitalize="words" />

      <Tarjeta style={{ backgroundColor: c.accentSoft, borderColor: c.accentSoft }}>
        <T tipo="chico">
          {prev || a.origen ? (
            <>
              <Text style={{ fontWeight: '700', color: c.ink }}>En la etiqueta: </Text>
              {prev || 'Composición pendiente'}
              {a.origen ? ` · Hecho en ${a.origen}` : ''}
            </>
          ) : (
            'Aquí verás cómo queda el texto de la etiqueta.'
          )}
        </T>
      </Tarjeta>
    </View>
  );
}
