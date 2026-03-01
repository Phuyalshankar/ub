// /src/lib/mycss.ts - v17.13.0 (PERFECT INVERSION WITH !important)
// ✅ Perceptual color inversion (APCA-based)
// ✅ !important added for CSS specificity
// ✅ Gray-specific thresholds
// ✅ Pure Black (0.10) and Pure White (0.99)
// ✅ Caret color sync
// ✅ All utilities preserved
// ✅ DOM Proxy for no ub() needed in components

import { useState, useRef, useEffect } from 'react';

// ==================== CONSTANTS ====================

const isWeb = typeof document !== 'undefined';
const SCALE_MAX = 255;
const PX_MULTIPLIER = 4;      // spacing: p-1 = 4px
const BORDER_MULTIPLIER = 1;   // border: border-1 = 1px
const GAP_MULTIPLIER = 4;      // grid gap: gap-1 = 4px
const SIZE_MULTIPLIER = 4;     // width/height: w-1 = 4px

// ==================== TYPES ====================

export type Scale = number;
export type ColorName = string;
export type Direction = 'ltr' | 'rtl';
export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type Pseudo = 'hover' | 'active' | 'focus' | 'group-hover';
export type SpacingType = 'p' | 'm' | 'pl' | 'pr' | 'ml' | 'mr' | 'pt' | 'pb' | 'mt' | 'mb';

// ==================== BASE DATA ====================

const BASE_COLORS: Record<string, [number, number, number]> = {
  red: [0.62, 0.28, 25],
  blue: [0.68, 0.24, 260],
  green: [0.67, 0.22, 145],
  purple: [0.65, 0.22, 310],
  orange: [0.78, 0.22, 60],
  pink: [0.78, 0.24, 350],
  teal: [0.70, 0.18, 180],
  amber: [0.84, 0.18, 80],
  gray: [0.88, 0.04, 240],
};

const BREAKPOINTS: Record<Breakpoint, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

const SPACING_MAP: Record<SpacingType, string> = {
  p: 'padding', pt: 'padding-top', pb: 'padding-bottom',
  pl: 'padding-left', pr: 'padding-right',
  m: 'margin', mt: 'margin-top', mb: 'margin-bottom',
  ml: 'margin-left', mr: 'margin-right',
};

const BORDER_SIDE_MAP: Record<string, string> = {
  t: 'top', r: 'right', b: 'bottom', l: 'left'
};

// ==================== SAFE NUMBER UTILITIES ====================

const safeToString = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  try {
    return String(value);
  } catch {
    return '';
  }
};

const safeParseFloat = (value: any): number => {
  if (typeof value === 'number' && !isNaN(value)) return Math.max(0, value);
  const str = safeToString(value);
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.max(0, num);
};

const safeParseInt = (value: any, defaultValue: number = 0): number => {
  if (typeof value === 'number' && !isNaN(value)) return Math.max(0, Math.floor(value));
  const str = safeToString(value);
  const num = parseInt(str, 10);
  return isNaN(num) ? defaultValue : Math.max(0, num);
};

const safeClamp = (value: number, min: number, max: number): number => 
  Math.min(max, Math.max(min, value));

// ==================== UTILITIES ====================

const px = (n: number): string => `${n * PX_MULTIPLIER}px`;
const borderPx = (n: number): string => `${n * BORDER_MULTIPLIER}px`;
const gapPx = (n: number): string => `${n * GAP_MULTIPLIER}px`;
const sizePx = (n: number): string => `${n * SIZE_MULTIPLIER}px`;

const parseNumber = (str: any): number => safeParseFloat(str);
const parseFloatShade = (str: any): number => safeClamp(safeParseFloat(str), 0, 255) || 128;

const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).substring(0, 6);
};

// ==================== OPACITY UTILITY ====================

const applyOpacity = (color: string, opacity?: number): string => {
  if (opacity === undefined) return color;
  const opacityValue = safeClamp(opacity, 0, 1);
  
  if (color.startsWith('oklch(')) {
    return color.replace('oklch(', 'oklch(').replace(')', ` / ${opacityValue})`);
  }
  return color;
};

