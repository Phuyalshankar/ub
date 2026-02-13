// /src/lib/ub/parser.js
// Universal Binary Parser v2.1
// FIXED: Proper validation, clamping, and negative number handling
// Size: 4.5KB • Zero Dependencies

/**
 * Parses UB class names and converts to CSS
 */

// Property configuration with precise mapping
const PROPERTY_CONFIG = {
  // === SIZING === (0-255 → 0-100%)
  'w': { css: 'width', unit: '%', multiplier: 0.392, precision: 1 },
  'h': { css: 'height', unit: '%', multiplier: 0.392, precision: 1 },
  'min-w': { css: 'min-width', unit: '%', multiplier: 0.392, precision: 1 },
  'max-w': { css: 'max-width', unit: '%', multiplier: 0.392, precision: 1 },
  'min-h': { css: 'min-height', unit: '%', multiplier: 0.392, precision: 1 },
  'max-h': { css: 'max-height', unit: '%', multiplier: 0.392, precision: 1 },
  
  // === SPACING === (0-255 → 0-4rem)
  'p': { css: 'padding', unit: 'rem', multiplier: 0.0157, precision: 2 },
  'p-t': { css: 'padding-top', unit: 'rem', multiplier: 0.0157, precision: 2 },
  'p-r': { css: 'padding-right', unit: 'rem', multiplier: 0.0157, precision: 2 },
  'p-b': { css: 'padding-bottom', unit: 'rem', multiplier: 0.0157, precision: 2 },
  'p-l': { css: 'padding-left', unit: 'rem', multiplier: 0.0157, precision: 2 },
  'p-x': { css: 'padding-left,padding-right', unit: 'rem', multiplier: 0.0157, precision: 2 },
  'p-y': { css: 'padding-top,padding-bottom', unit: 'rem', multiplier: 0.0157, precision: 2 },
  
  'm': { css: 'margin', unit: 'rem', multiplier: 0.0157, precision: 2 },
  'm-t': { css: 'margin-top', unit: 'rem', multiplier: 0.0157, precision: 2 },
  'm-r': { css: 'margin-right', unit: 'rem', multiplier: 0.0157, precision: 2 },
  'm-b': { css: 'margin-bottom', unit: 'rem', multiplier: 0.0157, precision: 2 },
  'm-l': { css: 'margin-left', unit: 'rem', multiplier: 0.0157, precision: 2 },
  'm-x': { css: 'margin-left,margin-right', unit: 'rem', multiplier: 0.0157, precision: 2 },
  'm-y': { css: 'margin-top,margin-bottom', unit: 'rem', multiplier: 0.0157, precision: 2 },
  
  'gap': { css: 'gap', unit: 'rem', multiplier: 0.0078, precision: 2 },
  'gap-x': { css: 'column-gap', unit: 'rem', multiplier: 0.0078, precision: 2 },
  'gap-y': { css: 'row-gap', unit: 'rem', multiplier: 0.0078, precision: 2 },
  
  // === COLORS === (0-255 → 0-255 RGB)
  'bg': { css: 'background-color', unit: 'rgb', multiplier: 1, precision: 0 },
  'bg-r': { css: '--ub-bg-r', unit: 'number', multiplier: 1, precision: 0 },
  'bg-g': { css: '--ub-bg-g', unit: 'number', multiplier: 1, precision: 0 },
  'bg-b': { css: '--ub-bg-b', unit: 'number', multiplier: 1, precision: 0 },
  'bg-a': { css: '--ub-bg-a', unit: 'alpha', multiplier: 0.00392, precision: 3 },
  
  'text': { css: 'color', unit: 'rgb', multiplier: 1, precision: 0 },
  'text-r': { css: '--ub-text-r', unit: 'number', multiplier: 1, precision: 0 },
  'text-g': { css: '--ub-text-g', unit: 'number', multiplier: 1, precision: 0 },
  'text-b': { css: '--ub-text-b', unit: 'number', multiplier: 1, precision: 0 },
  
  'border': { css: 'border-color', unit: 'rgb', multiplier: 1, precision: 0 },
  'border-r': { css: '--ub-border-r', unit: 'number', multiplier: 1, precision: 0 },
  'border-g': { css: '--ub-border-g', unit: 'number', multiplier: 1, precision: 0 },
  'border-b': { css: '--ub-border-b', unit: 'number', multiplier: 1, precision: 0 },
  
  // === TYPOGRAPHY ===
  'text': { css: 'font-size', unit: 'rem', multiplier: 0.0118, precision: 2 },
  'leading': { css: 'line-height', unit: 'unitless', multiplier: 0.00392, precision: 2, offset: 1 },
  'tracking': { css: 'letter-spacing', unit: 'em', multiplier: 0.000392, precision: 3 },
  'font': { css: 'font-weight', unit: 'weight', multiplier: 3.53, precision: 0 },
  
  // === EFFECTS ===
  'opacity': { css: 'opacity', unit: 'unitless', multiplier: 0.00392, precision: 3 },
  'blur': { css: 'filter', unit: 'px', multiplier: 0.0392, precision: 2 },
  'brightness': { css: 'filter', unit: 'unitless', multiplier: 0.00392, precision: 2 },
  'contrast': { css: 'filter', unit: '%', multiplier: 0.392, precision: 0, offset: 100 },
  'grayscale': { css: 'filter', unit: 'unitless', multiplier: 0.00392, precision: 2 },
  'hue': { css: 'filter', unit: 'deg', multiplier: 1.411, precision: 0 },
  'saturate': { css: 'filter', unit: '%', multiplier: 0.392, precision: 0, offset: 100 },
  'sepia': { css: 'filter', unit: 'unitless', multiplier: 0.00392, precision: 2 },
  
  // === TRANSFORMS ===
  'rotate': { css: 'transform', unit: 'deg', multiplier: 1.411, precision: 0 },
  'scale': { css: 'transform', unit: 'unitless', multiplier: 0.00392, precision: 2 },
  'scale-x': { css: 'transform', unit: 'unitless', multiplier: 0.00392, precision: 2 },
  'scale-y': { css: 'transform', unit: 'unitless', multiplier: 0.00392, precision: 2 },
  'translate-x': { css: 'transform', unit: 'px', multiplier: 0.784, precision: 1, offset: -100 },
  'translate-y': { css: 'transform', unit: 'px', multiplier: 0.784, precision: 1, offset: -100 },
  
  // === BORDERS ===
  'border': { css: 'border-width', unit: 'px', multiplier: 0.0314, precision: 1 },
  'border-t': { css: 'border-top-width', unit: 'px', multiplier: 0.0314, precision: 1 },
  'border-r': { css: 'border-right-width', unit: 'px', multiplier: 0.0314, precision: 1 },
  'border-b': { css: 'border-bottom-width', unit: 'px', multiplier: 0.0314, precision: 1 },
  'border-l': { css: 'border-left-width', unit: 'px', multiplier: 0.0314, precision: 1 },
  
  'rounded': { css: 'border-radius', unit: 'rem', multiplier: 0.0118, precision: 2 },
  'rounded-tl': { css: 'border-top-left-radius', unit: 'rem', multiplier: 0.0118, precision: 2 },
  'rounded-tr': { css: 'border-top-right-radius', unit: 'rem', multiplier: 0.0118, precision: 2 },
  'rounded-bl': { css: 'border-bottom-left-radius', unit: 'rem', multiplier: 0.0118, precision: 2 },
  'rounded-br': { css: 'border-bottom-right-radius', unit: 'rem', multiplier: 0.0118, precision: 2 },
  
  // === SHADOWS ===
  'shadow': { css: 'box-shadow', unit: 'shadow', multiplier: 1, precision: 2 },
  'shadow-color': { css: '--ub-shadow-color', unit: 'number', multiplier: 1, precision: 0 },
  
  // === GRADIENTS ===
  'gradient-angle': { css: '--ub-gradient-angle', unit: 'deg', multiplier: 1.411, precision: 0 },
  'gradient-from': { css: '--ub-gradient-from', unit: 'number', multiplier: 1, precision: 0 },
  'gradient-to': { css: '--ub-gradient-to', unit: 'number', multiplier: 1, precision: 0 },
  'gradient-type': { css: '--ub-gradient-type', unit: 'type', multiplier: 1, precision: 0 },
  
  // === LAYOUT ===
  'top': { css: 'top', unit: '%', multiplier: 0.392, precision: 1 },
  'right': { css: 'right', unit: '%', multiplier: 0.392, precision: 1 },
  'bottom': { css: 'bottom', unit: '%', multiplier: 0.392, precision: 1 },
  'left': { css: 'left', unit: '%', multiplier: 0.392, precision: 1 },
  'z': { css: 'z-index', unit: 'number', multiplier: 0.0392, precision: 0 },
  
  // === GRID ===
  'col-span': { css: 'grid-column', unit: 'span', multiplier: 0.00392, precision: 0 },
  'row-span': { css: 'grid-row', unit: 'span', multiplier: 0.00392, precision: 0 },
  'grid-cols': { css: 'grid-template-columns', unit: 'repeat', multiplier: 0.00392, precision: 0 },
  'grid-rows': { css: 'grid-template-rows', unit: 'repeat', multiplier: 0.00392, precision: 0 },
  
  // === FLEXBOX ===
  'flex': { css: 'flex', unit: 'unitless', multiplier: 0.00392, precision: 2 },
  'basis': { css: 'flex-basis', unit: '%', multiplier: 0.392, precision: 1 },
  'grow': { css: 'flex-grow', unit: 'unitless', multiplier: 0.00392, precision: 2 },
  'shrink': { css: 'flex-shrink', unit: 'unitless', multiplier: 0.00392, precision: 2 },
  
  // === SPECIAL EFFECTS ===
  'backdrop-blur': { css: 'backdrop-filter', unit: 'px', multiplier: 0.0392, precision: 2 },
  'backdrop-brightness': { css: 'backdrop-filter', unit: 'unitless', multiplier: 0.00392, precision: 2 },
  'drop-shadow': { css: 'filter', unit: 'shadow', multiplier: 1, precision: 2 },
  'invert': { css: 'filter', unit: 'unitless', multiplier: 0.00392, precision: 3 },
  
  // === TRANSITIONS ===
  'duration': { css: 'transition-duration', unit: 'ms', multiplier: 7.84, precision: 0 },
  'delay': { css: 'transition-delay', unit: 'ms', multiplier: 7.84, precision: 0 },
  'timing': { css: 'transition-timing-function', unit: 'timing', multiplier: 1, precision: 0 },
  
  // === INTERACTIVITY ===
  'cursor': { css: 'cursor', unit: 'cursor', multiplier: 1, precision: 0 },
  'select': { css: 'user-select', unit: 'select', multiplier: 1, precision: 0 },
  
  // === ANIMATION ===
  'animation-duration': { css: 'animation-duration', unit: 'ms', multiplier: 7.84, precision: 0 },
  'animation-delay': { css: 'animation-delay', unit: 'ms', multiplier: 7.84, precision: 0 },
  'animation-iteration': { css: 'animation-iteration-count', unit: 'count', multiplier: 0.0392, precision: 0 },
};

