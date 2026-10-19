import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { Boton, Cabecera, Campo, Chip, Chips, Fila, Pantalla, Segmento, T, Tarjeta } from '@/components/ui';
import { COLORES_BASE, MULTS_MAY, MULTS_MEN, ORDENES, TALLAS_BASE, fmtF, multsDe, num, uniq } from '@/lib/calc';
import { espacioLocal, leerUso, peso, type Uso } from '@/lib/uso';
import { elegirRespaldo, importarRespaldo, type ModoImportar } from '@/lib/respaldo';
import { useStore } from '@/lib/store';
import { useColores } from '@/lib/theme';
import type { Config } from '@/lib/types';

function CampoNum({ etiqueta, k, placeholder }: { etiqueta: string; k: keyof Config; placeholder: string }) {
  const { cfg, setCfg } = useStore();
  const [v, setV] = useState(cfg[k] != null ? String(cfg[k]) : '');
  return <Campo etiqueta={etiqueta} value={v} onChangeText={setV} onEndEditing={() => setCfg({ [k]: num(v) })} keyboardType="decimal-pad" placeholder={placeholder} />;
}

function CampoTexto({ etiqueta, k, placeholder }: { etiqueta: string; k: keyof Config; placeholder: string }) {
  const { cfg, setCfg } = useStore();
  const [v, setV] = useState(cfg[k] != null ? String(cfg[k]) : '');
  return <Campo etiqueta={etiqueta} value={v} onChangeText={setV} onEndEditing={() => setCfg({ [k]: v.trim() || null })} placeholder={placeholder} autoCapitalize="words" />;
}