// ==================== PERFECT COLOR ENGINE ====================

const COLOR_CACHE = new Map<string, string>();

const getOKLCH = (name: string, shade: number, darkMode?: boolean): string => {
  const safeShade = safeClamp(shade, 0, 255);
  const key = `${name}-${safeShade.toFixed(2)}-${darkMode}`;
  const cached = COLOR_CACHE.get(key);
  if (cached) return cached;

  const baseColor = BASE_COLORS[name] || BASE_COLORS.gray;
  const [baseL, baseC, H] = baseColor;
  const t = safeShade / SCALE_MAX;
  
  let L: number, C: number;
  
  if (name === 'gray') {
    L = 0.98 - (t * 0.90);
    C = 0.04 + (t * 0.08);
  } else {
    L = 0.92 - (t * 0.77);
    const chromaMap: Record<string, number> = {
      'blue': 0.20 + (t * 0.14), 'purple': 0.20 + (t * 0.14),
      'red': 0.22 + (t * 0.12), 'orange': 0.22 + (t * 0.12),
      'green': 0.18 + (t * 0.14), 'teal': 0.18 + (t * 0.14),
      'pink': 0.20 + (t * 0.12), 'amber': 0.20 + (t * 0.12)
    };
    C = chromaMap[name] || 0.16 + (t * 0.16);
  }

  if (darkMode) {
    L = L * 0.9 + 0.05;
    C = C * 0.95;
  }
  
  L = safeClamp(L, 0.05, 0.98);
  C = safeClamp(C, 0.03, 0.35);

  const result = `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H})`;
  COLOR_CACHE.set(key, result);
  return result;
};

// ==================== PERFECT TEXT COLOR WITH !important SUPPORT ====================
// 🚀 Pure Black (0.10) and Pure White (0.99) with gray-specific thresholds

const getTextColorForBg = (oklchColor: string): string => {
  const match = oklchColor.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+)?\)/);
  if (!match) return 'oklch(0 0 0)'; // Fallback black
  
  const L = parseFloat(match[1]); // Lightness (0-1)
  const C = parseFloat(match[2]); // Chroma (0-0.4)
  const H = parseFloat(match[3]); // Hue (0-360)
  
  // 🎯 GRAY SPECIFIC THRESHOLD (Hue 220-260, low chroma)
  if (H >= 220 && H <= 260 && C < 0.1) {
    // Light gray (L > 0.6) -> Pure Black
    // Dark gray (L <= 0.6) -> Pure White
    const threshold = 0.62; // Higher threshold for gray
    if (L > threshold) {
      return `oklch(0.10 0.01 ${H})`; // Pure Black
    } else {
      return `oklch(0.99 0.005 ${H})`; // Pure White
    }
  }
  
  // 🎯 PERCEPTUAL WEIGHT (Hue-based)
  let threshold = 0.5; // Default
  
  // Green/Yellow range - धेरै bright देखिन्छ
  if (H >= 70 && H <= 180) {
    threshold = 0.42;
  }
  // Blue/Purple range - कम bright देखिन्छ
  else if (H >= 220 && H <= 320) {
    threshold = 0.58;
  }
  // Red/Orange range - मध्यम
  else if ((H >= 0 && H <= 40) || (H >= 340 && H <= 360)) {
    threshold = 0.52;
  }
  // Yellow/Amber range - धेरै bright
  else if (H >= 50 && H <= 90) {
    threshold = 0.4;
  }
  
  // 🎯 CHROMA ADJUSTMENT
  const chromaFactor = Math.min(0.1, C * 0.2);
  if (C > 0.15) {
    if (H >= 70 && H <= 180) {
      threshold -= chromaFactor;
    } else if (H >= 220 && H <= 320) {
      threshold += chromaFactor;
    }
  }
  
  // 🎯 PURE BLACK/WHITE OUTPUT
  if (L > threshold) {
    return `oklch(0.10 0.01 ${H})`; // Pure Black
  } else {
    return `oklch(0.99 0.005 ${H})`; // Pure White
  }
};

// ==================== ROUNDED UTILITIES ====================

