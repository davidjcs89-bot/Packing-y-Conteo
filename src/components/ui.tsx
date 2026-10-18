import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColores } from '@/lib/theme';

export const RADIO = 12;

export function Pantalla({ children, scroll = true, style }: { children: ReactNode; scroll?: boolean; style?: StyleProp<ViewStyle> }) {
  const c = useColores();
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: c.bg }, style]}>{children}</View>;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={[{ padding: 16, gap: 12, paddingBottom: 120 }, style]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function T({ children, style, tipo = 'normal', numberOfLines }: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  tipo?: 'normal' | 'titulo' | 'sub' | 'muted' | 'label' | 'mono' | 'chico';
  numberOfLines?: number;
}) {
  const c = useColores();
  const base: Record<string, TextStyle> = {
    normal: { fontSize: 16, color: c.ink },
    titulo: { fontSize: 22, fontWeight: '700', color: c.ink },
    sub: { fontSize: 17, fontWeight: '600', color: c.ink },
    muted: { fontSize: 14, color: c.muted },
    chico: { fontSize: 13, color: c.muted },
    label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: c.muted },
    mono: { fontSize: 15, fontWeight: '700', color: c.ink, fontFamily: 'Menlo' },
  };
  return (
    <Text style={[base[tipo], style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function Tarjeta({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const c = useColores();
  const st = [{ backgroundColor: c.card, borderColor: c.line, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: RADIO, padding: 12 }, style];
  if (onPress)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [st, pressed && { opacity: 0.7 }]}>
        {children}
      </Pressable>
    );
  return <View style={st}>{children}</View>;
}

export function Boton({ titulo, onPress, tipo = 'normal', style, disabled }: {
  titulo: string;
  onPress: () => void;
  tipo?: 'normal' | 'primario' | 'peligro' | 'link';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  const c = useColores();
  if (tipo === 'link')
    return (
      <Pressable onPress={onPress} disabled={disabled} hitSlop={8}>
        <Text style={{ color: c.accent, fontWeight: '600', fontSize: 15 }}>{titulo}</Text>
      </Pressable>
    );
  const bg = tipo === 'primario' ? c.accent : tipo === 'peligro' ? c.dangerSoft : c.card;
  const fg = tipo === 'primario' ? c.accentInk : tipo === 'peligro' ? c.danger : c.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        { backgroundColor: bg, borderColor: tipo === 'normal' ? c.line : bg, borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', opacity: disabled ? 0.5 : pressed ? 0.75 : 1 },
        style,
      ]}>
      <Text style={{ color: fg, fontWeight: '700', fontSize: 16 }}>{titulo}</Text>
    </Pressable>
  );
}

export function Chip({ titulo, activo, onPress, style }: { titulo: string; activo?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  const c = useColores();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { borderRadius: 999, borderWidth: 1, borderColor: activo ? c.accent : c.line, backgroundColor: activo ? c.accentSoft : c.card, paddingVertical: 7, paddingHorizontal: 13, opacity: pressed ? 0.7 : 1 },
        style,
      ]}>
      <Text style={{ color: c.ink, fontSize: 14, fontWeight: '600' }}>{titulo}</Text>
    </Pressable>
  );
}

export function Chips({ children, scroll }: { children: ReactNode; scroll?: boolean }) {
  if (scroll)
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    );
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{children}</View>;
}

export function Campo({ etiqueta, style, ...props }: TextInputProps & { etiqueta?: string; style?: StyleProp<ViewStyle> }) {
  const c = useColores();
  return (
    <View style={[{ gap: 5, flex: 1 }, style]}>
      {etiqueta ? <T tipo="chico" style={{ fontWeight: '600' }}>{etiqueta}</T> : null}
      <TextInput
        placeholderTextColor={c.muted}
        {...props}
        style={{ backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16, color: c.ink }}
      />
    </View>
  );
}

export function Fila({ children, style, gap = 10 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', gap, alignItems: 'flex-start' }, style]}>{children}</View>;
}

export function Segmento<K extends string>({ opciones, valor, onCambio }: { opciones: [K, string][]; valor: K; onCambio: (k: K) => void }) {
  const c = useColores();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: RADIO, padding: 4, gap: 4 }}>
      {opciones.map(([k, l]) => (
        <Pressable key={k} onPress={() => onCambio(k)} style={{ flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center', backgroundColor: valor === k ? c.accent : 'transparent' }}>
          <Text style={{ fontWeight: '700', fontSize: 14, color: valor === k ? c.accentInk : c.muted }}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Vacio({ texto }: { texto: string }) {
  const c = useColores();
  return (
    <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: c.line, borderRadius: RADIO, padding: 24, alignItems: 'center' }}>
      <T tipo="muted" style={{ textAlign: 'center' }}>{texto}</T>
    </View>
  );
}

export function Cabecera({ titulo, derecha }: { titulo: string; derecha?: ReactNode }) {
  const c = useColores();
  const ins = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: ins.top + 8, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: c.surface, borderBottomColor: c.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <T tipo="titulo">{titulo}</T>
      {derecha}
    </View>
  );
}
