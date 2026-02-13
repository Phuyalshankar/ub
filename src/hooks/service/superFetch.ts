import { useState, useCallback, useRef, useEffect } from "react";

/* =========================
    1. TYPES & CONFIG
   ========================= */
export type SuperFetchOptions = {
  data?: any;
  params?: Record<string, any>;
  token?: string;
  onRefresh?: (newToken: string) => void;
  retry?: number;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  headers?: Record<string, string>;
  cache?: RequestCache;
  _refreshed?: boolean;
  baseURL?: string;
  responseType?: 'json' | 'text';
  signal?: AbortSignal;
};

export type APIResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
  headers?: Headers;
};

// ADDED: Custom Error Class
export class SuperFetchError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public data?: any
  ) {
    super(message);
    this.name = 'SuperFetchError';
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SuperFetchError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code,
      data: this.data,
      stack: this.stack
    };
  }
}

const CONFIG = {
  BASE_URL: "https://api.yourdomain.com",
  ENDPOINTS: {
    REFRESH: "/api/auth/refresh",
  },
  STORAGE_KEYS: {
    ACCESS: "access_token",
  }
};

/* =========================
    2. REQUEST QUEUE FOR TOKEN REFRESH
   ========================= */
type QueuedRequest<T> = {
  resolve: (value: APIResponse<T>) => void;
  reject: (reason: any) => void;
  method: string;
  url: string;
  options: SuperFetchOptions;
};

class RequestQueue {
  private static instance: RequestQueue;
  private isRefreshing = false;
  private queue: QueuedRequest<any>[] = [];

  static getInstance(): RequestQueue {
    if (!RequestQueue.instance) {
      RequestQueue.instance = new RequestQueue();
    }
    return RequestQueue.instance;
  }

  add<T>(request: QueuedRequest<T>) {
    this.queue.push(request);
  }

  clear() {
    this.queue = [];
  }

  retryAll() {
    const requests = [...this.queue];
    this.clear();
    requests.forEach(({ resolve, reject, method, url, options }) => {
      superfetch(method, url, options).then(resolve).catch(reject);
    });
  }

  getQueueLength() {
    return this.queue.length;
  }

  setIsRefreshing(value: boolean) {
    this.isRefreshing = value;
  }

  getIsRefreshing() {
    return this.isRefreshing;
  }
}

/* =========================
    3. CORE ENGINE (WITH REQUEST QUEUE)
   ========================= */