class UniversalParser {
  /**
   * Parse a UB class name
   * @param {string} className - e.g., "ub-w-128" or "ub-bg-r-64"
   * @returns {object|null} - {property: string, value: number}
   */
  static parse(className) {
    if (!className || typeof className !== 'string') return null;
    
    // Remove ub- prefix
    const clean = className.replace(/^ub-/, '');
    
    // Match property-value pattern with support for negative numbers and large values
    // This pattern matches: property-name-value
    const match = clean.match(/^([a-z-]+?)-(-?\d+)$/);
    if (!match) return null;
    
    const [, property, valueStr] = match;
    
    // Parse the value and clamp to 0-255 range
    let rawValue = parseInt(valueStr, 10);
    
    // Handle invalid numbers
    if (isNaN(rawValue)) return null;
    
    // CRITICAL: Clamp to valid 0-255 range
    const clampedValue = Math.max(0, Math.min(255, rawValue));
    
    // If the value was clamped, log a warning (but still process it)
    if (rawValue !== clampedValue) {
      console.warn(`UB: Value ${rawValue} clamped to ${clampedValue} for "${className}"`);
    }
    
    if (!PROPERTY_CONFIG[property]) {
      console.warn(`UB: Unknown property "${property}" in "${className}"`);
      return null;
    }
    
    return { property, value: clampedValue };
  }
  
