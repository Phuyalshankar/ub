// map-ultimate.ts - Final Version (पुरानो code नबिगारी update)

import { useSyncExternalStore, useCallback, useRef } from 'react';

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
  signal?: AbortController;
  trackId?: string | number;      // ✅ यो मात्र थपियो
  isDelete?: boolean;
  isUpdate?: boolean;
};

type Middleware<T> = (src: T[], idx: number[]) => number[];

// API Types
type ApiRequestOptions = RequestInit & { timeout?: number };
type ApiInstance = {
  request: <R = any>(url: string, options?: ApiRequestOptions) => Promise<R>;
  get: <R = any>(url: string, options?: ApiRequestOptions) => Promise<R>;
  post: <R = any>(url: string, data?: any, options?: ApiRequestOptions) => Promise<R>;
  put: <R = any>(url: string, data?: any, options?: ApiRequestOptions) => Promise<R>;
  patch: <R = any>(url: string, data?: any, options?: ApiRequestOptions) => Promise<R>;
  delete: <R = any>(url: string, options?: ApiRequestOptions) => Promise<R>;
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

// ============ OPTIMIZED DATA ENGINE ============
class DataEngine<T extends Record<string, any> = any> {
  private _src: T[];
  private _filtered: T[] | null = null;
  private _filters = new Map<string, (item: T) => boolean>();
  private _sortFn: ((a: T, b: T) => number) | null = null;
  private _version: number = 0;

  constructor(initialData: T[] = []) { 
    this._src = [...initialData]; 
  }

  private _update() { 
    this._filtered = null; 
    this._version++; 
  }
  
  getVersion() { return this._version; }

  // ========== FILTERS ==========
  search(term: string, fields: (keyof T)[] = []) {
    if (!term) {
      this._filters.delete('search');
    } else {
      const t = term.toLowerCase();
      this._filters.set('search', item => {
        const keys = fields.length ? fields : Object.keys(item) as (keyof T)[];
        return keys.some(k => String(item[k] || '').toLowerCase().includes(t));
      });
    }
    this._update(); 
    return this;
  }

  filter(field: keyof T, value: any) {
    const key = `filter_${String(field)}`;
    if (value === undefined || value === null) {
      this._filters.delete(key);
    } else {
      this._filters.set(key, item => item[field] === value);
    }
    this._update(); 
    return this;
  }

  range(field: keyof T, min: number, max: number) {
    const key = `range_${String(field)}`;
    this._filters.set(key, item => {
      const v = item[field];
      return v != null && Number(v) >= min && Number(v) <= max;
    });
    this._update(); 
    return this;
  }

  sort(field: keyof T, asc: boolean = true) {
    this._sortFn = (a, b) => {
      const va = a[field], vb = b[field];
      if (va == null && vb == null) return 0;
      if (va == null) return asc ? 1 : -1;
      if (vb == null) return asc ? -1 : 1;
      
      if (typeof va === 'number' && typeof vb === 'number') {
        return asc ? va - vb : vb - va;
      }
      return String(va).localeCompare(String(vb)) * (asc ? 1 : -1);
    };
    this._update(); 
    return this;
  }

  clearFilters() {
    this._filters.clear();
    this._sortFn = null;
    this._update(); 
    return this;
  }

  // ========== CRUD ==========
  get(): T[] {
    if (!this._filtered) {
      let data = this._src;
      
      // Apply filters
      for (const fn of this._filters.values()) {
        data = data.filter(fn);
      }
      
      // Apply sort
      if (this._sortFn) {
        data = [...data].sort(this._sortFn);
      }
      
      this._filtered = data;
    }
    return this._filtered;
  }

  add(item: T): this {
    this._src = [...this._src, item];
    this._update(); 
    return this;
  }

  push(...items: T[]): this {
    this._src = [...this._src, ...items];
    this._update(); 
    return this;
  }
  
  updateById(id: any, updates: Partial<T>, key: string = 'id'): this {
    this._src = this._src.map(item => 
      item[key] === id ? { ...item, ...updates } : item
    );
    this._update(); 
    return this;
  }

  removeById(id: any, key: string = 'id'): this {
    this._src = this._src.filter(item => item[key] !== id);
    this._update(); 
    return this;
  }

  update(index: number, updates: Partial<T>): this {
    if (index >= 0 && index < this._src.length) {
      this._src = this._src.map((item, i) => 
        i === index ? { ...item, ...updates } : item
      );
    }
    this._update(); 
    return this;
  }

  remove(predicate: (item: T, index: number) => boolean): this {
    this._src = this._src.filter((item, i) => !predicate(item, i));
    this._update(); 
    return this;
  }

  setSource(newData: T[]): this { 
    this._src = [...newData]; 
    this._update(); 
    return this; 
  }

  clear(): this {
    this._filters.clear();
    this._sortFn = null;
    this._update(); 
    return this;
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

  get length() { return this.get().length; }
  get total() { return this._src.length; }
}

// ============ FILTERS ============
export const Filters = {
  by: <T extends Record<string, any>>(field: keyof T, value: any) => 
    (src: T[], idx: number[]): number[] => idx.filter(i => src[i]?.[field] === value),
  
  range: <T extends Record<string, any>>(field: keyof T, min: number, max: number) => 
    (src: T[], idx: number[]): number[] => idx.filter(i => {
      const v = src[i]?.[field];
      return v != null && Number(v) >= min && Number(v) <= max;
    }),
  
  search: <T extends Record<string, any>>(term: string = '', fields: (keyof T)[] = []) => {
    if (!term) return (_: T[], idx: number[]): number[] => idx;
    const t = term.toLowerCase();
    return (src: T[], idx: number[]): number[] => idx.filter(i => {
      const item = src[i];
      const keys = fields.length ? fields : Object.keys(item) as (keyof T)[];
      return keys.some(k => String(item[k] || '').toLowerCase().includes(t));
    });
  },
  
  sort: <T extends Record<string, any>>(field: keyof T, asc: boolean = true) => 
    (src: T[], idx: number[]): number[] => [...idx].sort((a, b) => {
      const va = src[a]?.[field], vb = src[b]?.[field];
      if (va == null && vb == null) return 0;
      if (va == null) return asc ? 1 : -1;
      if (vb == null) return asc ? -1 : 1;
      if (typeof va === 'number' && typeof vb === 'number') {
        return asc ? va - vb : vb - va;
      }
      return String(va).localeCompare(String(vb)) * (asc ? 1 : -1);
    })
};

// ============ ASYNC ACTION WITH ID TRACKING ============
function createAsyncAction<T extends Record<string, any>>(store: Store<T>) {
  const reqs = new Map<string, AbortController>();
  let counter = 0;
  
  return async <R = any, K extends keyof T = keyof T>(
    key: K, 
    promise: Promise<any>, 
    options: AsyncOpts<R> = {}
  ): Promise<[R | null, any]> => {
    const kid = String(key);
    const lKey = `${kid}Loading` as keyof T;
    const eKey = `${kid}Error` as keyof T;
    
    // ✅ ID Tracking - पहिले नै ट्र्याकिङमा राख्ने (ग्लोबल लोडर नबाली)
    if (options.trackId) {
      const trackKey = `${kid}_tracking`;
      const current = (store.get() as any)[trackKey] || [];
      (store as any).set(trackKey, [...current, options.trackId]);
    } else {
      // ✅ यदि trackId छैन भने मात्र ग्लोबल लोडर बाल्ने (पुरानो व्यवहार)
      store.set(lKey, true as any);
    }
    
    // Previous request cancel
    if (reqs.has(kid)) {
      reqs.get(kid)?.abort();
      reqs.delete(kid);
    }
    
    const abortCtrl = options.signal || new AbortController();
    reqs.set(kid, abortCtrl);
    
    store.set(eKey, null as any);
    
    try {
      const response = await promise;
      
      // ✅ Success - ID लाई ट्र्याकिङबाट हटाउने
      if (options.trackId) {
        const trackKey = `${kid}_tracking`;
        const current = (store.get() as any)[trackKey] || [];
        (store as any).set(trackKey, current.filter((id: any) => id !== options.trackId));
      } else {
        // ✅ trackId छैन भने मात्र लोडर बन्द गर्ने
        store.set(lKey, false as any);
      }
      
      // BUG FIX: Delete/Update action मा data replace नगर्ने
      const shouldReplaceData = !options.isDelete && !options.isUpdate;
      
      if (shouldReplaceData && response?.data) {
        store.set(key, response.data);
      } else if (shouldReplaceData && Array.isArray(response)) {
        store.set(key, response as any);
      }
      
      store.set(eKey, null as any);
      reqs.delete(kid);
      options.onSuccess?.(response);
      options.onSettled?.();
      return [response, null];
    } catch (err: any) {
      // ✅ Error - ID लाई ट्र्याकिङबाट हटाउने
      if (options.trackId) {
        const trackKey = `${kid}_tracking`;
        const current = (store.get() as any)[trackKey] || [];
        (store as any).set(trackKey, current.filter((id: any) => id !== options.trackId));
      } else {
        // ✅ trackId छैन भने मात्र लोडर बन्द गर्ने
        store.set(lKey, false as any);
      }
      
      store.set(eKey, err?.message || 'Error' as any);
      reqs.delete(kid);
      options.onError?.(err);
      options.onSettled?.();
      return [null, err];
    }
  };
}

// ============ MAIN STORE ============
export function createFullStore<T extends Record<string, any>>(initial: T) {
  // Add tracking fields to state (पुरानो state नबिगारी)
  const initialState = {
    ...initial
    // _tracking छुट्टै राख्नु पर्दैन, यो dynamically बन्छ
  };
  
  let state = { ...initialState };
  const listeners = new Set<Listener>();
  const timeouts = new Map<keyof T, any>();
  const batchSet = new Set<keyof T>();
  let batching = false;
  
  const dataEngine = new DataEngine(initial.data || []);
  let dataVersion = 0;

  const notify = () => { for (const l of listeners) try { l(); } catch {} };
  
  const batchNotify = () => {
    if (batching) return;
    batching = true;
    queueMicrotask(() => { 
      batching = false; 
      if (batchSet.size) { batchSet.clear(); notify(); } 
    });
  };

  const subscribe = (l: Listener) => {
    listeners.add(l);
    return () => listeners.delete(l);
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
    if (changed) { state = n; batchNotify(); }
  };
  
  const get = () => state;
  
  const reset = () => {
    timeouts.forEach(t => clearTimeout(t));
    timeouts.clear();
    state = { ...initialState };
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

  // ============ DATA API ============
  const data = {
    // Core methods
    get: <R = any>(): R[] => dataEngine.get() as R[],
    page: (p: number, s: number) => dataEngine.page(p, s),
    push: (...items: any[]) => { dataEngine.push(...items); triggerDataUpdate(); return data; },
    remove: (pred: (item: any, i: number) => boolean) => { dataEngine.remove(pred); triggerDataUpdate(); return data; },
    update: (idx: number, up: any) => { dataEngine.update(idx, up); triggerDataUpdate(); return data; },
    set: (src: any[]) => { dataEngine.setSource(src); triggerDataUpdate(); return data; },
    clear: () => { dataEngine.clear(); triggerDataUpdate(); return data; },
    
    // SUPER EASY FILTERS
    search: (term: string, fields?: string[]) => { dataEngine.search(term, fields as any); triggerDataUpdate(); return data; },
    filter: (field: string, value: any) => { dataEngine.filter(field as any, value); triggerDataUpdate(); return data; },
    range: (field: string, min: number, max: number) => { dataEngine.range(field as any, min, max); triggerDataUpdate(); return data; },
    sort: (field: string, asc: boolean = true) => { dataEngine.sort(field as any, asc); triggerDataUpdate(); return data; },
    clearFilters: () => { dataEngine.clearFilters(); triggerDataUpdate(); return data; },
    
    // ID-based CRUD
    add: (item: any) => { dataEngine.add(item); triggerDataUpdate(); return data; },
    updateById: (id: any, updates: any, key: string = 'id') => { dataEngine.updateById(id, updates, key); triggerDataUpdate(); return data; },
    deleteById: (id: any, key: string = 'id') => { dataEngine.removeById(id, key); triggerDataUpdate(); return data; },
    
    // Shortcuts
    $search: function(t: string) { return this.search(t); },
    $filter: function(f: string, v: any) { return this.filter(f, v); },
    $sort: function(f: string, a?: boolean) { return this.sort(f, a); },
    $clear: function() { return this.clearFilters(); },
    $add: function(i: any) { return this.add(i); },
    $up: function(id: any, up: any) { return this.updateById(id, up); },
    $del: function(id: any) { return this.deleteById(id); },
    
    get length() { return dataEngine.length; },
    get total() { return dataEngine.total; }
  };

  // ============ REACT HOOKS ============
  const use = <K extends keyof T>(k: K): T[K] => {
    const ref = useRef(k); ref.current = k;
    return useSyncExternalStore(
      subscribe,
      () => state[ref.current],
      () => initial[ref.current]
    );
  };
  
  const useStore = <R = T>(sel?: (state: T) => R): R => {
    const ref = useRef(sel); ref.current = sel;
    return useSyncExternalStore(
      subscribe,
      () => ref.current ? ref.current(state) : state as any,
      () => ref.current ? ref.current(initial) : initial as any
    );
  };
  
  const useData = <R = any>(): R[] => {
    useSyncExternalStore(subscribe, () => dataVersion, () => dataVersion);
    return dataEngine.get() as R[];
  };

  const usePath = (path: string): any => {
    const p = useRef(path); p.current = path;
    return useSyncExternalStore(
      subscribe,
      () => path.split('.').reduce((o: any, k) => o?.[k], state),
      () => path.split('.').reduce((o: any, k) => o?.[k], initial)
    );
  };
  
  const usePick = (...paths: string[]): Record<string, any> => {
    const pRef = useRef(paths); pRef.current = paths;
    const get = (src: any) => {
      const r: any = {};
      for (const p of pRef.current) {
        r[p] = p.includes('.') ? p.split('.').reduce((o: any, k) => o?.[k], src) : src[p];
      }
      return r;
    };
    const val = useSyncExternalStore(subscribe, () => get(state), () => get(initial));
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
  
  // ✅ ID Tracking Hooks - Type Safe
  const useTracking = (key: string, id: string | number): boolean => {
    return useSyncExternalStore(
      subscribe,
      () => {
        const trackKey = `${key}_tracking`;
        const tracking = (state as any)[trackKey];
        return Array.isArray(tracking) ? tracking.includes(id) : false;
      },
      () => false
    );
  };

  const isProcessing = (key: string, id: string | number): boolean => {
    const trackKey = `${key}_tracking`;
    const tracking = (state as any)[trackKey];
    return Array.isArray(tracking) ? tracking.includes(id) : false;
  };
  
  // ============ PERSIST ============
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
        try { setMany(JSON.parse(saved)); opts?.onSuccess?.(); } catch {}
      }
    } catch (e) { opts?.onError?.(e as Error); }
    
    let tid: any = null;
    let pending: T | null = null;
    let saving = false;
    
    const save = () => {
      if (saving) return;
      pending = state;
      if (tid) clearTimeout(tid);
      tid = setTimeout(() => {
        saving = true;
        try { if (pending) st.setItem(key, JSON.stringify(pending)); } 
        catch (e) { opts?.onError?.(e as Error); } 
        finally { saving = false; pending = null; tid = null; }
      }, opts?.throttle ?? 1000);
    };
    
    const unsub = subscribe(save);
    return () => { unsub(); if (tid) { clearTimeout(tid); if (pending) try { st.setItem(key, JSON.stringify(pending)); } catch {} } };
  };
  
  const persistWithRetry = (key: string, retries = 3) => {
    let attempt = 0;
    let unsub: (() => void) | null = null;
    
    const tryPersist = (): boolean => {
      try {
        unsub = persist(key, {
          onError: () => { if (attempt++ < retries) setTimeout(tryPersist, 1000 * Math.pow(2, attempt)); }
        });
        return true;
      } catch {
        if (attempt++ < retries) { setTimeout(tryPersist, 1000 * Math.pow(2, attempt)); return false; }
        return false;
      }
    };
    
    tryPersist();
    return unsub || (() => {});
  };
  
  // ============ API ============
  const api: ApiInstance = {
    request: async <R = any>(url: string, opts: ApiRequestOptions = {}): Promise<R> => {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), opts.timeout || 30000);
      try {
        const { token, refreshToken } = get();
        let res = await fetch(url, { 
          ...opts, 
          headers: { 'Content-Type': 'application/json', ...opts.headers, ...(token && { Authorization: `Bearer ${token}` }) }, 
          signal: ctrl.signal 
        });
        
        if (res.status === 401 && refreshToken) {
          const refreshRes = await fetch('/api/refresh', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ refreshToken }) 
          });
          if (refreshRes.ok) {
            const { token: newToken } = await refreshRes.json();
            set('token', newToken as any);
            localStorage?.setItem('token', newToken);
            return api.request(url, opts);
          }
        }
        
        if (!res.ok) {
          const error = await res.json().catch(() => ({ message: res.statusText }));
          throw error;
        }
        
        return res.json();
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

  const storeInst: Store<T> = { get, set, setMany, subscribe };
  const asyncAction = createAsyncAction(storeInst);

  const storeInstance = {
    // Core
    get, set, setMany, reset, subscribe,
    setTemp,
    use, useStore, useData, usePath, usePick,
    bind, useBind,
    persist, persistWithRetry,
    asyncAction, superFetch, api,
    computed,
    
    // Data engine
    data,
    
    // ✅ ID Tracking - Type Safe
    useTracking,
    isProcessing,
    
    // Shortcuts
    $: use,
    $$: usePick,
    $path: usePath,
    $temp: setTemp,
    $async: asyncAction,
    $data: data,
    $track: useTracking,
    $isProcessing: isProcessing,
    
    // Debug
    ...(process.env.NODE_ENV === 'development' ? {
      _debug: { getState: get, listeners: () => listeners.size, dataVersion: () => dataVersion }
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
    useTracking: (id: string | number) => boolean;
    isProcessing: (id: string | number) => boolean;
  };
  
  fn.set = (v: T) => store.set('value', v);
  fn.setTemp = (v: T, d?: number) => store.setTemp('value', v, d);
  fn.get = () => store.get().value;
  fn.async = <R = T>(p: Promise<any>, o?: AsyncOpts<R>) => store.asyncAction<R>('value', p, o);
  fn.subscribe = (l: Listener) => store.subscribe(l);
  fn.reset = store.reset;
  fn.useTracking = (id: string | number) => store.useTracking('value', id);
  fn.isProcessing = (id: string | number) => store.isProcessing('value', id);
  
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
  const keyStr = String(key);

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

  const page = (p: number, s: number) => store.$data.page(p, s);

  const useTracking = (id: string | number) => store.useTracking(keyStr, id);
  const isProcessing = (id: string | number) => store.isProcessing(keyStr, id);

  const resourceApi = {
    load,
    refetch,
    page,
    data: <R = T>() => store.useData<R>(),
    loading: () => store.$(keyStr + 'Loading' as any),
    error: () => store.$(keyStr + 'Error' as any),
    
    // ✅ ID Tracking
    useTracking,
    isProcessing,
    
    // Shortcuts
    $track: useTracking,
    $processing: isProcessing,
  };

  return resourceApi;
}

// ============ EXPORTS ============
export type { Store, AsyncOpts };
export { shallowEqual, DataEngine };
export default createFullStore; 