const roundedToRem = (value: number): string => {
  const roundedMap: Record<number, string> = {
    0: '0', 1: '0.25rem', 2: '0.5rem', 3: '0.75rem',
    4: '1rem', 5: '1.25rem', 6: '1.5rem', 8: '2rem',
    10: '2.5rem', 12: '3rem', 16: '4rem'
  };
  return roundedMap[value] || `${value * 0.25}rem`;
};

// ==================== SHADOW UTILITIES ====================

const SHADOW_SCALES: Record<string, string> = {
  '1': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  '2': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  '3': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  '4': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  '5': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '6': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  '7': '0 35px 60px -15px rgb(0 0 0 / 0.3)',
  '8': '0 45px 65px -15px rgb(0 0 0 / 0.35)',
  '9': '0 50px 70px -15px rgb(0 0 0 / 0.4)',
  '10': '0 60px 80px -20px rgb(0 0 0 / 0.45)',
};

// ==================== SAFE COLOR PARSING ====================

const parseColorName = (input: string): { name: string; shade: number; opacity?: number } => {
  const match = input.match(/^([a-z]+)-(\d+(?:\.\d+)?)(?:\/(\d+))?$/);
  if (match) {
    const [, name, shadeStr, opacityStr] = match;
    return {
      name,
      shade: parseFloatShade(shadeStr),
      opacity: opacityStr ? safeParseInt(opacityStr, 100) / 100 : undefined
    };
  }
  return { name: 'gray', shade: 128 };
};

// ==================== LRU CACHE ====================

class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private timestamps = new Map<K, number>();

  constructor(private maxSize = 1000) {}

  get(key: K): V | undefined {
    const val = this.cache.get(key);
    if (val) this.timestamps.set(key, Date.now());
    return val;
  }

  set(key: K, val: V): void {
    if (this.cache.size >= this.maxSize) {
      let oldestKey: K | null = null;
      let oldestTime = Infinity;
      
      for (const [k, time] of this.timestamps) {
        if (time < oldestTime) {
          oldestTime = time;
          oldestKey = k;
        }
      }
      
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.timestamps.delete(oldestKey);
      }
    }
    
    this.cache.set(key, val);
    this.timestamps.set(key, Date.now());
  }

  clear(): void { this.cache.clear(); this.timestamps.clear(); }
  get size(): number { return this.cache.size; }
}

// ==================== VIRTUAL CSS MAP ====================

interface StyleEntry {
  className: string;
  rules: string[];
  pseudo?: string;
  media?: string;
  child?: string;
  hash: string;
}

class VirtualCSSMap {
  private styles = new Map<string, StyleEntry>();
  private mediaGroups = new Map<string, Map<string, StyleEntry[]>>();
  private styleElement: HTMLStyleElement | null = null;
  private pendingFlush = false;
  private ruleHashes = new Map<string, string>();

  constructor() {
    if (!isWeb) return;
    this.styleElement = document.querySelector('style[data-ub]') as HTMLStyleElement;
    if (!this.styleElement) {
      this.styleElement = document.createElement('style');
      this.styleElement.setAttribute('data-ub', 'v17.13.0');
      document.head.appendChild(this.styleElement);
    }
  }

