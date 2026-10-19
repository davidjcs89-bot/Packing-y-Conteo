import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { fechaCorta } from '@/components/fecha';
import { Boton, Cabecera, Campo, Chip, Chips, Fila, Pantalla, Segmento, T, Tarjeta } from '@/components/ui';
import { fmtF, money, multsDe, num, resumenViaje, tieneStock, totalStock, uid } from '@/lib/calc';
import { useStore } from '@/lib/store';
import { useColores } from '@/lib/theme';
import type { Proveedor } from '@/lib/types';

function FichaProveedor({ p }: { p: Proveedor }) {
  const c = useColores();
  const { arts, cfg, guardarProv, borrarProv } = useStore();
  const [nombre, setNombre] = useState(p.nombre);
  const [fMen, setFMen] = useState(p.fMen != null ? String(p.fMen) : '');
  const n = arts.filter((a) => a.proveedorId === p.id).length;
  const guardar = (cambios: Partial<Proveedor>) => guardarProv({ ...p, ...cambios });
  return (
    <Tarjeta style={{ gap: 10 }}>
      <Fila style={{ alignItems: 'center' }}>
        <Campo value={nombre} onChangeText={setNombre} onEndEditing={() => nombre.trim() && guardar({ nombre: nombre.trim() })} />
        <T tipo="chico">{n} art.</T>
      </Fila>
      <Chips>
        <Chip titulo="USD" activo={p.moneda !== 'RMB'} onPress={() => guardar({ moneda: 'USD' })} />
        <Chip titulo="RMB (¥)" activo={p.moneda === 'RMB'} onPress={() => guardar({ moneda: 'RMB', tallaChina: p.tallaChina ?? true })} />
        <Chip titulo={p.tallaChina ? 'Tallas chinas ✓' : 'Tallas chinas'} activo={!!p.tallaChina} onPress={() => guardar({ tallaChina: !p.tallaChina })} />
      </Chips>
      <T tipo="label">Factor mayoreo</T>
      <Chips>
        {multsDe(cfg, 'mayoreo').map((m) => (
          <Chip key={m} titulo={`×${fmtF(m)}`} activo={Number(p.fMay) === m} onPress={() => guardar({ fMay: m })} />
        ))}
      </Chips>
      <Fila>
        <Campo etiqueta="Factor menudeo" value={fMen} onChangeText={setFMen} onEndEditing={() => guardar({ fMen: num(fMen) })} keyboardType="decimal-pad" />
      </Fila>
      {p.fMen != null && p.fMay != null && Number(p.fMen) <= Number(p.fMay) ? (
        <T style={{ color: c.danger, fontSize: 13 }}>El factor de menudeo debe ser mayor que el de mayoreo.</T>
      ) : null}
      <Boton
        tipo="link"
        titulo="Eliminar proveedor"
        onPress={() =>
          n
            ? Alert.alert('No se puede eliminar', `Tiene ${n} artículos; muévelos o bórralos antes.`)
            : Alert.alert('Eliminar proveedor', `¿Eliminar ${p.nombre}?`, [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Eliminar', style: 'destructive', onPress: () => borrarProv(p.id) },
              ])
        }
      />
    </Tarjeta>
  );
}

function FilaCompacta({ p, abierta, onToggle }: { p: Proveedor; abierta: boolean; onToggle: () => void }) {
  const c = useColores();
  const { arts } = useStore();
  const suyos = arts.filter((a) => a.proveedorId === p.id);
  const pzs = suyos.reduce((x, a) => x + (tieneStock(a) ? totalStock(a) : 0), 0);
  const mal = p.fMen != null && p.fMay != null && Number(p.fMen) <= Number(p.fMay);
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.card, borderColor: abierta ? c.accent : c.line, borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ flex: 1 }}>
        <T style={{ fontWeight: '700' }} numberOfLines={1}>{p.nombre}</T>
        <T tipo="chico">{suyos.length} art.{pzs ? ` · ${pzs} pzs` : ''}</T>
      </View>
      <View style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: c.muted, fontWeight: '800', fontFamily: 'Menlo' }}>{p.moneda === 'RMB' ? '¥' : '$'}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ color: c.muted, fontSize: 12, fontFamily: 'Menlo' }}>May ×{fmtF(Number(p.fMay) || 0)}</Text>
        <Text style={{ color: mal ? c.danger : c.muted, fontSize: 12, fontFamily: 'Menlo', fontWeight: mal ? '800' : '400' }}>Men ×{fmtF(Number(p.fMen) || 0)}</Text>
      </View>
      <Text style={{ color: c.muted }}>{abierta ? '▴' : '▾'}</Text>
    </Pressable>
  );
}

