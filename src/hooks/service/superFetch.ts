// superFetch.ts - Complete Version with setData for Optimistic Updates
import { useState, useRef, useCallback, useEffect } from "react";

// ==================== TYPES ====================
export type SFOptions = {
  params?: Record<string, any>;
  data?: any;
  headers?: Record<string, string>;
  token?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  signal?: AbortSignal;
  cache?: RequestCache;
  responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData';
  baseURL?: string;
  onSuccess?: (d: any) => void;
  onError?: (e: any) => void;
  onFinally?: () => void;
  silent?: boolean;
  withCredentials?: boolean;
  mode?: RequestMode;
};

export type SFResponse<T = any> = {
  data?: T;
  status?: number;
  headers?: Headers;
  error?: string;
  success: boolean;
  config?: { method: string; url: string };
};

export class SFError extends Error {
  constructor(
    m: string,
    public status?: number,
    public code = "UNKNOWN",
    public response?: any,
    public config?: any
  ) {
    super(m);
    this.name = "SFError";
  }
  isAbort = () => this.code === "ABORT_ERROR" || this.name === "AbortError";
  isAuth = () => this.status === 401;
  isServer = () => this.status && this.status >= 500;
}

interface SFConfig extends SFOptions {
  method: string;
  url: string;
  _retryCount?: number;
  _preventRefresh?: boolean;
}

// ==================== INTERCEPTORS ====================
type ReqFn = (c: SFConfig) => SFConfig | Promise<SFConfig>;
type ResFn = (r: SFResponse) => SFResponse | Promise<SFResponse>;
type ErrFn = (e: any) => any | Promise<any>;

const interceptors = {
  req: [] as ReqFn[],
  res: [] as ResFn[],
  err: [] as ErrFn[],
  useReq: (fn: ReqFn) => {
    interceptors.req.push(fn);
    return () => { interceptors.req = interceptors.req.filter(f => f !== fn); };
  },
  useRes: (fn: ResFn, err?: ErrFn) => {
    interceptors.res.push(fn);
    err && interceptors.err.push(err);
    return () => {
      interceptors.res = interceptors.res.filter(f => f !== fn);
      err && (interceptors.err = interceptors.err.filter(e => e !== err));
    };
  },
  clear: () => { interceptors.req = []; interceptors.res = []; interceptors.err = []; }
};

// ==================== REFRESH QUEUE ====================
const refreshQueue = (() => {
  let busy = false;
  const q: { resolve: (v: any) => void; reject: (e: any) => void; fn: () => Promise<any>; }[] = [];
  return {
    enqueue: <T>(fn: () => Promise<SFResponse<T>>) =>
      new Promise<SFResponse<T>>((res, rej) => q.push({ fn: fn as any, resolve: res, reject: rej })),
    flush: async () => {
      while (q.length) {
        const { fn, resolve, reject } = q.shift()!;
        try { resolve(await fn()); } catch (e) { reject(e); }
      }
    },
    rejectAll: (err: any) => { 
      while (q.length) q.shift()!.reject(err);
      q.length = 0; // Clear queue
    },
    clear: () => { q.length = 0; busy = false; },
    get busy() { return busy; }, 
    set busy(v: boolean) { busy = v; }
  };
})();

// ==================== CONFIG ====================
const C = {
  BASE_URL: "",
  REFRESH_URL: "/auth/refresh",
  TOKEN_KEY: "access_token",
  TIMEOUT: 30000,
  MAX_RETRIES: 2,
  RETRY_DELAY: 600,
  SILENT: true,
  WITH_CRED: false,
  MODE: 'cors' as RequestMode,
};

// ==================== UTILS ====================
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// Improved qs function to handle nested objects and arrays
const qs = (p?: Record<string, any>) => {
  if (!p) return "";
  
  const entries = Object.entries(p)
    .filter(([, v]) => v != null && v !== '')
    .flatMap(([k, v]) => {
      // Handle nested objects and arrays
      if (Array.isArray(v)) {
        return v.map((item, index) => [`${k}[${index}]`, String(item)]);
      } else if (typeof v === 'object' && v !== null) {
        return Object.entries(v).map(([subKey, subValue]) => 
          [`${k}.${subKey}`, String(subValue)]
        );
      } else {
        return [[k, String(v)]];
      }
    });
  
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries).toString();
};