  /**
   * Convert property to CSS string
   * @param {object} prop - {property: string, value: number}
   * @returns {string} CSS declaration
   */
  static toCSS(prop) {
    const config = PROPERTY_CONFIG[prop.property];
    if (!config) return '';
    
    const { multiplier = 1, offset = 0, precision = 2, unit } = config;
    const computed = (prop.value * multiplier) + offset;
    
    // Special handling for different units
    switch (unit) {
      case '%':
      case 'rem':
      case 'px':
      case 'em':
      case 'deg':
        return `${config.css}: ${computed.toFixed(precision)}${unit}`;
      
      case 'unitless':
        return `${config.css}: ${computed.toFixed(precision)}`;
      
      case 'rgb':
        return `${config.css}: rgb(${prop.value},${prop.value},${prop.value})`;
      
      case 'alpha':
        return `${config.css}: ${computed.toFixed(precision)}`;
      
      case 'weight':
        return `${config.css}: ${Math.round(computed)}`;
      
      case 'shadow':
        const shadowValue = prop.value / 255;
        return `box-shadow: 0 ${(shadowValue * 4).toFixed(2)}rem ${(shadowValue * 6).toFixed(2)}rem rgba(0,0,0,${(shadowValue * 0.3).toFixed(2)})`;
      
      case 'span':
        const spanValue = Math.max(1, Math.round(computed));
        return `${config.css}: span ${spanValue}`;
      
      case 'repeat':
        const repeatValue = Math.max(1, Math.round(computed));
        return `${config.css}: repeat(${repeatValue}, minmax(0, 1fr))`;
      
      case 'number':
        return `${config.css}: ${prop.value}`;
      
      case 'type':
        const types = ['linear', 'radial', 'conic'];
        const typeIndex = Math.min(Math.floor(prop.value / 85), 2);
        return `${config.css}: ${types[typeIndex]}`;
      
      case 'timing':
        const timings = ['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out'];
        const timingIndex = Math.min(Math.floor(prop.value / 51), 4);
        return `${config.css}: ${timings[timingIndex]}`;
      
      case 'cursor':
        const cursors = ['default', 'pointer', 'text', 'move', 'not-allowed'];
        const cursorIndex = Math.min(Math.floor(prop.value / 51), 4);
        return `${config.css}: ${cursors[cursorIndex]}`;
      
      case 'select':
        const selects = ['auto', 'none', 'text', 'all'];
        const selectIndex = Math.min(Math.floor(prop.value / 64), 3);
        return `${config.css}: ${selects[selectIndex]}`;
      
      case 'count':
        const count = prop.value === 255 ? 'infinite' : Math.max(1, Math.round(computed));
        return `${config.css}: ${count}`;
      
      default:
        return `${config.css}: ${computed}`;
    }
  }
  
