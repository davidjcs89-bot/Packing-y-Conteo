/* Packing-y-Conteo · sitio propio
   Conecta la misma app de claude.ai con Supabase: datos (tabla docs), archivos
   (bucket "archivos"), IA (función "ia") y entrada con el PIN del negocio.
   La app sigue llamando a window.claude.use('db' | 'assets' | 'sample' | 'downloads'). */
(function () {
  const CFG = window.PYC_CFG;
  const SUPA_URL = CFG.url, SUPA_KEY = CFG.key, EMAIL = CFG.email, BUCKET = 'archivos';
  window.BLOB_BASE = SUPA_URL + '/storage/v1/object/public/' + BUCKET + '/';
  window.PYC_WEB = true;

  const cargar = src => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => ko(new Error('No se pudo cargar ' + src)); document.head.appendChild(s); });
  let sbP = null;
  const cliente = () => sbP || (sbP = (async () => {
    if (!window.supabase) await cargar(CFG.lib);
    return window.supabase.createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'pyc.sesion' } });
  })());

  /* ---------- PIN del negocio ---------- */
  function pantallaPin(c, msg) {
    return new Promise(res => {
      const ov = document.createElement('div');
      ov.id = 'pyc-pin';
      ov.innerHTML = `<style>
        #pyc-pin{position:fixed;inset:0;z-index:2000;background:var(--bg,#EDF1EF);display:flex;align-items:center;justify-content:center;padding:16px;font-family:Figtree,system-ui,sans-serif}
        #pyc-pin .b{width:100%;max-width:340px;background:var(--card,#fff);border:1px solid var(--line,#d9e0dc);border-radius:18px;padding:22px;display:flex;flex-direction:column;gap:12px;box-shadow:0 10px 40px rgba(0,0,0,.08)}
        #pyc-pin h1{margin:0;font-size:20px;color:var(--ink,#1b1b1b)} #pyc-pin p{margin:0;font-size:14px;color:var(--muted,#6b6b6b)}
        #pyc-pin input{font:600 24px/1 'IBM Plex Mono',monospace;letter-spacing:6px;text-align:center;padding:12px;border-radius:12px;border:1px solid var(--line,#d9e0dc);background:var(--surface,#F8FAF9);color:var(--ink,#1b1b1b)}
        #pyc-pin button{font:700 16px Figtree,system-ui,sans-serif;padding:13px;border-radius:12px;border:0;background:var(--accent,#0E7C66);color:#fff}
        #pyc-pin button:disabled{opacity:.6} #pyc-pin .e{color:#c62828;font-size:13px;min-height:16px}
      </style><form class="b"><h1>Packing-y-Conteo</h1><p>Escribe el PIN del negocio para entrar.</p>
        <input type="password" inputmode="numeric" autocomplete="current-password" placeholder="••••••" aria-label="PIN" required>
        <span class="e">${msg || ''}</span><button type="submit">Entrar</button></form>`;
      document.body.appendChild(ov);
      const f = ov.querySelector('form'), inp = ov.querySelector('input'), err = ov.querySelector('.e'), bt = ov.querySelector('button');
      setTimeout(() => inp.focus(), 50);
      f.addEventListener('submit', async e => {
        e.preventDefault(); bt.disabled = true; err.textContent = '';
        const pin = inp.value.trim(); let r = null;
        for (const email of [EMAIL, CFG.emailEmp]) { if (!email) continue; r = await c.auth.signInWithPassword({ email, password: pin }); if (r.data && r.data.session) break; if (r.error && /network|fetch/i.test(r.error.message)) break; }
        bt.disabled = false;
        if (!r || r.error || !r.data.session) { err.textContent = r && r.error && /network|fetch/i.test(r.error.message) ? 'Sin conexión. Revisa el internet.' : 'PIN incorrecto'; inp.select(); return; }
        ov.remove(); res(r.data.session);
      });
    });
  }
  let sesionP = null;
  const sesion = () => sesionP || (sesionP = (async () => {
    const c = await cliente();
    const { data } = await c.auth.getSession();
    let ses = data && data.session ? data.session : await pantallaPin(c);
    // Se renueva la sesión para traer el rol actualizado (admin / empleado)
    try { const rf = await c.auth.refreshSession(); if (rf.data && rf.data.session) ses = rf.data.session; } catch {}
    const meta = (ses.user && ses.user.app_metadata) || {};
    window.PYC_ROL = meta.rol === 'empleado' ? 'empleado' : 'admin';
    return ses;
  })());
  window.PYC_SALIR = async () => { const c = await cliente(); await c.auth.signOut(); location.reload(); };

  /* ---------- db: colecciones como en claude.ai, guardadas en la tabla docs ----------
     Para el acceso del empleado, los datos sensibles van en colecciones aparte que Supabase
     solo entrega al administrador:
       articulos  -> parte visible (fotos, colores, tallas, existencia, precios de venta)
       articulos_priv -> costos, tipo de cambio, proveedor, factura, detalle de factura
       compras    -> la compra completa (solo administrador)
       recepciones -> lo necesario para contar (líneas sin costo, proveedor) + el estado del conteo
       config     -> configuración completa; config_pub -> la parte sin costos ni factores */
  const PRIV_ART = ['costo', 'costoOrigen', 'moneda', 'tc', 'proveedorId', 'factura', 'stockFacturas', 'detalle', 'viajeId'];
  const REC_KEYS = ['contEq', 'contEmb', 'conteos', 'estadoEq', 'estadoEmb', 'recibido', 'recibidoEq', 'difEq', 'cambios', 'eqContadoAt', 'embContadoAt', 'estado', 'verificadaAt', 'reclamo'];
  const CFG_PUB = ['tipos', 'tiposRecientes', 'tallasExtra', 'tallasDef', 'coloresDef', 'coloresRec', 'fotosExtra', 'fechaModo', 'fechaTexto', 'subMen', 'subMay', 'origenDef', 'verMenudeo', 'verMayoreo', 'ord_arts', 'ord_bod', 'taraCajaLb', 'taraBultoLb', 'taraBolsaLb', 'cartonSimpleLbFt2', 'cartonDobleLbFt2'];
  const pick = (o, ks) => { const r = {}; for (const k of ks) if (o && o[k] !== undefined) r[k] = o[k]; return r; };
  const omit = (o, ks) => { const r = { ...(o || {}) }; for (const k of ks) delete r[k]; return r; };
  function crearDb(c) {
    const emp = () => window.PYC_ROL === 'empleado';
    const raw = new Map(), cargas = new Map(), subs = new Map(), timers = new Map();
    const mapa = col => { if (!raw.has(col)) raw.set(col, new Map()); return raw.get(col); };
    // Colecciones físicas que forman cada colección de la app
    const deps = name => emp()
      ? ({ articulos: ['articulos'], compras: ['recepciones'], config: ['config_pub'], movimientos: ['movimientos'] })[name] || []
      : ({ articulos: ['articulos', 'articulos_priv'], compras: ['compras', 'recepciones'] })[name] || [name];
    const copiaRec = d => {
      const pv = mapa('proveedores').get(d.proveedorId);
      return { lineas: (d.lineas || []).map(l => ({ artId: l.artId, estilo: l.estilo, cant: l.cant || {}, eq: l.eq || {} })), proveedorId: d.proveedorId || '', provNombre: (pv && pv.nombre) || d.provNombre || '',
        entrega: d.entrega, via: d.via || null, viajeId: d.viajeId || '', etapa: d.etapa, fecha: d.fecha, creado: d.creado };
    };
    const construir = name => {
      if (emp()) {
        if (name === 'config') { const m = new Map(); const g = mapa('config_pub').get('general'); if (g) m.set('general', g); return m; }
        const d = deps(name); return d.length ? new Map(mapa(d[0])) : new Map();
      }
      if (name === 'articulos') { const m = new Map(); const pr = mapa('articulos_priv'); for (const [id, d] of mapa('articulos')) m.set(id, { ...d, ...(pr.get(id) || {}) }); return m; }
      if (name === 'compras') { const m = new Map(); const rc = mapa('recepciones'); for (const [id, d] of mapa('compras')) m.set(id, { ...d, ...pick(rc.get(id), REC_KEYS) }); return m; }
      return new Map(mapa(name));
    };
    const snap = (name, ord, lim) => {
      let arr = [...construir(name).entries()].map(([id, data]) => ({ id, exists: true, data: () => data }));
      if (ord) arr.sort((a, b) => { const x = a.data()[ord.f], y = b.data()[ord.f]; return (x > y ? 1 : x < y ? -1 : 0) * (ord.dir === 'desc' ? -1 : 1); });
      if (lim) arr = arr.slice(0, lim);
      return { docs: arr, size: arr.length, empty: !arr.length, docChanges: () => [] };
    };
    const emitir = name => { clearTimeout(timers.get(name)); timers.set(name, setTimeout(() => { for (const s of subs.get(name) || []) try { s.cb(snap(name, s.ord, s.lim)); } catch (e) { console.error(e); } }, 60)); };
    const emitirCol = col => { for (const name of subs.keys()) if (deps(name).includes(col)) emitir(name); };
    const cargarCol = col => {
      if (!cargas.has(col)) cargas.set(col, (async () => {
        const m = new Map(); let desde = 0;
        for (;;) {
          const { data, error } = await c.from('docs').select('id,data').eq('col', col).range(desde, desde + 999);
          if (error) throw error;
          data.forEach(r => m.set(r.id, r.data));
          if (data.length < 1000) break; desde += 1000;
        }
        const viejo = mapa(col); for (const [k, v] of viejo) if (!m.has(k)) m.set(k, v);
        raw.set(col, m);
      })().catch(e => { cargas.delete(col); throw e; }));
      return cargas.get(col);
    };
    const cargarDeps = name => Promise.all(deps(name).map(cargarCol));
    c.channel('pyc-docs').on('postgres_changes', { event: '*', schema: 'public', table: 'docs' }, p => {
      const r = (p.new && p.new.col) ? p.new : p.old; if (!r || !r.col || !raw.has(r.col)) return;
      if (p.eventType === 'DELETE') mapa(r.col).delete(r.id); else mapa(r.col).set(r.id, p.new.data);
      emitirCol(r.col);
    }).subscribe();
    // Escrituras físicas
    const up = async (col, id, data) => { mapa(col).set(id, data); emitirCol(col);
      const { error } = await c.from('docs').upsert({ col, id, data, upd: new Date().toISOString() }); if (error) throw error; };
    const upd = async (col, id, data) => { mapa(col).set(id, data); emitirCol(col);
      const { data: r, error } = await c.from('docs').update({ data, upd: new Date().toISOString() }).eq('col', col).eq('id', id).select('id'); if (error) throw error;
      if (!r || !r.length) throw new Error('Sin permiso para guardar esto'); };
    const ins = async (col, id, data) => { mapa(col).set(id, data); emitirCol(col);
      const { error } = await c.from('docs').insert({ col, id, data, upd: new Date().toISOString() }); if (error) throw error; };
    const del = async (col, id) => { mapa(col).delete(id); emitirCol(col); const { error } = await c.from('docs').delete().eq('col', col).eq('id', id); if (error) throw error; };
    // Escritura de un documento de la app según su colección y el rol
    async function escribir(name, id, d) {
      if (emp()) {
        if (name === 'articulos') return upd('articulos', id, omit(d, PRIV_ART));
        if (name === 'compras') { const prev = mapa('recepciones').get(id) || {}; return upd('recepciones', id, { ...prev, ...pick(d, REC_KEYS) }); }
        if (name === 'movimientos') return mapa('movimientos').has(id) ? upd('movimientos', id, d) : ins('movimientos', id, omit(d, ['factura', 'proveedorId']));
        return; // configuración y demás: el empleado no guarda en la nube
      }
      if (name === 'articulos') { await up('articulos', id, omit(d, PRIV_ART)); return up('articulos_priv', id, pick(d, PRIV_ART)); }
      if (name === 'compras') { await up('compras', id, omit(d, REC_KEYS)); return up('recepciones', id, { ...copiaRec(d), ...pick(d, REC_KEYS) }); }
      if (name === 'config' && id === 'general') { await up('config', id, d); return up('config_pub', id, pick(d, CFG_PUB)); }
      return up(name, id, d);
    }
    async function borrar(name, id) {
      if (emp()) throw new Error('Sin permiso para borrar');
      if (name === 'articulos') { await del('articulos', id); return del('articulos_priv', id); }
      if (name === 'compras') { await del('compras', id); return del('recepciones', id); }
      return del(name, id);
    }
    // Separación de datos que ya existían (se hace una vez, solo con el PIN del negocio)
    let separado = false;
    async function separar() {
      if (separado || emp()) return; separado = true;
      try {
        await Promise.all(['articulos', 'articulos_priv', 'compras', 'recepciones', 'config', 'config_pub', 'proveedores'].map(cargarCol));
        const arts = [...mapa('articulos').entries()].filter(([, d]) => PRIV_ART.some(k => d[k] !== undefined));
        for (const [id, d] of arts) await escribir('articulos', id, { ...d, ...(mapa('articulos_priv').get(id) || {}) });
        for (const [id, d] of mapa('compras')) { const rc = mapa('recepciones').get(id); if (!rc || REC_KEYS.some(k => d[k] !== undefined)) await escribir('compras', id, { ...d, ...pick(rc, REC_KEYS) }); }
        const g = mapa('config').get('general'); if (g && !mapa('config_pub').has('general')) await up('config_pub', 'general', pick(g, CFG_PUB));
        if (arts.length) console.info('Separados costos de', arts.length, 'artículos');
      } catch (e) { separado = false; console.error('No se pudo separar', e); }
    }
    const ref = (name, id) => ({
      id,
      async set(data) { return escribir(name, id, JSON.parse(JSON.stringify(data))); },
      async update(patch) { const prev = construir(name).get(id) || {}; return this.set({ ...prev, ...patch }); },
      async delete() { return borrar(name, id); },
      async get() { await cargarDeps(name); const d = construir(name).get(id); return { id, exists: !!d, data: () => d }; },
    });
    const consulta = (name, ord, lim) => ({
      orderBy: (f, dir) => consulta(name, { f, dir: dir || 'asc' }, lim),
      limit: n => consulta(name, ord, n),
      doc: id => ref(name, id),
      onSnapshot(cb, err) {
        const s = { cb, ord, lim }; if (!subs.has(name)) subs.set(name, new Set()); subs.get(name).add(s);
        cargarDeps(name).then(() => { cb(snap(name, ord, lim)); if (name === 'articulos') setTimeout(separar, 1500); }).catch(e => err && err(e));
        return () => subs.get(name).delete(s);
      },
      async get() { await cargarDeps(name); return snap(name, ord, lim); },
    });
    return { collection: name => consulta(name) };
  }

  /* ---------- assets: fotos y facturas en el bucket "archivos" ---------- */
  function crearAssets(c) {
    const ext = t => ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' })[t] || '';
    return {
      async upload(blob) {
        const id = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)) + ext(blob.type);
        const { error } = await c.storage.from(BUCKET).upload(id, blob, { contentType: blob.type || 'application/octet-stream', upsert: false });
        if (error) throw error;
        return { id, url: window.BLOB_BASE + id, sizeBytes: blob.size, contentType: blob.type };
      },
      async delete(id) { const { error } = await c.storage.from(BUCKET).remove([id]); if (error) throw error; },
      async list() { const { data, error } = await c.storage.from(BUCKET).list('', { limit: 1000 }); if (error) throw error;
        const assets = (data || []).map(o => ({ id: o.name, url: window.BLOB_BASE + o.name, sizeBytes: (o.metadata || {}).size || 0, contentType: (o.metadata || {}).mimetype || '' }));
        return { assets, usage: { bytes: assets.reduce((x, a) => x + a.sizeBytes, 0), count: assets.length } }; },
    };
  }

  /* ---------- sample: la IA pasa por la función "ia" de Supabase ---------- */
  function crearSample(c) {
    const b64 = blob => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = ko; r.readAsDataURL(blob); });
    async function llamar(input, opts, comoJson) {
      opts = opts || {};
      let msgs = typeof input === 'string' ? [{ role: 'user', content: input }] : input.map(m => ({ role: m.role, content: m.content }));
      if (opts.images && opts.images.length) {
        const ult = msgs[msgs.length - 1]; const imgs = [];
        for (const im of opts.images) imgs.push({ type: 'image', source: { type: 'base64', media_type: im.type && im.type.startsWith('image/') ? im.type : 'image/jpeg', data: await b64(im) } });
        ult.content = [...imgs, { type: 'text', text: String(ult.content) }];
      }
      const ses = await sesion();
      const r = await fetch(SUPA_URL + '/functions/v1/ia', {
        method: 'POST', signal: opts.signal,
        headers: { 'content-type': 'application/json', apikey: SUPA_KEY, Authorization: 'Bearer ' + ses.access_token },
        body: JSON.stringify({ messages: msgs, tier: opts.modelTier || 'default', max_tokens: 16000,
          system: comoJson ? 'Responde únicamente con JSON válido, sin texto antes ni después y sin bloques de código.' : undefined }),
      }).catch(e => { const er = new Error(e.name === 'AbortError' ? 'Cancelado' : 'Sin conexión'); er.code = e.name === 'AbortError' ? 'cancelled' : 'network'; er.name = e.name; throw er; });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { const er = new Error(j.error || ('Error ' + r.status)); er.code = r.status === 429 || r.status === 529 ? 'rate_limited' : r.status === 401 ? 'not_granted' : 'error'; throw er; }
      if (opts.onText) try { opts.onText({ text: j.text, delta: j.text }); } catch {}
      return { text: j.text || '', truncated: !!j.truncated };
    }
    const sample = (input, opts) => llamar(input, opts, false);
    sample.json = async (input, opts) => {
      const { text } = await llamar(input, opts, true);
      let t = String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
      const i = t.search(/[{[]/), k = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
      if (i >= 0 && k > i) t = t.slice(i, k + 1);
      try { return JSON.parse(t); } catch (e) { const er = new Error('La IA no devolvió JSON'); er.code = 'invalid_json'; er.text = text; throw er; }
    };
    sample.limits = async () => ({ images: true });
    return sample;
  }

  /* ---------- window.claude.use, como en claude.ai ---------- */
  const caps = {};
  window.claude = {
    use: async name => {
      if (name === 'downloads' || name === 'user') return null; // descarga normal del navegador
      if (caps[name]) return caps[name];
      const c = await cliente(); await sesion();
      if (name === 'db') return (caps.db = crearDb(c));
      if (name === 'assets') return (caps.assets = crearAssets(c));
      if (name === 'sample') return (caps.sample = crearSample(c));
      return null;
    },
  };
})();