const mergeSignals = (...signals: AbortSignal[]): { signal: AbortSignal; cleanup: () => void } => {
  const controller = new AbortController();
  const abortHandler = () => {
    controller.abort();
    cleanup();
  };
  
  const cleanup = () => {
    signals.forEach(sig => sig.removeEventListener('abort', abortHandler));
  };

  signals.forEach(sig => {
    if (sig.aborted) {
      controller.abort();
      cleanup();
    } else {
      sig.addEventListener('abort', abortHandler);
    }
  });

  return { signal: controller.signal, cleanup };
};

const getToken = () => typeof localStorage !== 'undefined' ? localStorage.getItem(C.TOKEN_KEY) : null;
const setToken = (t: string) => typeof localStorage !== 'undefined' && localStorage.setItem(C.TOKEN_KEY, t);
const removeToken = () => typeof localStorage !== 'undefined' && localStorage.removeItem(C.TOKEN_KEY);

// ==================== CORE REQUEST ====================
async function coreRequest<T>(c: SFConfig): Promise<SFResponse<T>> {
  for (const fn of interceptors.req) c = await Promise.resolve(fn(c));

  let { method, url, baseURL = C.BASE_URL, params, data, headers = {}, 
        token = getToken() ?? undefined, timeout = C.TIMEOUT, maxRetries = C.MAX_RETRIES,
        retryDelay = C.RETRY_DELAY, signal: userSignal, responseType = 'json', 
        _preventRefresh, onSuccess, onError, onFinally, silent = C.SILENT,
        withCredentials = C.WITH_CRED, mode = C.MODE } = c;

  let attempt = 0;
  let completed = false;
  let fullUrl = '';

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    // FIX 1: Remove "timeout" argument as AbortController.abort() doesn't support arguments
    const timer = timeout ? setTimeout(() => !completed && controller.abort(), timeout) : null;
    
    const { signal: finalSignal, cleanup } = userSignal 
      ? mergeSignals(userSignal, controller.signal) 
      : { signal: controller.signal, cleanup: () => {} };

    try {
      fullUrl = url.startsWith("http") ? url : baseURL + url;
      const query = qs(params);
      if (query) fullUrl += (fullUrl.includes('?') ? '&' : '') + query.slice(1);

      let body: BodyInit | undefined, contentType: string | undefined;
      if (data instanceof FormData) body = data;
      else if (data instanceof URLSearchParams) { body = data; contentType = 'application/x-www-form-urlencoded'; }
      else if (method !== "GET" && method !== "HEAD" && data != null) { body = JSON.stringify(data); contentType = "application/json"; }

      const fetchHeaders = new Headers(headers);
      if (contentType) fetchHeaders.set("Content-Type", contentType);
      if (token && !url.startsWith("http")) fetchHeaders.set("Authorization", `Bearer ${token}`);

      const res = await fetch(fullUrl, { 
        method, headers: fetchHeaders, body, signal: finalSignal, 
        credentials: withCredentials ? 'include' : 'same-origin',
        cache: c.cache, mode,
      }).catch(err => { 
        throw new SFError(err.message, undefined, 'NETWORK_ERROR', undefined, { method, url: fullUrl }); 
      });

      if (timer) clearTimeout(timer);
      completed = true;

      let parsed: any;
      try {
        if (responseType === "blob") parsed = await res.blob();
        else if (responseType === "arrayBuffer") parsed = await res.arrayBuffer();
        else if (responseType === "formData") parsed = await res.formData();
        else if (responseType === "text") parsed = await res.text();
        else { 
          const text = await res.text(); 
          parsed = text ? JSON.parse(text) : null; 
        }
      } catch { parsed = null; }

      let response: SFResponse = { 
        success: res.ok, data: parsed, status: res.status, headers: res.headers, 
        error: res.ok ? undefined : (parsed?.message || parsed?.error || `HTTP ${res.status}`), 
        config: { method, url: fullUrl } 
      };

      for (const fn of interceptors.res) response = await Promise.resolve(fn(response));

      // Handle token refresh
      if (res.status === 401 && !_preventRefresh && !url.includes('/auth/refresh') && !url.startsWith("http")) {
        if (refreshQueue.busy) return refreshQueue.enqueue(() => coreRequest<T>({ ...c, _preventRefresh: true, _retryCount: 0 }));

        refreshQueue.busy = true;
        try {
          const refreshRes = await fetch(baseURL + C.REFRESH_URL, { 
            method: "POST", credentials: withCredentials ? 'include' : 'same-origin', 
            headers: { 'Content-Type': 'application/json' } 
          });
          if (!refreshRes.ok) throw new SFError("Refresh failed", refreshRes.status, "REFRESH_FAILED");
          const refreshData = await refreshRes.json();
          const newToken = refreshData.accessToken || refreshData.token || refreshData.access_token;
          if (!newToken) throw new SFError("No token", 500, "NO_TOKEN");
          setToken(newToken);
          const retry = await coreRequest<T>({ ...c, token: newToken, _preventRefresh: true, _retryCount: 0 });
          await refreshQueue.flush();
          return retry;
        } catch (e) { 
          refreshQueue.rejectAll(e); 
          removeToken(); 
          throw e; 
        } finally { 
          refreshQueue.busy = false; 
        }
      }

      if (!res.ok) throw new SFError(response.error || "Request failed", res.status, "HTTP_ERROR", parsed, { method, url: fullUrl });

      onSuccess?.(response.data); 
      onFinally?.();
      return response as SFResponse<T>;

    } catch (err: any) {
      if (timer) clearTimeout(timer);

      if (err.name === "AbortError" || err.message?.includes("aborted") || err.code === "ABORT_ERROR") {
        // Check if this was a timeout abort
        const isTimeout = err.message?.includes("timeout") || err.code === "TIMEOUT";
        const abortErr = new SFError(
          isTimeout ? "Request timeout" : "Request aborted", 
          undefined, 
          isTimeout ? "TIMEOUT" : "ABORT_ERROR"
        );
        abortErr.name = "AbortError";
        onError?.(abortErr); onFinally?.();
        throw abortErr;
      }

      if (err.code === 'NETWORK_ERROR' || err.message?.includes('fetch')) {
        const netErr = new SFError(`Network error: ${fullUrl || url}`, undefined, 'NETWORK_ERROR');
        onError?.(netErr); onFinally?.();
        throw netErr;
      }

      const shouldRetry = attempt < maxRetries && err?.status && err.status >= 500;
      if (shouldRetry) { attempt++; await delay(retryDelay * Math.pow(2, attempt) + Math.random() * 100); continue; }

      let finalErr: SFError = err instanceof SFError ? err : new SFError(err.message || "Error", err.status, "UNKNOWN", undefined, { method, url: fullUrl });
      for (const fn of interceptors.err) await Promise.resolve(fn(finalErr));
      onError?.(finalErr); onFinally?.();
      throw finalErr;
    } finally {
      cleanup();
    }
  }
  throw new SFError("Max retries exceeded");
}

