import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useColores } from '@/lib/theme';

/** Buscador con teclado numérico por defecto y botón ABC/123 para cambiar a letras. */
export function Buscador({ valor, onCambio, placeholder = 'Buscar estilo' }: { valor: string; onCambio: (v: string) => void; placeholder?: string }) {
  const c = useColores();
  const [letras, setLetras] = useState(false);
  const ref = useRef<ComponentRef<typeof TextInput>>(null);
  const cambiarTeclado = () => {
    setLetras((x) => !x);
    // iOS solo cambia el teclado al volver a enfocar el campo.
    ref.current?.blur();
    setTimeout(() => ref.current?.focus(), 60);
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: 12, paddingLeft: 12, paddingRight: 6, gap: 6 }}>
      <Text style={{ color: c.muted, fontSize: 16 }}>⌕</Text>
      <TextInput
        ref={ref}
        value={valor}
        onChangeText={onCambio}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        keyboardType={letras ? 'default' : 'number-pad'}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="search"
        selectTextOnFocus
        style={{ flex: 1, paddingVertical: 11, fontSize: 16, color: c.ink }}
      />
      <Pressable onPress={cambiarTeclado} style={{ borderWidth: 1, borderColor: c.line, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 }}>
        <Text style={{ color: c.accent, fontWeight: '700', fontFamily: 'Menlo', fontSize: 12 }}>{letras ? '123' : 'ABC'}</Text>
      </Pressable>
      {valor ? (
        <Pressable onPress={() => onCambio('')} hitSlop={8} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: c.ink, fontSize: 16 }}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