  /**
   * Convert multiple properties to combined CSS
   * @param {object[]} properties - Array of {property, value}
   * @returns {string} Combined CSS
   */
  static combine(properties) {
    const cssRules = [];
    const colors = {
      bg: { r: 255, g: 255, b: 255, a: 1 },
      text: { r: 0, g: 0, b: 0 },
      border: { r: 0, g: 0, b: 0 },
    };
    
    let hasGradient = false;
    let gradientAngle = 0;
    let gradientFrom = 0;
    let gradientTo = 255;
    let gradientType = 'linear';
    
    // First pass: collect all CSS and color components
    properties.forEach(prop => {
      const css = this.toCSS(prop);
      if (css) cssRules.push(css);
      
      // Track color components
      if (prop.property === 'bg-r') colors.bg.r = prop.value;
      if (prop.property === 'bg-g') colors.bg.g = prop.value;
      if (prop.property === 'bg-b') colors.bg.b = prop.value;
      if (prop.property === 'bg-a') colors.bg.a = prop.value / 255;
      
      if (prop.property === 'text-r') colors.text.r = prop.value;
      if (prop.property === 'text-g') colors.text.g = prop.value;
      if (prop.property === 'text-b') colors.text.b = prop.value;
      
      if (prop.property === 'border-r') colors.border.r = prop.value;
      if (prop.property === 'border-g') colors.border.g = prop.value;
      if (prop.property === 'border-b') colors.border.b = prop.value;
      
      // Track gradient properties
      if (prop.property === 'gradient-angle') {
        hasGradient = true;
        gradientAngle = prop.value;
      }
      if (prop.property === 'gradient-from') {
        hasGradient = true;
        gradientFrom = prop.value;
      }
      if (prop.property === 'gradient-to') {
        hasGradient = true;
        gradientTo = prop.value;
      }
      if (prop.property === 'gradient-type') {
        hasGradient = true;
        const types = ['linear', 'radial', 'conic'];
        gradientType = types[Math.min(Math.floor(prop.value / 85), 2)];
      }
    });
    
    // Add background (solid or gradient)
    if (hasGradient) {
      const angle = (gradientAngle / 255) * 360;
      if (gradientType === 'linear') {
        cssRules.push(`background: linear-gradient(${angle}deg, rgb(${gradientFrom},${gradientFrom},${gradientFrom}), rgb(${gradientTo},${gradientTo},${gradientTo}))`);
      } else if (gradientType === 'radial') {
        cssRules.push(`background: radial-gradient(circle, rgb(${gradientFrom},${gradientFrom},${gradientFrom}), rgb(${gradientTo},${gradientTo},${gradientTo}))`);
      } else {
        cssRules.push(`background: conic-gradient(from ${angle}deg, rgb(${gradientFrom},${gradientFrom},${gradientFrom}), rgb(${gradientTo},${gradientTo},${gradientTo}))`);
      }
    } else {
      const hasBgColor = properties.some(p => p.property.startsWith('bg-'));
      if (hasBgColor) {
        cssRules.push(`background-color: rgba(${colors.bg.r},${colors.bg.g},${colors.bg.b},${colors.bg.a})`);
      }
    }
    
    // Add text and border colors
    const hasTextColor = properties.some(p => p.property.startsWith('text-'));
    const hasBorderColor = properties.some(p => p.property.startsWith('border-'));
    
    if (hasTextColor) {
      cssRules.push(`color: rgb(${colors.text.r},${colors.text.g},${colors.text.b})`);
    }
    
    if (hasBorderColor) {
      cssRules.push(`border-color: rgb(${colors.border.r},${colors.border.g},${colors.border.b})`);
    }
    
    // Performance optimization
    cssRules.push('will-change: transform, opacity');
    cssRules.push('backface-visibility: hidden');
    
    return cssRules.filter(rule => rule && rule.trim()).join(';');
  }
  
