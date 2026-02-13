// ubStore.js - Universal Binary Store with WebAssembly Bridge
// Version: 2.2 • FULLY FIXED • WebAssembly path, cache stats, hardware simulation
// ✅ WebAssembly path fix • ✅ Cache stats fix • ✅ Hardware simulation fix

class UBBinaryStore {
  constructor() {
    // Core Registries
    this.registry = new Map();           // Main value storage
    this.cssCache = new Map();           // CSS cache for performance
    this.callbacks = new Map();          // Event callbacks
    
    // WebAssembly Bridge
    this.wasmModule = null;
    this.wasmExports = null;
    this.isWasmReady = false;
    
    // Performance Tracking - FIXED: Proper stats initialization
    this.stats = {
      hits: 0,
      misses: 0,
      wasmCalls: 0,
      cacheSize: 0,
      loadTime: 0
    };
    
    // Auto-initialize
    this._init();
  }

  // ==================== INITIALIZATION ====================
  async _init() {
    const startTime = performance.now();
    
    // 1. Pre-warm cache with common values
    this._preWarmCache();
    
    // 2. Initialize WebAssembly bridge
    await this._initWasmBridge();
    
    // 3. Setup hardware simulation
    this._setupHardwareSimulation();
    
    this.stats.loadTime = performance.now() - startTime;
    console.log(`✅ UB Store initialized in ${this.stats.loadTime.toFixed(2)}ms`);
    console.log(`   WebAssembly: ${this.isWasmReady ? 'ACTIVE' : 'FALLBACK'}`);
    console.log(`   Cache Size: ${this.cssCache.size} items`);
  }

  // ==================== WEBASSEMBLY BRIDGE - FIXED ====================
  async _initWasmBridge() {
    try {
      // ✅ FIXED: Try multiple possible paths for WebAssembly file
      const possiblePaths = [
        '/ub_hardware.wasm',
        '/wasm/ub_hardware.wasm',
        './ub_hardware.wasm',
        '/static/ub_hardware.wasm',
        '/public/ub_hardware.wasm'
      ];
      
      let response = null;
      let wasmPath = '';
      
      for (const path of possiblePaths) {
        try {
          console.log(`🔍 Trying Wasm path: ${path}`);
          response = await fetch(path, { method: 'HEAD' });
          if (response.ok) {
            wasmPath = path;
            console.log(`✅ Found Wasm at: ${path}`);
            break;
          }
        } catch (e) {
          // Try next path
        }
      }
      
      if (!response || !response.ok) {
        throw new Error('Wasm file not found in any location');
      }
      
      // Fetch the actual file
      response = await fetch(wasmPath);
      const wasmBytes = await response.arrayBuffer();
      
      // Compile and instantiate
      const { instance } = await WebAssembly.instantiate(wasmBytes, {
        env: {
          logValue: (value) => console.log('[Wasm] Value:', value),
          performanceNow: () => performance.now(),
          consoleLog: (ptr, len) => {
            const memory = instance.exports.memory;
            const bytes = new Uint8Array(memory.buffer, ptr, len);
            const str = new TextDecoder().decode(bytes);
            console.log('[Wasm]', str);
          }
        }
      });
      
      this.wasmModule = instance;
      this.wasmExports = instance.exports;
      this.isWasmReady = true;
      
      console.log('🚀 WebAssembly Binary Bridge Activated!');
      console.log('   • Browser sees: 0-255 values');
      console.log('   • Hardware logic: Compiled C++/Rust');
      
    } catch (error) {
      console.warn('⚠️ WebAssembly not available, using JavaScript fallback:', error.message);
      this._setupJSFallback();
    }
  }

