import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import { Boton, Cabecera, Campo, Chip, Chips, Fila, Pantalla, Segmento, T, Tarjeta } from '@/components/ui';
import { ORDENES, fmtF, multsDe, num } from '@/lib/calc';
import { elegirRespaldo, importarRespaldo, type ModoImportar } from '@/lib/respaldo';
import { useStore } from '@/lib/store';
import type { Config } from '@/lib/types';

function CampoNum({ etiqueta, k, placeholder }: { etiqueta: string; k: keyof Config; placeholder: string }) {
  const { cfg, setCfg } = useStore();
  const [v, setV] = useState(cfg[k] != null ? String(cfg[k]) : '');
  return <Campo etiqueta={etiqueta} value={v} onChangeText={setV} onEndEditing={() => setCfg({ [k]: num(v) })} keyboardType="decimal-pad" placeholder={placeholder} />;
}

function ImportarRespaldo() {
  const db = useSQLiteContext();
  const { arts, recargar } = useStore();
  const [estado, setEstado] = useState('');

  const correr = async (uri: string, modo: ModoImportar) => {
    setEstado('Preparando…');
    try {
      const r = await importarRespaldo(db, uri, modo, setEstado);
      await recargar();
      const fecha = new Date(r.creado).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
      Alert.alert(
        'Respaldo importado',
        `Del respaldo del ${fecha}:\n${r.articulos} artículos · ${r.proveedores} proveedores\n${r.movimientos} movimientos · ${r.viajes} viajes · ${r.fotos} fotos` +
          (r.conservados ? `\n\nSe conservaron ${r.conservados} registros del iPhone porque eran más recientes.` : '')
      );
    } catch (e) {
      Alert.alert('No se pudo importar', e instanceof Error ? e.message : String(e));
    } finally {
      setEstado('');
    }
  };

  const empezar = async () => {
    const f = await elegirRespaldo();
    if (!f) return;
    if (!arts.length) return correr(f.uri, 'reemplazar');
    Alert.alert('¿Qué hacemos con lo que ya hay en el iPhone?', `Ahora tienes ${arts.length} artículos en esta app.`, [
      { text: 'Combinar (quedarse con lo más reciente)', onPress: () => correr(f.uri, 'combinar') },
      { text: 'Reemplazar todo', style: 'destructive', onPress: () => correr(f.uri, 'reemplazar') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  return (
    <Tarjeta style={{ gap: 8 }}>
      <T tipo="chico">En la app web ve a Configuración → «Exportar respaldo (.zip)», guarda el archivo en Archivos o iCloud Drive y ábrelo aquí. Importar no usa internet ni la nube.</T>
      {estado ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
          <ActivityIndicator />
          <T>{estado}</T>
        </View>
      ) : (
        <Boton tipo="primario" titulo="Importar respaldo" onPress={empezar} />
      )}
    </Tarjeta>
  );
}

export default function Ajustes() {
  const { cfg, setCfg, arts, provs, movs, pendientes } = useStore();
  return (
    <View style={{ flex: 1 }}>
      <Cabecera titulo="Ajustes" />
      <Pantalla>
        <T tipo="label">Apariencia</T>
        <Segmento
          opciones={[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']]}
          valor={cfg.tema || 'auto'}
          onCambio={(tema) => setCfg({ tema })}
        />

        <T tipo="label">Orden por defecto de Artículos</T>
        <Chips>
          {ORDENES.map(([k, l]) => (
            <Chip key={k} titulo={l} activo={(cfg.ord_arts || 'rec') === k} onPress={() => setCfg({ ord_arts: k })} />
          ))}
        </Chips>

        <T tipo="label">Valores por defecto</T>
        <Fila>
          <CampoNum etiqueta="Tipo de cambio ¥/USD" k="tcDef" placeholder="6.70" />
        </Fila>

        <T tipo="label">Múltiplos</T>
        <Tarjeta style={{ gap: 6 }}>
          <T tipo="chico">Mayoreo: {multsDe(cfg, 'mayoreo').map((m) => '×' + fmtF(m)).join(', ')}</T>
          <T tipo="chico">Menudeo: {multsDe(cfg, 'menudeo').map((m) => '×' + fmtF(m)).join(', ')}</T>
          <T tipo="chico">(La edición de múltiplos llega en la Fase 2.)</T>
        </Tarjeta>

        <T tipo="label">Importación a Ecuador · tasas por pieza</T>
        <Fila>
          <CampoNum etiqueta="Flete USD/kg" k="envioKg" placeholder="0.00" />
          <CampoNum etiqueta="Seguro % FOB" k="segPct" placeholder="0" />
        </Fila>
        <Fila>
          <CampoNum etiqueta="Ad valorem %" k="advPct" placeholder="10" />
          <CampoNum etiqueta="Específico USD/kg" k="espKg" placeholder="5.50" />
        </Fila>
        <Fila>
          <CampoNum etiqueta="FODINFA %" k="fodPct" placeholder="0.5" />
          <CampoNum etiqueta="IVA %" k="ivaPct" placeholder="15" />
        </Fila>
        <Fila>
          <CampoNum etiqueta="Agente y otros USD/kg" k="otrosKg" placeholder="0.00" />
        </Fila>
        <Chips>
          <Chip titulo={cfg.ivaCosto !== false ? 'Sumar IVA al costo ✓' : 'Sumar IVA al costo'} activo={cfg.ivaCosto !== false} onPress={() => setCfg({ ivaCosto: cfg.ivaCosto === false })} />
        </Chips>

        <T tipo="label">Respaldo desde la app web</T>
        <ImportarRespaldo />

        <T tipo="label">Datos en este iPhone</T>
        <Tarjeta style={{ gap: 4 }}>
          <T>{arts.length} artículos · {provs.length} proveedores · {movs.length} movimientos</T>
          <T tipo="chico">Todo se guarda en la base local del teléfono y funciona sin internet.</T>
          <T tipo="chico">Cambios pendientes de sincronizar: {pendientes} (la sincronización con la nube llega en la Fase 4).</T>
        </Tarjeta>
        <T tipo="chico" style={{ textAlign: 'center' }}>Packing-y-Conteo de productos ya comprados · Fase 1</T>
      </Pantalla>
    </View>
  );
}
