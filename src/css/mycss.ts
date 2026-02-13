// /src/lib/ub-core.ts
// UB-StyleSheet v7.6.3 - FULL FEATURES + HEIGHT FIXED
// ✅ सबै features छन् + height सही छ!

import { useState, useRef, useEffect } from 'react';

type WebStyle = string;
type NativeStyle = Record<string, any>;
type PlatformStyle = { web?: WebStyle; default?: NativeStyle };

const isWeb = typeof document !== 'undefined';

// ==================== 🎯 OKLCH COLOR ENGINE ====================

const baseOKLCH: Record<string, [number, number, number]> = {
  red: [0.60, 0.25, 25], crimson: [0.55, 0.22, 20], rose: [0.78, 0.18, 10],
  orange: [0.75, 0.18, 60], amber: [0.82, 0.15, 80], copper: [0.75, 0.15, 45],
  coral: [0.78, 0.20, 15], yellow: [0.90, 0.14, 85], gold: [0.85, 0.18, 70],
  green: [0.65, 0.18, 145], lime: [0.85, 0.20, 135], emerald: [0.70, 0.16, 160],
  teal: [0.68, 0.15, 180], mint: [0.88, 0.12, 150], blue: [0.65, 0.20, 260],
  sky: [0.82, 0.14, 220], cyan: [0.80, 0.16, 200], aqua: [0.84, 0.14, 190],
  navy: [0.45, 0.18, 250], indigo: [0.60, 0.22, 275], purple: [0.62, 0.18, 310],
  violet: [0.65, 0.20, 290], lavender: [0.80, 0.16, 280], magenta: [0.70, 0.24, 320],
  fuchsia: [0.68, 0.22, 330], pink: [0.75, 0.20, 350], brown: [0.70, 0.10, 30],
  stone: [0.90, 0.05, 40], slate: [0.92, 0.04, 220], gray: [0.85, 0.02, 240],
  zinc: [0.94, 0.02, 0], neutral: [0.92, 0.00, 0], white: [0.96, 0.01, 0],
  black: [0.14, 0.00, 0],
};