// ==================== PUBLIC API ====================
export const sf = {
  get: <T>(u: string, o?: SFOptions) => coreRequest<T>({ method: "GET", url: u, ...o }),
  post: <T>(u: string, d?: any, o?: SFOptions) => coreRequest<T>({ method: "POST", url: u, data: d, ...o }),
  put: <T>(u: string, d?: any, o?: SFOptions) => coreRequest<T>({ method: "PUT", url: u, data: d, ...o }),
  patch: <T>(u: string, d?: any, o?: SFOptions) => coreRequest<T>({ method: "PATCH", url: u, data: d, ...o }),
  delete: <T>(u: string, o?: SFOptions) => coreRequest<T>({ method: "DELETE", url: u, ...o }),
  request: <T>(c: SFConfig) => coreRequest<T>(c),

  interceptors: { 
    request: { use: interceptors.useReq, clear: () => { interceptors.req = []; } },
    response: { use: interceptors.useRes, clear: () => { interceptors.res = []; interceptors.err = []; } },
    clear: interceptors.clear 
  },

  config: {
    baseURL: C.BASE_URL,
    timeout: C.TIMEOUT,
    maxRetries: C.MAX_RETRIES,
    retryDelay: C.RETRY_DELAY,
    silent: C.SILENT,
    withCredentials: C.WITH_CRED,
    mode: C.MODE,
    
    setBaseURL: (u: string) => C.BASE_URL = u,
    setRefreshURL: (u: string) => C.REFRESH_URL = u,
    setSilent: (s: boolean) => C.SILENT = s,
    setTimeout: (t: number) => C.TIMEOUT = t,
    setMaxRetries: (r: number) => C.MAX_RETRIES = r,
    setRetryDelay: (d: number) => C.RETRY_DELAY = d,
    setWithCredentials: (w: boolean) => C.WITH_CRED = w,
    setMode: (m: RequestMode) => C.MODE = m,
  },

  token: { get: getToken, set: setToken, remove: removeToken },
  createCancel: () => { const c = new AbortController(); return { signal: c.signal, cancel: () => c.abort() }; },
  clearQueue: () => refreshQueue.clear(),
};

