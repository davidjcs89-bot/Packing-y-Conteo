import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Boton, Cabecera, Campo, Chip, Chips, Fila, Pantalla, T, Tarjeta } from '@/components/ui';
import { fmtF, MULTS_MAY, num, uid } from '@/lib/calc';
import { useStore } from '@/lib/store';
import { useColores } from '@/lib/theme';
import type { Proveedor } from '@/lib/types';

function FichaProveedor({ p }: { p: Proveedor }) {
  const c = useColores();
  const { arts, guardarProv, borrarProv } = useStore();
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
        {MULTS_MAY.map((m) => (
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

export default function Proveedores() {
  const { provs, guardarProv } = useStore();
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
        <Fila style={{ alignItems: 'flex-end' }}>
          <Campo etiqueta="Nuevo proveedor" value={nuevo} onChangeText={setNuevo} placeholder="Nombre" onSubmitEditing={crear} returnKeyType="done" />
          <Boton tipo="primario" titulo="Crear" onPress={crear} />
        </Fila>
        <T tipo="chico">El precio se calcula como costo en dólares × factor. Si el proveedor factura en yuanes, primero se convierte a dólares y se redondea hacia arriba.</T>
        {provs.map((p) => (
          <FichaProveedor key={p.id} p={p} />
        ))}
      </Pantalla>
    </View>
  );
}
