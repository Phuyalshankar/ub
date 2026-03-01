// map-full.ts - Production Ready (सबै Features सहित, Ultra Compact Interceptor सहित)
import { useSyncExternalStore, useCallback, useRef, useDebugValue } from 'react';

// ============ TYPES ============
type Listener = () => void;
type Store<T> = { 
  get: () => T; 
  set: <K extends keyof T>(k: K, v: T[K]) => void; 
  setMany: (u: Partial<T>) => void; 
  subscribe: (l: Listener) => () => void 
};

type AsyncOpts<T = any> = { 
  onSuccess?: (d: T) => void; 
  onError?: (e: any) => void; 
  onSettled?: () => void; 
  signal?: AbortSignal 
};

type Middleware<T> = (src: T[], idx: number[]) => number[];

// API Types
type ApiRequestOptions = RequestInit & { timeout?: number };
type ApiMethod = <R = any>(url: string, data?: any, options?: ApiRequestOptions) => Promise<R>;
type ApiInstance = {
  request: <R = any>(url: string, options?: ApiRequestOptions, retry?: boolean) => Promise<R>;
  get: ApiMethod;
  post: ApiMethod;
  put: ApiMethod;
  patch: ApiMethod;
  delete: ApiMethod;
};

// ============ UTILS ============
const isBrowser = typeof window !== 'undefined';

const shallowEqual = (a: any, b: any): boolean => {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const kA = Object.keys(a), kB = Object.keys(b);
  if (kA.length !== kB.length) return false;
  return kA.every(k => Object.prototype.hasOwnProperty.call(b, k) && Object.is(a[k], b[k]));
};

// ============ DATA ENGINE ============
class DataEngine<T extends Record<string, any> = any> {
  private _src: T[];
  private _idx: number[];
  private _ops: Array<{ fn: Middleware<T>; key: string }> = [];
  private _cache: T[] | null = null;
  private _version: number = 0;

  constructor(initialData: T[] = []) {
    this._src = [...initialData];
    this._idx = this._src.map((_, i) => i);
  }

  private _incrementVersion(): void {
    this._version++;
  }

  getVersion(): number {
    return this._version;
  }

  use(fn: Middleware<T>, key?: string): this {
    const k = key || `op_${this._ops.length}`;
    const i = key ? this._ops.findIndex(o => o.key === key) : -1;
    if (i !== -1) this._ops[i] = { fn, key: k };
    else this._ops.push({ fn, key: k });
    this._cache = null;
    this._incrementVersion();
    return this;
  }

  clear(): this {
    this._ops = [];
    this._cache = null;
    this._incrementVersion();
    return this;
  }

  get(): T[] {
    if (this._cache) return this._cache;
    let idx = [...this._idx];
    for (let o of this._ops) {
      try { idx = o.fn(this._src, idx) || idx; } catch {}
    }
    this._cache = idx.map(i => this._src[i]);
    return this._cache;
  }

  page(page: number = 1, size: number = 10) {
    const data = this.get();
    const start = (page - 1) * size;
    return {
      data: data.slice(start, start + size),
      total: data.length,
      page, size,
      pages: Math.ceil(data.length / size)
    };
  }

  push(...items: T[]): this {
    this._src = [...this._src, ...items];
    this._idx = this._src.map((_, i) => i);
    this._cache = null;
    this._incrementVersion();
    return this;
  }

  remove(predicate: (item: T, index: number) => boolean): this {
    this._src = this._src.filter((item, i) => !predicate(item, i));
    this._idx = this._src.map((_, i) => i);
    this._cache = null;
    this._incrementVersion();
    return this;
  }

  update(index: number, updates: Partial<T>): this {
    if (this._src[index]) {
      this._src = [
        ...this._src.slice(0, index),
        { ...this._src[index], ...updates },
        ...this._src.slice(index + 1)
      ];
    }
    this._cache = null;
    this._incrementVersion();
    return this;
  }

  setSource(newData: T[]): this {
    this._src = [...newData];
    this._idx = this._src.map((_, i) => i);
    this._cache = null;
    this._incrementVersion();
    return this;
  }

  get length(): number { return this.get().length; }
  get total(): number { return this._src.length; }
}