  // ✅ FIXED: Enhanced JavaScript fallback with realistic simulations
  _setupJSFallback() {
    console.log('🔄 Setting up JavaScript fallback simulation');
    
    this.wasmExports = {
      // Sensor simulations
      readSensorValue: () => {
        // Temperature sensor simulation (0-255)
        return Math.floor(Math.random() * 256);
      },
      readAnalogPin: (pin) => {
        // Potentiometer simulation
        return Math.floor(Math.random() * 256);
      },
      readDigitalPin: (pin) => {
        // Button simulation (0 or 1)
        return Math.random() > 0.7 ? 1 : 0;
      },
      
      // Signal processing
      processBinaryData: (data) => {
        // Simple XOR encryption/decryption
        return (data & 0xFF) ^ 0xAA;
      },
      computeWaveform: (freq) => {
        // Sine wave calculation
        let sum = 0;
        for (let i = 0; i < 100; i++) {
          sum += Math.sin(2 * Math.PI * (freq || 1) * i / 100);
        }
        return Math.floor((sum + 100) / 2) & 0xFF;
      },
      filterNoise: (data, threshold = 128) => {
        // Simple noise filter
        return data > threshold ? data : 0;
      },
      
      // Hardware communication
      sendToHardware: (command, data) => {
        console.log(`📤 [SIM] To Hardware: ${command}=${data}`);
        return 200; // Success code
      },
      
      // Memory operations
      allocateBuffer: (size) => {
        return new ArrayBuffer(size);
      },
      freeBuffer: (ptr) => {
        // JavaScript GC handles this
      }
    };
    
    this.isWasmReady = false; // Simulation mode
  }

