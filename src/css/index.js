// /src/lib/ub/index.js
// Universal Binary Engine v7.1 - COMPLETE FIXED VERSION
// ✅ FIXED: generateTheme now properly clamps to 0-255
// ✅ FIXED: Random function generates correct 0-255 values only

import UniversalParser from './parser';
import { getStyleManager } from './manager';
import {
  useUB,
  useUBProperty,
  useUBResponsive,
  useUBScroll,
  useUBSequence
} from './hooks';
import ubStore from './store';

// Initialize manager
const manager = getStyleManager();

// Enhanced Real-Time Dynamic Engine with Store Integration
class RealTimeDynamicEngine {
  constructor() {
    this.observers = new Map();
    this.values = new Map();
    this.stateValues = new Map();
    this.scrollListeners = new Set();
    this.hardwareListeners = new Map();
    this.init();
  }

  init() {
    // Store events लाई listen गर्ने
    if (typeof window !== 'undefined') {
      window.addEventListener('ub-value-changed', this._handleStoreUpdate.bind(this));
      
      // Setup global scroll listener
      window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
    }
  }

  // Store बाट update आएमा handle गर्ने
  _handleStoreUpdate(event) {
    const { key, value, source } = event.detail;
    
    // Hardware सँग जोडिएका keys हरूको लागि update गर्ने
    if (key.startsWith('hw-') || key.startsWith('sensor-')) {
      this.values.set(key, value);
      
      // Notify observers
      const observers = this.observers.get(key);
      if (observers) {
        observers.forEach(callback => callback(value, source));
      }
      
      // Hardware-specific listeners
      const hwListeners = this.hardwareListeners.get(key);
      if (hwListeners) {
        hwListeners.forEach(callback => callback(value));
      }
    }
  }

  handleScroll() {
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? scrollY / maxScroll : 0;

    document.documentElement.style.setProperty('--ub-scroll-progress', progress.toString());
    this.scrollListeners.forEach(callback => callback(progress));
  }

  watch(property, callback) {
    if (!this.observers.has(property)) {
      this.observers.set(property, new Set());
    }
    this.observers.get(property).add(callback);

    // Return unsubscribe function
    return () => {
      const observers = this.observers.get(property);
      if (observers) {
        observers.delete(callback);
        if (observers.size === 0) {
          this.observers.delete(property);
        }
      }
    };
  }