// ============ FILTERS ============
export const Filters = {
  by: <T extends Record<string, any>>(field: keyof T, value: any) => 
    (src: T[], idx: number[]): number[] => 
      idx.filter(i => src[i]?.[field] === value),
  
  range: <T extends Record<string, any>>(field: keyof T, min: number, max: number) => 
    (src: T[], idx: number[]): number[] => 
      idx.filter(i => {
        const v = src[i]?.[field];
        return v != null && Number(v) >= min && Number(v) <= max;
      }),
  
  search: <T extends Record<string, any>>(term: string = '', fields: (keyof T)[] = []) => {
    if (!term) return (_: T[], idx: number[]): number[] => idx;
    const t = term.toLowerCase();
    return (src: T[], idx: number[]): number[] => 
      idx.filter(i => {
        const item = src[i];
        const keys = fields.length ? fields : Object.keys(item) as (keyof T)[];
        return keys.some(k => String(item[k] || '').toLowerCase().includes(t));
      });
  },
  
  sort: <T extends Record<string, any>>(field: keyof T, asc: boolean = true) => 
    (src: T[], idx: number[]): number[] => 
      [...idx].sort((a, b) => {
        const va = src[a]?.[field];
        const vb = src[b]?.[field];
        
        if (va == null && vb == null) return 0;
        if (va == null) return asc ? 1 : -1;
        if (vb == null) return asc ? -1 : 1;
        
        if (typeof va === 'number' && typeof vb === 'number') {
          return asc ? va - vb : vb - va;
        }
        
        return String(va).localeCompare(String(vb)) * (asc ? 1 : -1);
      })
};

// ============ ASYNC ACTION ============
function createAsyncAction<T extends Record<string, any>>(store: Store<T>) {
  const reqs = new Map<keyof T, { abort: AbortController; id: number }>();
  let c = 0;
  
  return async <R = any, K extends keyof T = keyof T>(
    key: K, 
    promise: Promise<any>, 
    options: AsyncOpts<R> = {}
  ): Promise<[R | null, any]> => {
    const kid = String(key);
    const lKey = `${kid}Loading` as keyof T;
    const eKey = `${kid}Error` as keyof T;
    const rid = ++c;
    
    const prev = reqs.get(key);
    if (prev) { prev.abort.abort(); reqs.delete(key); }
    
    const abort = new AbortController();
    reqs.set(key, { abort, id: rid });
    
    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        if (reqs.get(key)?.id === rid) {
          abort.abort();
          reqs.delete(key);
        }
      });
    }
    
    store.set(lKey, true as any);
    store.set(eKey, null as any);
    
    const timeout = new Promise((_, rej) => 
      setTimeout(() => {
        if (reqs.get(key)?.id === rid) {
          abort.abort();
          reqs.delete(key);
          rej(new Error('Timeout'));
        }
      }, 30000)
    );
    
    try {
      const response = await Promise.race([promise, timeout]);
      if (reqs.get(key)?.id !== rid) return [null, new Error('Stale')];
      
      const res = response?.data ?? response;
      store.set(key, res);
      store.set(lKey, false as any);
      store.set(eKey, null as any);
      reqs.delete(key);
      options.onSuccess?.(res);
      options.onSettled?.();
      return [res, null];
    } catch (err: any) {
      if (reqs.get(key)?.id !== rid) return [null, new Error('Stale')];
      
      const errorMsg = err?.message || 'Error';
      store.set(eKey, errorMsg as any);
      store.set(lKey, false as any);
      reqs.delete(key);
      options.onError?.(err);
      options.onSettled?.();
      return [null, err];
    }
  };
}