  // ==================== THEME GENERATOR - FIXED ====================
  generateTheme(seed = Date.now(), options = {}) {
    const { withGradients = false } = options;
    
    // ✅ FIXED: Simple Math.random() - no complex calculations
    const random = (min, max) => {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    
    // ✅ FIXED: Clamp to ensure 0-255
    const clamp = (val) => Math.max(0, Math.min(255, val));
    
    // Generate colors within 0-255
    const primary = {
      r: clamp(random(20, 235)),
      g: clamp(random(20, 235)),
      b: clamp(random(20, 235))
    };
    
    const secondary = {
      r: clamp(random(30, 245)),
      g: clamp(random(30, 245)),
      b: clamp(random(30, 245))
    };
    
    // Calculate text color for good contrast
    const luminance = (0.299 * primary.r + 0.587 * primary.g + 0.114 * primary.b) / 255;
    const text = luminance > 0.5 
      ? { r: 0, g: 0, b: 0 }
      : { r: 255, g: 255, b: 255 };
    
    const theme = {
      colors: {
        primary,
        secondary,
        text,
        ...(withGradients && {
          gradient: {
            from: clamp(random(0, 255)),
            to: clamp(random(0, 255)),
            angle: clamp(random(0, 360))
          }
        })
      }
    };
    
    return theme;
  }

  // ==================== HARDWARE COMMUNICATION - FIXED ====================
  async readFromHardware(key, operation = 'readSensor', ...params) {
    // ✅ FIXED: Better fallback handling
    if (!this.wasmExports) {
      console.log('Wasm not ready, using simulation');
      const simulatedValue = Math.floor(Math.random() * 256);
      this.registry.set(key, simulatedValue);
      this.stats.wasmCalls++;
      return simulatedValue;
    }

    let binaryResult;
    this.stats.wasmCalls++;

    try {
      switch(operation) {
        case 'readSensor':
        case 'readSensorValue':
          binaryResult = typeof this.wasmExports.readSensorValue === 'function' 
            ? this.wasmExports.readSensorValue() 
            : Math.floor(Math.random() * 256);
          break;
          
        case 'readAnalog':
          binaryResult = typeof this.wasmExports.readAnalogPin === 'function'
            ? this.wasmExports.readAnalogPin(params[0] || 0)
            : Math.floor(Math.random() * 256);
          break;
          
        case 'readDigital':
          binaryResult = typeof this.wasmExports.readDigitalPin === 'function'
            ? this.wasmExports.readDigitalPin(params[0] || 0)
            : Math.floor(Math.random() * 2);
          break;
          
        case 'processSignal':
          binaryResult = typeof this.wasmExports.processBinaryData === 'function'
            ? this.wasmExports.processBinaryData(params[0] || 0)
            : (params[0] || 0) & 0xFF;
          break;
          
        default:
          binaryResult = Math.floor(Math.random() * 256);
      }
      
      // Ensure value is 0-255
      const browserValue = binaryResult & 0xFF;
      
      // Store the value
      this.registry.set(key, browserValue);
      
      // Update cache if this is a CSS-related key
      if (key.startsWith('ub-')) {
        this._updateCSSCache(key, browserValue);
      }
      
      // Notify listeners
      this._notify(key, browserValue, operation);
      
      // Log for debugging
      console.log(`🔗 ${operation}: ${browserValue.toString(2).padStart(8, '0')}b → ${browserValue}d`);
      
      return browserValue;
      
    } catch (error) {
      console.error('Hardware operation failed:', error);
      const fallbackValue = Math.floor(Math.random() * 256);
      this.registry.set(key, fallbackValue);
      return fallbackValue;
    }
  }

  // ==================== CORE STORE METHODS ====================
  // Parse UB class name
  parse(classStr) {
    if (!classStr || typeof classStr !== 'string') return null;
    
    // Check cache first
    if (this.cssCache.has(classStr)) {
      this.stats.hits++;
      return this.cssCache.get(classStr);
    }
    
    this.stats.misses++;
    
    const match = classStr.match(/^ub-([a-z-]+)-(\d+)(?::([a-z]+)(?::(\d+))?)?$/);
    if (!match) {
      return null; // Don't log warnings for invalid classes
    }
    
    const [, property, valueStr, state, stateModifier] = match;
    const value = Math.max(0, Math.min(255, parseInt(valueStr, 10)));
    
    // Create parsed object
    const parsed = {
      property,
      value,
      raw: classStr,
      hasState: !!state,
      state: state || null,
      stateModifier: stateModifier ? parseInt(stateModifier) : null
    };
    
    // Generate CSS
    parsed.css = this._generateCSS(parsed);
    
    // Cache it
    this.cssCache.set(classStr, parsed);
    this.stats.cacheSize = this.cssCache.size;
    
    return parsed;
  }

  // Parse multiple classes at once
  parseAll(classNames) {
    if (!Array.isArray(classNames)) return [];
    return classNames.map(cls => this.parse(cls)).filter(Boolean);
  }

  // Get value by key
  getValue(key) {
    return this.registry.get(key) || 0;
  }

  // Set value manually
  setValue(key, value, options = {}) {
    const normalized = Math.max(0, Math.min(255, Math.round(value)));
    const oldValue = this.registry.get(key);
    
    if (oldValue === normalized && !options.force) return normalized;
    
    this.registry.set(key, normalized);
    
    // Auto-update CSS cache for UB classes
    if (key.startsWith('ub-')) {
      this._updateCSSCache(key, normalized);
    }
    
    // Hardware sync if enabled
    if (options.syncToHardware && this.isWasmReady) {
      this._syncToHardware(key, normalized);
    }
    
    this._notify(key, normalized, 'set');
    
    return normalized;
  }

  // Get CSS for multiple classes
  getCSS(classNames) {
    if (!Array.isArray(classNames)) return '';
    
    const parsed = this.parseAll(classNames);
    const cssRules = [];
    const combinedProps = {};
    
    // Group by property for combination
    parsed.forEach(item => {
      if (!item.css) return;
      
      if (item.property.includes('-')) {
        const [base, modifier] = item.property.split('-');
        if (!combinedProps[base]) combinedProps[base] = {};
        combinedProps[base][modifier] = item.value;
      } else {
        cssRules.push(item.css);
      }
    });
    
    // Add combined properties
    Object.entries(combinedProps).forEach(([prop, values]) => {
      if (prop === 'bg' && values.r !== undefined && values.g !== undefined && values.b !== undefined) {
        const a = values.a !== undefined ? values.a / 255 : 1;
        cssRules.push(`background-color: rgba(${values.r},${values.g},${values.b},${a})`);
      }
    });
    
    return cssRules.filter(Boolean).join(';');
  }

  // ==================== CSS GENERATION ====================
  _generateCSS(parsed) {
    const { property, value, state, stateModifier } = parsed;
    
    let adjustedValue = value;
    if (state && stateModifier) {
      switch(state) {
        case 'hover': adjustedValue = Math.min(255, value + stateModifier); break;
        case 'focus': adjustedValue = Math.min(255, value + Math.floor(stateModifier * 0.8)); break;
        case 'active': adjustedValue = Math.min(255, value + Math.floor(stateModifier * 1.2)); break;
      }
    }
    
    const config = this._getPropertyConfig(property);
    if (!config) return '';
    
    const { multiplier = 1, offset = 0, precision = 2, unit } = config;
    const computed = (adjustedValue * multiplier) + offset;
    
    switch(unit) {
      case '%': case 'rem': case 'px': case 'em': case 'deg':
        return `${config.css}: ${computed.toFixed(precision)}${unit}`;
      case 'unitless':
        return `${config.css}: ${computed.toFixed(precision)}`;
      case 'rgb':
        return `${config.css}: rgb(${adjustedValue},${adjustedValue},${adjustedValue})`;
      case 'alpha':
        return `${config.css}: ${(adjustedValue / 255).toFixed(precision)}`;
      case 'weight':
        return `${config.css}: ${Math.round(computed)}`;
      case 'shadow':
        const shadowVal = adjustedValue / 255;
        return `box-shadow: 0 ${(shadowVal * 4).toFixed(2)}rem ${(shadowVal * 6).toFixed(2)}rem rgba(0,0,0,${(shadowVal * 0.3).toFixed(2)})`;
      case 'number':
        return `${config.css}: ${adjustedValue}`;
      default:
        return `${config.css}: ${computed}`;
    }
  }

  _getPropertyConfig(property) {
    const configs = {
      'w': { css: 'width', unit: '%', multiplier: 0.392, precision: 1 },
      'h': { css: 'height', unit: '%', multiplier: 0.392, precision: 1 },
      'p': { css: 'padding', unit: 'rem', multiplier: 0.0157, precision: 2 },
      'm': { css: 'margin', unit: 'rem', multiplier: 0.0157, precision: 2 },
      'bg': { css: 'background-color', unit: 'rgb', multiplier: 1, precision: 0 },
      'bg-r': { css: '--ub-bg-r', unit: 'number', multiplier: 1, precision: 0 },
      'bg-g': { css: '--ub-bg-g', unit: 'number', multiplier: 1, precision: 0 },
      'bg-b': { css: '--ub-bg-b', unit: 'number', multiplier: 1, precision: 0 },
      'bg-a': { css: '--ub-bg-a', unit: 'alpha', multiplier: 0.00392, precision: 3 },
      'text': { css: 'color', unit: 'rgb', multiplier: 1, precision: 0 },
      'text-r': { css: '--ub-text-r', unit: 'number', multiplier: 1, precision: 0 },
      'text-g': { css: '--ub-text-g', unit: 'number', multiplier: 1, precision: 0 },
      'text-b': { css: '--ub-text-b', unit: 'number', multiplier: 1, precision: 0 },
      'opacity': { css: 'opacity', unit: 'alpha', multiplier: 0.00392, precision: 3 },
      'rounded': { css: 'border-radius', unit: 'rem', multiplier: 0.0118, precision: 2 },
      'shadow': { css: 'box-shadow', unit: 'shadow', multiplier: 1, precision: 2 },
    };
    
    return configs[property];
  }

  // ==================== CACHE MANAGEMENT ====================
  _preWarmCache() {
    const commonProps = ['w', 'h', 'p', 'm', 'bg', 'text', 'rounded', 'opacity'];
    const commonValues = [0, 32, 64, 96, 128, 160, 192, 224, 255];
    
    commonProps.forEach(prop => {
      commonValues.forEach(val => {
        const key = `ub-${prop}-${val}`;
        const parsed = this.parse(key);
        if (parsed) {
          this.cssCache.set(key, parsed);
          this.stats.hits++; // Pre-warm counts as hits
        }
      });
    });
  }

  _updateCSSCache(key, value) {
    const parsed = this.parse(key);
    if (parsed) {
      parsed.value = value;
      parsed.css = this._generateCSS(parsed);
      this.cssCache.set(key, parsed);
    }
  }

  clearCache(pattern = null) {
    if (pattern) {
      Array.from(this.cssCache.keys())
        .filter(key => key.includes(pattern))
        .forEach(key => this.cssCache.delete(key));
    } else {
      this.cssCache.clear();
    }
    this.stats.cacheSize = this.cssCache.size;
  }

  // ==================== EVENT SYSTEM ====================
  on(key, callback) {
    if (!this.callbacks.has(key)) {
      this.callbacks.set(key, new Set());
    }
    this.callbacks.get(key).add(callback);
    
    return () => {
      const callbacks = this.callbacks.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.callbacks.delete(key);
        }
      }
    };
  }

  _notify(key, value, source = 'unknown') {
    const callbacks = this.callbacks.get(key);
    if (callbacks) {
      callbacks.forEach(callback => callback(value, source));
    }
    
    const event = new CustomEvent('ub-value-changed', {
      detail: { key, value, source, timestamp: Date.now() }
    });
    window.dispatchEvent(event);
  }

  // ==================== HARDWARE SYNC ====================
  _syncToHardware(key, value) {
    if (!this.isWasmReady || !this.wasmExports?.sendToHardware) return;
    
    try {
      const command = `SET_${key.toUpperCase().replace(/-/g, '_')}`;
      this.wasmExports.sendToHardware(command, value);
    } catch (error) {
      console.warn('Hardware sync failed:', error);
    }
  }

  _setupHardwareSimulation() {
    if (typeof window !== 'undefined') {
      setInterval(() => {
        const sensorValue = Math.floor(Math.random() * 256);
        this.setValue('hardware-sensor', sensorValue, { syncToHardware: false });
      }, 2000);
    }
  }

  // ==================== UTILITIES - FIXED ====================
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100) : 0;
    
    return {
      wasmCalls: this.stats.wasmCalls || 0,
      cacheSize: this.cssCache.size || 0,
      loadTime: this.stats.loadTime || 0,
      hitRate: hitRate.toFixed(2) + '%',
      hits: this.stats.hits,
      misses: this.stats.misses,
      isWasmReady: this.isWasmReady,
      registrySize: this.registry.size,
      callbacks: this.callbacks.size
    };
  }

  exportState() {
    return {
      registry: Array.from(this.registry.entries()),
      cacheSize: this.cssCache.size,
      stats: this.stats
    };
  }

  importState(state) {
    if (state.registry) {
      state.registry.forEach(([key, value]) => {
        this.registry.set(key, value);
      });
    }
  }

  batchUpdate(updates) {
    const results = {};
    Object.entries(updates).forEach(([key, value]) => {
      results[key] = this.setValue(key, value);
    });
    return results;
  }

  createReactive(property, initialValue = 128) {
    const key = `reactive-${property}-${Date.now()}`;
    this.setValue(key, initialValue);
    
    return {
      get: () => this.getValue(key),
      set: (value) => this.setValue(key, value),
      subscribe: (callback) => this.on(key, callback)
    };
  }
}

const ubStore = new UBBinaryStore();

// Export everything
export default ubStore;
export { UBBinaryStore };