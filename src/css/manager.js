// /src/lib/ub/manager.js
// Universal Binary Dynamic Manager v6.0
// Size: 4.2KB • Full Hover/Focus/Scroll Support

import UniversalParser from './parser';

class UBStyleManager {
  constructor() {
    this.sheet = null;
    this.cache = new Map(); // className -> rule index
    this.statefulCache = new Map(); // state -> rule index
    this.styleElement = null;
    this.animationRules = new Map();
    this.interactionStates = new Set(['hover', 'focus', 'active', 'disabled', 'visited']);
    this.init();
    this.setupScrollObserver();
  }

  init() {
    if (typeof document === 'undefined') return;

    // Create or get style element
    this.styleElement = document.querySelector('style[data-ub-dynamic]');
    if (!this.styleElement) {
      this.styleElement = document.createElement('style');
      this.styleElement.setAttribute('data-ub-dynamic', 'v6-full');
      document.head.appendChild(this.styleElement);

      // Add CSS variables and base styles
      this.styleElement.textContent = this.getBaseCSS();
    }

    this.sheet = this.styleElement.sheet;
  }

  getBaseCSS() {
    return `
      :root {
        --ub-bg-r: 255;
        --ub-bg-g: 255;
        --ub-bg-b: 255;
        --ub-text-r: 0;
        --ub-text-g: 0;
        --ub-text-b: 0;
        --ub-border-r: 0;
        --ub-border-g: 0;
        --ub-border-b: 0;
        --ub-shadow-color: 128;
        --ub-gradient-angle: 0deg;
        --ub-gradient-from: 0;
        --ub-gradient-to: 255;
        --ub-gradient-type: linear;
        --ub-scroll-progress: 0;
        --ub-scroll-offset: 0;
      }

      .ub-optimized {
        will-change: transform, opacity;
        transform: translateZ(0);
        backface-visibility: hidden;
        contain: layout style paint;
      }

      /* Scroll-driven animations */
      @property --ub-scroll-progress {
        syntax: '<number>';
        inherits: false;
        initial-value: 0;
      }

      .ub-scroll-trigger {
        animation-timeline: scroll();
        animation-range: 0 100vh;
      }
    `;
  }