// ==================== REACT HOOK WITH SETDATA ====================
export function useSF<T = any>() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<SFError | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  const execute = useCallback(async <R = T>(method: string, url: string, opts: SFOptions = {}): Promise<SFResponse<R>> => {
    abortRef.current?.abort();
    
    const controller = new AbortController();
    abortRef.current = controller;
    
    setLoading(true);
    setError(null);

    try {
      const res = await sf.request<R>({ method, url, signal: controller.signal, ...opts });
      
      if (mountedRef.current && !controller.signal.aborted) {
        if (res.success) {
          // FIX: Simplified type assertion
          setData(res.data as T ?? null);
          setError(null);
        } else {
          setError(new SFError(res.error || "Failed", res.status));
          setData(null);
        }
        setLoading(false);
      }
      
      return res;
    } catch (err: any) {
      if (mountedRef.current && !controller.signal.aborted) {
        setError(err instanceof SFError ? err : new SFError(err.message || "Failed", err.status));
        setData(null);
        setLoading(false);
      }
      
      if (err.name === "AbortError" || err.code === "ABORT_ERROR") {
        return { success: false, error: "Aborted" } as SFResponse<R>;
      }
      
      throw err;
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }, []);

  // Initialize array if needed for optimistic operations
  const ensureArray = useCallback((currentData: T | null): T | null => {
    if (currentData === null) {
      return [] as unknown as T;
    }
    return currentData;
  }, []);

  // Optimistic Update Helpers
  const optimisticUpdate = useCallback(<U = T>(
    updater: (currentData: T | null) => T | null,
    rollback?: () => void
  ) => {
    const previousData = data;
    setData(updater(data));
    
    return {
      rollback: () => setData(previousData),
      commit: () => {}, // For consistency
    };
  }, [data]);

  const optimisticAdd = useCallback(<U = T>(
    newItem: U,
    position: 'start' | 'end' = 'end'
  ) => {
    // FIX: Auto-initialize array if data is null
    const currentData = data === null ? [] : data;
    
    if (!Array.isArray(currentData)) {
      console.warn('optimisticAdd can only be used with array data');
      return { rollback: () => {} };
    }
    
    const previousData = data;
    const newData = position === 'start' 
      ? [newItem, ...currentData] as T
      : [...currentData, newItem] as T;
    
    setData(newData);
    
    return {
      rollback: () => setData(previousData),
    };
  }, [data]);

  const optimisticRemove = useCallback((index: number | ((item: any) => boolean)) => {
    // FIX: Auto-initialize array if data is null
    const currentData = data === null ? [] : data;
    
    if (!Array.isArray(currentData)) {
      console.warn('optimisticRemove can only be used with array data');
      return { rollback: () => {} };
    }
    
    const previousData = data;
    const predicate = typeof index === 'function' ? index : (_item: any, i: number) => i === index;
    const newData = currentData.filter((item, i) => !predicate(item, i)) as T;
    
    setData(newData);
    
    return {
      rollback: () => setData(previousData),
    };
  }, [data]);

  const optimisticUpdateItem = useCallback((
    index: number | ((item: any) => boolean),
    updater: (item: any) => any
  ) => {
    // FIX: Auto-initialize array if data is null
    const currentData = data === null ? [] : data;
    
    if (!Array.isArray(currentData)) {
      console.warn('optimisticUpdateItem can only be used with array data');
      return { rollback: () => {} };
    }
    
    const previousData = data;
    const predicate = typeof index === 'function' ? index : (_item: any, i: number) => i === index;
    
    const newData = currentData.map((item, i) => 
      predicate(item, i) ? updater(item) : item
    ) as T;
    
    setData(newData);
    
    return {
      rollback: () => setData(previousData),
    };
  }, [data]);

  const resetData = useCallback(() => setData(null), []);
  const resetError = useCallback(() => setError(null), []);
  const resetAll = useCallback(() => { setData(null); setError(null); setLoading(false); }, []);
  const cancel = useCallback(() => { abortRef.current?.abort(); abortRef.current = null; }, []);

  // Helper to initialize data as array
  const initArray = useCallback(() => {
    if (data === null) {
      setData([] as unknown as T);
    }
    return data as T & any[];
  }, [data]);

  return {
    // State
    loading, 
    data, 
    error,
    
    // State setters (for optimistic updates)
    setData,
    
    // Derived state
    isError: !!error,
    isEmpty: !loading && !error && (!data || (Array.isArray(data) && !data.length)),
    isSuccess: !loading && !error && !!data,
    
    // CRUD operations
    execute,
    get: useCallback(<R = T>(u: string, o?: SFOptions) => execute<R>("GET", u, o), [execute]),
    post: useCallback(<R = T>(u: string, d?: any, o?: SFOptions) => execute<R>("POST", u, { ...o, data: d }), [execute]),
    put: useCallback(<R = T>(u: string, d?: any, o?: SFOptions) => execute<R>("PUT", u, { ...o, data: d }), [execute]),
    patch: useCallback(<R = T>(u: string, d?: any, o?: SFOptions) => execute<R>("PATCH", u, { ...o, data: d }), [execute]),
    delete: useCallback(<R = T>(u: string, o?: SFOptions) => execute<R>("DELETE", u, o), [execute]),
    
    // Optimistic update helpers
    optimistic: {
      update: optimisticUpdate,
      add: optimisticAdd,
      remove: optimisticRemove,
      updateItem: optimisticUpdateItem,
    },
    
    // Array helpers
    initArray,
    
    // Reset functions
    resetData, 
    resetError, 
    resetAll,
    
    // Cancel
    cancel,
  };
}