/** Múltiplos de mayoreo o menudeo: ★ marca el predeterminado, × quita uno, y se pueden agregar nuevos. */
function EditorMultiplos({ tipo }: { tipo: 'mayoreo' | 'menudeo' }) {
  const c = useColores();
  const { cfg, setCfg } = useStore();
  const [nuevo, setNuevo] = useState('');
  const kLista = tipo === 'mayoreo' ? 'multMay' : 'multMen';
  const kDef = tipo === 'mayoreo' ? 'defMay' : 'defMen';
  const lista = multsDe(cfg, tipo);
  const def = Number(cfg[kDef]) || null;
  const guardarLista = (l: number[]) => setCfg({ [kLista]: uniq(l).sort((x, y) => x - y) });
  const agregar = () => {
    const n = num(nuevo);
    if (!n || n <= 1) return Alert.alert('Múltiplo no válido', 'Escribe un número mayor que 1, por ejemplo 3.5');
    guardarLista([...lista, n]);
    setNuevo('');
  };
  const quitar = (m: number) => {
    if (lista.length <= 1) return;
    guardarLista(lista.filter((x) => x !== m));
    if (def === m) setCfg({ [kDef]: null });
  };
  return (
    <Tarjeta style={{ gap: 8 }}>
      <Fila style={{ justifyContent: 'space-between' }}>
        <T style={{ fontWeight: '700' }}>{tipo === 'mayoreo' ? 'Mayoreo' : 'Menudeo'}</T>
        <T tipo="chico">{def ? `Predeterminado ×${fmtF(def)}` : 'Sin predeterminado'}</T>
      </Fila>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {lista.map((m) => (
          <View key={m} style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 999, borderWidth: 1, borderColor: def === m ? c.accent : c.line, backgroundColor: def === m ? c.accentSoft : c.card, paddingLeft: 4, paddingRight: 6 }}>
            <Pressable hitSlop={6} onPress={() => setCfg({ [kDef]: def === m ? null : m })} style={{ padding: 5 }}>
              <Text style={{ color: c.gold, fontSize: 16 }}>{def === m ? '★' : '☆'}</Text>
            </Pressable>
            <Text style={{ color: c.ink, fontWeight: '700', fontFamily: 'Menlo' }}>×{fmtF(m)}</Text>
            <Pressable hitSlop={6} onPress={() => quitar(m)} style={{ paddingLeft: 8, paddingVertical: 5 }}>
              <Text style={{ color: c.muted, fontSize: 16 }}>×</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <Fila style={{ alignItems: 'flex-end' }}>
        <Campo value={nuevo} onChangeText={setNuevo} keyboardType="decimal-pad" placeholder="Nuevo múltiplo (ej. 3.5)" onSubmitEditing={agregar} />
        <Boton tipo="primario" titulo="Agregar" onPress={agregar} />
      </Fila>
    </Tarjeta>
  );
}

function ChipsDefecto({ etiqueta, k, opciones }: { etiqueta: string; k: 'tallasDef' | 'coloresDef'; opciones: string[] }) {
  const { cfg, setCfg } = useStore();
  const sel = (cfg[k] as string[] | undefined) || [];
  return (
    <View style={{ gap: 6 }}>
      <T tipo="chico" style={{ fontWeight: '600' }}>{etiqueta}</T>
      <Chips>
        {uniq([...sel, ...opciones]).map((x) => (
          <Chip key={x} titulo={x} activo={sel.includes(x)} onPress={() => setCfg({ [k]: sel.includes(x) ? sel.filter((y) => y !== x) : [...sel, x] })} />
        ))}
      </Chips>
    </View>
  );
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

function UsoYCostos() {
  const db = useSQLiteContext();
  const { pendientes } = useStore();
  const [uso, setUso] = useState<Uso | null>(null);
  const [esp, setEsp] = useState<ReturnType<typeof espacioLocal> | null>(null);
  useFocusEffect(
    useCallback(() => {
      leerUso(db).then(setUso);
      try {
        setEsp(espacioLocal());
      } catch {
        setEsp(null);
      }
    }, [db])
  );
  const n = (x = 0) => x.toLocaleString('es-EC');
  const filas: [string, string, string][] = uso
    ? [
        ['Lecturas', n(uso.hoy.l), n(uso.mes.l)],
        ['Escrituras', n(uso.hoy.e), n(uso.mes.e)],
        ['Transferencia bajada', peso(uso.hoy.tb), peso(uso.mes.tb)],
        ['Transferencia subida', peso(uso.hoy.ts), peso(uso.mes.ts)],
      ]
    : [];
  return (
    <Tarjeta style={{ gap: 8 }}>
      <Fila style={{ justifyContent: 'space-between' }}>
        <T tipo="chico">Nube</T>
        <T tipo="chico">Hoy · Este mes</T>
      </Fila>
      {filas.map(([l, h, m]) => (
        <Fila key={l} style={{ justifyContent: 'space-between' }}>
          <T>{l}</T>
          <T tipo="mono">{h} · {m}</T>
        </Fila>
      ))}
      <T tipo="chico">La app todavía no usa la nube: todo se lee y se guarda en el teléfono, así que estos números siguen en cero. Empezarán a contar cuando conectemos Supabase en la Fase 4.</T>
      <View style={{ height: 1, backgroundColor: 'rgba(128,128,128,.25)', marginVertical: 4 }} />
      <T tipo="chico">Espacio en este iPhone</T>
      <Fila style={{ justifyContent: 'space-between' }}>
        <T>Datos</T>
        <T tipo="mono">{peso(esp?.datos)}</T>
      </Fila>
      <Fila style={{ justifyContent: 'space-between' }}>
        <T>Fotos ({n(esp?.nFotos)})</T>
        <T tipo="mono">{peso(esp?.fotos)}</T>
      </Fila>
      <Fila style={{ justifyContent: 'space-between' }}>
        <T>Libre en el teléfono</T>
        <T tipo="mono">{peso(esp?.libre)}</T>
      </Fila>
      <Fila style={{ justifyContent: 'space-between' }}>
        <T>Cambios pendientes de subir</T>
        <T tipo="mono">{n(pendientes)}</T>
      </Fila>
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

        <T tipo="label">Múltiplos de precio</T>
        <T tipo="chico">El costo en ¥ solo se convierte a USD. Los precios de mayoreo y menudeo se calculan siempre sobre el costo en USD. ★ = se usa cuando el proveedor no tiene su propio factor.</T>
        <EditorMultiplos tipo="mayoreo" />
        <EditorMultiplos tipo="menudeo" />
        <Boton
          tipo="link"
          titulo="Restablecer múltiplos"
          onPress={() =>
            Alert.alert('Restablecer múltiplos', `Vuelven a ${MULTS_MAY.map((m) => '×' + fmtF(m)).join(' ')} (mayoreo) y ${MULTS_MEN.map((m) => '×' + fmtF(m)).join(' ')} (menudeo), sin predeterminado.`, [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Restablecer', onPress: () => setCfg({ multMay: null, multMen: null, defMay: null, defMen: null }) },
            ])
          }
        />

        <T tipo="label">Valores por defecto al crear un artículo</T>
        <Fila>
          <CampoNum etiqueta="Tipo de cambio ¥/USD" k="tcDef" placeholder="6.70" />
          <CampoTexto etiqueta="Origen" k="origenDef" placeholder="China" />
        </Fila>
        <ChipsDefecto etiqueta="Tallas que salen marcadas" k="tallasDef" opciones={uniq([...TALLAS_BASE, ...(cfg.tallasExtra || [])])} />
        <ChipsDefecto etiqueta="Colores que salen marcados" k="coloresDef" opciones={uniq([...(cfg.coloresRec || []), ...COLORES_BASE]).slice(0, 14)} />
        <T tipo="chico">Se aplican solo a artículos nuevos creados a mano.</T>

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

        <T tipo="label">Uso y costos</T>
        <UsoYCostos />

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