export async function superfetch<T = any>(
  method: string,
  url: string,
  opt: SuperFetchOptions = {}
): Promise<APIResponse<T>> {
  const {
    data,
    token,
    onRefresh,
    params,
    retry = 0,
    maxRetries = 2,
    retryDelay = 800,
    timeout = 20000,
    headers = {},
    cache,
    _refreshed,
    baseURL = CONFIG.BASE_URL,
    responseType = 'json',
    signal: externalSignal,
  } = opt;

  // Create abort controller (only if not provided externally)
  const internalController = new AbortController();
  const internalSignal = internalController.signal;
  
  // Use external signal if provided, otherwise internal
  const finalSignal = externalSignal || internalSignal;
  
  const timer = setTimeout(() => internalController.abort(), timeout);

  // 🛠 URL Building & Query Params
  let finalUrl = url.startsWith("http") ? url : `${baseURL}${url}`;
  
  if (params) {
    const queryString = new URLSearchParams(
      Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)])
    ).toString();
    if (queryString) {
      finalUrl += finalUrl.includes("?") ? `&${queryString}` : `?${queryString}`;
    }
  }

  try {
    // Prepare request body (support FormData)
    let body: BodyInit | undefined;
    let contentType = 'application/json';
    
    if (data instanceof FormData) {
      body = data;
    } else if (method !== "GET" && data !== undefined) {
      body = JSON.stringify(data);
    }

    const res = await fetch(finalUrl, {
      method: method.toUpperCase(),
      signal: finalSignal,
      cache,
      headers: {
        ...(contentType && !(data instanceof FormData) && { 'Content-Type': contentType }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
      body,
      credentials: "include",
    });

    // Parse response based on responseType
    let parsed: any = null;
    let responseText = "";
    
    if (responseType === 'text') {
      responseText = await res.text();
      parsed = responseText;
    } else {
      responseText = await res.text();
      try { 
        parsed = responseText ? JSON.parse(responseText) : null; 
      } catch { 
        parsed = { message: responseText || "Invalid JSON" }; 
      }
    }

    // 🔁 AUTO TOKEN REFRESH WITH REQUEST QUEUE
    if (res.status === 401 && !_refreshed) {
      const queue = RequestQueue.getInstance();
      
      // If refresh is already in progress, queue this request
      if (queue.getIsRefreshing()) {
        return new Promise((resolve, reject) => {
          queue.add({
            resolve,
            reject,
            method,
            url,
            options: { ...opt, _refreshed: true }
          });
        });
      }
      
      // Start refresh process
      queue.setIsRefreshing(true);
      
      try {
        const refreshRes = await fetch(`${baseURL}${CONFIG.ENDPOINTS.REFRESH}`, {
          method: "POST",
          credentials: "include",
          signal: finalSignal, // Pass the same signal to abort refresh if original request aborts
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const accessToken = refreshData.accessToken || refreshData.token;
          
          if (accessToken) {
            localStorage.setItem(CONFIG.STORAGE_KEYS.ACCESS, accessToken);
            onRefresh?.(accessToken);
            
            // Retry original request with new token
            const result = await superfetch<T>(method, url, { 
              ...opt, 
              token: accessToken, 
              _refreshed: true 
            });
            
            // Retry all queued requests
            queue.retryAll();
            return result;
          }
        }
        
        // If refresh failed, clear queue and reject all requests
        const requests = queue.getQueueLength();
        queue.clear();
        throw new SuperFetchError(
          `Token refresh failed. ${requests} queued requests cancelled.`,
          401,
          'REFRESH_FAILED'
        );
        
      } catch (refreshError) {
        queue.setIsRefreshing(false);
        queue.clear();
        
        if (refreshError instanceof SuperFetchError) {
          throw refreshError;
        }
        
        throw new SuperFetchError(
          'Token refresh failed',
          401,
          'REFRESH_ERROR',
          refreshError
        );
      } finally {
        queue.setIsRefreshing(false);
      }
    }

    // Handle Error Status Codes with Custom Error
    if (!res.ok) {
      const error = new SuperFetchError(
        parsed?.message || parsed?.error || `Error ${res.status}`,
        res.status,
        parsed?.code,
        parsed
      );
      
      return { 
        success: false, 
        status: res.status, 
        headers: res.headers,
        error: error.message 
      };
    }

    // Success Return
    return { 
      success: true, 
      status: res.status, 
      headers: res.headers,
      data: parsed as T 
    };

  } catch (e: any) {
    // 🔄 Retry Logic on Network Failure
    if (retry < maxRetries && e.name !== "AbortError" && e.code !== 'REFRESH_FAILED') {
      const backoff = retryDelay * Math.pow(2, retry);
      await new Promise((r) => setTimeout(r, backoff));
      return superfetch<T>(method, url, { ...opt, retry: retry + 1 });
    }
    
    // Throw custom error for better debugging
    if (e instanceof SuperFetchError) {
      return { 
        success: false, 
        error: e.message,
        status: e.status
      };
    }
    
    const error = new SuperFetchError(
      e.name === "AbortError" ? "Request cancelled" : e.message || "Network error",
      undefined,
      e.name === "AbortError" ? 'ABORTED' : 'NETWORK_ERROR'
    );
    
    return { 
      success: false, 
      error: error.message 
    };
  } finally {
    clearTimeout(timer);
  }
}

/* =========================
    4. SF WRAPPERS
   ========================= */
const getDefaults = () => ({
  token: localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS) || undefined,
  onRefresh: (newToken: string) => localStorage.setItem(CONFIG.STORAGE_KEYS.ACCESS, newToken),
});

// ADDED: Type for createSF instance
export interface SFInstance {
  get: <T = any>(url: string, opt?: SuperFetchOptions) => Promise<APIResponse<T>>;
  post: <T = any>(url: string, data?: any, opt?: SuperFetchOptions) => Promise<APIResponse<T>>;
  put: <T = any>(url: string, data?: any, opt?: SuperFetchOptions) => Promise<APIResponse<T>>;
  patch: <T = any>(url: string, data?: any, opt?: SuperFetchOptions) => Promise<APIResponse<T>>;
  delete: <T = any>(url: string, opt?: SuperFetchOptions) => Promise<APIResponse<T>>;
  request: <T = any>(config: { method: string; url: string } & SuperFetchOptions) => Promise<APIResponse<T>>;
}

export function createSF(baseURL?: string, defaultOptions?: Partial<SuperFetchOptions>): SFInstance {
  const defaults = {
    ...getDefaults(),
    baseURL,
    ...defaultOptions,
  };

  return {
    get: <T = any>(url: string, opt?: SuperFetchOptions) => 
      superfetch<T>("GET", url, { ...defaults, ...opt }),
    
    post: <T = any>(url: string, data?: any, opt?: SuperFetchOptions) => 
      superfetch<T>("POST", url, { ...defaults, ...opt, data }),
    
    put: <T = any>(url: string, data?: any, opt?: SuperFetchOptions) => 
      superfetch<T>("PUT", url, { ...defaults, ...opt, data }),
    
    patch: <T = any>(url: string, data?: any, opt?: SuperFetchOptions) => 
      superfetch<T>("PATCH", url, { ...defaults, ...opt, data }),
    
    delete: <T = any>(url: string, opt?: SuperFetchOptions) => 
      superfetch<T>("DELETE", url, { ...defaults, ...opt }),
    
    request: <T = any>(config: { method: string; url: string } & SuperFetchOptions) =>
      superfetch<T>(config.method, config.url, { ...defaults, ...config }),
  };
}

// Default instance
export const sf = createSF(CONFIG.BASE_URL);

/* =========================
    5. REACT HOOKS (IMPROVED)
   ========================= */
export function useSuperFetch<T = any>(defaultOptions?: SuperFetchOptions) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<SuperFetchError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (
    method: string, 
    url: string, 
    options?: SuperFetchOptions
  ): Promise<APIResponse<T>> => {
    // Cancel previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const res = await superfetch<T>(method, url, {
        ...getDefaults(),
        ...defaultOptions,
        ...options,
        signal: abortRef.current.signal,
      });

      if (res.success) {
        setData(res.data || null);
      } else {
        const apiError = new SuperFetchError(
          res.error || "Something went wrong",
          res.status,
          'API_ERROR'
        );
        setError(apiError);
      }

      return res;
    } catch (err: any) {
      const errorMsg = err.message || "Request failed";
      const apiError = err instanceof SuperFetchError 
        ? err 
        : new SuperFetchError(errorMsg, undefined, 'REQUEST_FAILED');
      
      setError(apiError);
      return { success: false, error: errorMsg, status: apiError.status };
    } finally {
      setLoading(false);
    }
  }, [defaultOptions]);

  // Convenience methods
  const get = useCallback((url: string, options?: SuperFetchOptions) => 
    run("GET", url, options), [run]);

  const post = useCallback((url: string, data?: any, options?: SuperFetchOptions) => 
    run("POST", url, { ...options, data }), [run]);

  const put = useCallback((url: string, data?: any, options?: SuperFetchOptions) => 
    run("PUT", url, { ...options, data }), [run]);

  const del = useCallback((url: string, options?: SuperFetchOptions) => 
    run("DELETE", url, options), [run]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  return { 
    run, 
    get, 
    post, 
    put, 
    delete: del,
    loading, 
    data, 
    error,
    reset 
  };
}

export function useAPI<T = any>(url: string, method: string = "GET", options?: SuperFetchOptions) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<SuperFetchError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (callOptions?: SuperFetchOptions) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    
    setLoading(true);
    setError(null);

    try {
      const res = await superfetch<T>(method, url, {
        ...getDefaults(),
        ...options,
        ...callOptions,
        signal: abortRef.current.signal,
      });

      if (res.success) {
        setData(res.data || null);
      } else {
        const apiError = new SuperFetchError(
          res.error || "Request failed",
          res.status,
          'API_ERROR'
        );
        setError(apiError);
      }

      return res;
    } catch (err: any) {
      const errorMsg = err.message || "Request failed";
      const apiError = err instanceof SuperFetchError 
        ? err 
        : new SuperFetchError(errorMsg, undefined, 'REQUEST_FAILED');
      
      setError(apiError);
      return { success: false, error: errorMsg, status: apiError.status };
    } finally {
      setLoading(false);
    }
  }, [url, method, options]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return { data, loading, error, refetch: fetchData };
}