// ==================== GLOBAL HANDLER ====================
sf.interceptors.response.use(
  r => r,
  e => { 
    if (e.name !== "AbortError" && !C.SILENT) console.error(`❌ ${e.config?.method} ${e.config?.url}:`, e.message);
    return Promise.reject(e);
  }
);

// ==================== HELPER API FACTORY ====================
export const api = (baseURL: string) => ({
  get: async <T = any>(url: string, options?: SFOptions) => 
    await sf.get<T>(`${baseURL}/${url.replace(/^\//, '')}`, options),
  
  post: async <T = any>(url: string, data?: any, options?: SFOptions) => 
    await sf.post<T>(`${baseURL}/${url.replace(/^\//, '')}`, data, options),
  
  put: async <T = any>(url: string, data?: any, options?: SFOptions) => 
    await sf.put<T>(`${baseURL}/${url.replace(/^\//, '')}`, data, options),
  
  patch: async <T = any>(url: string, data?: any, options?: SFOptions) => 
    await sf.patch<T>(`${baseURL}/${url.replace(/^\//, '')}`, data, options),
  
  delete: async <T = any>(url: string, options?: SFOptions) => 
    await sf.delete<T>(`${baseURL}/${url.replace(/^\//, '')}`, options),
  
  getAll: async <T = any>(url: string, options?: SFOptions) => 
    await sf.get<T>(`${baseURL}/${url.replace(/^\//, '')}`, options),
  
  postData: async <T = any>(url: string, data: any, options?: SFOptions) => 
    await sf.post<T>(`${baseURL}/${url.replace(/^\//, '')}`, data, options),
  
  putData: async <T = any>(url: string, data: any, options?: SFOptions) => 
    await sf.put<T>(`${baseURL}/${url.replace(/^\//, '')}`, data, options),
  
  patchData: async <T = any>(url: string, data: any, options?: SFOptions) => 
    await sf.patch<T>(`${baseURL}/${url.replace(/^\//, '')}`, data, options),
  
  deleteData: async <T = any>(url: string, options?: SFOptions) => 
    await sf.delete<T>(`${baseURL}/${url.replace(/^\//, '')}`, options),
});

// ==================== DEFAULT EXPORT ====================
export default sf;