  watchHardware(key, callback) {
    if (!this.hardwareListeners.has(key)) {
      this.hardwareListeners.set(key, new Set());
    }
    this.hardwareListeners.get(key).add(callback);
    
    return () => {
      const listeners = this.hardwareListeners.get(key);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.hardwareListeners.delete(key);
        }
      }
    };
  }

  watchScroll(callback) {
    this.scrollListeners.add(callback);
    return () => this.scrollListeners.delete(callback);
  }

  set(property, value, options = {}) {
    const normalized = Math.max(0, Math.min(255, Math.round(value)));
    const oldValue = this.values.get(property);
    
    if (oldValue === normalized && !options.force) return;

    this.values.set(property, normalized);

    // Handle state modifiers
    if (options.stateModifiers) {
      Object.entries(options.stateModifiers).forEach(([state, modifier]) => {
        const stateValue = Math.max(0, Math.min(255, normalized + modifier));
        this.stateValues.set(`${property}:${state}`, stateValue);
      });
    }

    // Notify observers
    const observers = this.observers.get(property);
    if (observers) {
      observers.forEach(callback => callback(normalized, oldValue));
    }

    // Update DOM
    this.updateDOM(property, normalized, options);
    
    // Store मा पनि sync गर्ने यदि चाहिएमा
    if (options.syncToStore) {
      ubStore.setValue(property, normalized, { syncToHardware: options.syncToHardware });
    }
  }

  updateDOM(property, value, options = {}) {
    const className = `ub-${property}-${value}`;
    manager.inject(className);

    // Update state variants
    if (options.stateModifiers) {
      Object.entries(options.stateModifiers).forEach(([state, modifier]) => {
        const stateValue = Math.max(0, Math.min(255, value + modifier));
        manager.injectWithState(className, state, modifier);
      });
    }

    // Update elements with this property
    const selector = `[class*="ub-${property}-"]`;
    const elements = document.querySelectorAll(selector);

    elements.forEach(element => {
      const classes = Array.from(element.classList);
      
      // Remove old property classes
      const oldClasses = classes.filter(cls => 
        cls.startsWith(`ub-${property}-`) && !cls.includes(':')
      );
      
      oldClasses.forEach(cls => element.classList.remove(cls));
      
      // Add new class
      element.classList.add(className);
      
      // Add state classes
      if (options.stateModifiers && element.hasAttribute('data-ub-states')) {
        Object.keys(options.stateModifiers).forEach(state => {
          element.classList.remove(`${className}:${state}`);
          element.classList.add(`${className}:${state}`);
        });
      }
    });
  }

  get(property) {
    // पहिले local cache मा खोज्ने, अनि store मा
    return this.values.get(property) || ubStore.getValue(property) || 0;
  }

  getStateValue(property, state) {
    return this.stateValues.get(`${property}:${state}`) || this.get(property);
  }

  // Hardware operations through store
  async readFromHardware(key, operation = 'readSensor', ...params) {
    return await ubStore.updateFromHardware(key, operation, ...params);
  }

  // Store parsing को shortcut
  parseWithStore(classStr) {
    return ubStore.parse(classStr);
  }

  getCSSFromStore(classNames) {
    return ubStore.getCSS(classNames);
  }

  // CSS string लाई React style object मा convert गर्ने
  cssToObject(cssString) {
    if (!cssString || typeof cssString !== 'string') return {};
    const styleObject = {};
    cssString.split(';').forEach(rule => {
      const [key, value] = rule.split(':').map(s => s.trim());
      if (key && value) {
        const reactKey = key.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
        styleObject[reactKey] = value;
      }
    });
    return styleObject;
  }

  createReactive(property, initialValue = 128, options = {}) {
    const currentValue = this.get(property) || initialValue;
    this.set(property, currentValue, options);

    return {
      value: currentValue,
      set: (val) => this.set(property, val, options),
      className: `ub-${property}-${currentValue}`,
      stateClass: (state) => {
        const stateValue = this.getStateValue(property, state);
        return `ub-${property}-${stateValue}:${state}`;
      },
      subscribe: (callback) => this.watch(property, callback),
      // Store integration
      syncToStore: (sync = true) => {
        ubStore.setValue(property, currentValue, { syncToHardware: sync });
        return this;
      }
    };
  }

  createAnimation(name, keyframes, options = {}) {
    return manager.createAnimation(name, keyframes, options);
  }

  applyScrollEffect(element, effectType, options = {}) {
    const className = `ub-scroll-${effectType}`;
    manager.injectWithScroll(className, effectType);
    
    element.classList.add('ub-scroll-trigger', className);
    
    if (options.thresholds) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            const progress = 1 - entry.intersectionRatio;
            element.style.setProperty('--ub-scroll-progress', progress.toString());
          });
        },
        { threshold: options.thresholds }
      );
      
      observer.observe(element);
      return () => observer.disconnect();
    }
    
    return () => {};
  }
}

