import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { EditorComposicion } from '@/components/composicion';
import { HistorialArticulo } from '@/components/historial';
import { TablaStock } from '@/components/tabla-stock';
import { Boton, Campo, Chip, Chips, Fila, Pantalla, Segmento, T, Tarjeta } from '@/components/ui';
import {
  COLORES_BASE,
  TALLAS_BASE,
  desglose,
  ejes,
  factorDe,
  fmtF,
  money,
  multsDe,
  num,
  r2,
  rmbAUsd,
  skey,
  tieneStock,
  totalStock,
  uid,
  uniq,
} from '@/lib/calc';
import { fotoUri, guardarFotoLocal } from '@/lib/fotos';
import { useStore } from '@/lib/store';
import { useColores } from '@/lib/theme';
import type { Articulo, Linea } from '@/lib/types';


export default function EditorArticulo() {
  const c = useColores();
  const { id, prov: provParam } = useLocalSearchParams<{ id: string; prov?: string }>();
  const { arts, provs, prov, cfg, viajes, guardarArt, borrarArt, registrarMov, setCfg } = useStore();
  const existente = arts.find((a) => a.id === id);
  const esNuevo = !existente;

  const [a, setA] = useState<Articulo>(() =>
    existente
      ? JSON.parse(JSON.stringify(existente))
      : {
          id: uid(),
          estilo: '',
          nombre: '',
          categoria: '',
          proveedorId: provParam || '',
          factura: '',
          costo: null,
          pMay: null,
          pMen: null,
          tc: cfg.tcDef ?? null,
          colores: [...(cfg.coloresDef || [])],
          tallas: [...(cfg.tallasDef || [])],
          origen: cfg.origenDef || '',
          fotos: [],
          creado: Date.now(),
        }
  );
  const [tab, setTab] = useState<'basico' | 'precio' | 'comp'>('basico');
  const [cant, setCant] = useState<Record<string, number> | null>(null); // null = sin tocar
  const [nuevoColor, setNuevoColor] = useState('');
  const [nuevaTalla, setNuevaTalla] = useState('');
  const [txt, setTxt] = useState({ corig: a.costoOrigen != null ? String(a.costoOrigen) : '', tc: a.tc != null ? String(a.tc) : '', costo: a.costo != null ? String(a.costo) : '' });

  const set = (p: Partial<Articulo>) => setA((x) => ({ ...x, ...p }));
  const p = prov(a.proveedorId);
  const d = desglose(a, cfg, viajes, arts);
  const base = d.total;

  // ---------- existencias ----------
  const exist = !esNuevo && tieneStock(existente!);
  const { cols, tals } = useMemo(() => ejes(a), [a]);
  const valores = useMemo(() => {
    const v: Record<string, number> = {};
    for (const col of cols) for (const t of tals) {
      const k = skey(col, t);
      v[k] = cant?.[k] ?? (exist ? a.stock?.[k] ?? 0 : 0);
    }
    return v;
  }, [cols, tals, cant, exist, a.stock]);
  const totalCab = Object.values(valores).reduce((x, y) => x + y, 0) || (esNuevo && cant == null ? cols.length * tals.length : 0);

  const togColor = (col: string) => set({ colores: a.colores.includes(col) ? a.colores.filter((x) => x !== col) : [...a.colores, col] });
  const togTalla = (t: string) => set({ tallas: a.tallas.includes(t) ? a.tallas.filter((x) => x !== t) : [...a.tallas, t] });

  // ---------- costos y precios ----------
  const onCostoOrigen = (v: string) => {
    setTxt((x) => ({ ...x, corig: v }));
    const n = num(v);
    const tc = num(txt.tc);
    if (n == null) return set({ costoOrigen: null, moneda: undefined });
    const usd = tc ? rmbAUsd(n, tc) : a.costo ?? null;
    if (tc) setTxt((x) => ({ ...x, corig: v, costo: String(usd) }));
    set({ costoOrigen: n, moneda: 'RMB', costo: usd });
  };
  const onTc = (v: string) => {
    setTxt((x) => ({ ...x, tc: v }));
    const tc = num(v);
    set({ tc });
    if (tc && a.costoOrigen != null) {
      const usd = rmbAUsd(a.costoOrigen, tc);
      setTxt((x) => ({ ...x, tc: v, costo: String(usd) }));
      set({ tc, costo: usd });
    }
  };
  const aplicarMult = (tipo: 'mayoreo' | 'menudeo', m: number) => {
    if (base == null) return Alert.alert('Falta el costo', 'Escribe primero el costo del artículo.');
    const val = Math.ceil(r2(base * m));
    const f = factorDe(p, tipo, cfg);
    set(tipo === 'mayoreo' ? { pMay: f === m ? null : val } : { pMen: f === m ? null : val });
  };

  // ---------- fotos ----------
  const agregarFotos = async (camara: boolean) => {
    const perm = camara ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permiso necesario', camara ? 'Permite el acceso a la cámara en Ajustes del iPhone.' : 'Permite el acceso a tus fotos en Ajustes del iPhone.');
    const r = camara
      ? await ImagePicker.launchCameraAsync({ quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 6, quality: 0.85 });
    if (r.canceled) return;
    const nuevas: string[] = [];
    for (const asset of r.assets) nuevas.push(await guardarFotoLocal(asset.uri));
    set({ fotos: [...a.fotos, ...nuevas] });
  };

  // ---------- guardar ----------
  const guardar = async () => {
    if (!a.estilo.trim()) {
      setTab('basico');
      return Alert.alert('Falta el estilo', 'Escribe el código de estilo.');
    }
    if (!a.tallas.length && !tieneStock(a)) {
      setTab('basico');
      return Alert.alert('Falta la talla', 'Elige al menos una talla (o “Única”).');
    }
    const pm = a.pMay ?? null, pn = a.pMen ?? null;
    if (pm != null && pn != null && pn <= pm) {
      setTab('precio');
      return Alert.alert('Revisa los precios', 'El menudeo debe ser mayor que el mayoreo.');
    }
    const datos: Articulo = { ...a, estilo: a.estilo.toUpperCase().replace(/\s+/g, ''), categoria: (a.categoria || '').trim() || a.nombre };
    try {
      if (esNuevo) {
        const v = cant ?? Object.fromEntries(Object.keys(valores).map((k) => [k, 1]));
        const lin: Linea[] = Object.entries(v).map(([k, q]) => ({ color: k.split('|')[0], talla: k.split('|')[1], cant: q })).filter((l) => l.cant > 0);
        await guardarArt({ ...datos, cantidad: lin.reduce((x, l) => x + l.cant, 0) });
        if (lin.length) await registrarMov({ ...datos, stock: {} }, 'entrada', lin, 'Existencia inicial');
      } else {
        await guardarArt(datos);
        if (cant) {
          const st = existente?.stock || {};
          const lin: Linea[] = Object.entries(valores).map(([k, q]) => ({ color: k.split('|')[0], talla: k.split('|')[1], cant: q - (st[k] || 0) })).filter((l) => l.cant);
          if (lin.length) await registrarMov(datos, 'ajuste', lin, 'Ajuste desde el artículo');
        }
      }
      // Historial de colores y tallas propias (solo en el teléfono).
      const colNuevos = datos.colores.filter((x) => !COLORES_BASE.includes(x));
      const talNuevas = datos.tallas.filter((x) => !TALLAS_BASE.includes(x));
      if (colNuevos.length || talNuevas.length)
        setCfg({
          coloresRec: uniq([...colNuevos, ...(cfg.coloresRec || [])]).slice(0, 20),
          tallasExtra: uniq([...(cfg.tallasExtra || []), ...talNuevas]),
        });
      router.back();
    } catch (e) {
      Alert.alert('No se pudo guardar', String(e));
    }
  };

  const eliminar = () =>
    Alert.alert('Eliminar artículo', `¿Eliminar ${a.estilo || 'este artículo'}? No se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await borrarArt(a.id); router.back(); } },
    ]);

  const precioBox = (tipo: 'mayoreo' | 'menudeo') => {
    const k = tipo === 'mayoreo' ? 'pMay' : 'pMen';
    const man = a[k] != null;
    const f = factorDe(p, tipo, cfg);
    const calc = f && base != null ? Math.ceil(r2(base * f)) : null;
    const lista = multsDe(cfg, tipo);
    const actual = man && base ? lista.find((m) => Math.ceil(r2(base * m)) === a[k]) : f;
    const pMay = a.pMay ?? (factorDe(p, 'mayoreo', cfg) && base != null ? Math.ceil(r2(base * factorDe(p, 'mayoreo', cfg)!)) : null);
    return (
      <Tarjeta style={{ gap: 8, borderColor: tipo === 'mayoreo' ? c.gold : c.line }}>
        <T tipo="label">{tipo === 'mayoreo' ? 'Mayoreo' : 'Menudeo'}</T>
        <Campo value={man ? String(a[k]) : calc != null ? String(calc) : ''} onChangeText={(v) => set({ [k]: num(v) } as Partial<Articulo>)} keyboardType="decimal-pad" placeholder="0.00" />
        <T tipo="chico">{man ? (actual ? `Costo ${money(base)} × ${fmtF(actual)}` : 'Precio escrito a mano') : f ? `Calculado con factor ${f}` : base != null ? 'Toca un múltiplo o escribe el precio' : 'Escribe el costo para usar los múltiplos'}</T>
        <Chips>
          {lista.map((m) => {
            const bajo = tipo === 'menudeo' && base != null && pMay != null && Math.ceil(r2(base * m)) <= pMay;
            return <Chip key={m} titulo={`×${fmtF(m)}`} activo={actual === m} onPress={() => aplicarMult(tipo, m)} style={bajo ? { opacity: 0.4 } : undefined} />;
          })}
        </Chips>
        {man && calc != null ? <Boton tipo="link" titulo="Usar el del proveedor" onPress={() => set({ [k]: null } as Partial<Articulo>)} /> : null}
      </Tarjeta>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: esNuevo ? 'Nuevo artículo' : a.estilo || 'Artículo',
          headerRight: () => (
            <Pressable onPress={guardar} hitSlop={10}>
              <Text style={{ color: c.accent, fontWeight: '800', fontSize: 17 }}>Guardar</Text>
            </Pressable>
          ),
        }}
      />
      <Pantalla>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <T tipo="mono">{a.estilo || '—'}</T>
          <View style={{ backgroundColor: c.accent, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 }}>
            <Text style={{ color: c.accentInk, fontWeight: '800' }}>{totalCab} pzs</Text>
          </View>
          <T tipo="muted">× {money(base ?? 0)} = <Text style={{ color: c.accent, fontWeight: '800' }}>{money(r2(totalCab * (base ?? 0)))}</Text></T>
        </View>
        <Segmento opciones={[['basico', 'Básico'], ['precio', 'Costo y precio'], ['comp', 'Composición']]} valor={tab} onCambio={setTab} />

        {tab === 'basico' ? (
          <>
            <T tipo="label">Fotos · la primera sale en el catálogo</T>
            {a.fotos.length ? (
              <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
                {a.fotos.map((f, i) => (
                  <View key={f + i}>
                    <Image source={{ uri: fotoUri(f) }} style={{ width: 110, height: 140, borderRadius: 10, backgroundColor: c.card }} contentFit="cover" cachePolicy="disk" />
                    <Pressable onPress={() => set({ fotos: a.fotos.filter((_, j) => j !== i) })} style={{ position: 'absolute', top: 5, right: 5, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,.6)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: 16 }}>×</Text>
                    </Pressable>
                    {i > 0 ? (
                      <Pressable onPress={() => set({ fotos: [f, ...a.fotos.filter((_, j) => j !== i)] })} style={{ position: 'absolute', bottom: 5, left: 5, backgroundColor: 'rgba(0,0,0,.6)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: '#fff', fontSize: 12 }}>★ Portada</Text>
                      </Pressable>
                    ) : (
                      <View style={{ position: 'absolute', bottom: 5, left: 5, backgroundColor: 'rgba(0,0,0,.6)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Portada</Text>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            ) : null}
            <Fila>
              <Boton titulo="📷  Cámara" onPress={() => agregarFotos(true)} style={{ flex: 1 }} />
              <Boton titulo="🖼  Fototeca" onPress={() => agregarFotos(false)} style={{ flex: 1 }} />
            </Fila>

            <Fila>
              <Campo etiqueta="Estilo" value={a.estilo} onChangeText={(v) => set({ estilo: v.toUpperCase().replace(/\s+/g, '') })} keyboardType="number-pad" autoCapitalize="characters" placeholder="8826" />
              <Campo etiqueta="Factura" value={a.factura || ''} onChangeText={(v) => set({ factura: v })} keyboardType="number-pad" placeholder="0001" />
            </Fila>
            <Campo etiqueta="Tipo de prenda (sale en el catálogo)" value={a.nombre} onChangeText={(v) => set({ nombre: v })} placeholder="Blusa, Vestido, Casaca…" />
            <Chips scroll>
              {uniq(arts.map((x) => x.nombre).filter(Boolean)).slice(0, 8).map((t) => (
                <Chip key={t} titulo={t} activo={a.nombre === t} onPress={() => set({ nombre: t })} />
              ))}
            </Chips>
            <Campo etiqueta="Descripción" value={a.categoria || ''} onChangeText={(v) => set({ categoria: v })} placeholder={a.nombre || 'Igual al tipo'} />
            <T tipo="label">Proveedor</T>
            <Chips>
              {provs.map((x) => (
                <Chip key={x.id} titulo={x.nombre} activo={a.proveedorId === x.id} onPress={() => set({ proveedorId: x.id })} />
              ))}
            </Chips>

            <T tipo="label">Colores</T>
            <Chips>
              {uniq([...a.colores, ...(cfg.coloresRec || []).slice(0, 6), ...COLORES_BASE]).map((col) => (
                <Chip key={col} titulo={col} activo={a.colores.includes(col)} onPress={() => togColor(col)} />
              ))}
            </Chips>
            <Fila>
              <Campo value={nuevoColor} onChangeText={setNuevoColor} placeholder="Otro color" onSubmitEditing={() => { const v = nuevoColor.trim(); if (v) { set({ colores: uniq([...a.colores, v.charAt(0).toUpperCase() + v.slice(1)]) }); setNuevoColor(''); } }} returnKeyType="done" />
            </Fila>

            <T tipo="label">Tallas</T>
            <Chips>
              {uniq([...TALLAS_BASE, ...(cfg.tallasExtra || []), ...a.tallas]).map((t) => (
                <Chip key={t} titulo={t} activo={a.tallas.includes(t)} onPress={() => togTalla(t)} />
              ))}
            </Chips>
            <Fila>
              <Campo value={nuevaTalla} onChangeText={setNuevaTalla} placeholder="Otra talla (ej. 28, 30)" autoCapitalize="characters" onSubmitEditing={() => { const v = nuevaTalla.trim().toUpperCase(); if (v) { set({ tallas: uniq([...a.tallas, ...v.split(/[\s,]+/).filter(Boolean)]) }); setNuevaTalla(''); } }} returnKeyType="done" />
            </Fila>

            <T tipo="label">Existencia en bodega</T>
            <Tarjeta style={{ gap: 6 }}>
              <T tipo="chico">{esNuevo ? 'Escribe cuántas piezas tienes; se guarda al tocar Guardar. Si no escribes nada, se crea 1 por cada color y talla.' : 'Cambia las cantidades y toca Guardar; se registra como ajuste.'}</T>
              <TablaStock
                cols={cols}
                tals={tals}
                valores={valores}
                onCambio={(k, v) => setCant({ ...valores, [k]: v })}
                onLlenar={(n) => setCant(Object.fromEntries(Object.keys(valores).map((k) => [k, n])))}
              />
            </Tarjeta>
            {exist ? (
              <Fila>
                <Boton titulo="− Venta" onPress={() => router.push({ pathname: '/movimiento/[id]', params: { id: a.id, tipo: 'venta' } })} style={{ flex: 1 }} />
                <Boton titulo="+ Entrada" onPress={() => router.push({ pathname: '/movimiento/[id]', params: { id: a.id, tipo: 'entrada' } })} style={{ flex: 1 }} />
                <Boton titulo="Conteo" onPress={() => router.push({ pathname: '/movimiento/[id]', params: { id: a.id, tipo: 'ajuste' } })} style={{ flex: 1 }} />
              </Fila>
            ) : null}
            {!esNuevo ? <HistorialArticulo artId={a.id} /> : null}
            {!esNuevo ? <Boton tipo="peligro" titulo="Eliminar artículo" onPress={eliminar} /> : null}
          </>
        ) : tab === 'comp' ? (
          <EditorComposicion a={a} set={set} />
        ) : (
          <>
            <Fila>
              <Campo etiqueta="Costo ¥ (RMB)" value={txt.corig} onChangeText={onCostoOrigen} keyboardType="decimal-pad" placeholder="0.00" />
              <Campo etiqueta="Cambio" value={txt.tc} onChangeText={onTc} keyboardType="decimal-pad" placeholder="6.70" />
              <Campo etiqueta="Costo USD" value={txt.costo} onChangeText={(v) => { setTxt((x) => ({ ...x, costo: v })); set({ costo: num(v) }); }} keyboardType="decimal-pad" placeholder="0.00" />
            </Fila>
            <T tipo="chico">
              {a.costoOrigen != null && a.tc ? `¥${a.costoOrigen.toFixed(2)} ÷ ${a.tc} = ${(a.costoOrigen / a.tc).toFixed(2)} → ${money(a.costo)} (redondeado hacia arriba)` : 'Escribe el costo en yuanes y el tipo de cambio, o directamente el costo en USD.'}
            </T>

            <T tipo="label">Costo de importación</T>
            <Fila>
              <Campo etiqueta="Peso por pieza (lb)" value={a.pesoLb != null ? String(a.pesoLb) : ''} onChangeText={(v) => set({ pesoLb: num(v) })} keyboardType="decimal-pad" placeholder="0.00" />
              <Campo etiqueta="En kilos" value={d.kg != null ? `${d.kg.toFixed(3)} kg` : '—'} editable={false} />
            </Fila>
            <Tarjeta style={{ gap: 4 }}>
              {d.kg == null ? (
                <T tipo="chico">Escribe el peso para calcular flete, aranceles e impuestos (las tasas están en Ajustes).</T>
              ) : (
                <>
                  {[
                    ['Costo (FOB)', d.fob],
                    ['Flete', d.flete],
                    ['Seguro', d.seguro],
                    ['Valor CIF', d.cif],
                    ['Arancel ad valorem', d.adv],
                    ['Arancel específico', d.esp],
                    ['FODINFA', d.fod],
                    ['IVA', d.iva],
                    ['Agente y otros', d.otros],
                  ].map(([l, v]) => (
                    <View key={l as string} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <T tipo="muted">{l as string}</T>
                      <T style={{ fontFamily: 'Menlo' }}>{money(v as number)}</T>
                    </View>
                  ))}
                </>
              )}
              {d.viaje ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <T tipo="muted">Gastos de viaje</T>
                  <T style={{ fontFamily: 'Menlo' }}>{money(d.viaje)}</T>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: c.line, paddingTop: 6, marginTop: 4 }}>
                <T style={{ fontWeight: '700' }}>Costo total por pieza</T>
                <T style={{ fontFamily: 'Menlo', fontWeight: '800', color: c.accent }}>{money(base)}</T>
              </View>
            </Tarjeta>

            <T tipo="label">Viaje de compra</T>
            {viajes.length ? (
              <Chips scroll>
                <Chip titulo="Sin viaje" activo={!a.viajeId} onPress={() => set({ viajeId: null })} />
                {viajes.map((v) => (
                  <Chip key={v.id} titulo={v.nombre || 'Viaje'} activo={a.viajeId === v.id} onPress={() => set({ viajeId: v.id })} />
                ))}
              </Chips>
            ) : (
              <T tipo="chico">Crea un viaje en la pestaña Proveedores para repartir pasajes, hospedaje y comida entre lo que compraste.</T>
            )}

            <T tipo="label">Precio de venta</T>
            {precioBox('mayoreo')}
            {precioBox('menudeo')}
          </>
        )}
        <Boton tipo="primario" titulo="Guardar" onPress={guardar} />
        {exist ? <T tipo="chico" style={{ textAlign: 'center' }}>En bodega ahora: {totalStock(existente!)} piezas</T> : null}
      </Pantalla>
    </>
  );
}