  /**
   * Parse multiple class names
   * @param {string[]} classNames - Array of UB class names
   * @returns {object[]} Array of parsed properties
   */
  static parseAll(classNames) {
    if (!Array.isArray(classNames)) return [];
    return classNames
      .map(className => this.parse(className))
      .filter(Boolean);
  }
  
  /**
   * Get CSS for multiple class names
   * @param {string[]} classNames - Array of UB class names
   * @returns {string} Combined CSS
   */
  static toCSSAll(classNames) {
    if (!Array.isArray(classNames)) return '';
    const properties = this.parseAll(classNames);
    return this.combine(properties);
  }
  
  /**
   * Convert to React style object
   * @param {string[]} classNames - Array of UB class names
   * @returns {object} React CSSProperties object
   */
  static toReactStyle(classNames) {
    const css = this.toCSSAll(classNames);
    const style = {};
    
    css.split(';').forEach(rule => {
      if (!rule.trim()) return;
      const [key, ...valueParts] = rule.split(':').map(s => s.trim());
      const value = valueParts.join(':');
      if (key && value) {
        // Convert CSS property to React camelCase
        const reactKey = key.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
        style[reactKey] = value;
      }
    });
    
    return style;
  }
  
  /**
   * Validate a UB class name
   * @param {string} className - Class name to validate
   * @returns {boolean} True if valid
   */
  static isValid(className) {
    return this.parse(className) !== null;
  }
  
  /**
   * Generate class name from property and value
   * @param {string} property - Property name
   * @param {number} value - Value (0-255)
   * @returns {string} UB class name
   */
  static generate(property, value) {
    // Clamp value to 0-255 range
    const normalized = Math.max(0, Math.min(255, parseInt(value, 10) || 0));
    return `ub-${property}-${normalized}`;
  }
  
  /**
   * Safely parse a value with clamping
   * @param {string|number} value - Value to parse
   * @returns {number} Clamped 0-255 value
   */
  static clampValue(value) {
    const num = parseInt(value, 10);
    if (isNaN(num)) return 0;
    return Math.max(0, Math.min(255, num));
  }
}

export default UniversalParser;