function Viajes() {
  const { viajes, arts, cfg } = useStore();
  return (
    <View style={{ gap: 8 }}>
      <Fila style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <T tipo="sub">Viajes de compra</T>
        <Boton titulo="+ Nuevo viaje" onPress={() => router.push({ pathname: '/viaje/[id]', params: { id: 'nuevo' } })} />
      </Fila>
      {viajes.length ? (
        viajes.map((v) => {
          const r = resumenViaje(v, arts, cfg.tcDef ?? null);
          const n = arts.filter((a) => a.viajeId === v.id).length;
          return (
            <Tarjeta key={v.id} onPress={() => router.push({ pathname: '/viaje/[id]', params: { id: v.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <T style={{ fontWeight: '700' }}>{v.nombre || 'Viaje'}</T>
                <T tipo="chico">{[[fechaCorta(v.desde), fechaCorta(v.hasta)].filter(Boolean).join(' → '), n ? `${n} art. · ${r.piezas} pzs` : 'sin artículos'].filter(Boolean).join(' · ')}</T>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <T style={{ fontWeight: '800', fontFamily: 'Menlo' }}>{money(r.gastos)}</T>
                {r.valor ? <T tipo="chico">{r.pct.toFixed(1)}% de lo comprado</T> : null}
              </View>
            </Tarjeta>
          );
        })
      ) : (
        <T tipo="chico">Registra aquí pasajes, hospedaje, comida y movilización de cada viaje. Se reparten entre las prendas compradas y se suman a su costo.</T>
      )}
    </View>
  );
}

export default function Proveedores() {
  const { provs, guardarProv, cfg, setCfg } = useStore();
  const [abierto, setAbierto] = useState<string | null>(null);
  const vista = cfg.pVista === 'compacta' ? 'compacta' : 'detalle';
  const [nuevo, setNuevo] = useState('');
  const crear = async () => {
    const n = nuevo.trim();
    if (!n) return;
    await guardarProv({ id: uid(), nombre: n, moneda: 'RMB', tallaChina: true, fMay: 3, fMen: 5 });
    setNuevo('');
  };
  return (
    <View style={{ flex: 1 }}>
      <Cabecera titulo="Proveedores" />
      <Pantalla>
        <Viajes />
        <T tipo="sub" style={{ marginTop: 8 }}>Proveedores</T>
        <Fila style={{ alignItems: 'flex-end' }}>
          <Campo etiqueta="Nuevo proveedor" value={nuevo} onChangeText={setNuevo} placeholder="Nombre" onSubmitEditing={crear} returnKeyType="done" />
          <Boton tipo="primario" titulo="Crear" onPress={crear} />
        </Fila>
        <T tipo="chico">El precio se calcula como costo en dólares × factor. Si el proveedor factura en yuanes, primero se convierte a dólares y se redondea hacia arriba.</T>
        <Segmento opciones={[['compacta', 'Compacta'], ['detalle', 'Detallada']]} valor={vista} onCambio={(k) => setCfg({ pVista: k })} />
        {vista === 'compacta'
          ? provs.map((p) => (
              <View key={p.id} style={{ gap: 6 }}>
                <FilaCompacta p={p} abierta={abierto === p.id} onToggle={() => setAbierto(abierto === p.id ? null : p.id)} />
                {abierto === p.id ? <FichaProveedor p={p} /> : null}
              </View>
            ))
          : provs.map((p) => <FichaProveedor key={p.id} p={p} />)}
      </Pantalla>
    </View>
  );
}