// ✅ FIXED: Theme Generator - अब 0-255 भित्र मात्र values आउने
const UBTheme = {
  generate(seed = Date.now(), options = {}) {
    // ✅ FIXED: Simple random function जुन 0-255 भित्र मात्र value दिन्छ
    const random = (min, max) => {
      // सीधा Math.random() प्रयोग गर्ने - यो सबैभन्दा सुरक्षित
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    // ✅ FIXED: Always clamp to 0-255 range
    const clamp = (value) => Math.max(0, Math.min(255, value));
    
    // ✅ FIXED: Primary colors - strictly 0-255
    const primary = {
      r: clamp(random(20, 235)),
      g: clamp(random(20, 235)),
      b: clamp(random(20, 235))
    };
    
    // Calculate text color based on luminance for better contrast
    const luminance = (0.299 * primary.r + 0.587 * primary.g + 0.114 * primary.b) / 255;
    const text = luminance > 0.5 
      ? { r: 0, g: 0, b: 0 }      // Dark text on light background
      : { r: 255, g: 255, b: 255 }; // Light text on dark background

    const theme = {
      colors: {
        primary,
        secondary: {
          r: clamp(random(30, 245)),
          g: clamp(random(30, 245)),
          b: clamp(random(30, 245))
        },
        accent: {
          r: clamp(random(40, 255)),
          g: clamp(random(20, 200)),
          b: clamp(random(10, 150))
        },
        background: {
          r: clamp(luminance > 0.5 ? random(240, 255) : random(10, 30)),
          g: clamp(luminance > 0.5 ? random(240, 255) : random(10, 30)),
          b: clamp(luminance > 0.5 ? random(240, 255) : random(10, 30))
        },
        surface: {
          r: clamp(luminance > 0.5 ? random(250, 255) : random(20, 40)),
          g: clamp(luminance > 0.5 ? random(250, 255) : random(20, 40)),
          b: clamp(luminance > 0.5 ? random(250, 255) : random(20, 40))
        },
        text,
        textMuted: {
          r: clamp(text.r * 0.7),
          g: clamp(text.g * 0.7),
          b: clamp(text.b * 0.7)
        }
      },
      spacing: {
        xs: clamp(random(8, 24)),
        sm: clamp(random(16, 48)),
        md: clamp(random(32, 96)),
        lg: clamp(random(64, 160)),
        xl: clamp(random(128, 255))
      },
      typography: {
        size: {
          xs: clamp(random(10, 24)),
          sm: clamp(random(16, 48)),
          md: clamp(random(32, 96)),
          lg: clamp(random(64, 160)),
          xl: clamp(random(128, 255))
        },
        weight: {
          light: clamp(random(100, 300)),
          normal: clamp(random(400, 500)),
          bold: clamp(random(600, 800))
        }
      },
      effects: {
        borderRadius: {
          sm: clamp(random(8, 40)),
          md: clamp(random(32, 80)),
          lg: clamp(random(64, 160)),
          full: 255
        },
        shadow: {
          sm: clamp(random(16, 48)),
          md: clamp(random(48, 96)),
          lg: clamp(random(80, 160)),
          xl: clamp(random(160, 255))
        },
        opacity: {
          subtle: clamp(random(20, 64)),
          medium: clamp(random(80, 144)),
          strong: clamp(random(160, 224))
        }
      },
      transitions: {
        fast: clamp(random(8, 24)),
        normal: clamp(random(32, 80)),
        slow: clamp(random(96, 200))
      }
    };

    // Add gradients if enabled
    if (options.withGradients) {
      theme.gradients = {
        primary: { 
          from: primary, 
          to: theme.colors.accent, 
          angle: clamp(random(0, 255)) 
        },
        secondary: { 
          from: theme.colors.secondary, 
          to: theme.colors.accent, 
          angle: clamp(random(0, 255)) 
        }
      };
    }

    return theme;
  },

  toClasses(theme, prefix = '') {
    const classes = [];

    // Colors
    Object.entries(theme.colors).forEach(([colorName, color]) => {
      if (color && color.r !== undefined) {
        classes.push(`${prefix}bg-r-${color.r}`);
        classes.push(`${prefix}bg-g-${color.g}`);
        classes.push(`${prefix}bg-b-${color.b}`);
      }
    });

    // Spacing
    Object.entries(theme.spacing).forEach(([sizeName, value]) => {
      classes.push(`${prefix}p-${value}`);
      classes.push(`${prefix}m-${value}`);
    });

    // Typography
    if (theme.typography) {
      Object.entries(theme.typography.size).forEach(([sizeName, value]) => {
        classes.push(`${prefix}text-${value}`);
      });
    }

    // Effects
    if (theme.effects) {
      Object.entries(theme.effects.borderRadius).forEach(([sizeName, value]) => {
        classes.push(`${prefix}rounded-${value}`);
      });

      Object.entries(theme.effects.shadow).forEach(([sizeName, value]) => {
        classes.push(`${prefix}shadow-${value}`);
      });
    }

    // Transitions
    if (theme.transitions) {
      Object.entries(theme.transitions).forEach(([speedName, value]) => {
        classes.push(`${prefix}duration-${value}`);
      });
    }

    return classes;
  },

  toCSSVariables(theme, prefix = 'ub') {
    const variables = {};

    // Colors
    Object.entries(theme.colors).forEach(([colorName, color]) => {
      if (color && color.r !== undefined) {
        variables[`--${prefix}-${colorName}-r`] = color.r;
        variables[`--${prefix}-${colorName}-g`] = color.g;
        variables[`--${prefix}-${colorName}-b`] = color.b;
      }
    });

    return variables;
  }
};

// ✅ FIXED: Complete ub object with ALL properties
export const ub = {
  // Store access
  store: ubStore,
  
  // Store methods shortcuts
  parse: (classStr) => ubStore.parse(classStr),
  getCSS: (classNames) => ubStore.getCSS(classNames),
  setValue: (key, value, options) => ubStore.setValue(key, value, options),
  getValue: (key) => ubStore.getValue(key),
  
  // Hardware operations
  readHardware: async (key, operation, ...params) => 
    await ubStore.updateFromHardware(key, operation, ...params),
  
  // Stats
  getStats: () => ubStore.getStats(),
  
  // ✅ FIXED: All property generators defined
  // Sizing
  w: (val) => `ub-w-${Math.max(0, Math.min(255, val))}`,
  h: (val) => `ub-h-${Math.max(0, Math.min(255, val))}`,
  minW: (val) => `ub-min-w-${Math.max(0, Math.min(255, val))}`,
  maxW: (val) => `ub-max-w-${Math.max(0, Math.min(255, val))}`,
  minH: (val) => `ub-min-h-${Math.max(0, Math.min(255, val))}`,
  maxH: (val) => `ub-max-h-${Math.max(0, Math.min(255, val))}`,

  // Spacing - same pattern...
  p: (val) => `ub-p-${Math.max(0, Math.min(255, val))}`,
  px: (val) => `ub-p-x-${Math.max(0, Math.min(255, val))}`,
  py: (val) => `ub-p-y-${Math.max(0, Math.min(255, val))}`,
  pt: (val) => `ub-p-t-${Math.max(0, Math.min(255, val))}`,
  pr: (val) => `ub-p-r-${Math.max(0, Math.min(255, val))}`,
  pb: (val) => `ub-p-b-${Math.max(0, Math.min(255, val))}`,
  pl: (val) => `ub-p-l-${Math.max(0, Math.min(255, val))}`,

  m: (val) => `ub-m-${Math.max(0, Math.min(255, val))}`,
  mx: (val) => `ub-m-x-${Math.max(0, Math.min(255, val))}`,
  my: (val) => `ub-m-y-${Math.max(0, Math.min(255, val))}`,
  mt: (val) => `ub-m-t-${Math.max(0, Math.min(255, val))}`,
  mr: (val) => `ub-m-r-${Math.max(0, Math.min(255, val))}`,
  mb: (val) => `ub-m-b-${Math.max(0, Math.min(255, val))}`,
  ml: (val) => `ub-m-l-${Math.max(0, Math.min(255, val))}`,

  gap: (val) => `ub-gap-${Math.max(0, Math.min(255, val))}`,
  gapX: (val) => `ub-gap-x-${Math.max(0, Math.min(255, val))}`,
  gapY: (val) => `ub-gap-y-${Math.max(0, Math.min(255, val))}`,

  // Colors
  bg: (val) => `ub-bg-${Math.max(0, Math.min(255, val))}`,
  bgR: (val) => `ub-bg-r-${Math.max(0, Math.min(255, val))}`,
  bgG: (val) => `ub-bg-g-${Math.max(0, Math.min(255, val))}`,
  bgB: (val) => `ub-bg-b-${Math.max(0, Math.min(255, val))}`,
  bgA: (val) => `ub-bg-a-${Math.max(0, Math.min(255, val))}`,

  text: (val) => `ub-text-${Math.max(0, Math.min(255, val))}`,
  textR: (val) => `ub-text-r-${Math.max(0, Math.min(255, val))}`,
  textG: (val) => `ub-text-g-${Math.max(0, Math.min(255, val))}`,
  textB: (val) => `ub-text-b-${Math.max(0, Math.min(255, val))}`,

  border: (val) => `ub-border-${Math.max(0, Math.min(255, val))}`,
  borderR: (val) => `ub-border-r-${Math.max(0, Math.min(255, val))}`,
  borderG: (val) => `ub-border-g-${Math.max(0, Math.min(255, val))}`,
  borderB: (val) => `ub-border-b-${Math.max(0, Math.min(255, val))}`,

  // Typography
  textSize: (val) => `ub-text-${Math.max(0, Math.min(255, val))}`,
  leading: (val) => `ub-leading-${Math.max(0, Math.min(255, val))}`,
  tracking: (val) => `ub-tracking-${Math.max(0, Math.min(255, val))}`,
  font: (val) => `ub-font-${Math.max(0, Math.min(255, val))}`,

  // Borders
  rounded: (val) => `ub-rounded-${Math.max(0, Math.min(255, val))}`,
  roundedTL: (val) => `ub-rounded-tl-${Math.max(0, Math.min(255, val))}`,
  roundedTR: (val) => `ub-rounded-tr-${Math.max(0, Math.min(255, val))}`,
  roundedBL: (val) => `ub-rounded-bl-${Math.max(0, Math.min(255, val))}`,
  roundedBR: (val) => `ub-rounded-br-${Math.max(0, Math.min(255, val))}`,
  borderWidth: (val) => `ub-border-${Math.max(0, Math.min(255, val))}`,
  borderWidthT: (val) => `ub-border-t-${Math.max(0, Math.min(255, val))}`,
  borderWidthR: (val) => `ub-border-r-${Math.max(0, Math.min(255, val))}`,
  borderWidthB: (val) => `ub-border-b-${Math.max(0, Math.min(255, val))}`,
  borderWidthL: (val) => `ub-border-l-${Math.max(0, Math.min(255, val))}`,

  // Effects
  opacity: (val) => `ub-opacity-${Math.max(0, Math.min(255, val))}`,
  shadow: (val) => `ub-shadow-${Math.max(0, Math.min(255, val))}`,
  blur: (val) => `ub-blur-${Math.max(0, Math.min(255, val))}`,
  brightness: (val) => `ub-brightness-${Math.max(0, Math.min(255, val))}`,
  contrast: (val) => `ub-contrast-${Math.max(0, Math.min(255, val))}`,
  grayscale: (val) => `ub-grayscale-${Math.max(0, Math.min(255, val))}`,
  hue: (val) => `ub-hue-${Math.max(0, Math.min(255, val))}`,
  saturate: (val) => `ub-saturate-${Math.max(0, Math.min(255, val))}`,
  sepia: (val) => `ub-sepia-${Math.max(0, Math.min(255, val))}`,

  // Transforms
  rotate: (val) => `ub-rotate-${Math.max(0, Math.min(255, val))}`,
  scale: (val) => `ub-scale-${Math.max(0, Math.min(255, val))}`,
  scaleX: (val) => `ub-scale-x-${Math.max(0, Math.min(255, val))}`,
  scaleY: (val) => `ub-scale-y-${Math.max(0, Math.min(255, val))}`,
  translateX: (val) => `ub-translate-x-${Math.max(0, Math.min(255, val))}`,
  translateY: (val) => `ub-translate-y-${Math.max(0, Math.min(255, val))}`,

  // Gradients
  gradientAngle: (val) => `ub-gradient-angle-${Math.max(0, Math.min(255, val))}`,
  gradientFrom: (val) => `ub-gradient-from-${Math.max(0, Math.min(255, val))}`,
  gradientTo: (val) => `ub-gradient-to-${Math.max(0, Math.min(255, val))}`,
  gradientType: (val) => `ub-gradient-type-${Math.max(0, Math.min(255, val))}`,

  // Layout
  top: (val) => `ub-top-${Math.max(0, Math.min(255, val))}`,
  right: (val) => `ub-right-${Math.max(0, Math.min(255, val))}`,
  bottom: (val) => `ub-bottom-${Math.max(0, Math.min(255, val))}`,
  left: (val) => `ub-left-${Math.max(0, Math.min(255, val))}`,
  z: (val) => `ub-z-${Math.max(0, Math.min(255, val))}`,

  // Grid
  colSpan: (val) => `ub-col-span-${Math.max(1, Math.min(12, val))}`,
  rowSpan: (val) => `ub-row-span-${Math.max(1, Math.min(12, val))}`,
  gridCols: (val) => `ub-grid-cols-${Math.max(1, Math.min(12, val))}`,
  gridRows: (val) => `ub-grid-rows-${Math.max(1, Math.min(12, val))}`,

  // Flexbox
  flex: (val) => `ub-flex-${Math.max(0, Math.min(255, val))}`,
  basis: (val) => `ub-basis-${Math.max(0, Math.min(255, val))}`,
  grow: (val) => `ub-grow-${Math.max(0, Math.min(255, val))}`,
  shrink: (val) => `ub-shrink-${Math.max(0, Math.min(255, val))}`,

  // Effects
  backdropBlur: (val) => `ub-backdrop-blur-${Math.max(0, Math.min(255, val))}`,
  backdropBrightness: (val) => `ub-backdrop-brightness-${Math.max(0, Math.min(255, val))}`,
  dropShadow: (val) => `ub-drop-shadow-${Math.max(0, Math.min(255, val))}`,
  invert: (val) => `ub-invert-${Math.max(0, Math.min(255, val))}`,

  // Transitions
  duration: (val) => `ub-duration-${Math.max(0, Math.min(255, val))}`,
  delay: (val) => `ub-delay-${Math.max(0, Math.min(255, val))}`,
  timing: (val) => `ub-timing-${Math.max(0, Math.min(255, val))}`,

  // Animation
  animationDuration: (val) => `ub-animation-duration-${Math.max(0, Math.min(255, val))}`,
  animationDelay: (val) => `ub-animation-delay-${Math.max(0, Math.min(255, val))}`,
  animationIteration: (val) => `ub-animation-iteration-${Math.max(1, Math.min(10, val))}`,

  // Interactivity
  cursor: (val) => `ub-cursor-${Math.max(0, Math.min(255, val))}`,
  select: (val) => `ub-select-${Math.max(0, Math.min(255, val))}`,

  // States (with modifiers)
  hover: (className, modifier = 30) => `${className}:hover:${modifier}`,
  focus: (className, modifier = 20) => `${className}:focus:${modifier}`,
  active: (className, modifier = 40) => `${className}:active:${modifier}`,

  // Scroll effects
  scrollFade: () => 'ub-scroll-fade',
  scrollParallax: () => 'ub-scroll-parallax',
  scrollScale: () => 'ub-scroll-scale',
  scrollBlur: () => 'ub-scroll-blur',

  // Shortcuts
  full: 'ub-w-255',
  half: 'ub-w-128',
  auto: 'ub-m-auto',
  hidden: 'ub-opacity-0',
  visible: 'ub-opacity-255',
  center: 'ub-m-x-auto ub-m-y-auto',
  absolute: 'ub-top-0 ub-left-0 ub-right-0 ub-bottom-0',
  fixed: 'ub-top-0 ub-left-0 ub-right-0 ub-bottom-0 ub-z-255',

  // Presets
  container: ['ub-w-255', 'ub-p-32', 'ub-m-x-auto'],
  card: ['ub-p-64', 'ub-rounded-64', 'ub-shadow-100', 'ub-bg-255'],
  button: ['ub-p-x-96', 'ub-p-y-32', 'ub-rounded-48', 'ub-bg-200', 'ub-text-0'],
  buttonPrimary: ['ub-p-x-96', 'ub-p-y-32', 'ub-rounded-48', 'ub-bg-r-40', 'ub-bg-g-120', 'ub-bg-b-220', 'ub-text-255'],
  buttonHover: ['ub-bg-r-60', 'ub-bg-g-140', 'ub-bg-b-240'],

  // Utility
  cls: (...classes) => classes.join(' '),
  style: (classes) => {
    const css = ubStore.getCSS(Array.isArray(classes) ? classes : [classes]);
    const styleObj = {};
    css.split(';').forEach(rule => {
      const [key, value] = rule.split(':').map(s => s.trim());
      if (key && value) {
        const reactKey = key.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
        styleObj[reactKey] = value;
      }
    });
    return styleObj;
  },
  css: (classes) => ubStore.getCSS(Array.isArray(classes) ? classes : [classes]),
  
  // Event system
  on: (key, callback) => ubStore.on(key, callback),
  
  // ✅ FIXED: Theme generator shortcut
  generateTheme: (seed, options) => UBTheme.generate(seed, options)
};

// Core utilities (store-aware versions)
export const parse = (classStr) => ubStore.parse(classStr);
export const toCSS = (classes) => ubStore.getCSS(Array.isArray(classes) ? classes : [classes]);
export const combine = (classes) => ubStore.getCSS(classes);
export const toReactStyle = (classes) => {
  const css = ubStore.getCSS(Array.isArray(classes) ? classes : [classes]);
  const style = {};
  css.split(';').forEach(rule => {
    const [key, value] = rule.split(':').map(s => s.trim());
    if (key && value) {
      const reactKey = key.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      style[reactKey] = value;
    }
  });
  return style;
};
export const isValid = (className) => !!ubStore.parse(className);
export const generate = (property, value) => `ub-${property}-${Math.max(0, Math.min(255, value))}`;

// Style management (store-aware)
export const inject = (className) => {
  manager.inject(className);
  ubStore.parse(className); // Pre-cache in store
};
export const injectAll = (classNames) => {
  manager.injectAll(classNames);
  classNames.forEach(cls => ubStore.parse(cls));
};
export const apply = (element, classNames, options) => {
  manager.apply(element, classNames, options);
  classNames.forEach(cls => ubStore.parse(cls));
};
export const animate = (element, classNames, options) => {
  manager.animate(element, classNames, options);
  classNames.forEach(cls => ubStore.parse(cls));
};
export const clearStyles = (element) => manager.clear(element);

// Initialize real-time engine
const realTimeEngine = new RealTimeDynamicEngine();

// Create the default export object with full store integration
const UniversalBinary = {
  // Version info
  version: '7.1.0-hardware-ready', // Updated version
  
  // Core
  parse,
  toCSS,
  combine,
  toReactStyle,
  isValid,
  generate,

  // Manager
  inject,
  injectAll,
  apply,
  animate,
  clearStyles,

  // Hooks
  useUB,
  useUBProperty,
  useUBResponsive,
  useUBScroll,
  useUBSequence,

  // Real-time Engine
  engine: realTimeEngine,
  watch: (property, callback) => realTimeEngine.watch(property, callback),
  watchHardware: (key, callback) => realTimeEngine.watchHardware(key, callback),
  set: (property, value, options) => realTimeEngine.set(property, value, options),
  get: (property) => realTimeEngine.get(property),
  createReactive: (property, initialValue, options) =>
    realTimeEngine.createReactive(property, initialValue, options),
  
  // Hardware operations
  readFromHardware: async (key, operation, ...params) =>
    await realTimeEngine.readFromHardware(key, operation, ...params),

  // Store access
  store: ubStore,
  getStoreStats: () => ubStore.getStats(),
  clearStoreCache: (pattern) => ubStore.clearCache(pattern),

  // Theme
  theme: UBTheme,
  generateTheme: (seed, options) => UBTheme.generate(seed, options),
  themeToClasses: (theme, prefix) => UBTheme.toClasses(theme, prefix),

  // ✅ FIXED: ub object properly included
  ub, // यो अब generateTheme method सहित complete छ

  // Classes
  Parser: UniversalParser,
  Manager: manager,
  RealTimeEngine: realTimeEngine,
  Store: ubStore,
  
  // Helper functions
  cssToObject: (cssString) => realTimeEngine.cssToObject(cssString)
};

// Export everything individually
export {
  UniversalParser,
  getStyleManager,
  useUB,
  useUBProperty,
  useUBResponsive,
  useUBScroll,
  useUBSequence,
  realTimeEngine as RealTimeEngine,
  UBTheme,
  ubStore,
};

// Export default
export default UniversalBinary;

// Auto-initialize for browser global
if (typeof window !== 'undefined') {
  window.UniversalBinary = UniversalBinary;
  window.UB = UniversalBinary; // ✅ UB shortcut
  window.ubStore = ubStore;
  
  // Log initialization
  setTimeout(() => {
    console.log('🚀 Universal Binary Engine v7.1 Ready');
    console.log('   • UB.ub properties:', Object.keys(ub).length);
    console.log('   • WebAssembly Bridge:', ubStore.isWasmReady ? 'ACTIVE' : 'FALLBACK');
    console.log('   • Store Cache:', ubStore.getStats().cacheSize + ' items');
    console.log('   • ✅ Theme Generator: Fixed (0-255 range only)');
  }, 100);
}