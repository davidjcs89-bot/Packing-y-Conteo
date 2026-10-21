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
        const { data, error } = await c.auth.signInWithPassword({ email: EMAIL, password: inp.value.trim() });
        bt.disabled = false;
        if (error || !data.session) { err.textContent = error && /network|fetch/i.test(error.message) ? 'Sin conexión. Revisa el internet.' : 'PIN incorrecto'; inp.select(); return; }
        ov.remove(); res(data.session);
      });
    });
  }
  let sesionP = null;
  const sesion = () => sesionP || (sesionP = (async () => {
    const c = await cliente();
    const { data } = await c.auth.getSession();
    if (data && data.session) return data.session;
    return pantallaPin(c);
  })());
  window.PYC_SALIR = async () => { const c = await cliente(); await c.auth.signOut(); location.reload(); };

  /* ---------- db: colecciones como en claude.ai, guardadas en la tabla docs ---------- */
  function crearDb(c) {
    const cache = new Map(), cargas = new Map(), subs = new Map(), timers = new Map();
    const mapa = col => { if (!cache.has(col)) cache.set(col, new Map()); return cache.get(col); };
    const snap = (col, ord, lim) => {
      let arr = [...mapa(col).entries()].map(([id, data]) => ({ id, exists: true, data: () => data }));
      if (ord) arr.sort((a, b) => { const x = a.data()[ord.f], y = b.data()[ord.f]; return (x > y ? 1 : x < y ? -1 : 0) * (ord.dir === 'desc' ? -1 : 1); });
      if (lim) arr = arr.slice(0, lim);
      return { docs: arr, size: arr.length, empty: !arr.length, docChanges: () => [] };
    };
    const emitir = col => { clearTimeout(timers.get(col)); timers.set(col, setTimeout(() => { for (const s of subs.get(col) || []) try { s.cb(snap(col, s.ord, s.lim)); } catch (e) { console.error(e); } }, 60)); };
    const cargarCol = col => {
      if (!cargas.has(col)) cargas.set(col, (async () => {
        const m = new Map(); let desde = 0;
        for (;;) {
          const { data, error } = await c.from('docs').select('id,data').eq('col', col).range(desde, desde + 999);
          if (error) throw error;
          data.forEach(r => m.set(r.id, r.data));
          if (data.length < 1000) break; desde += 1000;
        }
        const viejo = mapa(col); for (const [k, v] of viejo) if (!m.has(k)) m.set(k, v); // lo escrito mientras cargaba
        cache.set(col, m);
      })().catch(e => { cargas.delete(col); throw e; }));
      return cargas.get(col);
    };
    // Cambios en vivo hechos desde otros teléfonos
    c.channel('pyc-docs').on('postgres_changes', { event: '*', schema: 'public', table: 'docs' }, p => {
      const r = (p.new && p.new.col) ? p.new : p.old; if (!r || !r.col || !cache.has(r.col)) return;
      if (p.eventType === 'DELETE') mapa(r.col).delete(r.id); else mapa(r.col).set(r.id, p.new.data);
      emitir(r.col);
    }).subscribe();
    const ref = (col, id) => ({
      id,
      async set(data) { const d = JSON.parse(JSON.stringify(data)); mapa(col).set(id, d); emitir(col);
        const { error } = await c.from('docs').upsert({ col, id, data: d, upd: new Date().toISOString() }); if (error) throw error; },
      async update(patch) { const prev = mapa(col).get(id) || {}; return this.set({ ...prev, ...patch }); },
      async delete() { mapa(col).delete(id); emitir(col);
        const { error } = await c.from('docs').delete().eq('col', col).eq('id', id); if (error) throw error; },
      async get() { const { data, error } = await c.from('docs').select('data').eq('col', col).eq('id', id).maybeSingle(); if (error) throw error;
        return { id, exists: !!data, data: () => (data ? data.data : undefined) }; },
    });
    const consulta = (col, ord, lim) => ({
      orderBy: (f, dir) => consulta(col, { f, dir: dir || 'asc' }, lim),
      limit: n => consulta(col, ord, n),
      doc: id => ref(col, id),
      onSnapshot(cb, err) {
        const s = { cb, ord, lim }; if (!subs.has(col)) subs.set(col, new Set()); subs.get(col).add(s);
        cargarCol(col).then(() => cb(snap(col, ord, lim))).catch(e => err && err(e));
        return () => subs.get(col).delete(s);
      },
      async get() { await cargarCol(col); return snap(col, ord, lim); },
    });
    return { collection: col => consulta(col) };
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
