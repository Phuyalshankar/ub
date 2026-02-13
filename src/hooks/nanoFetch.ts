// nano-fetch-complete.ts - सबै Interceptors सहितको पूर्ण संस्करण

// ───────────────────────────────────────────────
// TYPES
// ───────────────────────────────────────────────
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';
export type ResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData' | 'raw';

export interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  retry?: number;
  retryDelay?: number;
  cacheTime?: number;
  responseType?: ResponseType;
  credentials?: RequestCredentials;
  params?: Record<string, any>;
  skipInterceptors?: boolean;
}

export interface NanoFetchOptions extends RequestConfig {
  baseURL?: string;
}

export interface InterceptorRequest {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: BodyInit | null;
  config: Required<Omit<RequestConfig, 'params'>> & { headers: Record<string, string> };
  originalRequest?: {
    path: string;
    data?: any;
    options?: RequestConfig;
  };
}

export interface InterceptorResponse<T = any> {
  data: T;
  response: Response;
  config: Required<Omit<RequestConfig, 'params'>> & { headers: Record<string, string> };
  request: InterceptorRequest;
}

export type RequestInterceptor = (
  request: InterceptorRequest
) => Promise<InterceptorRequest> | InterceptorRequest;

export type ResponseInterceptor<T = any> = (
  response: InterceptorResponse<T>
) => Promise<InterceptorResponse<T>> | InterceptorResponse<T>;

export type ErrorInterceptor = (
  error: any,
  request?: InterceptorRequest
) => Promise<any> | any;

export class HttpError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: Response,
    public request?: InterceptorRequest
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

// ───────────────────────────────────────────────
// MAIN CLASS WITH ALL INTERCEPTORS
// ───────────────────────────────────────────────
export class NanoFetch {
  private baseURL: string;
  private config: Required<Omit<RequestConfig, 'params'>> & { 
    headers: Record<string, string>;
  };
  private cache = new Map<string, { data: any; timestamp: number }>();
  private pending = new Map<string, Promise<any>>();
  private abortController = new AbortController();
  
