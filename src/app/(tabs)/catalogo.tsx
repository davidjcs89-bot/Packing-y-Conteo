import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Boton, Cabecera, Campo, Chip, Chips, Fila, Segmento, T, Tarjeta } from '@/components/ui';
import { costoBase, money, precio, uniq } from '@/lib/calc';
import { compartirPdf, fechaCat, generarCatalogo, nombreArchivo, type TipoCat } from '@/lib/catalogo';
import { fotoUri } from '@/lib/fotos';
import { useStore } from '@/lib/store';
import { useColores } from '@/lib/theme';
import type { Articulo } from '@/lib/types';

const FECHAS: [string, string][] = [
  ['completa', 'Fecha completa'],
  ['mesanio', 'Mes y año'],
  ['texto', 'Texto propio'],
  ['ninguna', 'Sin fecha'],
];

export default function Catalogo() {
  const c = useColores();
  const ins = useSafeAreaInsets();
  const { arts, provs, prov, cfg, viajes, setCfg } = useStore();
  const [tipo, setTipo] = useState<TipoCat>('mayoreo');
  const [fProv, setFProv] = useState('');
  const [fFact, setFFact] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fuera, setFuera] = useState<Set<string>>(new Set()); // artículos desmarcados
  const [estado, setEstado] = useState('');
  const [ultimo, setUltimo] = useState<string | null>(null);

  const may = tipo === 'mayoreo';
  const kSub = may ? 'subMay' : 'subMen';
  const sub = String(cfg[kSub] ?? (may ? 'Catálogo mayorista · precios por unidad' : 'Catálogo'));
  const subtitulo = [sub.trim(), fechaCat(cfg.fechaModo as string, cfg.fechaTexto as string)].filter(Boolean).join(' · ');
  const porPag = Number(cfg.catPorPag) === 6 ? 6 : 4;
  const fotosExtra = cfg.fotosExtra !== false;

  const reales = arts.filter((a) => !a.ejemplo);
  const facturas = uniq(reales.map((a) => a.factura).filter(Boolean) as string[]).sort();
  const descs = uniq(reales.map((a) => a.categoria).filter(Boolean) as string[]).sort();
  const filtrados = useMemo(
    () => reales.filter((a) => (!fProv || a.proveedorId === fProv) && (!fFact || a.factura === fFact) && (!fDesc || a.categoria === fDesc)),
    [reales, fProv, fFact, fDesc]
  );
  const elegidos = filtrados.filter((a) => !fuera.has(a.id));
  const precioDe = (a: Articulo) => precio(a, tipo, prov(a.proveedorId), cfg, costoBase(a, cfg, viajes, arts));
  const sinPrecio = elegidos.filter((a) => precioDe(a) == null).length;

  const generar = async () => {
    if (!elegidos.length) return;
    try {
      setUltimo(null);
      const nombre = nombreArchivo(elegidos, provs, tipo);
      const uri = await generarCatalogo(elegidos, precioDe, { tipo, titulo: String(cfg.catTitulo ?? 'Nueva colección'), subtitulo, contacto: String(cfg.catContacto ?? ''), porPag, fotosExtra }, nombre, setEstado);
      setEstado('');
      setUltimo(uri);
      await compartirPdf(uri);
    } catch (e) {
      setEstado('');
      Alert.alert('No se pudo crear el catálogo', e instanceof Error ? e.message : String(e));
    }
  };

  const Opciones = (
    <View style={{ gap: 10, marginBottom: 10 }}>
      <Segmento opciones={[['menudeo', 'Menudeo'], ['mayoreo', 'Mayoreo']]} valor={tipo} onCambio={setTipo} />
      <Tarjeta style={{ gap: 10 }}>
        <Campo etiqueta="Título del catálogo" defaultValue={String(cfg.catTitulo ?? 'Nueva colección')} onEndEditing={(e) => setCfg({ catTitulo: e.nativeEvent.text })} />
        <Campo key={kSub} etiqueta={`Subtítulo ${may ? 'mayoreo' : 'menudeo'}`} defaultValue={sub} onEndEditing={(e) => setCfg({ [kSub]: e.nativeEvent.text })} placeholder="Sin subtítulo" />
        <T tipo="chico" style={{ fontWeight: '600' }}>Fecha en el catálogo</T>
        <Chips>
          {FECHAS.map(([k, l]) => (
            <Chip key={k} titulo={l} activo={(cfg.fechaModo || 'completa') === k} onPress={() => setCfg({ fechaModo: k })} />
          ))}
        </Chips>
        {cfg.fechaModo === 'texto' ? <Campo defaultValue={String(cfg.fechaTexto ?? '')} onEndEditing={(e) => setCfg({ fechaTexto: e.nativeEvent.text })} placeholder="Temporada Otoño 2026" /> : null}
        <Fila>
          <Campo etiqueta="WhatsApp de pedidos" defaultValue={String(cfg.catContacto ?? '')} onEndEditing={(e) => setCfg({ catContacto: e.nativeEvent.text })} keyboardType="phone-pad" placeholder="099 000 0000" />
        </Fila>
        <T tipo="chico" style={{ fontWeight: '600' }}>Fotos por página</T>
        <Segmento opciones={[['4', '4 grandes'], ['6', '6 medianas']]} valor={String(porPag) as '4' | '6'} onCambio={(k) => setCfg({ catPorPag: Number(k) })} />
        <Chips>
          <Chip titulo={fotosExtra ? 'Fotos adicionales ✓' : 'Fotos adicionales'} activo={fotosExtra} onPress={() => setCfg({ fotosExtra: !fotosExtra })} />
        </Chips>
        <T tipo="chico">Vista: {subtitulo || 'sin subtítulo ni fecha'}. El PDF no muestra proveedor ni costo.</T>
      </Tarjeta>

      <T tipo="label">Proveedor</T>
      <Chips scroll>
        <Chip titulo="Todos" activo={!fProv} onPress={() => setFProv('')} />
        {provs.map((p) => (reales.some((a) => a.proveedorId === p.id) ? <Chip key={p.id} titulo={p.nombre} activo={fProv === p.id} onPress={() => setFProv(p.id)} /> : null))}
      </Chips>
      {facturas.length ? (
        <>
          <T tipo="label">Factura</T>
          <Chips scroll>
            <Chip titulo="Todas" activo={!fFact} onPress={() => setFFact('')} />
            {facturas.map((f) => (
              <Chip key={f} titulo={f} activo={fFact === f} onPress={() => setFFact(f)} />
            ))}
          </Chips>
        </>
      ) : null}
      {descs.length > 1 ? (
        <>
          <T tipo="label">Descripción</T>
          <Chips scroll>
            <Chip titulo="Todas" activo={!fDesc} onPress={() => setFDesc('')} />
            {descs.map((d) => (
              <Chip key={d} titulo={d} activo={fDesc === d} onPress={() => setFDesc(d)} />
            ))}
          </Chips>
        </>
      ) : null}

      <Fila style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <T tipo="sub">Artículos · {elegidos.length} de {filtrados.length}</T>
        <Fila gap={16}>
          <Boton tipo="link" titulo="Todos" onPress={() => setFuera(new Set())} />
          <Boton tipo="link" titulo="Ninguno" onPress={() => setFuera(new Set(filtrados.map((a) => a.id)))} />
        </Fila>
      </Fila>
      {sinPrecio ? <T style={{ color: c.danger, fontSize: 13 }}>{sinPrecio} {sinPrecio === 1 ? 'artículo sale' : 'artículos salen'} como “Consultar” porque no tienen precio de {may ? 'mayoreo' : 'menudeo'}.</T> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Cabecera titulo="Catálogo" />
      <FlatList
        data={filtrados}
        keyExtractor={(a) => a.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: ins.bottom + 170 }}
        ListHeaderComponent={Opciones}
        initialNumToRender={15}
        renderItem={({ item: a }) => {
          const on = !fuera.has(a.id);
          const p = precioDe(a);
          return (
            <Pressable
              onPress={() => setFuera((s) => { const n = new Set(s); if (n.has(a.id)) n.delete(a.id); else n.add(a.id); return n; })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.line, opacity: on ? 1 : 0.45 }}>
              <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {on ? <Text style={{ color: c.accentInk, fontWeight: '900' }}>✓</Text> : null}
              </View>
              {a.fotos[0] ? <Image source={{ uri: fotoUri(a.fotos[0]) }} style={{ width: 44, height: 56, borderRadius: 6 }} contentFit="cover" /> : <View style={{ width: 44, height: 56, borderRadius: 6, backgroundColor: c.line }} />}
              <View style={{ flex: 1 }}>
                <T tipo="mono">{a.estilo} <T tipo="muted">{a.nombre}</T></T>
                <T tipo="chico" numberOfLines={1}>{(a.colores || []).length} colores · {(a.tallas || []).join(', ')}</T>
              </View>
              <Text style={{ fontWeight: '800', fontFamily: 'Menlo', color: p == null ? c.danger : may ? c.gold : c.accent }}>{p == null ? 'Sin precio' : money(p)}</Text>
            </Pressable>
          );
        }}
      />
      <View style={{ position: 'absolute', left: 16, right: 16, bottom: ins.bottom + 64, gap: 8 }}>
        {estado ? (
          <Tarjeta style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ActivityIndicator />
            <T>{estado}</T>
          </Tarjeta>
        ) : (
          <>
            {ultimo ? <Boton titulo="Compartir otra vez" onPress={() => compartirPdf(ultimo).catch(() => {})} /> : null}
            <Boton tipo="primario" titulo={elegidos.length ? `Crear y compartir PDF · ${elegidos.length}` : 'Elige al menos un artículo'} onPress={generar} disabled={!elegidos.length} />
          </>
        )}
      </View>
    </View>
  );
}
