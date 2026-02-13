class DolphinMinimal {
  constructor(c = {}) {
    this.c = {
      base: '', ws: '', to: 10000, ret: 3, del: 300,
      cache: true, fresh: 10000, stale: 30000,
      batch: 20, qsize: 200, rec: 5000,
      headers: {},
      plugins: [],
      ...c
    };
    if (!this.c.base && !this.c.ws) throw new Error('base or ws required');

    this.s = { t: null, u: null, q: [], o: true, w: null, wc: false, ws: new Map(), recon: 0 };
    this._store = { cache: new Map(), pending: new Map(), m: { r: 0, s: 0, ch: 0 } };
    this._operations = new Map(); // 🔥 NEW: OPID tracking
    this._reqCancel = new Map();
    this._refreshPromise = null;

    this._ev = {
      request: { loading: new Set(), success: new Set(), error: new Set(), retry: new Set(), cached: new Set() },
      queue: { added: new Set(), flush_start: new Set(), flush_complete: new Set(), success: new Set(), error: new Set(), retry: new Set() },
      websocket: { connected: new Set(), disconnected: new Set(), data: new Set(), error: new Set(), subscribed: new Set(), unsubscribed: new Set() },
      auth: { set: new Set(), cleared: new Set(), refreshed: new Set(), expired: new Set() },
      network: { online: new Set(), offline: new Set() },
      activity: new Set()
    };

    this._struct = {
      prio: ['critical', 'high', 'normal', 'low'],
      types: new Map([
        [FormData, { t: null, e: d => d }],
        [ArrayBuffer, { t: 'octet-stream', e: d => d }],
        [Object, { t: 'json', e: JSON.stringify }]
      ])
    };

    this._requestInterceptors = [];
    this._responseInterceptors = [];

    this.c.plugins.forEach(plugin => this.use(plugin));

    this._init();
  }

  use(plugin) {
    if (typeof plugin === 'function') plugin(this);
    else if (plugin && typeof plugin.install === 'function') plugin.install(this, this.c);
  }

  useRequestInterceptor(fn) {
    this._requestInterceptors.push(fn);
  }

  useResponseInterceptor(fn) {
    this._responseInterceptors.push(fn);
  }

  configure(updates) {
    Object.assign(this.c, updates);
  }

  get store() {
    return {
      snapshot: () => ({
        auth: { loggedIn: !!this.s.t, user: this.s.u },
        online: this.s.o,
        wsConnected: this.s.wc,
        queueLength: this.s.q.length,
        cacheSize: this._store.cache.size,
        metrics: this.metrics()
      }),
      subscribe: (cb) => {
        cb(this.store.snapshot());
        return this.on('activity', () => cb(this.store.snapshot()));
      }
    };
  }

  _detect() {
    if (typeof navigator !== 'undefined') {
      if (navigator.product === 'ReactNative') return 'mobile';
      if (typeof window !== 'undefined') return 'web';
    }
    return 'iot';
  }

  _url(p, ws = false) {
    if (p.startsWith('http')) return p;
    const base = ws ? this.c.ws : this.c.base;
    const params = [];
    if (ws && this.s.t) params.push(`token=${encodeURIComponent(this.s.t)}`);
    if (ws) params.push(`platform=${this._detect()}`);
    return params.length ? `${base}${p}?${params.join('&')}` : `${base}${p}`;
  }

  _canonical(val) {
    if (val === null || typeof val !== 'object') return JSON.stringify(val);
    if (Array.isArray(val)) return '[' + val.map(v => this._canonical(v)).join(',') + ']';
    const keys = Object.keys(val).sort();
    return '{' + keys.map(k => `${JSON.stringify(k)}:${this._canonical(val[k])}`).join(',') + '}';
  }

  _key(o) {
    const dataStr = o.data == null ? '' : this._canonical(o.data);
    const queryStr = o.query ? this._canonical(o.query) : '';
    return `${o.method || 'GET'}:${o.path}:${dataStr}:${queryStr}`;
  }

  _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  _getPayloadInfo(data) {
    if (data == null) return { body: undefined, ct: undefined };
    if (typeof HTMLFormElement !== 'undefined' && data instanceof HTMLFormElement) {
      return { body: new FormData(data), ct: undefined };
    }
    for (const [Ctor, { t, e }] of this._struct.types) {
      if (data instanceof Ctor) return { body: e(data), ct: t ? `application/${t}` : undefined };
    }
    return { body: data, ct: undefined };
  }

  _payload(data, headers = {}, auth = true) {
    const { body, ct } = this._getPayloadInfo(data);
    const h = { ...this.c.headers, ...headers };
    if (ct) h['Content-Type'] = ct;
    if (auth && this.s.t) h.Authorization = `Bearer ${this.s.t}`;
    h['X-Platform'] = this._detect();
    return { h, body };
  }

  _buildPath(path, query) {
    if (!query) return path;
    const params = new URLSearchParams(query);
    return path + (path.includes('?') ? '&' : '?') + params.toString();
  }

  _getCache(key) {
    const entry = this._store.cache.get(key);
    if (!entry) return null;
    const age = Date.now() - entry.t;
    if (age > this.c.stale) {
      this._store.cache.delete(key);
      return null;
    }
    return entry.d;
  }

  invalidate(prefix = '') {
    for (const [key, entry] of this._store.cache.entries()) {
      if (entry.path.startsWith(prefix)) this._store.cache.delete(key);
    }
  }

  on(input, cb) {
    if (typeof input === 'string') {
      const subs = this._ev[input];
      if (!subs) throw new Error(`Unknown topic: ${input}`);
      if (subs instanceof Set) { subs.add(cb); return () => subs.delete(cb); }
      const unsubs = Object.values(subs).map(s => { s.add(cb); return () => s.delete(cb); });
      return () => unsubs.forEach(u => u());
    }
    const unsubs = [];
    for (const topic in input) {
      const handlers = input[topic];
      const subs = this._ev[topic];
      if (typeof handlers === 'function') { subs.add(handlers); unsubs.push(() => subs.delete(handlers)); }
      else for (const ev in handlers) { if (!subs[ev]) subs[ev] = new Set(); subs[ev].add(handlers[ev]); unsubs.push(() => subs[ev].delete(handlers[ev])); }
    }
    return () => unsubs.forEach(u => u());
  }

  reqOn(obj) { return this.on({ request: obj }); }
  qOn(obj) { return this.on({ queue: obj }); }

  off(topic, subEvent) {
    if (!topic) Object.values(this._ev).forEach(v => v instanceof Set ? v.clear() : Object.values(v).forEach(s => s.clear()));
    else {
      const subs = this._ev[topic];
      if (!subs) return;
      if (subEvent && subs[subEvent]) subs[subEvent].clear();
      else if (subs instanceof Set) subs.clear();
      else Object.values(subs).forEach(s => s.clear());
    }
  }

  _emit(topic, event, data) {
    const e = { type: event, data, timestamp: Date.now(), id: data?.id || 'id' };
    const subs = this._ev[topic];
    if (!subs) return;
    if (subs instanceof Set) subs.forEach(fn => fn({ d: data, e }));
    else if (subs[event]) subs[event].forEach(fn => fn({ d: data, e }));
    if (topic !== 'activity') this._ev.activity.forEach(fn => fn({ d: data, e }));
  }

  async req(cfg) {
    const id = cfg.id || this._genId(cfg);
    const fullPath = this._buildPath(cfg.path, cfg.query);
    let config = { ...cfg, path: fullPath };

    for (const fn of this._requestInterceptors) {
      const modified = await fn(config);
      if (modified) config = modified;
    }

    const key = this._key(config);
    this._emit('request', 'loading', { id, ...config });

    if (config.cache !== false && config.method === 'GET') {
      const cached = this._getCache(key);
      if (cached !== null) {
        const entry = this._store.cache.get(key);
        const age = Date.now() - entry.t;
        this._emit('request', 'cached', { id, data: cached });
        this._emit('request', 'success', { id, data: cached, cached: true });

        if (age > this.c.fresh) {
          this.req({ ...config, cache: false, dedup: false }).catch(() => {});
        }
        return cached;
      }
    }

    if (config.dedup !== false && this._store.pending.has(key)) return this._store.pending.get(key);

    const promise = this._exec(config, id, config.ret ?? this.c.ret)
      .then(async data => {
        for (const fn of this._responseInterceptors) {
          const modified = await fn(data, cfg);
          if (modified !== undefined) data = modified;
        }

        if (config.cache !== false && config.method === 'GET') {
          this._store.cache.set(key, { d: data, t: Date.now(), path: cfg.path });
        }
        this._emit('request', 'success', { id, data });
        return data;
      })
      .catch(err => {
        this._emit('request', 'error', { id, error: err });
        throw err;
      })
      .finally(() => {
        this._store.pending.delete(key);
        this._reqCancel.delete(id);
      });

    if (config.dedup !== false) this._store.pending.set(key, promise);
    return promise;
  }

  cancel(id) { this._reqCancel.get(id)?.abort(); }

  _genId({ path = 'req', method = 'GET' }) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 6);
    const pathSlug = path.replace(/\//g, '_');
    // 🔥 IMPROVED: Better OPID format
    return `${method.toLowerCase()}_${pathSlug}_${timestamp}_${random}`;
  }

  async _exec(cfg, id, maxRetries, attempt = 1) {
    // 🔥 NEW: Track operation start
    this._operations.set(id, {
      start: Date.now(),
      status: 'loading',
      attempt,
      config: cfg
    });

    this._store.m.r++;
    this._emit('request', 'retry', { id, attempt });

    try {
      const data = await this._fetch(cfg, id);
      this._store.m.s++;

      // 🔥 NEW: Track operation success
      this._operations.set(id, {
        ...this._operations.get(id),
        status: 'success',
        end: Date.now(),
        duration: Date.now() - this._operations.get(id).start
      });

      return data;
    } catch (err) {
      // 🔥 NEW: Track operation error
      this._operations.set(id, {
        ...this._operations.get(id),
        status: 'error',
        end: Date.now(),
        duration: Date.now() - this._operations.get(id).start,
        error: err
      });

      if (attempt <= maxRetries && !this._isFatal(err)) {
        await this._delay(Math.min(this.c.del * 2 ** (attempt - 1), 10000));
        return this._exec(cfg, id, maxRetries, attempt + 1);
      }
      throw err;
    }
  }

  async _fetch(cfg, id) {
    const { path, method = 'GET', data, headers = {}, auth = true } = cfg;
    const hasBody = !['GET', 'HEAD', 'OPTIONS', 'DELETE'].includes(method.toUpperCase());
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), this.c.to);
    this._reqCancel.set(id, controller);

    try {
      const { h, body: rawBody } = this._payload(data, headers, auth);
      const res = await fetch(this._url(path), {
        method,
        headers: h,
        body: hasBody ? rawBody : null,
        signal: controller.signal
      });

      if (res.status === 401 && auth && this.s.t) {
        const nt = await this._refreshToken();
        if (nt) return this._fetch(cfg, id);
      }

      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`);
        err.status = res.status;
        throw err;
      }

      const ct = res.headers.get('content-type') || '';
      if (ct.includes('json')) return res.json();
      if (ct.includes('text')) return res.text();
      return res.arrayBuffer();
    } finally {
      clearTimeout(tid);
      this._reqCancel.delete(id);
    }
  }

  _isFatal(err) {
    if (err?.name === 'AbortError') return true;
    if (err?.status === 429) return false;
    if (err?.status >= 400 && err?.status < 500) return true;
    const msg = (err?.message || '').toLowerCase();
    return ['unauthorized', 'forbidden', 'not found'].some(t => msg.includes(t));
  }

  async _refreshToken() {
    if (this._refreshPromise) return this._refreshPromise;
    this._refreshPromise = this._fetch({ path: '/auth/refresh', method: 'POST', auth: false })
      .then(res => {
        if (res.token) {
          this.s.t = res.token;
          this.s.u = res.user ?? null;
          this._emit('auth', 'refreshed', { user: this.s.u });
          return res.token;
        }
        throw new Error('No token');
      })
      .catch(() => {
        this.s.t = null;
        this.s.u = null;
        this._emit('auth', 'expired', {});
        return null;
      })
      .finally(() => { this._refreshPromise = null });
    return this._refreshPromise;
  }

  _crud(method, hasBody = false) {
    return (path, dOrO, opts = {}) => {
      const data = hasBody ? (typeof dOrO === 'object' && !Array.isArray(dOrO) ? dOrO : undefined) : undefined;
      const options = hasBody ? (data === undefined ? dOrO : opts) : dOrO;
      return this.req({ method, path, ...(hasBody ? { data } : {}), ...options });
    };
  }

  crud = {
    get: (p, o = {}) => this.req({ method: 'GET', path: p, cache: true, dedup: true, ...o }),
    post: this._crud('POST', true),
    put: this._crud('PUT', true),
    patch: this._crud('PATCH', true),
    delete: this._crud('DELETE')
  };

  resource(base) {
    return {
      list: (q = {}, o = {}) => {
        const qs = Object.keys(q).length ? `?${new URLSearchParams(q)}` : '';
        return this.crud.get(`${base}${qs}`, o);
      },
      get: (id, o = {}) => this.crud.get(`${base}/${id}`, o),
      create: (d, o = {}) => this.crud.post(base, d, o),
      update: (id, d, o = {}) => this.crud.put(`${base}/${id}`, d, o),
      patch: (id, d, o = {}) => this.crud.patch(`${base}/${id}`, d, o),
      delete: (id, o = {}) => this.crud.delete(`${base}/${id}`, o)
    };
  }

  async add(o, prio = 'normal') {
    prio = this._struct.prio.includes(prio) ? prio : 'normal';
    const item = { ...o, id: o.id || this._genId(o), t: Date.now(), tries: 0, prio };
    if (this.s.q.length >= this.c.qsize) {
      this.s.q.sort((a, b) => this._struct.prio.indexOf(a.prio) - this._struct.prio.indexOf(b.prio));
      this.s.q.pop();
    }
    this.s.q.push(item);
    this._emit('queue', 'added', item);
    return { ok: true, id: item.id };
  }

  async flush() {
    if (!this.s.o || !this.s.q.length) return [];
    this.s.q.sort((a, b) => this._struct.prio.indexOf(a.prio) - this._struct.prio.indexOf(b.prio));
    const batch = this.s.q.splice(0, this.c.batch);
    this._emit('queue', 'flush_start', { count: batch.length });

    const results = await Promise.allSettled(batch.map(item =>
      this.req(item)
        .then(d => ({ id: item.id, ok: true, data: d }))
        .catch(() => {
          if (item.tries < 3) {
            item.tries++;
            this.s.q.push(item);
            this._emit('queue', 'retry', { ...item, attempt: item.tries });
          } else {
            this._emit('queue', 'error', item);
          }
          return { id: item.id, ok: false };
        })
        .finally(() => {
          if (!item.tries || item.tries >= 3) this._emit('queue', 'success', item);
        })
    ));

    const formatted = results.map(r => r.status === 'fulfilled' ? r.value : r.reason);
    this._emit('queue', 'flush_complete', { count: formatted.length });
    return formatted;
  }

  auth = {
    set: (t, u) => { this.s.t = t; this.s.u = u; this._emit('auth', 'set', { user: u }); },
    clear: () => { this.s.t = null; this.s.u = null; this._emit('auth', 'cleared', {}); }
  };

  ws(url = this.c.ws) {
    if (!url || this.s.w) return;
    this.s.w = new WebSocket(this._url(url, true));
    this.s.w.onopen = () => {
      this.s.wc = true;
      this.s.recon = 0;
      this._emit('websocket', 'connected', { url });
      this.s.ws.forEach((_, topic) => this._wsSend('sub', { topic }));
    };
    this.s.w.onmessage = e => {
      if (typeof e.data !== 'string') return;
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'data') {
          const cbs = this.s.ws.get(msg.topic);
          cbs?.forEach(cb => cb(msg.data));
          this._emit('websocket', 'data', msg);
        } else if (msg.type === 'auth' && this.s.t) this._wsSend('auth', { token: this.s.t });
        else if (msg.type === 'sync') this.flush();
        else if (msg.type === 'ping') this._wsSend('pong');
      } catch {}
    };
    this.s.w.onclose = ev => {
      this.s.wc = false;
      this._emit('websocket', 'disconnected', ev);
      if (!ev.wasClean) {
        const delay = Math.min(this.c.rec * 2 ** this.s.recon, 60000);
        this.s.recon++;
        setTimeout(() => this.ws(url), delay);
      }
    };
    this.s.w.onerror = err => this._emit('websocket', 'error', { error: err });
  }

  _wsSend(type, payload = {}) {
    if (this.s.wc) this.s.w.send(JSON.stringify({ type, ...payload }));
  }

  sub(topic, cb) {
    let set = this.s.ws.get(topic) || new Set();
    const wasEmpty = set.size === 0;
    set.add(cb);
    this.s.ws.set(topic, set);
    if (wasEmpty && this.s.wc) this._wsSend('sub', { topic });
    this._emit('websocket', 'subscribed', { topic });
    return () => {
      set.delete(cb);
      if (set.size === 0) this.s.ws.delete(topic);
      this._emit('websocket', 'unsubscribed', { topic });
    };
  }

  _init() {
    if (typeof navigator !== 'undefined') {
      this.s.o = navigator.onLine;
      window.addEventListener('online', () => { this.s.o = true; this._emit('network', 'online', {}); this.flush(); });
      window.addEventListener('offline', () => { this.s.o = false; this._emit('network', 'offline', {}); });
    }
    setInterval(() => this.flush(), 30000);
    setInterval(() => {
      const cutoff = Date.now() - this.c.stale;
      for (const [k, v] of this._store.cache) if (v.t < cutoff) this._store.cache.delete(k);
    }, 300000);
  }

  // 🔥 NEW: Operations tracking API
  operations() {
    return {
      get: (opid) => this._operations.get(opid),
      getAll: () => Array.from(this._operations.entries()),
      getByStatus: (status) => {
        const result = [];
        for (const [opid, data] of this._operations) {
          if (data.status === status) result.push({ opid, ...data });
        }
        return result;
      },
      clear: () => this._operations.clear()
    };
  }

  metrics() { 
    return { 
      ...this._store.m, 
      queue: this.s.q.length, 
      cache: this._store.cache.size, 
      ws: this.s.wc,
      operations: this._operations.size // 🔥 NEW: Include operations count
    }; 
  }
  
  clearCache() { this._store.cache.clear(); }
  clearQueue() { this.s.q = []; }
  getQueue() { return [...this.s.q]; }

  takeLatest(key, factory) {
    let lastId = null;
    return (...args) => {
      if (lastId) this.cancel(lastId);
      lastId = `${key}_${Date.now()}`;
      const cfg = typeof factory === 'function' ? factory(...args) : factory;
      return this.req({ ...cfg, id: lastId });
    };
  }

  debounceReq(key, wait, factory) {
    let t = null;
    return (...args) => new Promise((resolve, reject) => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        const cfg = typeof factory === 'function' ? factory(...args) : factory;
        this.req(cfg).then(resolve).catch(reject);
      }, wait);
    });
  }
}

if (typeof module !== 'undefined') module.exports = DolphinMinimal;
if (typeof window !== 'undefined') window.Dolphin = DolphinMinimal;
export default DolphinMinimal;