  // All interceptors storage
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  // Built-in interceptors state
  private authToken: string | null = null;
  private isLoggingEnabled = false;
  private loadingCallbacks: Array<(loading: boolean) => void> = [];
  private requestCount = 0;
  private performanceMonitor = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalResponseTime: 0,
    startTimes: new Map<string, number>()
  };

  constructor(options: NanoFetchOptions = {}) {
    this.baseURL = options.baseURL || '';
    
    this.config = {
      headers: options.headers || { 'Content-Type': 'application/json' },
      timeout: options.timeout ?? 10000,
      retry: options.retry ?? 2,
      retryDelay: options.retryDelay ?? 300,
      cacheTime: options.cacheTime ?? 0,
      responseType: options.responseType ?? 'json',
      credentials: options.credentials ?? 'same-origin',
      skipInterceptors: options.skipInterceptors ?? false
    };

    // Automatically add built-in interceptors
    this.setupBuiltInInterceptors();
  }

  // ───────────────────────────────────────────────
  // BUILT-IN INTERCEPTORS SETUP
  // ───────────────────────────────────────────────
  private setupBuiltInInterceptors(): void {
    // 1. Authentication Interceptor
    this.requestInterceptors.push(this.authInterceptor.bind(this));
    
    // 2. Logging Interceptor
    this.requestInterceptors.push(this.loggingInterceptor.bind(this));
    this.responseInterceptors.push(this.responseLoggingInterceptor.bind(this));
    
    // 3. Performance Monitoring Interceptor
    this.requestInterceptors.push(this.performanceStartInterceptor.bind(this));
    this.responseInterceptors.push(this.performanceEndInterceptor.bind(this));
    this.errorInterceptors.push(this.performanceErrorInterceptor.bind(this));
    
    // 4. Loading State Interceptor
    this.requestInterceptors.push(this.loadingStartInterceptor.bind(this));
    this.responseInterceptors.push(this.loadingEndInterceptor.bind(this));
    this.errorInterceptors.push(this.loadingErrorInterceptor.bind(this));
    
    // 5. Retry Logic Interceptor
    this.errorInterceptors.push(this.retryInterceptor.bind(this));
    
    // 6. Error Handling Interceptor
    this.errorInterceptors.push(this.errorHandlingInterceptor.bind(this));
    
    // 7. Request Transformation Interceptor
    this.requestInterceptors.push(this.requestTransformInterceptor.bind(this));
    
    // 8. Response Transformation Interceptor
    this.responseInterceptors.push(this.responseTransformInterceptor.bind(this));
    
    // 9. Cache Control Interceptor
    this.requestInterceptors.push(this.cacheControlInterceptor.bind(this));
    
    // 10. Offline Detection Interceptor
    this.requestInterceptors.push(this.offlineInterceptor.bind(this));
  }

  // ───────────────────────────────────────────────
  // BUILT-IN INTERCEPTOR IMPLEMENTATIONS
  // ───────────────────────────────────────────────
  
  // 1. AUTHENTICATION INTERCEPTOR
  private async authInterceptor(request: InterceptorRequest): Promise<InterceptorRequest> {
    if (this.authToken && !request.headers.Authorization) {
      request.headers.Authorization = `Bearer ${this.authToken}`;
    }
    return request;
  }

  // 2. LOGGING INTERCEPTOR
  private async loggingInterceptor(request: InterceptorRequest): Promise<InterceptorRequest> {
    if (this.isLoggingEnabled) {
      console.groupCollapsed(`📤 [NanoFetch] ${request.method} ${request.url}`);
      console.log('Headers:', request.headers);
      console.log('Body:', request.body);
      console.log('Config:', request.config);
      console.groupEnd();
    }
    return request;
  }

  private async responseLoggingInterceptor<T>(
    response: InterceptorResponse<T>
  ): Promise<InterceptorResponse<T>> {
    if (this.isLoggingEnabled) {
      console.groupCollapsed(`📥 [NanoFetch] ${response.request.method} ${response.request.url}`);
      console.log('Status:', response.response.status, response.response.statusText);
      console.log('Headers:', Object.fromEntries(response.response.headers.entries()));
      console.log('Data:', response.data);
      console.groupEnd();
    }
    return response;
  }

  // 3. PERFORMANCE MONITORING INTERCEPTOR
  private async performanceStartInterceptor(
    request: InterceptorRequest
  ): Promise<InterceptorRequest> {
    this.performanceMonitor.totalRequests++;
    this.performanceMonitor.startTimes.set(request.url, Date.now());
    return request;
  }

  private async performanceEndInterceptor<T>(
    response: InterceptorResponse<T>
  ): Promise<InterceptorResponse<T>> {
    this.performanceMonitor.successfulRequests++;
    const startTime = this.performanceMonitor.startTimes.get(response.request.url);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.performanceMonitor.totalResponseTime += duration;
      this.performanceMonitor.startTimes.delete(response.request.url);
      
      // Log slow requests
      if (duration > 1000) {
        console.warn(`⚠️ Slow request: ${response.request.method} ${response.request.url} took ${duration}ms`);
      }
    }
    return response;
  }

  private async performanceErrorInterceptor(
    error: any,
    request?: InterceptorRequest
  ): Promise<any> {
    this.performanceMonitor.failedRequests++;
    if (request) {
      this.performanceMonitor.startTimes.delete(request.url);
    }
    return error;
  }

  // 4. LOADING STATE INTERCEPTOR
  private async loadingStartInterceptor(
    request: InterceptorRequest
  ): Promise<InterceptorRequest> {
    this.requestCount++;
    if (this.requestCount === 1) {
      this.notifyLoadingState(true);
    }
    return request;
  }

  private async loadingEndInterceptor<T>(
    response: InterceptorResponse<T>
  ): Promise<InterceptorResponse<T>> {
    this.requestCount--;
    if (this.requestCount === 0) {
      this.notifyLoadingState(false);
    }
    return response;
  }

  private async loadingErrorInterceptor(
    error: any,
    request?: InterceptorRequest
  ): Promise<any> {
    this.requestCount--;
    if (this.requestCount === 0) {
      this.notifyLoadingState(false);
    }
    return error;
  }

  private notifyLoadingState(loading: boolean): void {
    this.loadingCallbacks.forEach(callback => callback(loading));
  }

  // 5. RETRY INTERCEPTOR
  private async retryInterceptor(
    error: any,
    request?: InterceptorRequest
  ): Promise<any> {
    // Network errors र 5xx server errors को लागि retry
    const shouldRetry = error instanceof Error && (
      error.name === 'TypeError' || // Network error
      error.name === 'AbortError' || // Timeout
      (error instanceof HttpError && error.status && error.status >= 500) // Server error
    );

    if (shouldRetry && request) {
      console.log(`🔄 Retrying ${request.method} ${request.url} due to:`, error.message);
    }
    
    return error;
  }

  // 6. ERROR HANDLING INTERCEPTOR
  private async errorHandlingInterceptor(
    error: any,
    request?: InterceptorRequest
  ): Promise<any> {
    // Standardize error format
    if (error instanceof HttpError) {
      // Already standardized
      return error;
    }
    
    // Create standardized error
    let status = 0;
    let message = 'Unknown error occurred';
    
    if (error instanceof Error) {
      message = error.message;
      if (error.name === 'AbortError') {
        status = 408; // Timeout
        message = 'Request timeout';
      } else if (error.name === 'TypeError') {
        status = 0; // Network error
        message = 'Network connection failed';
      }
    }
    
    return new HttpError(message, status, undefined, request);
  }

  // 7. REQUEST TRANSFORMATION INTERCEPTOR
  private async requestTransformInterceptor(
    request: InterceptorRequest
  ): Promise<InterceptorRequest> {
    // Add timestamp to all requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        if (request.body && typeof request.body === 'string') {
          const data = JSON.parse(request.body);
          const transformedData = {
            ...data,
            _timestamp: new Date().toISOString(),
            _client: 'nano-fetch'
          };
          request.body = JSON.stringify(transformedData);
        }
      } catch {
        // If JSON parse fails, leave as is
      }
    }
    
    // Add request ID for tracing
    request.headers['X-Request-ID'] = this.generateRequestId();
    
    return request;
  }

  // 8. RESPONSE TRANSFORMATION INTERCEPTOR
  private async responseTransformInterceptor<T>(
    response: InterceptorResponse<T>
  ): Promise<InterceptorResponse<T>> {
    // Add metadata to response
    const transformedData = {
      data: response.data,
      _metadata: {
        status: response.response.status,
        statusText: response.response.statusText,
        timestamp: new Date().toISOString(),
        requestId: response.request.headers['X-Request-ID'],
        cached: response.response.headers.get('X-Cached') === 'true'
      }
    };
    
    return {
      ...response,
      data: transformedData as T
    };
  }

  // 9. CACHE CONTROL INTERCEPTOR
  private async cacheControlInterceptor(
    request: InterceptorRequest
  ): Promise<InterceptorRequest> {
    // Auto-cache GET requests for 1 minute
    if (request.method === 'GET' && request.config.cacheTime === 0) {
      request.config.cacheTime = 60000; // 1 minute default
    }
    
    // Don't cache auth endpoints
    if (request.url.includes('/auth/') || request.url.includes('/login')) {
      request.config.cacheTime = 0;
    }
    
    return request;
  }

  // 10. OFFLINE DETECTION INTERCEPTOR
  private async offlineInterceptor(
    request: InterceptorRequest
  ): Promise<InterceptorRequest> {
    if (!navigator.onLine) {
      throw new HttpError(
        'No internet connection. Please check your network.',
        0,
        undefined,
        request
      );
    }
    return request;
  }

  // ───────────────────────────────────────────────
  // PUBLIC INTERCEPTOR MANAGEMENT
  // ───────────────────────────────────────────────
  addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor);
      if (index > -1) this.requestInterceptors.splice(index, 1);
    };
  }

  addResponseInterceptor<T = any>(interceptor: ResponseInterceptor<T>): () => void {
    this.responseInterceptors.push(interceptor as ResponseInterceptor);
    return () => {
      const index = this.responseInterceptors.indexOf(interceptor as ResponseInterceptor);
      if (index > -1) this.responseInterceptors.splice(index, 1);
    };
  }

  addErrorInterceptor(interceptor: ErrorInterceptor): () => void {
    this.errorInterceptors.push(interceptor);
    return () => {
      const index = this.errorInterceptors.indexOf(interceptor);
      if (index > -1) this.errorInterceptors.splice(index, 1);
    };
  }

  clearInterceptors(): void {
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    this.errorInterceptors = [];
    // Re-add built-in interceptors
    this.setupBuiltInInterceptors();
  }

  // ───────────────────────────────────────────────
  // BUILT-IN INTERCEPTOR CONTROLS
  // ───────────────────────────────────────────────
  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  enableLogging(enable: boolean = true): void {
    this.isLoggingEnabled = enable;
  }

  onLoadingChange(callback: (loading: boolean) => void): () => void {
    this.loadingCallbacks.push(callback);
    return () => {
      const index = this.loadingCallbacks.indexOf(callback);
      if (index > -1) this.loadingCallbacks.splice(index, 1);
    };
  }

  getPerformanceStats() {
    return {
      totalRequests: this.performanceMonitor.totalRequests,
      successfulRequests: this.performanceMonitor.successfulRequests,
      failedRequests: this.performanceMonitor.failedRequests,
      successRate: this.performanceMonitor.totalRequests > 0 
        ? (this.performanceMonitor.successfulRequests / this.performanceMonitor.totalRequests) * 100 
        : 0,
      averageResponseTime: this.performanceMonitor.successfulRequests > 0
        ? this.performanceMonitor.totalResponseTime / this.performanceMonitor.successfulRequests
        : 0,
      activeRequests: this.requestCount
    };
  }

  resetPerformanceStats(): void {
    this.performanceMonitor = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      startTimes: new Map()
    };
  }

  // ───────────────────────────────────────────────
  // UTILITY METHODS
  // ───────────────────────────────────────────────
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async executeRequestInterceptors(
    request: InterceptorRequest
  ): Promise<InterceptorRequest> {
    let currentRequest = { ...request };
    
    for (const interceptor of this.requestInterceptors) {
      currentRequest = await interceptor(currentRequest);
    }
    
    return currentRequest;
  }

  private async executeResponseInterceptors<T>(
    response: InterceptorResponse<T>
  ): Promise<InterceptorResponse<T>> {
    let currentResponse = { ...response };
    
    for (const interceptor of this.responseInterceptors) {
      currentResponse = await interceptor(currentResponse);
    }
    
    return currentResponse;
  }

  private async executeErrorInterceptors(
    error: any,
    request?: InterceptorRequest
  ): Promise<any> {
    let currentError = error;
    
    for (const interceptor of this.errorInterceptors) {
      try {
        currentError = await interceptor(currentError, request);
      } catch (interceptorError) {
        console.error('Error interceptor failed:', interceptorError);
      }
    }
    
    return currentError;
  }

  // ───────────────────────────────────────────────
  // CORE HTTP METHODS (SAME AS BEFORE)
  // ───────────────────────────────────────────────
  private buildURL(path: string, params?: Record<string, any>): string {
    const url = path.startsWith('http') ? path : this.baseURL + path;
    if (!params) return url;

    const search = new URLSearchParams();
    
    const append = (key: string, value: any): void => {
      if (value == null) return;
      search.append(key, String(value));
    };

    for (const [k, v] of Object.entries(params)) {
      if (Array.isArray(v)) {
        v.forEach(item => append(`${k}[]`, item));
      } else if (v instanceof Date) {
        append(k, v.toISOString());
      } else if (v && typeof v === 'object') {
        this.appendObject(search, k, v);
      } else {
        append(k, v);
      }
    }

    return url + (search.toString() ? `?${search.toString()}` : '');
  }

  private appendObject(search: URLSearchParams, prefix: string, obj: Record<string, any>): void {
    for (const [k, v] of Object.entries(obj)) {
      const key = `${prefix}[${k}]`;
      if (v && typeof v === 'object' && !(v instanceof Date)) {
        this.appendObject(search, key, v);
      } else if (v != null) {
        search.append(key, String(v));
      }
    }
  }

  private createBody(method: HttpMethod, data: any, headers: Record<string, string>): BodyInit | null {
    if (!data || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return null;
    }

    if (data instanceof FormData || data instanceof URLSearchParams) {
      delete headers['Content-Type'];
      return data;
    }

    headers['Content-Type'] = 'application/json';
    return JSON.stringify(data);
  }

  private async parseResponse<T>(response: Response, type: ResponseType): Promise<T> {
    const parsers: Record<ResponseType, (res: Response) => Promise<any>> = {
      json: async (res) => {
        const text = await res.text();
        try {
          return text ? JSON.parse(text) : null;
        } catch {
          throw new Error(`Invalid JSON: ${text.substring(0, 100)}`);
        }
      },
      text: async (res) => await res.text(),
      blob: async (res) => await res.blob(),
      arrayBuffer: async (res) => await res.arrayBuffer(),
      formData: async (res) => await res.formData(),
      raw: async (res) => res
    };

    const parser = parsers[type];
    if (!parser) throw new Error(`Unsupported response type: ${type}`);
    
    return await parser(response) as T;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async executeRequest<T>(
    method: HttpMethod,
    url: string,
    body: BodyInit | null,
    headers: Record<string, string>,
    config: Required<Omit<RequestConfig, 'params'>> & { headers: Record<string, string> },
    cacheKey?: string,
    originalRequest?: {
      path: string;
      data?: any;
      options?: RequestConfig;
    }
  ): Promise<T> {
    let attempt = 0;
    let timeoutId: NodeJS.Timeout | undefined;

    while (attempt <= config.retry) {
      try {
        const interceptorRequest: InterceptorRequest = {
          method,
          url,
          headers: { ...headers },
          body,
          config: { ...config },
          originalRequest
        };

        let finalRequest = interceptorRequest;
        if (!config.skipInterceptors) {
          finalRequest = await this.executeRequestInterceptors(interceptorRequest);
        }

        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), config.timeout);

        const response = await fetch(finalRequest.url, {
          method: finalRequest.method,
          headers: finalRequest.headers,
          body: finalRequest.body,
          signal: controller.signal,
          credentials: config.credentials
        });

        if (timeoutId) clearTimeout(timeoutId);

        // Check cache headers
        if (response.headers.get('X-Cached') === 'true') {
          console.log('ℹ️ Serving from cache');
        }

        if (!response.ok) {
          const error = new HttpError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            response,
            finalRequest
          );
          
          if (response.status >= 500 && attempt < config.retry) {
            attempt++;
            await this.sleep(config.retryDelay * Math.pow(2, attempt - 1));
            continue;
          }
          
          throw error;
        }

        const data = await this.parseResponse<T>(response, config.responseType);

        const interceptorResponse: InterceptorResponse<T> = {
          data,
          response,
          config: { ...config },
          request: finalRequest
        };

        let finalResponse = interceptorResponse;
        if (!config.skipInterceptors) {
          finalResponse = await this.executeResponseInterceptors(interceptorResponse);
        }
        
        if (cacheKey && method === 'GET' && config.cacheTime > 0) {
          this.cache.set(cacheKey, {
            data: finalResponse.data,
            timestamp: Date.now()
          });
        }

        return finalResponse.data;

      } catch (error: unknown) {
        if (timeoutId) clearTimeout(timeoutId);

        const isNetworkError = error instanceof Error && 
          (error.name === 'AbortError' || error.name === 'TypeError');

        if (isNetworkError && attempt < config.retry) {
          attempt++;
          await this.sleep(config.retryDelay * Math.pow(2, attempt - 1));
          continue;
        }

        if (!config.skipInterceptors) {
          const processedError = await this.executeErrorInterceptors(error, {
            method,
            url,
            headers: { ...headers },
            body,
            config: { ...config },
            originalRequest
          });
          throw processedError;
        }

        throw error;
      }
    }

    throw new HttpError('Max retries exceeded');
  }

  // ───────────────────────────────────────────────
  // PUBLIC API METHODS
  // ───────────────────────────────────────────────
  async request<T = any>(
    method: HttpMethod,
    path: string,
    data?: any,
    options: RequestConfig = {}
  ): Promise<T> {
    const config = { 
      ...this.config, 
      ...options,
      headers: { ...this.config.headers, ...options.headers },
      skipInterceptors: options.skipInterceptors ?? this.config.skipInterceptors
    };
    
    const cacheKey = method === 'GET' ? path + JSON.stringify(options.params || data) : undefined;

    if (cacheKey && config.cacheTime > 0) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < config.cacheTime) {
        // Mark as cached response
        return {
          ...cached.data,
          _metadata: {
            ...cached.data._metadata,
            cached: true
          }
        } as T;
      }
    }

    if (cacheKey && this.pending.has(cacheKey)) {
      return this.pending.get(cacheKey)! as Promise<T>;
    }

    const url = this.buildURL(path, method === 'GET' ? (options.params || data) : undefined);
    const body = this.createBody(method, data, config.headers);

    const requestPromise = this.executeRequest<T>(
      method,
      url,
      body,
      config.headers,
      config,
      cacheKey,
      {
        path,
        data,
        options
      }
    );

    if (cacheKey) {
      this.pending.set(cacheKey, requestPromise);
      requestPromise.finally(() => this.pending.delete(cacheKey));
    }

    return requestPromise;
  }

  get<T = any>(path: string, params?: Record<string, any>, config?: RequestConfig): Promise<T> {
    return this.request<T>('GET', path, undefined, { ...config, params });
  }

  post<T = any>(path: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>('POST', path, data, config);
  }

  put<T = any>(path: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>('PUT', path, data, config);
  }

  patch<T = any>(path: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>('PATCH', path, data, config);
  }

  delete<T = void>(path: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>('DELETE', path, data, config);
  }

  // ───────────────────────────────────────────────
  // UTILITY METHODS
  // ───────────────────────────────────────────────
  clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
    } else {
      for (const [key] of this.cache) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    }
  }

  setHeader(key: string, value: string): void {
    this.config.headers[key] = value;
  }

  removeHeader(key: string): void {
    delete this.config.headers[key];
  }

  abortAll(): void {
    this.abortController.abort();
    this.abortController = new AbortController();
  }
}

// ───────────────────────────────────────────────
// FACTORY FUNCTION
// ───────────────────────────────────────────────
export function createNanoFetch(options: NanoFetchOptions = {}): NanoFetch {
  return new NanoFetch(options);
}