  setupScrollObserver() {
    if (typeof window === 'undefined') return;

    let ticking = false;
    const updateScrollProgress = () => {
      const scrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? scrollY / maxScroll : 0;

      document.documentElement.style.setProperty('--ub-scroll-progress', progress.toString());

      // Update scroll-based classes
      const scrollClasses = document.querySelectorAll('[class*="ub-scroll-"]');
      scrollClasses.forEach(el => {
        const classes = Array.from(el.classList);
        const scrollClass = classes.find(cls => cls.startsWith('ub-scroll-'));
        if (scrollClass) {
          this.updateScrollBasedStyles(el, scrollClass, progress);
        }
      });

      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollProgress);
        ticking = true;
      }
    }, { passive: true });

    // Initial update
    updateScrollProgress();
  }

  inject(className, options = {}) {
    if (this.cache.has(className) && !options.force) return;

    const prop = UniversalParser.parse(className);
    if (!prop) return;

    const css = UniversalParser.toCSS(prop);
    if (!css) return;

    try {
      const rule = `.${className} { ${css}; }`;
      const index = this.sheet.insertRule(rule, this.sheet.cssRules.length);
      this.cache.set(className, index);
    } catch (error) {
      console.warn(`UB: Failed to inject ${className}:`, error);
    }
  }

  injectWithState(baseClass, state, modifier = 0) {
    const stateKey = `${baseClass}:${state}:${modifier}`;
    if (this.statefulCache.has(stateKey)) return;

    const prop = UniversalParser.parse(baseClass);
    if (!prop) return;

    // Calculate modified value based on state
    let modifiedValue = prop.value;
    switch (state) {
      case 'hover':
        modifiedValue = Math.min(255, prop.value + modifier);
        break;
      case 'focus':
        modifiedValue = Math.min(255, prop.value + Math.floor(modifier * 0.8));
        break;
      case 'active':
        modifiedValue = Math.min(255, prop.value + Math.floor(modifier * 1.2));
        break;
      default:
        modifiedValue = prop.value;
    }

    const modifiedProp = { ...prop, value: modifiedValue };
    const css = UniversalParser.toCSS(modifiedProp);

    try {
      const rule = `.${baseClass}:${state} { ${css}; }`;
      const index = this.sheet.insertRule(rule, this.sheet.cssRules.length);
      this.statefulCache.set(stateKey, index);
    } catch (error) {
      console.warn(`UB: Failed to inject ${stateKey}:`, error);
    }
  }

  injectWithScroll(baseClass, scrollEffect = 'fade') {
    const scrollKey = `${baseClass}:scroll:${scrollEffect}`;
    if (this.statefulCache.has(scrollKey)) return;

    const prop = UniversalParser.parse(baseClass);
    if (!prop) return;

    let cssRule = '';
    switch (scrollEffect) {
      case 'fade':
        cssRule = `
          opacity: calc(1 - var(--ub-scroll-progress));
          transform: translateY(calc(var(--ub-scroll-progress) * -20px));
        `;
        break;
      case 'parallax':
        cssRule = `
          transform: translateY(calc(var(--ub-scroll-progress) * 100px));
        `;
        break;
      case 'scale':
        cssRule = `
          transform: scale(calc(1 - var(--ub-scroll-progress) * 0.3));
        `;
        break;
      case 'blur':
        cssRule = `
          filter: blur(calc(var(--ub-scroll-progress) * 10px));
        `;
        break;
      default:
        cssRule = '';
    }

    try {
      const rule = `.${baseClass}.ub-scroll-${scrollEffect} { ${cssRule}; }`;
      const index = this.sheet.insertRule(rule, this.sheet.cssRules.length);
      this.statefulCache.set(scrollKey, index);
    } catch (error) {
      console.warn(`UB: Failed to inject scroll effect ${scrollKey}:`, error);
    }
  }

  createAnimation(name, keyframes, options = {}) {
    const animationKey = `@keyframes ${name}`;
    if (this.animationRules.has(animationKey)) return name;

    const keyframesRule = `
      @keyframes ${name} {
        ${keyframes}
      }
    `;

    try {
      const index = this.sheet.insertRule(keyframesRule, this.sheet.cssRules.length);
      this.animationRules.set(animationKey, index);
      return name;
    } catch (error) {
      console.warn(`UB: Failed to create animation ${name}:`, error);
      return null;
    }
  }

  apply(element, classNames, options = {}) {
    if (!element || !classNames.length) return;

    // Parse and inject all classes
    classNames.forEach(className => {
      this.inject(className);

      // Check for state modifiers
      if (className.includes(':')) {
        const [baseClass, state, modifierStr] = className.split(':');
        const modifier = parseInt(modifierStr) || 20;
        if (this.interactionStates.has(state)) {
          this.injectWithState(baseClass, state, modifier);
        }
      }

      // Check for scroll effects
      if (className.startsWith('ub-scroll-')) {
        const scrollEffect = className.replace('ub-scroll-', '');
        element.classList.add('ub-scroll-trigger', `ub-scroll-${scrollEffect}`);
      }
    });

    // Parse all properties
    const props = UniversalParser.parseAll(classNames.filter(cls => !cls.includes(':')));
    if (props.length === 0) return;

    // Get combined CSS
    const css = UniversalParser.combine(props);

    if (options.preserveExisting !== false) {
      this.mergeStyles(element, css);
    } else {
      element.style.cssText = css;
    }

    // Add optimization class
    element.classList.add('ub-optimized');

    // Add event listeners for stateful classes
    if (classNames.some(cls => cls.includes(':'))) {
      this.attachStateListeners(element, classNames);
    }
  }

  mergeStyles(element, newCSS) {
    const existing = element.style.cssText;
    const newStyles = newCSS.split(';').reduce((acc, rule) => {
      const [key] = rule.split(':');
      if (key) acc[key.trim()] = true;
      return acc;
    }, {});

    // Filter out old UB styles
    const filtered = existing.split(';')
      .filter(rule => {
        const [key] = rule.split(':');
        return !newStyles[key?.trim()];
      })
      .filter(rule => rule.trim());

    element.style.cssText = [...filtered, newCSS].join(';');
  }

  attachStateListeners(element, classNames) {
    const stateClasses = classNames.filter(cls => cls.includes(':'));

    stateClasses.forEach(stateClass => {
      const [baseClass, state] = stateClass.split(':');
      
      switch (state) {
        case 'hover':
          element.addEventListener('mouseenter', () => {
            element.classList.add(`${baseClass}:hover`);
          });
          element.addEventListener('mouseleave', () => {
            element.classList.remove(`${baseClass}:hover`);
          });
          break;

        case 'focus':
          element.addEventListener('focus', () => {
            element.classList.add(`${baseClass}:focus`);
          });
          element.addEventListener('blur', () => {
            element.classList.remove(`${baseClass}:focus`);
          });
          break;

        case 'active':
          element.addEventListener('mousedown', () => {
            element.classList.add(`${baseClass}:active`);
          });
          element.addEventListener('mouseup', () => {
            element.classList.remove(`${baseClass}:active`);
          });
          element.addEventListener('touchstart', () => {
            element.classList.add(`${baseClass}:active`);
          });
          element.addEventListener('touchend', () => {
            element.classList.remove(`${baseClass}:active`);
          });
          break;
      }
    });
  }

  animate(element, newClasses, options = {}) {
    if (!element) return;

    const {
      duration = 300,
      easing = 'cubic-bezier(0.4, 0, 0.2, 1)',
      onComplete = null
    } = options;

    const currentClasses = Array.from(element.classList)
      .filter(cls => cls.startsWith('ub-') && !cls.includes(':'));

    const currentProps = UniversalParser.parseAll(currentClasses);
    const targetProps = UniversalParser.parseAll(newClasses);

    const startTime = performance.now();

    const animateFrame = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Custom easing
      let eased;
      if (easing === 'ease-out') {
        eased = 1 - Math.pow(1 - progress, 3);
      } else if (easing === 'ease-in') {
        eased = Math.pow(progress, 3);
      } else if (easing === 'spring') {
        const damping = 15;
        const stiffness = 180;
        const w0 = Math.sqrt(stiffness);
        const zeta = damping / (2 * w0);
        const wd = w0 * Math.sqrt(1 - zeta * zeta);
        eased = 1 - Math.exp(-zeta * w0 * progress) * Math.cos(wd * progress);
      } else {
        eased = progress;
      }

      // Interpolate properties
      const interpolatedProps = [];
      const allProperties = new Set([
        ...currentProps.map(p => p.property),
        ...targetProps.map(p => p.property)
      ]);

      allProperties.forEach(property => {
        const current = currentProps.find(p => p.property === property);
        const target = targetProps.find(p => p.property === property);

        if (current && target) {
          const value = Math.round(current.value + (target.value - current.value) * eased);
          interpolatedProps.push({ property, value });
        } else if (current) {
          const value = Math.round(current.value * (1 - eased));
          interpolatedProps.push({ property, value });
        } else if (target) {
          const value = Math.round(target.value * eased);
          interpolatedProps.push({ property, value });
        }
      });

      // Apply interpolated styles
      const css = UniversalParser.combine(interpolatedProps);
      element.style.cssText = css;

      if (progress < 1) {
        requestAnimationFrame(animateFrame);
      } else {
        // Final state
        this.apply(element, newClasses);
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animateFrame);
  }

  updateScrollBasedStyles(element, scrollClass, progress) {
    const effect = scrollClass.replace('ub-scroll-', '');
    const prop = UniversalParser.parse(scrollClass.replace('scroll-', ''));

    if (!prop) return;

    let value;
    switch (effect) {
      case 'opacity':
        value = Math.round(prop.value * (1 - progress));
        break;
      case 'blur':
        value = Math.round(prop.value * progress);
        break;
      case 'scale':
        value = Math.round(prop.value * (1 - progress * 0.3));
        break;
      case 'translate-y':
        value = Math.round(prop.value * progress);
        break;
      default:
        value = prop.value;
    }

    const modifiedProp = { ...prop, value };
    const css = UniversalParser.toCSS(modifiedProp);
    
    // Update only this specific style
    const [property, styleValue] = css.split(':').map(s => s.trim());
    if (property && styleValue) {
      element.style[property.replace(/-([a-z])/g, (g) => g[1].toUpperCase())] = styleValue;
    }
  }

  clear(element) {
    if (!element) return;

    // Remove UB classes
    const ubClasses = Array.from(element.classList)
      .filter(cls => cls.startsWith('ub-'));

    ubClasses.forEach(cls => {
      element.classList.remove(cls);
      // Remove state listeners
      if (cls.includes(':')) {
        const [baseClass] = cls.split(':');
        element.classList.remove(`${baseClass}:hover`);
        element.classList.remove(`${baseClass}:focus`);
        element.classList.remove(`${baseClass}:active`);
      }
    });

    // Clear inline styles that match UB patterns
    const cssText = element.style.cssText;
    const lines = cssText.split(';')
      .filter(line => {
        const isUB = line.includes('--ub-') ||
          (line.includes(':') && UniversalParser.isValid('ub-' + line.split(':')[0]));
        return !isUB;
      })
      .filter(line => line.trim());

    element.style.cssText = lines.join(';');
    element.classList.remove('ub-optimized');
  }

  getInjectedClasses() {
    return Array.from(this.cache.keys());
  }

  isInjected(className) {
    return this.cache.has(className);
  }

  remove(className) {
    if (!this.cache.has(className)) return;

    const index = this.cache.get(className);
    try {
      this.sheet.deleteRule(index);
      this.cache.delete(className);
    } catch (error) {
      console.warn(`UB: Failed to remove ${className}:`, error);
    }
  }

  clearAll() {
    while (this.sheet.cssRules.length > 0) {
      this.sheet.deleteRule(0);
    }
    this.cache.clear();
    this.statefulCache.clear();
    this.animationRules.clear();

    // Reset to base CSS
    this.styleElement.textContent = this.getBaseCSS();
  }
}

// Singleton instance
let instance = null;

export const getStyleManager = () => {
  if (!instance) {
    instance = new UBStyleManager();
  }
  return instance;
};

export default getStyleManager;