  add(className: string, rules: string[], pseudo?: string, media?: string, child?: string): void {
    const ruleHash = `${className}|${rules.join('')}|${pseudo || ''}|${media || ''}|${child || ''}`;
    if (this.ruleHashes.has(ruleHash)) return;
    
    this.ruleHashes.set(ruleHash, className);
    const entry = { className, rules, pseudo, media, child, hash: ruleHash };
    
    if (media) {
      if (!this.mediaGroups.has(media)) this.mediaGroups.set(media, new Map());
      const mediaMap = this.mediaGroups.get(media)!;
      const key = `${className}-${child || ''}`;
      if (!mediaMap.has(key)) mediaMap.set(key, []);
      mediaMap.get(key)!.push(entry);
    } else {
      this.styles.set(`${className}-${child || ''}`, entry);
    }
    
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.pendingFlush || !isWeb) return;
    this.pendingFlush = true;
    queueMicrotask(() => { this.flush(); this.pendingFlush = false; });
  }

  private generateSelector(entry: StyleEntry): string {
    if (entry.child) return `.${entry.className} > ${entry.child}`;
    if (entry.pseudo) return `.${entry.className}:${entry.pseudo}`;
    return `.${entry.className}`;
  }

  flush(): void {
    if (!this.styleElement || !isWeb) return;
    
    try {
      const cssParts: string[] = [];
      
      for (const entry of this.styles.values()) {
        cssParts.push(`${this.generateSelector(entry)} { ${entry.rules.join(' ')} }`);
      }

      const sortedMedia = Array.from(this.mediaGroups.keys()).sort((a, b) => {
        const aVal = parseInt(a.match(/\d+/)?.toString() || '0', 10);
        const bVal = parseInt(b.match(/\d+/)?.toString() || '0', 10);
        return aVal - bVal;
      });

      for (const media of sortedMedia) {
        cssParts.push(`${media} {`);
        for (const entries of this.mediaGroups.get(media)!.values()) {
          for (const entry of entries) {
            cssParts.push(`  ${this.generateSelector(entry)} { ${entry.rules.join(' ')} }`);
          }
        }
        cssParts.push('}');
      }

      this.styleElement.innerHTML = cssParts.join('\n');
    } catch (e) {
      console.warn('CSS flush error:', e);
    }
  }

  clear(): void {
    this.styles.clear();
    this.mediaGroups.clear();
    this.ruleHashes.clear();
    if (this.styleElement) this.styleElement.innerHTML = '';
  }
}

// ==================== STYLE ENGINE ====================

class WebStyleEngine {
  private static instance: WebStyleEngine;
  private cache = new LRUCache<string, string>(1000);
  private virtualMap = new VirtualCSSMap();
  private darkMode = isWeb ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
  private darkModeListeners: Set<() => void> = new Set();

