import { useState } from 'react';
import { View } from 'react-native';

import { Cabecera, Campo, Chip, Chips, Fila, Pantalla, Segmento, T, Tarjeta } from '@/components/ui';
import { ORDENES, fmtF, multsDe, num } from '@/lib/calc';
import { useStore } from '@/lib/store';
import type { Config } from '@/lib/types';

function CampoNum({ etiqueta, k, placeholder }: { etiqueta: string; k: keyof Config; placeholder: string }) {
  const { cfg, setCfg } = useStore();
  const [v, setV] = useState(cfg[k] != null ? String(cfg[k]) : '');
  return <Campo etiqueta={etiqueta} value={v} onChangeText={setV} onEndEditing={() => setCfg({ [k]: num(v) })} keyboardType="decimal-pad" placeholder={placeholder} />;
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