// ============ MAIN STORE ============
export function createFullStore<T extends Record<string, any>>(initial: T) {
  let state = { ...initial };
  const listeners = new Set<Listener>();
  const timeouts = new Map<keyof T, any>();
  const batchSet = new Set<keyof T>();
  let batching = false;
  
  const dataEngine = new DataEngine(initial.data || []);
  
  let dataVersion = 0;
  
  const notify = () => {
    for (const l of Array.from(listeners)) try { l(); } catch {}
  };
  
  const batchNotify = () => {
    if (batching) return;
    batching = true;
    queueMicrotask(() => {
      batching = false;
      if (batchSet.size) {
        batchSet.clear();
        notify();
      }
    });
  };
  
  const subscribe = (l: Listener) => {
    listeners.add(l);
    return () => { listeners.delete(l); };
  };
  
  const set = <K extends keyof T>(key: K, val: T[K]) => {
    if (!Object.is(state[key], val)) {
      state = { ...state, [key]: val };
      batchSet.add(key);
      batchNotify();
    }
  };
  
  const setMany = (up: Partial<T>) => {
    let changed = false;
    const n = { ...state };
    for (const k in up) {
      if (!Object.is(state[k], up[k])) {
        n[k] = up[k] as any;
        changed = true;
        batchSet.add(k as keyof T);
      }
    }
    if (changed) {
      state = n;
      batchNotify();
    }
  };
  
  const update = (fn: (s: T) => T) => {
    const n = fn(state);
    if (!Object.is(state, n)) {
      const o = state;
      state = n;
      for (const k in n) {
        if (!Object.is(o[k], n[k])) batchSet.add(k as keyof T);
      }
      batchNotify();
    }
  };
  
  const get = () => state;
  
  const reset = () => {
    timeouts.forEach(t => clearTimeout(t));
    timeouts.clear();
    state = { ...initial };
    dataEngine.setSource(initial.data || []);
    dataVersion = dataEngine.getVersion();
    batchSet.clear();
    notify();
  };
  
  const setTemp = <K extends keyof T>(key: K, val: T[K], dur = 2000) => {
    if (timeouts.has(key)) clearTimeout(timeouts.get(key));
    set(key, val);
    const tid = setTimeout(() => {
      if (timeouts.has(key) && Object.is(state[key], val)) {
        state = { ...state, [key]: initial[key] };
        timeouts.delete(key);
        notify();
      }
    }, dur);
    timeouts.set(key, tid);
    return () => { clearTimeout(tid); timeouts.delete(key); };
  };

  const triggerDataUpdate = () => {
    const newVersion = dataEngine.getVersion();
    if (newVersion !== dataVersion) {
      dataVersion = newVersion;
      set('_dataVersion' as any, newVersion as any);
    }
  };

  const data = {
    get: <R = any>(): R[] => dataEngine.get() as R[],
    page: (p: number, s: number) => dataEngine.page(p, s),
    use: (fn: Middleware<any>, key?: string) => {
      dataEngine.use(fn, key);
      triggerDataUpdate();
      return data;
    },
    push: (...items: any[]) => {
      dataEngine.push(...items);
      triggerDataUpdate();
      return data;
    },
    remove: (pred: (item: any, i: number) => boolean) => {
      dataEngine.remove(pred);
      triggerDataUpdate();
      return data;
    },
    update: (idx: number, up: any) => {
      dataEngine.update(idx, up);
      triggerDataUpdate();
      return data;
    },
    set: (src: any[]) => {
      dataEngine.setSource(src);
      triggerDataUpdate();
      return data;
    },
    clear: () => {
      dataEngine.clear();
      triggerDataUpdate();
      return data;
    },
    get length() { return dataEngine.length; },
    get total() { return dataEngine.total; }
  };

  const use = <K extends keyof T>(k: K): T[K] => {
    const ref = useRef(k);
    ref.current = k;
    return useSyncExternalStore(
      subscribe,
      () => state[ref.current],
      () => initial[ref.current]
    );
  };
  
  const useStore = <R = T>(sel?: (state: T) => R): R => {
    const ref = useRef(sel);
    ref.current = sel;
    return useSyncExternalStore(
      subscribe,
      () => (ref.current ? ref.current(state) : state as any),
      () => (ref.current ? ref.current(initial) : initial as any)
    );
  };
  
  const useData = <R = any>(): R[] => {
    useSyncExternalStore(subscribe, () => dataVersion, () => dataVersion);
    return dataEngine.get() as R[];
  };

  const usePath = (path: string): any => {
    const p = useRef(path);
    p.current = path;
    return useSyncExternalStore(
      subscribe,
      () => path.split('.').reduce((o: any, k) => o?.[k], state),
      () => path.split('.').reduce((o: any, k) => o?.[k], initial)
    );
  };
  
  const usePick = (...paths: string[]): Record<string, any> => {
    const pRef = useRef(paths);
    pRef.current = paths;
    const get = (src: any) => {
      const r: any = {};
      for (const p of pRef.current) {
        r[p] = p.includes('.') ? p.split('.').reduce((o: any, k) => o?.[k], src) : src[p];
      }
      return r;
    };
    const val = useSyncExternalStore(
      subscribe,
      () => get(state),
      () => get(initial)
    );
    const prev = useRef(val);
    if (!shallowEqual(prev.current, val)) prev.current = val;
    return prev.current;
  };
  
  const bind = <K extends keyof T>(k: K) => ({
    value: state[k] ?? '',
    onChange: (e: any) => set(k, e.target.type === 'checkbox' ? e.target.checked : e.target.value)
  });
  
  const useBind = <K extends keyof T>(k: K) => {
    const value = use(k);
    const onChange = useCallback((e: any) => {
      set(k, e.target.type === 'checkbox' ? e.target.checked : e.target.value);
    }, [k]);
    
    return { value, onChange };
  };
  
  const persist = (key: string, opts?: {
    storage?: Storage;
    onError?: (e: Error) => void;
    onSuccess?: () => void;
    throttle?: number
  }) => {
    const st = opts?.storage || (isBrowser ? localStorage : null);
    if (!st) return () => {};
    
    try {
      const saved = st.getItem(key);
      if (saved) {
        try {
          setMany(JSON.parse(saved));
          opts?.onSuccess?.();
        } catch {}
      }
    } catch (e) {
      opts?.onError?.(e as Error);
    }
    
    let tid: any = null;
    let pending: T | null = null;
    let saving = false;
    
    const save = () => {
      if (saving) return;
      pending = state;
      if (tid) clearTimeout(tid);
      tid = setTimeout(() => {
        saving = true;
        try {
          if (pending) st.setItem(key, JSON.stringify(pending));
        } catch (e) {
          opts?.onError?.(e as Error);
        } finally {
          saving = false;
          pending = null;
          tid = null;
        }
      }, opts?.throttle ?? 1000);
    };
    
    const unsub = subscribe(save);
    return () => {
      unsub();
      if (tid) {
        clearTimeout(tid);
        if (pending) {
          try { st.setItem(key, JSON.stringify(pending)); } catch {}
        }
      }
    };
  };
  
  const persistWithRetry = (key: string, retries = 3) => {
    let attempt = 0;
    let unsub: (() => void) | null = null;
    
    const tryPersist = (): boolean => {
      try {
        unsub = persist(key, {
          onError: () => {
            if (attempt++ < retries) {
              setTimeout(tryPersist, 1000 * Math.pow(2, attempt));
            }
          }
        });
        return true;
      } catch {
        if (attempt++ < retries) {
          setTimeout(tryPersist, 1000 * Math.pow(2, attempt));
          return false;
        }
        return false;
      }
    };
    
    tryPersist();
    return unsub || (() => {});
  };
  
  const storeInst: Store<T> = { get, set, setMany, subscribe };
  const asyncAction = createAsyncAction(storeInst);
  
  // ============ ULTRA COMPACT INTERCEPTOR (सबैभन्दा सानो) ============
  const api: ApiInstance = {
    request: async <R = any>(url: string, opts: ApiRequestOptions = {}, retry = true): Promise<R> => {
      const ctrl = new AbortController(), tid = setTimeout(() => ctrl.abort(), opts.timeout || 30000);
      try {
        const { token, refreshToken } = get();
        let res = await fetch(url, { 
          ...opts, 
          headers: { 'Content-Type': 'application/json', ...opts.headers, ...(token && { Authorization: `Bearer ${token}` }) }, 
          signal: ctrl.signal 
        });
        
        if (res.status === 401 && refreshToken && retry) {
          const refreshRes = await fetch('/api/refresh', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ refreshToken }) 
          });
          if (refreshRes.ok) {
            const { token: newToken } = await refreshRes.json();
            set('token', newToken as any);
            localStorage?.setItem('token', newToken);
            return api.request(url, opts, false);
          }
        }
        
        return res.ok ? res.json() : Promise.reject(await res.json().catch(() => ({ message: res.statusText })));
      } finally { clearTimeout(tid); }
    },
    
    get: <R = any>(url: string, opts?: ApiRequestOptions) => 
      api.request<R>(url, { ...opts, method: 'GET' }),
    
    post: <R = any>(url: string, data?: any, opts?: ApiRequestOptions) => 
      api.request<R>(url, { ...opts, method: 'POST', body: JSON.stringify(data) }),
    
    put: <R = any>(url: string, data?: any, opts?: ApiRequestOptions) => 
      api.request<R>(url, { ...opts, method: 'PUT', body: JSON.stringify(data) }),
    
    patch: <R = any>(url: string, data?: any, opts?: ApiRequestOptions) => 
      api.request<R>(url, { ...opts, method: 'PATCH', body: JSON.stringify(data) }),
    
    delete: <R = any>(url: string, opts?: ApiRequestOptions) => 
      api.request<R>(url, { ...opts, method: 'DELETE' })
  };

  // superFetch using api
  const superFetch = async <R = any>(url: string, opts?: ApiRequestOptions) => {
    const data = await api.request<R>(url, opts);
    return { data, status: 200, ok: true };
  };
  
  const computed = <R>(fn: (s: T) => R): (() => R) => {
    let lastS = state;
    let lastR: R;
    let dirty = true;
    
    return () => {
      if (dirty || !Object.is(lastS, state)) {
        lastS = state;
        lastR = fn(state);
        dirty = false;
      }
      return lastR;
    };
  };

  const storeInstance = {
    // Core
    get, set, setMany, update, reset, subscribe,
    setTemp,
    use, useStore, useData, usePath, usePick,
    bind, useBind,
    persist, persistWithRetry,
    asyncAction, superFetch, api,
    computed,
    
    // Data engine
    data,
    
    // Shortcuts
    $: use,
    $$: usePick,
    $path: usePath,
    $temp: setTemp,
    $async: asyncAction,
    $data: data,
    
    ...(process.env.NODE_ENV === 'development' ? {
      _debug: {
        getState: get,
        listeners: () => listeners.size,
        timeouts: () => timeouts.size,
        dataVersion: () => dataVersion
      }
    } : {})
  };

  return storeInstance;
}