  static getInstance(): WebStyleEngine {
    if (!WebStyleEngine.instance) {
      WebStyleEngine.instance = new WebStyleEngine();
      if (isWeb) {
        try {
          window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            WebStyleEngine.instance.darkMode = e.matches;
            WebStyleEngine.instance.cache.clear();
            WebStyleEngine.instance.virtualMap.clear();
            WebStyleEngine.instance.darkModeListeners.forEach(fn => fn());
            WebStyleEngine.instance.virtualMap.flush();
          });
        } catch (e) {
          (window.matchMedia('(prefers-color-scheme: dark)') as any).addListener((e: any) => {
            WebStyleEngine.instance.darkMode = e.matches;
            WebStyleEngine.instance.cache.clear();
            WebStyleEngine.instance.virtualMap.clear();
            WebStyleEngine.instance.darkModeListeners.forEach(fn => fn());
            WebStyleEngine.instance.virtualMap.flush();
          });
        }
      }
    }
    return WebStyleEngine.instance;
  }

  onDarkModeChange(fn: () => void): () => void {
    this.darkModeListeners.add(fn);
    return () => this.darkModeListeners.delete(fn);
  }

  inject(classes: string): string {
    if (!isWeb || !classes) return classes;
    
    const results: string[] = [];
    const parts = classes.split(/\s+/).filter(Boolean);

    for (const cls of parts) {
      if (cls.startsWith('ub-')) { results.push(cls); continue; }
      
      const cached = this.cache.get(cls);
      if (cached) { results.push(cached); continue; }

      const segments = cls.split(':');
      const name = segments.pop()!;
      const variants = segments;

      let pseudo: string | undefined;
      let media: string | undefined;

      for (const v of variants) {
        if (v === 'hover' || v === 'active' || v === 'focus' || v === 'group-hover') {
          pseudo = v;
        } else if (v in BREAKPOINTS) {
          media = `@media (min-width: ${BREAKPOINTS[v as Breakpoint]}px)`;
        }
      }

      const className = `ub-${simpleHash(cls)}`;
      let rules: string[] | null = null;

      // Utility matchers
      const opacityMatch = name.match(/^opacity-(\d+)$/);
      const borderFloatMatch = name.match(/^border(?:-(\d+(?:\.\d+)?))?$/);
      const borderSideMatch = name.match(/^border-(t|r|b|l)-(\d+(?:\.\d+)?)$/);
      const borderXMatch = name.match(/^border-x-(\d+(?:\.\d+)?)$/);
      const borderYMatch = name.match(/^border-y-(\d+(?:\.\d+)?)$/);
      const autoLayoutMatch = name.match(/^layout-auto-(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)-?(\d+s|\d+ms)?$/);
      const gridMatch = name.match(/^grid-(\d+)x(\d+)-(\d+(?:\.\d+)?)$/);
      const autoGridMatch = name.match(/^auto-grid-(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
      const spanMatch = name.match(/^span-(\d+)$/);
      const rowMatch = name.match(/^row-(\d+)$/);
      const roundedMatch = name.match(/^rounded(?:-(\d+(?:\.\d+)?|full))?$/);
      const shadowMatch = name.match(/^shadow(?:-(\d+))?$/);
      const sizeMatch = name.match(/^(w|h)-(\d+(?:\.\d+)?)$/);
      const spacingMatch = name.match(/^(p|m|pl|pr|ml|mr|pt|pb|mt|mb)-(\d+(?:\.\d+)?)$/);
      const isColor = name.startsWith('bg-') || name.startsWith('text-') || name.startsWith('border-');

      if (opacityMatch) {
        const opacity = safeClamp(safeParseInt(opacityMatch[1], 100) / 100, 0, 1);
        rules = [`opacity: ${opacity};`];
      }
      else if (borderFloatMatch) {
        const width = borderFloatMatch[1] || '1';
        rules = [`border-width: ${borderPx(parseNumber(width))};`, `border-style: solid;`];
      }
      else if (borderSideMatch) {
        const [, side, width] = borderSideMatch;
        rules = [
          `border-${BORDER_SIDE_MAP[side]}-width: ${borderPx(parseNumber(width))};`,
          `border-${BORDER_SIDE_MAP[side]}-style: solid;`
        ];
      }
      else if (borderXMatch) {
        const width = borderXMatch[1];
        rules = [
          `border-left-width: ${borderPx(parseNumber(width))};`,
          `border-right-width: ${borderPx(parseNumber(width))};`,
          `border-left-style: solid;`, `border-right-style: solid;`
        ];
      }
      else if (borderYMatch) {
        const width = borderYMatch[1];
        rules = [
          `border-top-width: ${borderPx(parseNumber(width))};`,
          `border-bottom-width: ${borderPx(parseNumber(width))};`,
          `border-top-style: solid;`, `border-bottom-style: solid;`
        ];
      }
      else if (autoLayoutMatch) {
        const [, minScale, gapScale, duration] = autoLayoutMatch;
        rules = [
          `display: grid;`,
          `grid-template-columns: repeat(auto-fit, minmax(${px(parseNumber(minScale))}, 1fr));`,
          `gap: ${gapPx(parseNumber(gapScale))};`, `width: 100%;`,
          `transition: all ${duration || '0.3s'} ease-in-out;`
        ];
      }
      else if (gridMatch) {
        const [, cols, rows, gapScale] = gridMatch;
        rules = [
          `display: grid;`,
          `grid-template-columns: repeat(${cols}, minmax(0, 1fr));`,
          `grid-template-rows: repeat(${rows}, auto);`,
          `gap: ${gapPx(parseNumber(gapScale))};`, `width: 100%;`,
        ];
      }
      else if (autoGridMatch) {
        const [, minScale, gapScale] = autoGridMatch;
        rules = [
          `display: grid;`,
          `grid-template-columns: repeat(auto-fit, minmax(${px(parseNumber(minScale))}, 1fr));`,
          `gap: ${gapPx(parseNumber(gapScale))};`, `width: 100%;`,
        ];
      }
      else if (spanMatch) {
        rules = [`grid-column: span ${safeParseInt(spanMatch[1], 1)};`];
      }
      else if (rowMatch) {
        rules = [`grid-row: span ${safeParseInt(rowMatch[1], 1)};`];
      }
      else if (name === 'full') {
        rules = [`grid-column: 1 / -1;`];
      }
      else if (roundedMatch) {
        const scale = roundedMatch[1] || '2';
        rules = [scale === 'full' 
          ? `border-radius: 9999px;` 
          : `border-radius: ${roundedToRem(parseNumber(scale))};`
        ];
      }
      else if (shadowMatch) {
        const scale = shadowMatch[1] || '3';
        if (SHADOW_SCALES[scale]) rules = [`box-shadow: ${SHADOW_SCALES[scale]};`];
      }
      else if (sizeMatch) {
        const [, prop, scaleStr] = sizeMatch;
        rules = [`${prop === 'w' ? 'width' : 'height'}: ${sizePx(parseNumber(scaleStr))};`];
      }
      else if (isColor) {
        const type = name.split('-')[0];
        const colorPart = name.substring(type.length + 1);
        
        const shadeMatch = colorPart.match(/^([a-z]+)-(\d+(?:\.\d+)?)(?:\/(\d+))?$/);
        if (shadeMatch) {
          const [, colorName, shadeStr, opacityStr] = shadeMatch;
          const shade = parseFloatShade(shadeStr);
          const opacity = opacityStr ? safeParseInt(opacityStr, 100) / 100 : undefined;
          
          if (type === 'bg') {
            const color = getOKLCH(colorName, shade, this.darkMode);
            const textColor = getTextColorForBg(color);
            const bgColor = applyOpacity(color, opacity);
            
            if (pseudo === 'hover') {
              const hoverColor = getOKLCH(colorName, Math.min(255, shade + 15), this.darkMode);
              const hoverTextColor = getTextColorForBg(hoverColor);
              const hoverBgColor = applyOpacity(hoverColor, opacity);
              
              // 🚀 !important added for CSS specificity
              rules = [
                `background-color: ${hoverBgColor} !important;`, 
                `color: ${hoverTextColor} !important;`,
                `caret-color: ${hoverTextColor} !important;`
              ];
            } else {
              // 🚀 !important added for CSS specificity
              rules = [
                `background-color: ${bgColor} !important;`, 
                `color: ${textColor} !important;`,
                `caret-color: ${textColor} !important;`
              ];
            }
          } else {
            const prop = type === 'text' ? 'color' : 'border-color';
            const color = getOKLCH(colorName, shade, this.darkMode);
            rules = [`${prop}: ${applyOpacity(color, opacity)};`];
          }
        }
      }
      else if (spacingMatch) {
        const [, prop, scaleStr] = spacingMatch;
        rules = [`${SPACING_MAP[prop as SpacingType]}: ${px(parseNumber(scaleStr))};`];
      }

      if (rules) {
        this.virtualMap.add(className, rules, pseudo, media);
        results.push(className);
        this.cache.set(cls, className);
      } else {
        results.push(cls);
      }
    }

    return results.join(' ');
  }

  debug() { return { total: this.cache.size, version: 'v17.13.0' }; }
  flush() { if (isWeb) this.virtualMap.flush(); }
}

// ==================== HOOKS ====================

export const useDirection = () => {
  const [dir, setDir] = useState<Direction>('ltr');
  useEffect(() => { if (isWeb) document.documentElement.setAttribute('dir', dir); }, [dir]);
  const toggle = () => setDir(d => d === 'ltr' ? 'rtl' : 'ltr');
  return { direction: dir, toggleDirection: toggle };
};

export const useResponsive = () => {
  const [screen, setScreen] = useState({ width: 0, breakpoint: 'lg' as Breakpoint });
  
  useEffect(() => {
    if (!isWeb) return;
    const update = () => {
      const w = window.innerWidth;
      let bp: Breakpoint = 'sm';
      if (w >= 1536) bp = '2xl';
      else if (w >= 1280) bp = 'xl';
      else if (w >= 1024) bp = 'lg';
      else if (w >= 768) bp = 'md';
      setScreen({ width: w, breakpoint: bp });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  
  return screen;
};

export const useDeviceScale = () => {
  const [scale, setScale] = useState({ width: 0, height: 0, pixels: { width: 0, height: 0 } });
  
  useEffect(() => {
    if (!isWeb) return;
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setScale({
        width: Math.min(255, Math.floor(w / 4)),
        height: Math.min(255, Math.floor(h / 4)),
        pixels: { width: w, height: h }
      });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  
  return scale;
};

// ==================== PUBLIC API ====================

export const ub = (str: any): string => {
  try {
    const safeStr = safeToString(str);
    if (!safeStr) return '';
    return WebStyleEngine.getInstance().inject(safeStr);
  } catch (e) {
    console.warn('UB Error:', e);
    return safeToString(str);
  }
};

export const debugUB = () => {
  try { return WebStyleEngine.getInstance().debug(); } 
  catch { return { total: 0, version: 'error' }; }
};

export const flushUB = () => {
  try { WebStyleEngine.getInstance().flush(); } 
  catch (e) { console.warn('Flush error:', e); }
};

export const oklch = getOKLCH;

// ==================== TYPED HELPERS ====================

const createHelper = (prefix: string) => (v: any) => `${prefix}-${v}`;
const createHelperWithDefault = (prefix: string, defaultValue: any = 1) => (v: any = defaultValue) => `${prefix}-${v}`;

export const p = createHelper('p');
export const m = createHelper('m');
export const pl = createHelper('pl');
export const pr = createHelper('pr');
export const ml = createHelper('ml');
export const mr = createHelper('mr');
export const pt = createHelper('pt');
export const pb = createHelper('pb');
export const mt = createHelper('mt');
export const mb = createHelper('mb');
export const w = createHelper('w');
export const h = createHelper('h');

export const border = createHelperWithDefault('border');
export const borderT = createHelperWithDefault('border-t');
export const borderR = createHelperWithDefault('border-r');
export const borderB = createHelperWithDefault('border-b');
export const borderL = createHelperWithDefault('border-l');
export const borderX = createHelperWithDefault('border-x');
export const borderY = createHelperWithDefault('border-y');

export const rounded = (v: any) => v === 'full' ? 'rounded-full' : `rounded-${v}`;
export const shadow = (v: any) => `shadow-${safeClamp(safeParseInt(v, 3), 1, 10)}`;
export const opacity = (v: any) => `opacity-${safeClamp(safeParseInt(v, 100), 0, 100)}`;

export const bg = (c: string, s: any, o?: any) => o !== undefined ? `bg-${c}-${s}/${o}` : `bg-${c}-${s}`;
export const text = (c: string, s: any, o?: any) => o !== undefined ? `text-${c}-${s}/${o}` : `text-${c}-${s}`;
export const grid = (cols: any, rows: any, gap: any) => `grid-${cols}x${rows}-${gap}`;
export const autoGrid = (minWidth: any, gap: any) => `auto-grid-${minWidth}-${gap}`;
export const span = (n: any) => `span-${safeClamp(safeParseInt(n, 1), 1, 12)}`;
export const row = (n: any) => `row-${safeClamp(safeParseInt(n, 1), 1, 6)}`;

// ==================== DOM PROXY ====================
// /src/lib/mycss.ts मा यो राख्नुस् (export को माथि)

import React from 'react';

// Simple proxy that actually works
export const dom = new Proxy({} as any, {
  get: (target, prop) => {
    // Return a component for the tag
    return ({ children, className, ...props }: any) => {
      return React.createElement(
        prop as string,  // यो tag हो (div, span, etc)
        {
          ...props,
          className: className ? ub(className) : undefined
        },
        children
      );
    };
  },
});
// ==================== EXPORT ====================

export const UB = {
  ub, p, m, pl, pr, ml, mr, pt, pb, mt, mb, w, h, 
  border, borderT, borderR, borderB, borderL, borderX, borderY,
  rounded, shadow, opacity, bg, text,
  grid, autoGrid, span, row,
  useDirection, useResponsive, useDeviceScale,
  oklch, debug: debugUB, flush: flushUB,
  dom, // Add dom to UB export
  version: 'v17.13.0-important'
};

export default UB;