const getOKLCH = (name: string, shade: number): string => {
  const base = baseOKLCH[name.toLowerCase()] || [0.75, 0.10, 0];
  const [baseL, baseC, H] = base;
  const t = Math.max(0, Math.min(255, shade)) / 255;

  let L: number, C: number;
  
  if (name.toLowerCase() === 'white') {
    L = 0.88 + (t * 0.12);
    C = baseC * (1 - t * 0.4);
  } else if (name.toLowerCase() === 'black') {
    L = 0.08 + (t * 0.27);
    C = baseC * t * 0.6;
  } else if (['gray', 'slate', 'zinc', 'neutral', 'stone'].includes(name.toLowerCase())) {
    L = 0.15 + (t * 0.80);
    C = baseC * (1 - Math.abs(t - 0.5) * 1.2);
  } else {
    L = 0.12 + (t * 0.84);
    C = baseC * (0.25 + (t * 0.75));
    if (shade > 60 && shade < 200) {
      C *= (1.0 + 0.15 * Math.sin((shade - 60) / 140 * Math.PI));
    }
  }

  L = Math.max(0.10, Math.min(0.96, L));
  C = Math.max(0.03, Math.min(0.37, C));

  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H})`;
};

// ==================== 🎯 RESPONSIVE ENGINE ====================

const fluid = (min: number, max: number) => 
  `${min * 0.25}rem, ${min * 0.25 + 1.2}vw, ${max * 0.25}rem`;

const fluidPx = (min: number, max: number) => 
  `${min}px, 2vw, ${max}px`;

// ==================== 🎯 HELPERS ====================

const extractArbitrary = (v: string): string | null => {
  if (v.startsWith('[') && v.endsWith(']')) {
    return v.slice(1, -1).replace(/_/g, ' ');
  }
  return null;
};

const processValue = (v: number | string): string | number => {
  if (typeof v !== 'string') return v;
  const arb = extractArbitrary(v);
  if (arb) return arb;
  if (/px|%|rem|em|vw|vh|deg|rad|grad|turn|ms|s/.test(v)) return v;
  const num = parseFloat(v);
  return isNaN(num) ? v : num;
};

const rem = (n: number): string => `${n * 0.25}rem`;
const rnSize = (n: number): number => n * 4;
const rnSizeHalf = (n: number): number => n * 2;
const percent = (n: number): string => `${(n / 255) * 100}%`;

// ✅ Device scale helpers
export const deviceToScale = (pixels: number): number => Math.min(255, Math.floor(pixels / 4));
export const scaleToPixels = (scale: number): number => scale * 4;

// ==================== 🎯 FACTORIES ====================

const createSpacing = (props: string[]) => (v: number | string): PlatformStyle => {
  const val = processValue(v);
  const isStr = typeof val === 'string';
  const webVal = isStr ? val : rem(val as number);
  const rnVal = isStr ? val : rnSize(val as number);

  const webParts = props.map(p => {
    const css = p === 'paddingHorizontal' ? 'padding-left padding-right' :
                p === 'paddingVertical' ? 'padding-top padding-bottom' :
                p === 'marginHorizontal' ? 'margin-left margin-right' :
                p === 'marginVertical' ? 'margin-top margin-bottom' :
                p.replace(/([A-Z])/g, '-$1').toLowerCase();
    
    return css.includes(' ') 
      ? css.split(' ').map(c => `${c}: ${webVal}`).join('; ')
      : `${css}: ${webVal}`;
  }).join('; ');

  const native = props.reduce((acc, p) => ({ ...acc, [p]: rnVal }), {} as Record<string, any>);
  return { web: webParts, default: native };
};

const createBorderDir = (dir: string, capDir: string) => (v: number | string): PlatformStyle => {
  const val = processValue(v);
  const isStr = typeof val === 'string';
  const webVal = isStr ? val : rem(val as number);
  const rnVal = isStr ? val : rnSizeHalf(val as number);
  return {
    web: `border-${dir}-width: ${webVal}`,
    default: { [`border${capDir}Width`]: rnVal }
  };
};

// ==================== 🎯 CSS DICTIONARY ====================

const CSS_DICT: Record<string, (v: any) => PlatformStyle> = {
  // Spacing
  p: createSpacing(['padding']), 
  px: createSpacing(['paddingHorizontal']), 
  py: createSpacing(['paddingVertical']),
  pt: createSpacing(['paddingTop']), 
  pr: createSpacing(['paddingRight']), 
  pb: createSpacing(['paddingBottom']), 
  pl: createSpacing(['paddingLeft']),
  m: createSpacing(['margin']), 
  mx: createSpacing(['marginHorizontal']), 
  my: createSpacing(['marginVertical']),
  mt: createSpacing(['marginTop']), 
  mr: createSpacing(['marginRight']), 
  mb: createSpacing(['marginBottom']), 
  ml: createSpacing(['marginLeft']),
  gap: createSpacing(['gap']),

  // Fluid utilities
  'p-fluid': (v: string | number): PlatformStyle => {
    if (typeof v !== 'string') return { web: '', default: {} };
    const [min, max] = v.split('-').map(Number);
    if (isNaN(min) || isNaN(max)) return { web: '', default: {} };
    return { web: `padding: clamp(${fluid(min, max)})`, default: { padding: (min + max) * 2 } };
  },
  'm-fluid': (v: string | number): PlatformStyle => {
    if (typeof v !== 'string') return { web: '', default: {} };
    const [min, max] = v.split('-').map(Number);
    if (isNaN(min) || isNaN(max)) return { web: '', default: {} };
    return { web: `margin: clamp(${fluid(min, max)})`, default: { margin: (min + max) * 2 } };
  },
  'gap-fluid': (v: string | number): PlatformStyle => {
    if (typeof v !== 'string') return { web: '', default: {} };
    const [min, max] = v.split('-').map(Number);
    if (isNaN(min) || isNaN(max)) return { web: '', default: {} };
    return { web: `gap: clamp(${fluid(min, max)})`, default: { gap: (min + max) * 2 } };
  },

  // Dimensions - ✅ HEIGHT FIXED!
  w: (v: number | string): PlatformStyle => {
    const val = processValue(v);
    if (typeof val === 'string') return { web: `width: ${val}`, default: { width: val } };
    const pxValue = (val as number) * 4;
    return { web: `width: ${pxValue}px`, default: { width: pxValue } };
  },
  
  h: (v: number | string): PlatformStyle => {
    const val = processValue(v);
    if (typeof val === 'string') return { web: `height: ${val}`, default: { height: val } };
    const pxValue = (val as number) * 4; // ✅ FIXED!
    return { web: `height: ${pxValue}px`, default: { height: pxValue } };
  },

  'w-fluid': (v: string | number): PlatformStyle => {
    if (typeof v !== 'string') return { web: '', default: {} };
    const [min, max] = v.split('-').map(Number);
    if (isNaN(min) || isNaN(max)) return { web: '', default: {} };
    return { web: `width: clamp(${fluidPx(min, max)})`, default: { width: (min + max) / 2 } };
  },
  'h-fluid': (v: string | number): PlatformStyle => {
    if (typeof v !== 'string') return { web: '', default: {} };
    const [min, max] = v.split('-').map(Number);
    if (isNaN(min) || isNaN(max)) return { web: '', default: {} };
    return { web: `height: clamp(${fluidPx(min, max)})`, default: { height: (min + max) / 2 } };
  },

  // Colors
  bg: (input: string | number): PlatformStyle => {
    let color: string;
    if (typeof input === 'number') {
      const v = Math.round(Math.max(0, Math.min(255, input)));
      color = `rgb(${v},${v},${v})`;
    } else if (typeof input === 'string') {
      const match = input.match(/^([a-z]+)-(\d{1,3})$/i);
      if (match) {
        const [, name, shadeStr] = match;
        const shade = parseInt(shadeStr, 10);
        if (!isNaN(shade) && shade >= 0 && shade <= 255) {
          color = getOKLCH(name, shade);
        } else {
          color = input;
        }
      } else if (input.startsWith('#')) {
        color = input;
      } else if (input.startsWith('rgb') || input.startsWith('hsl') || input.startsWith('oklch')) {
        color = input;
      } else if (input.startsWith('[') && input.endsWith(']')) {
        color = input.slice(1, -1).replace(/_/g, ' ');
      } else {
        color = input;
      }
    } else {
      color = 'transparent';
    }
    return { web: `background-color: ${color}`, default: { backgroundColor: color } };
  },
  
  text: (input: string | number): PlatformStyle => {
    let color: string;
    if (typeof input === 'number') {
      const v = Math.round(Math.max(0, Math.min(255, input)));
      color = `rgb(${v},${v},${v})`;
    } else if (typeof input === 'string') {
      const match = input.match(/^([a-z]+)-(\d{1,3})$/i);
      if (match) {
        const [, name, shadeStr] = match;
        const shade = parseInt(shadeStr, 10);
        if (!isNaN(shade) && shade >= 0 && shade <= 255) {
          color = getOKLCH(name, shade);
        } else {
          color = input;
        }
      } else if (input.startsWith('#')) {
        color = input;
      } else if (input.startsWith('rgb') || input.startsWith('hsl') || input.startsWith('oklch')) {
        color = input;
      } else if (input.startsWith('[') && input.endsWith(']')) {
        color = input.slice(1, -1).replace(/_/g, ' ');
      } else {
        color = input;
      }
    } else {
      color = 'transparent';
    }
    return { web: `color: ${color}`, default: { color } };
  },
  
  'border-color': (input: string | number): PlatformStyle => {
    let color: string;
    if (typeof input === 'number') {
      const v = Math.round(Math.max(0, Math.min(255, input)));
      color = `rgb(${v},${v},${v})`;
    } else if (typeof input === 'string') {
      const match = input.match(/^([a-z]+)-(\d{1,3})$/i);
      if (match) {
        const [, name, shadeStr] = match;
        const shade = parseInt(shadeStr, 10);
        if (!isNaN(shade) && shade >= 0 && shade <= 255) {
          color = getOKLCH(name, shade);
        } else {
          color = input;
        }
      } else if (input.startsWith('#')) {
        color = input;
      } else if (input.startsWith('rgb') || input.startsWith('hsl') || input.startsWith('oklch')) {
        color = input;
      } else if (input.startsWith('[') && input.endsWith(']')) {
        color = input.slice(1, -1).replace(/_/g, ' ');
      } else {
        color = input;
      }
    } else {
      color = 'transparent';
    }
    return { web: `border-color: ${color}`, default: { borderColor: color } };
  },

  opacity: (v: number | string): PlatformStyle => {
    const val = processValue(v);
    const op = typeof val === 'string' ? parseFloat(val) || 1 : (val as number) / 255;
    return { web: `opacity: ${op}`, default: { opacity: op } };
  },

  // Border
  border: (v: number | string): PlatformStyle => {
    const val = processValue(v);
    const isStr = typeof val === 'string';
    const webVal = isStr ? val : rem(val as number);
    const rnVal = isStr ? val : rnSizeHalf(val as number);
    return { web: `border-width: ${webVal}`, default: { borderWidth: rnVal } };
  },
  'border-t': createBorderDir('top', 'Top'), 
  'border-r': createBorderDir('right', 'Right'),
  'border-b': createBorderDir('bottom', 'Bottom'), 
  'border-l': createBorderDir('left', 'Left'),
  'border-style': (v: string): PlatformStyle => ({ web: `border-style: ${v}`, default: { borderStyle: v } }),

  // Radius
  rounded: (v: number | string): PlatformStyle => {
    const val = processValue(v);
    if (typeof val === 'string' && val === 'full') return { web: 'border-radius: 9999px', default: { borderRadius: 9999 } };
    const isStr = typeof val === 'string';
    const webVal = isStr ? val : rem(val as number);
    const rnVal = isStr ? val : rnSize(val as number);
    return { web: `border-radius: ${webVal}`, default: { borderRadius: rnVal } };
  },

  // Shadow
  shadow: (v: number | string): PlatformStyle => {
    const val = processValue(v);
    if (typeof val === 'string') {
      return { web: `box-shadow: ${val}`, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 } };
    }
    const size = val as number;
    return {
      web: `box-shadow: 0 ${rem(size)} ${rem(size * 0.5)} rgba(0,0,0,${size/510})`,
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: size * 0.5 }, shadowOpacity: size / 510, shadowRadius: size * 0.75, elevation: size * 0.5 }
    };
  },

  // Auto Grid
  grid: (v: number | string): PlatformStyle => {
    const min = typeof v === 'number' ? v : parseInt(v as string) || 200;
    return { 
      web: `display: grid; grid-template-columns: repeat(auto-fit, minmax(${min}px, 1fr)); gap: 1rem;`,
      default: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }
    };
  },

  // Responsive Stack
  stack: (v: number | string): PlatformStyle => {
    const bp = typeof v === 'number' ? v : parseInt(v as string) || 640;
    return { 
      web: `display: flex; flex-wrap: wrap; gap: 1rem; @media (max-width: ${bp}px) { flex-direction: column; }`,
      default: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }
    };
  },

  // Container
  container: (v: number | string): PlatformStyle => {
    const max = typeof v === 'number' ? v : parseInt(v as string) || 800;
    return { 
      web: `width: 100%; max-width: ${max}px; margin-left: auto; margin-right: auto; padding-left: 1rem; padding-right: 1rem;`,
      default: { width: '100%', maxWidth: max }
    };
  },

  // Flex & Layout
  flex: (v?: number | string): PlatformStyle => v === undefined 
    ? { web: 'display: flex', default: { display: 'flex' } }
    : { web: `flex: ${processValue(v)}`, default: { flex: processValue(v) } },
  row: (): PlatformStyle => ({ web: 'flex-direction: row', default: { flexDirection: 'row' } }),
  col: (): PlatformStyle => ({ web: 'flex-direction: column', default: { flexDirection: 'column' } }),
  center: (): PlatformStyle => ({ web: 'display: flex; align-items: center; justify-content: center', default: { display: 'flex', alignItems: 'center', justifyContent: 'center' } }),
  items: (v: string): PlatformStyle => ({ web: `align-items: ${v}`, default: { alignItems: v } }),
  justify: (v: string): PlatformStyle => ({ web: `justify-content: ${v}`, default: { justifyContent: v } }),

  // Typography
  fs: (v: number | string): PlatformStyle => {
    const val = processValue(v);
    const isStr = typeof val === 'string';
    const webVal = isStr ? val : rem(val as number);
    const rnVal = isStr ? val : rnSize(val as number);
    return { web: `font-size: ${webVal}`, default: { fontSize: rnVal } };
  },
  
  'fs-fluid': (v: string | number): PlatformStyle => {
    if (typeof v !== 'string') return { web: '', default: {} };
    const [min, max] = v.split('-').map(Number);
    if (isNaN(min) || isNaN(max)) return { web: '', default: {} };
    return { web: `font-size: clamp(${fluidPx(min, max)})`, default: { fontSize: (min + max) / 2 } };
  },

  fw: (v: number | string): PlatformStyle => {
    const val = processValue(v);
    if (typeof val === 'string') return { web: `font-weight: ${val}`, default: { fontWeight: val } };
    const weight = Math.round((val as number) * 3.53);
    return { web: `font-weight: ${weight}`, default: { fontWeight: weight.toString() } };
  },
  ta: (v: string): PlatformStyle => ({ web: `text-align: ${v}`, default: { textAlign: v } }),

  // Position
  absolute: (): PlatformStyle => ({ web: 'position: absolute', default: { position: 'absolute' } }),
  relative: (): PlatformStyle => ({ web: 'position: relative', default: { position: 'relative' } }),
  fixed: (): PlatformStyle => ({ web: 'position: fixed', default: { position: 'absolute' } }),
  sticky: (): PlatformStyle => ({ web: 'position: sticky', default: { position: 'relative' } }),

  // Transforms
  scale: (v: number | string): PlatformStyle => {
    const val = processValue(v);
    if (typeof val === 'string') return { web: `transform: scale(${val})`, default: { transform: [{ scale: val }] } };
    return { web: `transform: scale(${val / 255})`, default: { transform: [{ scale: val / 255 }] } };
  },
  rotate: (v: number | string): PlatformStyle => {
    const val = processValue(v);
    const rot = typeof val === 'string' ? val : `${val}deg`;
    return { web: `transform: rotate(${rot})`, default: { transform: [{ rotate: rot }] } };
  },
  translate: (v: number | string): PlatformStyle => {
    const val = processValue(v);
    if (typeof val === 'string') return { web: `transform: translate(${val})`, default: { transform: [{ translateX: val }, { translateY: 0 }] } };
    return { web: `transform: translate(${rem(val as number)})`, default: { transform: [{ translateX: rnSize(val as number) }, { translateY: 0 }] } };
  },
  'translate-x': (v: number | string): PlatformStyle => {
    const val = processValue(v);
    if (typeof val === 'string') return { web: `transform: translateX(${val})`, default: { transform: [{ translateX: val }] } };
    return { web: `transform: translateX(${rem(val as number)})`, default: { transform: [{ translateX: rnSize(val as number) }] } };
  },
  'translate-y': (v: number | string): PlatformStyle => {
    const val = processValue(v);
    if (typeof val === 'string') return { web: `transform: translateY(${val})`, default: { transform: [{ translateY: val }] } };
    return { web: `transform: translateY(${rem(val as number)})`, default: { transform: [{ translateY: rnSize(val as number) }] } };
  },

  // Transitions
  transition: (v: string): PlatformStyle => ({ web: `transition: ${v}`, default: {} }),
  'transition-all': (): PlatformStyle => ({ web: 'transition: all 0.2s ease-in-out', default: {} }),
  'transition-colors': (): PlatformStyle => ({ web: 'transition: background-color 0.2s ease-in-out, border-color 0.2s ease-in-out, color 0.2s ease-in-out, fill 0.2s ease-in-out, stroke 0.2s ease-in-out', default: {} }),
  'transition-opacity': (): PlatformStyle => ({ web: 'transition: opacity 0.2s ease-in-out', default: {} }),
  'transition-transform': (): PlatformStyle => ({ web: 'transition: transform 0.2s ease-in-out', default: {} }),
  duration: (v: number | string): PlatformStyle => {
    const val = processValue(v);
    const dur = typeof val === 'string' ? val : `${val * 50}ms`;
    return { web: `transition-duration: ${dur}`, default: {} };
  },
  ease: (v: string): PlatformStyle => ({ web: `transition-timing-function: ${v}`, default: {} }),
  delay: (v: number | string): PlatformStyle => {
    const val = processValue(v);
    const del = typeof val === 'string' ? val : `${val * 50}ms`;
    return { web: `transition-delay: ${del}`, default: {} };
  },
};

type CSSKey = keyof typeof CSS_DICT;

// ==================== 🚀 WEB ENGINE ====================

class WebStyleEngine {
  private static instance: WebStyleEngine;
  private sheet: CSSStyleSheet | null = null;
  private cache = new Map<string, string>();
  private dynamicCache = new Map<string, string>();
  private variants = ['hover', 'active', 'focus', 'group-hover'];
  private styleElement: HTMLStyleElement | null = null;
  private counter = 0;

  private constructor() {
    if (!isWeb) return;
    try {
      this.styleElement = document.querySelector('style[data-ub="v7.6.3"]') as HTMLStyleElement;
      if (!this.styleElement) {
        this.styleElement = document.createElement('style');
        this.styleElement.setAttribute('data-ub', 'v7.6.3');
        document.head.appendChild(this.styleElement);
        console.log('✅ UB StyleSheet v7.6.3 - Full Features + Height Fixed');
      }
      this.sheet = this.styleElement.sheet;
    } catch (e) {
      console.error('❌ UB StyleSheet init error:', e);
    }
  }

  static getInstance(): WebStyleEngine {
    if (!WebStyleEngine.instance) {
      WebStyleEngine.instance = new WebStyleEngine();
    }
    return WebStyleEngine.instance;
  }

  private generateClassName(prefix: string, rawVal: string): string {
    this.counter++;
    const cleanVal = rawVal
      .replace(/[\[\]\(\)]/g, '')
      .replace(/,/g, '-')
      .replace(/\s+/g, '-')
      .replace(/_/g, '-')
      .replace(/--/g, '-')
      .replace(/[^a-zA-Z0-9-]/g, '')
      .substring(0, 30);
    
    const prefixStr = cleanVal.startsWith('-') ? 'neg' + cleanVal.substring(1) : cleanVal;
    return `ub-${prefix}-${prefixStr}-${this.counter}`;
  }

  private injectColor(color: string, shade: number, type: 'bg' | 'text' | 'border' = 'bg'): string {
    const cacheKey = `${type}-${color}-${shade}`;
    if (this.dynamicCache.has(cacheKey)) return this.dynamicCache.get(cacheKey)!;

    const className = `ub-${type}-${color}-${shade}-${this.counter++}`;
    const oklchColor = getOKLCH(color, shade);
    
    let cssProperty = '';
    switch (type) {
      case 'bg': cssProperty = 'background-color'; break;
      case 'text': cssProperty = 'color'; break;
      case 'border': cssProperty = 'border-color'; break;
    }
    
    try {
      const rule = `.${className} { ${cssProperty}: ${oklchColor} !important; }`;
      
      if (this.sheet?.cssRules) {
        this.sheet.insertRule(rule, this.sheet.cssRules.length);
      } else if (this.styleElement) {
        this.styleElement.appendChild(document.createTextNode(rule));
      }
      
      this.dynamicCache.set(cacheKey, className);
      return className;
    } catch (e) {
      console.warn(`Failed to inject ${color}-${shade}`);
      return `${color}-${shade}`;
    }
  }

  private getTextColorClass(shade: number): string {
    const textColor = shade > 150 ? 'black' : 'white';
    const cacheKey = `text-${textColor}`;
    
    if (!this.dynamicCache.has(cacheKey)) {
      const className = `ub-text-${textColor}-${this.counter++}`;
      try {
        const rule = `.${className} { color: ${textColor === 'black' ? '#000' : '#fff'} !important; }`;
        if (this.sheet?.cssRules) {
          this.sheet.insertRule(rule, this.sheet.cssRules.length);
        } else if (this.styleElement) {
          this.styleElement.appendChild(document.createTextNode(rule));
        }
        this.dynamicCache.set(cacheKey, className);
      } catch (e) {
        return textColor === 'black' ? 'text-black' : 'text-white';
      }
    }
    
    return this.dynamicCache.get(cacheKey)!;
  }

  inject(classes: string): string {
    if (!isWeb || !this.sheet) return classes;

    const classList = classes.split(/\s+/).filter(Boolean);
    const results: string[] = [];

    for (const cls of classList) {
      if (cls.startsWith('ub-')) {
        results.push(cls);
        continue;
      }

      if (!cls.includes('-') && !cls.includes(':')) {
        results.push(cls);
        continue;
      }

      let variant: string | undefined;
      let name = cls;
      if (cls.includes(':')) {
        const parts = cls.split(':');
        for (let i = 0; i < parts.length - 1; i++) {
          if (this.variants.includes(parts[i])) {
            variant = parts[i];
          }
        }
        name = parts[parts.length - 1];
      }

      const colorMatch = name.match(/^(bg|text|border)-([a-z]+)-(\d{1,3})$/);
      if (colorMatch) {
        const [, type, color, shadeStr] = colorMatch;
        const shade = parseInt(shadeStr, 10);
        if (shade >= 0 && shade <= 255 && baseOKLCH[color]) {
          const colorClass = this.injectColor(color, shade, type as any);
          if (type === 'bg') {
            const textClass = this.getTextColorClass(shade);
            results.push(colorClass, textClass);
          } else {
            results.push(colorClass);
          }
          continue;
        }
      }

      const arbMatch = name.match(/^(bg|text|border)-\[(.*)\]$/);
      if (arbMatch) {
        const [, type, value] = arbMatch;
        const className = this.generateClassName('arb', name);
        const cssProperty = type === 'bg' ? 'background-color' : type === 'text' ? 'color' : 'border-color';
        
        try {
          const selector = variant ? `.${className}:${variant}` : `.${className}`;
          const rule = `${selector} { ${cssProperty}: ${value}; }`;
          
          if (this.sheet.cssRules) {
            this.sheet.insertRule(rule, this.sheet.cssRules.length);
          } else {
            this.styleElement?.appendChild(document.createTextNode(rule));
          }
          
          results.push(className);
          continue;
        } catch {
          results.push(cls);
          continue;
        }
      }

      const match = name.match(/^(-?[a-z-]+)-(.+)$/);
      if (match) {
        const [, key, rawVal] = match;
        
        if (key in CSS_DICT) {
          const cacheKey = variant ? `${variant}:${name}` : name;
          if (this.cache.has(cacheKey)) {
            results.push(this.cache.get(cacheKey)!);
            continue;
          }

          const className = this.generateClassName(key, rawVal);
          let parsed: any = rawVal;
          
          if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
            parsed = extractArbitrary(rawVal) ?? rawVal;
          } else {
            const num = parseFloat(rawVal);
            if (!isNaN(num)) parsed = num;
          }

          try {
            const rule = CSS_DICT[key as CSSKey](parsed);
            if (rule?.web) {
              let selector = `.${className}`;
              if (variant === 'group-hover') {
                selector = `.group:hover .${className}`;
              } else if (variant) {
                selector += `:${variant}`;
              }

              const ruleStr = `${selector} { ${rule.web} }`;
              
              if (this.sheet.cssRules) {
                this.sheet.insertRule(ruleStr, this.sheet.cssRules.length);
              } else {
                this.styleElement?.appendChild(document.createTextNode(ruleStr));
              }
              
              this.cache.set(cacheKey, className);
              results.push(className);
            } else {
              results.push(cls);
            }
          } catch (e) {
            results.push(cls);
          }
        } else {
          results.push(cls);
        }
      } else {
        results.push(cls);
      }
    }

    return results.join(' ');
  }
}

// ==================== 🚀 PUBLIC API ====================

export const ub = (str: string): string => {
  if (!isWeb) return str;
  if (!str || str.trim() === '') return str;
  return WebStyleEngine.getInstance().inject(str);
};

export const ubWithBase = (str: string, base: string): string => 
  isWeb ? `${base} ${ub(str)}`.trim() : str;

export const dynamic = (color: string, shade: number): React.CSSProperties => {
  const bgColor = getOKLCH(color, shade);
  const textColor = shade > 150 ? '#000000' : '#ffffff';
  return { backgroundColor: bgColor, color: textColor };
};

export const oklch = (color: string, shade: number): string => {
  return getOKLCH(color, shade);
};

export const useDeviceScale = () => {
  const [scale, setScale] = useState({ width: 0, height: 0, pixels: { width: 0, height: 0 } });

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setScale({
        width: deviceToScale(w),
        height: deviceToScale(h),
        pixels: { width: w, height: h }
      });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return scale;
};

export const style = (str: string): NativeStyle => {
  if (isWeb) return {};
  const res: NativeStyle = {};
  const classes = str.split(/\s+/).filter(Boolean);
  for (const cls of classes) {
    if (!cls.trim() || cls.includes(':')) continue;
    const m = cls.match(/^([a-z-]+)-(.+)$/);
    if (!m) continue;
    const [, key, raw] = m;
    if (!(key in CSS_DICT)) continue;
    let val: any = raw;
    if (raw.startsWith('[') && raw.endsWith(']')) val = extractArbitrary(raw) ?? raw;
    else { const num = parseFloat(raw); if (!isNaN(num)) val = num; }
    try { 
      const rule = CSS_DICT[key as CSSKey](val); 
      if (rule?.default) Object.assign(res, rule.default); 
    } catch {}
  }
  return res;
};

export const create = <T extends Record<string, any>>(styles: T): T => {
  if (isWeb) return styles;
  const RN = getRN();
  if (!RN) return styles;
  const rn: Record<string, any> = {};
  for (const [key, obj] of Object.entries(styles)) {
    rn[key] = {};
    for (const [prop, val] of Object.entries(obj as Record<string, any>)) {
      if (prop in CSS_DICT) {
        try {
          let pVal: any = val;
          if (typeof val === 'string' && val.startsWith('[') && val.endsWith(']')) pVal = extractArbitrary(val) ?? val;
          else if (typeof val === 'string') { const num = parseFloat(val); if (!isNaN(num)) pVal = num; }
          const rule = CSS_DICT[prop as CSSKey](pVal);
          if (rule?.default) Object.assign(rn[key], rule.default);
        } catch {}
      }
    }
  }
  try { return RN.create(rn) as T; } catch { return styles; }
};

export const useStyles = (init: Record<string, any> = {}) => {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<Record<string, any>>(init);
  useEffect(() => {
    if (!isWeb || !ref.current) return;
    const rules: string[] = [];
    for (const [key, val] of Object.entries(state)) {
      if (key in CSS_DICT) { 
        try { 
          const rule = CSS_DICT[key as CSSKey](val); 
          if (rule?.web) rules.push(rule.web); 
        } catch {} 
      }
    }
    ref.current.style.cssText = rules.join('; ');
  }, [state]);
  return {
    ref,
    styles: { 
      ...state, 
      set: (key: string, val: number): void => 
        setState((prev: Record<string, any>) => ({ ...prev, [key]: Math.max(0, Math.min(255, val)) })) 
    },
  };
};

// ==================== 🚀 HELPER FUNCTIONS ====================

export const hover = (s: string): string => {
  if (!s) return '';
  return isWeb ? ub(s.split(' ').map(c => `hover:${c}`).join(' ')) : s;
};
  
export const active = (s: string): string => {
  if (!s) return '';
  return isWeb ? ub(s.split(' ').map(c => `active:${c}`).join(' ')) : s;
};
  
export const focus = (s: string): string => {
  if (!s) return '';
  return isWeb ? ub(s.split(' ').map(c => `focus:${c}`).join(' ')) : s;
};
  
export const groupHover = (s: string): string => {
  if (!s) return '';
  return isWeb ? ub(s.split(' ').map(c => `group-hover:${c}`).join(' ')) : s;
};

export const arb = (property: string, value?: string): string => {
  if (!property) return '';
  if (!value || value.trim() === '') return `${property}-[missing-value]`;
  try {
    let val = value.trim();
    if (!val.startsWith('[')) val = `[${val}`;
    if (!val.endsWith(']')) val = `${val}]`;
    return `${property}-${val}`;
  } catch {
    return `${property}-[error]`;
  }
};

export const gradient = (direction: string = '45deg', ...colors: string[]): string => {
  if (!colors || colors.length === 0) return 'bg-[linear-gradient(45deg,_#000,_#fff)]';
  try {
    const processedColors = colors.map(c => {
      if (!c) return '#000';
      const match = c.match(/^([a-z]+)-(\d+)$/);
      if (match) {
        const [, name, shade] = match;
        return getOKLCH(name, parseInt(shade)).replace(/ /g, '_');
      }
      return c.replace(/ /g, '_');
    });
    return `bg-[linear-gradient(${direction},_${processedColors.join(',_')})]`;
  } catch {
    return 'bg-[linear-gradient(45deg,_#000,_#fff)]';
  }
};

export const radialGradient = (shape: string = 'circle_at_center', ...colors: string[]): string => {
  if (!colors || colors.length === 0) return 'bg-[radial-gradient(circle_at_center,_#000,_#fff)]';
  try {
    const processedColors = colors.map(c => {
      if (!c) return '#000';
      const match = c.match(/^([a-z]+)-(\d+)$/);
      if (match) {
        const [, name, shade] = match;
        return getOKLCH(name, parseInt(shade)).replace(/ /g, '_');
      }
      return c.replace(/ /g, '_');
    });
    return `bg-[radial-gradient(${shape},_${processedColors.join(',_')})]`;
  } catch {
    return 'bg-[radial-gradient(circle_at_center,_#000,_#fff)]';
  }
};

export const conicGradient = (from: string = 'from_90deg', ...colors: string[]): string => {
  if (!colors || colors.length === 0) return 'bg-[conic-gradient(from_90deg,_#000,_#fff)]';
  try {
    const processedColors = colors.map(c => {
      if (!c) return '#000';
      const match = c.match(/^([a-z]+)-(\d+)$/);
      if (match) {
        const [, name, shade] = match;
        return getOKLCH(name, parseInt(shade)).replace(/ /g, '_');
      }
      return c.replace(/ /g, '_');
    });
    return `bg-[conic-gradient(${from},_${processedColors.join(',_')})]`;
  } catch {
    return 'bg-[conic-gradient(from_90deg,_#000,_#fff)]';
  }
};

export const transform = (value?: string): string => {
  if (!value || value.trim() === '') return 'transform-[scale(1)]';
  try {
    const val = value.replace(/\s+/g, '_');
    return `transform-[${val}]`;
  } catch {
    return 'transform-[scale(1)]';
  }
};

export const val = (v: string | number | undefined): string | number => {
  if (v === undefined || v === null) return 0;
  return v;
};

export const colorNames: string[] = Object.keys(baseOKLCH).sort();

// ==================== 🚀 EXPORT ====================

export const UB = {
  ub, ubWithBase, create, useStyles, style,
  hover, active, focus, groupHover,
  val, arb, transform,
  gradient, radialGradient, conicGradient,
  dynamic, oklch, useDeviceScale,
  deviceToScale, scaleToPixels,
  colorNames,
  version: 'v7.6.3-full-features'
};

export default UB;