// ============ ATOM ============
export function createAtom<T>(init: T) {
  const store = createFullStore({ value: init });
  
  const useAtom = (): T => store.use('value');
  
  const fn = useAtom as typeof useAtom & {
    set: (v: T) => void;
    setTemp: (v: T, d?: number) => () => void;
    get: () => T;
    async: <R = T>(p: Promise<any>, o?: AsyncOpts<R>) => Promise<[R | null, any]>;
    subscribe: (l: Listener) => () => void;
    reset: () => void;
  };
  
  fn.set = (v: T) => store.set('value', v);
  fn.setTemp = (v: T, d?: number) => store.setTemp('value', v, d);
  fn.get = () => store.get().value;
  fn.async = <R = T>(p: Promise<any>, o?: AsyncOpts<R>) => store.asyncAction<R>('value', p, o);
  fn.subscribe = (l: Listener) => store.subscribe(l);
  fn.reset = store.reset;
  
  return fn;
}

// ============ RESOURCE ============
type ResourceOpts<T> = {
  key: keyof any;
  fetcher: () => Promise<any>;
  map?: (res: any) => T[];
};

export function createResource<T = any>(
  store: ReturnType<typeof createFullStore>,
  opts: ResourceOpts<T>
) {
  const { key, fetcher, map } = opts;

  const load = async () => {
    try {
      return await store.$async(key as any, fetcher(), {
        onSuccess: (res) => {
          const out = map ? map(res) : res;
          store.$data.set(Array.isArray(out) ? out : []);
        }
      });
    } catch (e) {
      return [null, e];
    }
  };

  const refetch = load;

  const filter = (fn: Middleware<any>, opKey?: string) => {
    store.$data.use(fn, opKey);
    return resourceApi;
  };

  const clear = () => {
    store.$data.clear();
    return resourceApi;
  };

  const page = (p: number, s: number) => store.$data.page(p, s);

  const resourceApi = {
    load,
    refetch,
    filter,
    clear,
    page,
    data: <R = T>() => store.useData<R>(),
    loading: () => store.$(`${String(key)}Loading` as any),
    error: () => store.$(`${String(key)}Error` as any),
  };

  return resourceApi;
}

// ============ EXPORTS ============
export type { Store, AsyncOpts };
export { shallowEqual, DataEngine };
export default createFullStore;